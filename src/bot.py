import asyncio
import html
import json
import logging
import os
import sys
import uuid
import datetime
from pathlib import Path

from telegram import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    InputFile,
    KeyboardButton,
    ReplyKeyboardMarkup,
    Update,
)
from telegram.ext import (
    ApplicationBuilder,
    CallbackQueryHandler,
    CommandHandler,
    ConversationHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from src.core import TelegramRegistrar
from src.utils import save_result, load_ads
from src.db import db
from src.okpay import OkayPay
from src.paths import ensure_data_dir, trc20_qr_image_path
from src import tron_monitor
from src.bot_lang import translate_for_user

logger = logging.getLogger(__name__)


async def run_bot():
    """Telegram Bot 模式。"""

    BOT_TOKEN = os.getenv("BOT_TOKEN", "")

    if not BOT_TOKEN or BOT_TOKEN == "your_bot_token_here":
        print("❌ 请在 .env 文件中设置 BOT_TOKEN")
        sys.exit(1)

    ensure_data_dir()

    # 强制关注的频道/群组
    REQUIRED_CHANNELS_STR = os.getenv("REQUIRED_CHANNELS", "").strip()
    REQUIRED_CHANNELS: list[str] = []
    if REQUIRED_CHANNELS_STR:
        REQUIRED_CHANNELS = [ch.strip() for ch in REQUIRED_CHANNELS_STR.split(",") if ch.strip()]

    # 会话状态常量（自定义菜单为 url 按钮，无单独状态）
    MAIN_MENU, ENTER_PHONE, VERIFY_CODE, RECHARGE, USDT_PAYMENT, CARD_CODE, PERSONAL_CENTER, HELP, LANGUAGE_SETTINGS = range(9)

    def pack_prices():
        return {
            1: float(db.get_config("APPLY_PACK_1_PRICE", "1") or 1),
            10: float(db.get_config("APPLY_PACK_10_PRICE", "7.5") or 7.5),
            50: float(db.get_config("APPLY_PACK_50_PRICE", "25") or 25),
            100: float(db.get_config("APPLY_PACK_100_PRICE", "35") or 35),
        }

    # 设置用户语言
    def set_user_language(user_id, language):
        """设置用户的语言"""
        db.set_user_language(user_id, language)

    # 获取翻译
    def _(user_id, key, **kwargs):
        """获取翻译文本"""
        return translate_for_user(user_id, key, **kwargs)

    def normalize_menu_url(raw: str) -> str:
        raw = (raw or "").strip()
        if not raw:
            return ""
        if raw.startswith("http://") or raw.startswith("https://"):
            return raw
        if raw.startswith("@"):
            return f"https://t.me/{raw[1:]}"
        if raw.startswith("t.me/"):
            return f"https://{raw}"
        return f"https://t.me/{raw.lstrip('/')}"

    def load_custom_menu_items() -> list[dict[str, str]]:
        raw = (db.get_config("BOT_CUSTOM_MENU_JSON", "[]") or "").strip()
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return []
        if not isinstance(data, list):
            return []
        out: list[dict[str, str]] = []
        for item in data[:6]:
            if not isinstance(item, dict):
                continue
            text = str(item.get("text") or "").strip()
            url = normalize_menu_url(str(item.get("url") or "").strip())
            if not text or not url:
                continue
            out.append({"text": text, "url": url})
        return out[:6]

    def build_custom_menu_button_rows() -> list[list[InlineKeyboardButton]]:
        """字数 >6 独占一行；否则与下一个「短」项（≤6）并排，否则单独一行。"""
        items = load_custom_menu_items()
        rows: list[list[InlineKeyboardButton]] = []
        i = 0
        while i < len(items):
            t = items[i]["text"]
            u = items[i]["url"]
            if len(t) > 6:
                rows.append([InlineKeyboardButton(t, url=u)])
                i += 1
            elif i + 1 < len(items) and len(items[i + 1]["text"]) <= 6:
                rows.append(
                    [
                        InlineKeyboardButton(t, url=u),
                        InlineKeyboardButton(items[i + 1]["text"], url=items[i + 1]["url"]),
                    ]
                )
                i += 2
            else:
                rows.append([InlineKeyboardButton(t, url=u)])
                i += 1
        return rows

    def main_menu_keyboard(user_id: str) -> list[list[InlineKeyboardButton]]:
        rows: list[list[InlineKeyboardButton]] = [
            [InlineKeyboardButton(_(user_id, "api_apply"), callback_data="api_apply")],
            [
                InlineKeyboardButton(_(user_id, "personal_center"), callback_data="personal_center"),
                InlineKeyboardButton(_(user_id, "recharge"), callback_data="recharge"),
            ],
            [
                InlineKeyboardButton(_(user_id, "card_code"), callback_data="card_code"),
                InlineKeyboardButton(_(user_id, "help"), callback_data="help"),
            ],
            [InlineKeyboardButton(_(user_id, "language"), callback_data="language")],
        ]
        rows.extend(build_custom_menu_button_rows())
        return rows

    def pack_buy_keyboard(user_id):
        p = pack_prices()
        uid = user_id
        return [
            [InlineKeyboardButton(_(uid, "pack_button", credits=1, price=p[1]), callback_data="pack_1")],
            [InlineKeyboardButton(_(uid, "pack_button", credits=10, price=p[10]), callback_data="pack_10")],
            [InlineKeyboardButton(_(uid, "pack_button", credits=50, price=p[50]), callback_data="pack_50")],
            [InlineKeyboardButton(_(uid, "pack_button", credits=100, price=p[100]), callback_data="pack_100")],
            [InlineKeyboardButton(_(uid, "back_to_menu"), callback_data="back_to_menu")],
        ]

    async def start_usdt_pack_payment(query, user_id: str, amount: float, credit_pack: int):
        order_id = datetime.datetime.now().strftime("%Y%m%d%H%M%S%f")[:-3]
        db.cancel_pending_orders(user_id)
        trc20_pay = tron_monitor.unique_trc20_pay_amount(amount, order_id)
        db.create_order(
            order_id, user_id, amount, "usdt", credit_pack=credit_pack, trc20_pay_amount=trc20_pay
        )
        keyboard = [
            [InlineKeyboardButton(_(user_id, "back_to_menu"), callback_data="back_to_menu")],
        ]
        ok_id = (db.get_config("OKPAY_ID") or "").strip()
        ok_token = (db.get_config("OKPAY_TOKEN") or "").strip()
        ok_coin = (db.get_config("OKPAY_PAYED") or "USDT").strip() or "USDT"
        ok_return = (db.get_config("OKPAY_RETURN_URL") or "https://t.me/").strip() or "https://t.me/"
        okay_pay = OkayPay(ok_id, ok_token)
        pay_url, _okpay_oid = okay_pay.get_pay_link(
            order_id, amount, ok_coin, _(user_id, "okpay_product", credits=credit_pack), ok_return
        )
        trc20_raw = (db.get_config("TRC20_ADDRESS") or "").strip()
        addr_display = trc20_raw if trc20_raw else _(user_id, "trc20_address_missing")
        addr_esc = html.escape(addr_display)
        oid_esc = html.escape(order_id)
        trc20_pay_s = f"{trc20_pay:.6f}"
        lines = [
            _(user_id, "payment_title_html"),
            _(user_id, "payment_pack_line_html", credits=credit_pack),
            _(user_id, "payment_trc20_exact_line_html", trc20_pay=trc20_pay_s),
            _(user_id, "payment_order_line_html", order_id=oid_esc),
            "",
            _(user_id, "payment_trc20_address_title_html"),
            f"<code>{addr_esc}</code>",
        ]
        if pay_url:
            pu_esc = html.escape(pay_url, quote=True)
            lines.insert(
                3,
                _(user_id, "payment_okay_amount_line_html", amount=f"{amount:.2f}"),
            )
            lines.extend(
                [
                    "",
                    _(user_id, "payment_okay_link_html", pay_url=pu_esc),
                    _(user_id, "payment_note_okay_html"),
                ]
            )
        else:
            lines.extend(["", _(user_id, "payment_note_trc20_only_html")])
        caption = "\n".join(lines)
        if len(caption) > 1024:
            caption = caption[:1021] + "..."
        qr_path = trc20_qr_image_path()
        markup = InlineKeyboardMarkup(keyboard)
        try:
            if qr_path:
                with open(qr_path, "rb") as ph:
                    qr_bytes = ph.read()
                bot = query.get_bot()
                chat_id = query.message.chat_id
                # 纯文本消息 edit_message_media + 本地上传在部分环境会报 media not found，改为删原消息再发单条带图消息
                try:
                    await query.message.delete()
                except Exception:
                    logger.debug("删除原支付菜单消息失败（可忽略）", exc_info=True)
                await bot.send_photo(
                    chat_id=chat_id,
                    photo=InputFile(qr_bytes, filename=os.path.basename(qr_path)),
                    caption=caption,
                    parse_mode="HTML",
                    reply_markup=markup,
                )
            else:
                await query.edit_message_text(caption, reply_markup=markup, parse_mode="HTML")
        except Exception:
            logger.exception("更新支付说明消息失败")

    async def check_channels(user_id: int, bot) -> list[str]:
        """检查用户是否已加入所有必须关注的频道/群组，返回未加入的列表。"""
        not_joined = []
        for ch in REQUIRED_CHANNELS:
            try:
                member = await bot.get_chat_member(chat_id=ch, user_id=user_id)
                if member.status in ("left", "kicked"):
                    not_joined.append(ch)
            except Exception:
                # 查询失败（Bot 不是管理员等），跳过该频道
                not_joined.append(ch)
        return not_joined

    def build_channel_buttons(not_joined: list[str], user_id: str) -> InlineKeyboardMarkup:
        """为未加入的频道/群组生成加入按钮 + 验证按钮。"""
        buttons = []
        for ch in not_joined:
            # @username 格式转为链接
            if ch.startswith("@"):
                url = f"https://t.me/{ch[1:]}"
                label = ch
            elif ch.startswith("-100"):
                url = None
                label = ch
            else:
                url = f"https://t.me/{ch}"
                label = ch
            if url:
                buttons.append(
                    [InlineKeyboardButton(_(user_id, "channel_join", label=label), url=url)]
                )
        buttons.append(
            [InlineKeyboardButton(_(user_id, "channel_check_joined"), callback_data="check_joined")]
        )
        return InlineKeyboardMarkup(buttons)

    ads_text = load_ads()

    async def reply_callback_text(query, text: str, reply_markup=None, parse_mode=None):
        """回调查询上展示纯文本：当前消息若是图片/视频等媒体（无 text 可编辑）则删后新发。"""
        msg = query.message
        if msg.photo or msg.document or msg.video or msg.animation:
            try:
                await msg.delete()
            except Exception:
                logger.debug("删除原消息失败", exc_info=True)
            await msg.chat.send_message(
                text=text,
                reply_markup=reply_markup,
                parse_mode=parse_mode,
            )
        else:
            await query.edit_message_text(text, reply_markup=reply_markup, parse_mode=parse_mode)

    # ── /start ──
    async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = str(update.effective_user.id)
        username = update.effective_user.username
        
        # 确保用户存在于数据库中
        user = db.get_user(user_id)
        if not user:
            db.create_user(user_id, username)
        
        user = db.get_user(user_id)
        credits = int(user[6]) if user else 0

        keyboard = main_menu_keyboard(user_id)

        if update.message:
            await update.message.reply_text(
                f"{_(user_id, 'welcome')}\n\n{_(user_id, 'balance', credits=credits)}\n\n{_(user_id, 'text1')}",
                reply_markup=InlineKeyboardMarkup(keyboard),
            )
        elif update.callback_query:
            # 调用方（如 handle_main_menu）已 answer，此处勿重复 answer
            q = update.callback_query
            await reply_callback_text(
                q,
                f"{_(user_id, 'welcome')}\n{_(user_id, 'balance', credits=credits)}\n\n{_(user_id, 'text1')}:",
                reply_markup=InlineKeyboardMarkup(keyboard),
            )
        return MAIN_MENU



    # ── 处理主菜单按钮点击 ──
    async def handle_main_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
        query = update.callback_query
        await query.answer()
        
        user_id = str(query.from_user.id)
        
        if query.data == "api_apply":
            user = db.get_user(user_id)
            credits = int(user[6]) if user else 0
            if credits < 1:
                await reply_callback_text(
                    query,
                    _(user_id, "insufficient_balance", credits=credits),
                    reply_markup=InlineKeyboardMarkup(pack_buy_keyboard(user_id)),
                )
                return RECHARGE
            await reply_callback_text(query, _(user_id, "enter_phone"))
            return ENTER_PHONE

        elif query.data == "personal_center":
            # 进入个人中心
            user = db.get_user(user_id)
            if user:
                telegram_id, username = user[1], user[2]
                total_recharge, total_applications, credits = user[4], user[5], int(user[6])
                keyboard = [[InlineKeyboardButton(_(user_id, 'back_to_menu'), callback_data="back_to_menu")]]
                await reply_callback_text(
                    query,
                    _(
                        user_id,
                        "personal_info",
                        tg_id=telegram_id,
                        username=username or "N/A",
                        credits=credits,
                        recharge=total_recharge,
                        applications=total_applications,
                    ),
                    reply_markup=InlineKeyboardMarkup(keyboard),
                )
                return PERSONAL_CENTER

        elif query.data == "recharge":
            await reply_callback_text(
                query,
                f"{_(user_id, 'recharge_title')}\n\n{_(user_id, 'recharge_promo')}",
                reply_markup=InlineKeyboardMarkup(pack_buy_keyboard(user_id)),
            )
            return RECHARGE
        
        elif query.data == "card_code":
            # 进入卡密兑换页面
            keyboard = [[InlineKeyboardButton(_(user_id, 'back_to_menu'), callback_data="back_to_menu")]]
            await reply_callback_text(
                query,
                _(user_id, 'card_code_title'),
                reply_markup=InlineKeyboardMarkup(keyboard),
            )
            return CARD_CODE

        elif query.data == "card_code_continue":
            keyboard = [[InlineKeyboardButton(_(user_id, 'back_to_menu'), callback_data="back_to_menu")]]
            await query.edit_message_text(
                _(user_id, 'card_code_title'),
                reply_markup=InlineKeyboardMarkup(keyboard),
            )
            return CARD_CODE
        
        elif query.data == "help":
            # 进入帮助说明页面
            keyboard = [[InlineKeyboardButton(_(user_id, 'back_to_menu'), callback_data="back_to_menu")]]
            await reply_callback_text(
                query,
                _(user_id, 'help_text'),
                reply_markup=InlineKeyboardMarkup(keyboard),
            )
            return HELP
        
        elif query.data == "language":
            # 进入语言设置
            keyboard = [
                [InlineKeyboardButton(_(user_id, 'chinese'), callback_data="lang_zh")],
                [InlineKeyboardButton(_(user_id, 'english'), callback_data="lang_en")],
                [InlineKeyboardButton(_(user_id, 'back_to_menu'), callback_data="back_to_menu")]
            ]
            await reply_callback_text(
                query,
                _(user_id, 'select_language'),
                reply_markup=InlineKeyboardMarkup(keyboard),
            )
            return LANGUAGE_SETTINGS
        
        elif query.data.startswith("lang_"):
            # 设置语言
            language = query.data.split("_")[1]
            set_user_language(user_id, language)
            name_key = "chinese" if language == "zh" else "english"
            await query.edit_message_text(
                _(user_id, "language_set_ok", name=_(user_id, name_key))
            )
            # 返回主菜单
            await cmd_start(update, context)
            return MAIN_MENU
        
        elif query.data == "back_to_menu":
            # 返回主菜单
            await cmd_start(update, context)
            return MAIN_MENU

    # ── 未在会话中时收到普通消息，自动进入流程 ──
    async def auto_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = str(update.effective_user.id)
        
        # 确保用户存在于数据库中
        user = db.get_user(user_id)
        if not user:
            db.create_user(user_id, update.effective_user.username)
        
        user = db.get_user(user_id)
        credits = int(user[6]) if user else 0

        keyboard = main_menu_keyboard(user_id)

        await update.message.reply_text(
            f"{_(user_id, 'welcome')}\n{_(user_id, 'balance', credits=credits)}\n{_(user_id, 'price')}",
            reply_markup=InlineKeyboardMarkup(keyboard),
        )
        return MAIN_MENU

    # ── 收到手机号 ──
    async def handle_phone(update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = str(update.effective_user.id)
        u = db.get_user(user_id)
        if not u or int(u[6]) < 1:
            await update.message.reply_text(_(user_id, "insufficient_credits_short"))
            return ConversationHandler.END

        phone = update.message.text.strip()
        if not phone.startswith("+"):
            await update.message.reply_text(_(user_id, 'phone_format_error'))
            return ENTER_PHONE

        await update.message.reply_text(_(user_id, 'sending_code'))

        reg = TelegramRegistrar()
        result = await reg.send_code(phone)

        if not result["ok"]:
            await reg.close()
            await update.message.reply_text(_(user_id, 'send_code_failed', error=result['error']))
            return ENTER_PHONE

        context.user_data["phone"] = phone
        context.user_data["random_hash"] = result["random_hash"]
        context.user_data["registrar"] = reg

        await update.message.reply_text(
            _(user_id, 'code_sent')
        )
        return VERIFY_CODE

    # ── 收到验证码 ──
    async def handle_code(update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = str(update.effective_user.id)
        code = update.message.text.strip()
        phone = context.user_data.get("phone", "")
        random_hash = context.user_data.get("random_hash", "")
        reg: TelegramRegistrar = context.user_data.get("registrar")

        if not reg:
            await update.message.reply_text(_(user_id, 'session_expired'))
            return ConversationHandler.END

        await update.message.reply_text(_(user_id, 'logging_in'))

        try:
            # 登录
            result = await reg.login(phone, random_hash, code)
            if not result["ok"]:
                await update.message.reply_text(_(user_id, 'login_failed', error=result['error']))
                return VERIFY_CODE

            await update.message.reply_text(_(user_id, 'login_success'))

            # 获取或创建应用
            result = await reg.get_or_create_app()
            if not result["ok"]:
                await update.message.reply_text(_(user_id, 'app_failed', error=result['error']))
                return ConversationHandler.END

            # 保存文件
            filepath = save_result(phone, result)

            user_id = str(update.effective_user.id)
            if not db.consume_apply_credit(user_id):
                logger.warning("申请成功但扣次失败 user=%s", user_id)
            db.increment_application_count(user_id)
            
            # 保存API申请记录
            db.add_api_application(user_id, phone, result.get('api_id'), result.get('api_hash'))

            # 发送文字结果
            await update.message.reply_text(
                _(user_id, 'register_success', api_id=result.get('api_id'), api_hash=result.get('api_hash'))
            )

            # 发送 txt 文件（附带广告）
            caption = _(user_id, "api_credentials_file_caption")
            if ads_text:
                caption = f"{ads_text}\n\n{caption}"
            with open(filepath, "rb") as f:
                await update.message.reply_document(
                    document=f,
                    filename=filepath.name,
                    caption=caption,
                )



        except Exception as e:
            logger.exception("Bot 处理异常")
            await update.message.reply_text(_(user_id, "error", error=e))
        finally:
            await reg.close()
            context.user_data.clear()

        return ConversationHandler.END




    # ── /menu ──
    async def cmd_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """显示主菜单。"""
        keyboard = [
            [KeyboardButton("/start")],
        ]
        reply_markup = ReplyKeyboardMarkup(
            keyboard,
            resize_keyboard=True,
            one_time_keyboard=False
        )
        uid = str(update.effective_user.id)
        await update.message.reply_text(
            _(uid, "menu"),
            reply_markup=reply_markup,
        )

    # ── /cancel ──（申请手机号/验证码等流程中取消后回到主菜单）
    async def cmd_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = str(update.effective_user.id)
        username = update.effective_user.username
        reg = context.user_data.get("registrar")
        if reg:
            try:
                await reg.close()
            except Exception:
                logger.exception("关闭 registrar 失败")
        context.user_data.clear()
        user = db.get_user(user_id)
        if not user:
            db.create_user(user_id, username)
        user = db.get_user(user_id)
        credits = int(user[6]) if user else 0
        await update.message.reply_text(
            f"{_(user_id, 'cancel_returned_menu')}\n\n"
            f"{_(user_id, 'welcome')}\n\n{_(user_id, 'balance', credits=credits)}\n{_(user_id, 'price')}\n\n{_(user_id, 'text1')}",
            reply_markup=InlineKeyboardMarkup(main_menu_keyboard(user_id)),
        )
        return MAIN_MENU

    async def handle_recharge(update: Update, context: ContextTypes.DEFAULT_TYPE):
        query = update.callback_query
        await query.answer()

        user_id = str(query.from_user.id)
        if query.data in ("back_to_menu", "cancel_recharge"):
            await cmd_start(update, context)
            return MAIN_MENU

        pack_map = {"pack_1": 1, "pack_10": 10, "pack_50": 50, "pack_100": 100}
        if query.data in pack_map:
            n = pack_map[query.data]
            price = pack_prices()[n]
            await start_usdt_pack_payment(query, user_id, price, n)
            return USDT_PAYMENT

        await cmd_start(update, context)
        return MAIN_MENU

    # ── 处理卡密兑换 ──
    async def handle_card_code(update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = str(update.effective_user.id)
        code = update.message.text.strip()
        
        if code == "/cancel":
            await update.message.reply_text(_(user_id, "operation_canceled"))
            return ConversationHandler.END

        # 验证卡密
        code_info = db.get_code(code)
        if not code_info:
            await update.message.reply_text(_(user_id, 'invalid_code'))
            return CARD_CODE
        
        if code_info[3] != "unused":
            await update.message.reply_text(_(user_id, 'code_used'))
            return CARD_CODE
        
        if db.use_code(code, user_id):
            credits_add = max(1, int(code_info[2]))
            db.increment_apply_credits(user_id, credits_add)

            success_kb = [
                [InlineKeyboardButton(_(user_id, "card_code_continue"), callback_data="card_code_continue")],
                [InlineKeyboardButton(_(user_id, "back_to_menu"), callback_data="back_to_menu")],
            ]
            await update.message.reply_text(
                _(user_id, "code_success", credits=credits_add),
                reply_markup=InlineKeyboardMarkup(success_kb),
            )
            return CARD_CODE
        else:
            await update.message.reply_text(_(user_id, 'code_failed'))
            return CARD_CODE

    async def post_init(application):
        from telegram import BotCommand,MenuButtonCommands
        commands = [
            BotCommand("start", "Start the bot"),
        ]
        await application.bot.set_my_commands(commands)
        # 设置菜单按钮
        await application.bot.set_chat_menu_button(menu_button=MenuButtonCommands())
        logger.info("菜单按钮设置完成")

    # ── 构建并启动 Bot ──
    app = ApplicationBuilder().token(BOT_TOKEN).post_init(post_init).build()


    conv_handler = ConversationHandler(
        entry_points=[
            CommandHandler("start", cmd_start),
            MessageHandler(filters.TEXT & ~filters.COMMAND, auto_start),
        ],
        states={
            MAIN_MENU: [
                CallbackQueryHandler(handle_main_menu)
            ],
            ENTER_PHONE: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, handle_phone)
            ],
            VERIFY_CODE: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, handle_code)
            ],
            RECHARGE: [
                CallbackQueryHandler(handle_recharge)
            ],
            USDT_PAYMENT: [
                CallbackQueryHandler(handle_main_menu)
            ],
            CARD_CODE: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, handle_card_code),
                CallbackQueryHandler(handle_main_menu)
            ],
            PERSONAL_CENTER: [
                CallbackQueryHandler(handle_main_menu)
            ],
            HELP: [
                CallbackQueryHandler(handle_main_menu)
            ],
            LANGUAGE_SETTINGS: [
                CallbackQueryHandler(handle_main_menu)
            ],
        },
        fallbacks=[CommandHandler("cancel", cmd_cancel)],
        per_user=True,
        per_chat=True,
    )
    app.add_handler(conv_handler)
    app.add_handler(CommandHandler("menu", cmd_menu))

    ORDER_TIMEOUT_MINUTES = 10
    ORDER_EXPIRY_POLL_SECONDS = 30

    def format_order_timeout_notice(telegram_id: str, order_id: str) -> str:
        return translate_for_user(telegram_id, "order_timeout_cancelled", order_id=order_id)

    async def order_expiry_loop():
        while True:
            try:
                expired = db.expire_pending_orders_older_than(ORDER_TIMEOUT_MINUTES)
                for row in expired:
                    tid = row["telegram_id"]
                    oid = row["order_id"]
                    text = format_order_timeout_notice(tid, oid)
                    try:
                        await app.bot.send_message(chat_id=int(tid), text=text)
                    except Exception:
                        logger.exception("订单超时通知失败 tid=%s oid=%s", tid, oid)
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("订单超时扫描失败")
            await asyncio.sleep(ORDER_EXPIRY_POLL_SECONDS)

    async def tron_monitor_loop():
        while True:
            try:
                raw = db.get_config("TRON_POLL_SECONDS", "45") or "45"
                interval = max(15, int(raw))
            except ValueError:
                interval = 45
            try:
                notes = await asyncio.to_thread(tron_monitor.run_tron_payment_scan, db)
                for n in notes:
                    try:
                        await app.bot.send_message(chat_id=int(n["telegram_id"]), text=n["text"])
                    except Exception:
                        logger.exception("TRC20 到账通知失败 tid=%s", n.get("telegram_id"))
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("TRON 链上监听异常")
            await asyncio.sleep(interval)

    async def main():
        """启动机器人"""
        logger.info("Bot 已启动，等待消息...")
        print("Bot 已启动！按 Ctrl+C 停止。")

        await app.initialize()
        # initialize() 不会触发 post_init（仅 run_polling/run_webhook 会），须手动调用才能注册命令与菜单按钮
        if app.post_init:
            await app.post_init(app)
        await app.start()
        await app.updater.start_polling()

        expiry_task = asyncio.create_task(order_expiry_loop())
        tron_task = asyncio.create_task(tron_monitor_loop())
        try:
            while True:
                await asyncio.sleep(1)
        except (KeyboardInterrupt, SystemExit):
            pass
        finally:
            expiry_task.cancel()
            tron_task.cancel()
            await asyncio.gather(expiry_task, tron_task, return_exceptions=True)
            await app.updater.stop()
            await app.stop()

    # 启动机器人
    await main()

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_bot())
