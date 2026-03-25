import asyncio
import json
import logging
import os
import sys
import uuid
import datetime
from pathlib import Path

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, KeyboardButton, ReplyKeyboardMarkup, Update
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

logger = logging.getLogger(__name__)


async def run_bot():
    """Telegram Bot 模式。"""

    # 多语言支持
    LANGUAGES = {
        'zh': {
            'welcome': '🤖 欢迎使用Telegram API申请机器人!',
            'balance': '💰 当前余额: {balance:.2f}',
            'text1': '请选择操作:',
            'price': '💵 申请单价: 1u起(批量低至 0.8u/个)',
            'api_apply': '📱 申请 Telegram API',
            'personal_center': '👤 个人中心',
            'recharge': '💳 充值余额',
            'card_code': '🎫 卡密兑换',
            'help': '❓ 帮助说明',
            'contact_support': '📞 联系客服',
            'select_quantity': '📱 申请Telegram API\n\n💰 当前余额: {balance:.2f}\n💵 基础单价: 5.99\n一次申请越多单价越低\n\n请选择本次申请数量:\n',
            'quantity_1': '🌹1个起0.99u/次',
            'quantity_5': '🌹🌹5个起-0.88/次',
            'back_to_menu': '🔙 返回菜单',
            'insufficient_balance': '❌ 余额不足\n\n💰 当前余额: {balance:.2f}\n💵 申请{count}次合计: {price:.2f}u\n还需充值: {needed:.2f}u\n\n请充分充值后再申请\n',
            'recharge_amount': '💳 充值{amount:.2f}u(到账后可立刻申请)',
            'reselect_quantity': '🔄 重新选择数量',
            'enter_phone': '📱 请发送您的手机号（国际格式）\n例如: +8613800138000\n\n发送 /cancel 取消操作',
            'phone_format_error': '❌ 手机号格式错误，请重新输入：',
            'sending_code': '⏳ 正在发送验证码，请稍候...',
            'send_code_failed': '❌ 发送验证码失败: {error}\n\n请重新发送手机号：',
            'code_sent': '✅ 验证码已发送！\n\n请查看您的 Telegram 消息，然后输入收到的验证码：',
            'logging_in': '⏳ 正在登录...',
            'login_failed': '❌ 登录失败: {error}\n\n请重新输入验证码：',
            'login_success': '✅ 登录成功，正在获取/创建应用...',
            'app_failed': '❌ 获取应用信息失败: {error}',
            'register_success': '✅ 注册成功！\n\napi_id: {api_id}\napi_hash: {api_hash}\nAPI其他信息访问 https://my.telegram.org 查看\n麻烦闲鱼给个好评,非常感谢!!!\n✈️ 账号批发,会员打开,软件定制 https://t.me/r7tg1\n',
            'recharge_title': '💳 充值余额',
            'recharge_promo': '当前充值优惠:\n    *充值20u以上赠送10%的金额\n\n请直接点击下方按钮输入充值金额\n',
            'enter_amount': '💵 输入充值金额',
            'custom_amount': '💳 自定义充值金额\n\n请直接输入发送您要充值的金额(U)\n范围:1~9999u\n示例: 50或88.5\n',
            'cancel': '❌ 取消',
            'amount_range_error': '❌ 金额超出范围，请重新输入：',
            'amount_format_error': '❌ 金额格式错误，请重新输入：',
            'recharge_bonus': '🎁 充值优惠：充值20u以上赠送10%\n实际到账：{amount:.2f}u',
            'select_payment': '💳 自定义充值\n\n💵 充值金额:{amount:.2f}u\n\n请选择支付方式\n',
            'alipay': '🧧 支付宝扫码',
            'usdt': '💲 USDT转账',
            'trx': '⚡ TRX转账',
            'reenter_amount': '🔄 重新输入金额',
            'alipay_payment': '🧧 支付宝扫码\n产品: 自定义充值\n金额: {amount:.2f}u\n人民币金额: ¥{rmb:.2f}\n订单号: {order_id}\n收款地址: 支付宝账号: 12345678901\n\n请使用支付宝扫码支付',
            'check_payment': '✅ 我已付款，查询到账',
            'select_other': '🔄 选择其他套餐',
            'usdt_payment': '💲 USDT充值\n产品: 自定义充值\n金额: {amount:.2f}u\n订单号: {order_id}\n收款地址: TRC20: TXXXXXXXXXXXXXXXXXXXXXXXXXX\n\n提示:转账后系统自动监听,到账既发通知,无需联系客服\n请务必按照上方金额转账,订单24小时有效',
            'trx_payment': '⚡ TRX充值\n产品: 自定义充值\n金额: {amount:.2f}u\n订单号: {order_id}\n收款地址: TRC20: TXXXXXXXXXXXXXXXXXXXXXXXXXX\n\n提示:转账后系统自动监听,到账既发通知,无需联系客服\n请务必按照上方金额转账,订单24小时有效',
            'card_code_title': '🎫 卡密兑换\n请直接发送卡密内容\n例如:XXXXXXX\n\n返送/cancel可取消',
            'invalid_code': '❌ 无效的卡密，请重新输入：',
            'code_used': '❌ 卡密已被使用，请重新输入：',
            'code_success': '✅ 卡密兑换成功！\n已充值 {value:.2f}u 到您的账户',
            'code_failed': '❌ 卡密兑换失败，请重新输入：',
            'personal_info': '👤 个人中心\n\n🆔 TG ID: {tg_id}\n👤 用户名: @{username}\n💰 当前余额: {balance:.2f}\n💳 累计充值: {recharge:.2f}\n📱 累计申请: {applications}\n',
            'help_text': '❓ 使用说明\n\n1. 点击[申请Telegram API]\n2. 发送您的手机号(含国际区号,如+8613800000000)\n3. 查收Telegram发来的验证码\n4. 回复验证码\n5. 系统自动完成申请,返回api_id和api_hash\n\n注意事项:\n手机号必须已注册Telegram\n每个手机号每天申请的次数有限\n社情成功后请妥善保管凭证',
            'contact_text': '📞 联系客服\n请点击下方链接联系客服',
            'contact_support': '📞 联系客服',
            'operation_canceled': '❌ 操作已取消。发送 /start 重新开始。',
            'session_expired': '❌ 会话已过期，请重新发送 /start',
            'error': '❌ 发生错误: {error}',
            'menu': '📋 主菜单已显示，点击下方按钮开始。',
            'start': '🚀 开启机器人',
            'language': '🌐 My Language',
            'select_language': '🌐 请选择语言 / Please select language',
            'chinese': '🇨🇳 中文',
            'english': '🇺🇸 English'
        },
        'en': {
            'welcome': '🤖 Welcome to Telegram API Application Bot!',
            'balance': '💰 Current balance: {balance:.2f}',
            'text1': 'Please select an action:',
            'price': '💵 Application price: starting from 1u (bulk as low as 0.8u each)',
            'api_apply': '📱 Apply for Telegram API',
            'personal_center': '👤 Personal Center',
            'recharge': '💳 Recharge Balance',
            'card_code': '🎫 Card Code Exchange',
            'help': '❓ Help & Instructions',
            'contact_support': '📞 Contact Support',
            'select_quantity': '📱 Apply for Telegram API\n💰 Current balance: {balance:.2f}\n💵 Base price: 5.99\nThe more you apply at once, the lower the unit price\nPlease select the number of applications:',
            'quantity_1': '1️⃣ 1 piece - 1u/time',
            'quantity_5': '5️⃣ 5 pieces or more - 0.8u each',
            'back_to_menu': '🔙 Back to Menu',
            'insufficient_balance': '❌ Insufficient balance\n💰 Current balance: {balance:.2f}\n💵 Total for {count} applications: {price:.2f}u\nNeeded: {needed:.2f}u\nPlease recharge before applying',
            'recharge_amount': '💳 Recharge {amount:.2f}u',
            'reselect_quantity': '🔄 Reselect Quantity',
            'enter_phone': '📱 Please send your phone number (international format)\nExample: +8613800138000\n\nSend /cancel to cancel',
            'phone_format_error': '❌ Invalid phone number format, please re-enter:',
            'sending_code': '⏳ Sending verification code, please wait...',
            'send_code_failed': '❌ Failed to send verification code: {error}\n\nPlease re-send your phone number:',
            'code_sent': '✅ Verification code sent!\n\nPlease check your Telegram messages and enter the received code:',
            'logging_in': '⏳ Logging in...',
            'login_failed': '❌ Login failed: {error}\n\nPlease re-enter the verification code:',
            'login_success': '✅ Login successful, getting/creating application...',
            'app_failed': '❌ Failed to get application information: {error}',
            'register_success': '✅ Registration successful!\n\napi_id: {api_id}\napi_hash: {api_hash}\nFor other API information, visit https://my.telegram.org\nPlease leave a positive review on Xianyu, thank you very much!!!\n✈️ Account wholesale, member opening, software customization https://t.me/r7tg1\n',
            'recharge_title': '💳 Recharge Balance',
            'recharge_promo': 'Current recharge offer:\n    *Recharge 20u or more to get 10% bonus\nPlease click the button below to enter the recharge amount',
            'enter_amount': '💵 Enter Recharge Amount',
            'custom_amount': '💳 Custom Recharge Amount\nPlease directly send the amount you want to recharge (U)\nRange: 1~9999u\nExample: 50 or 88.5',
            'cancel': '❌ Cancel',
            'amount_range_error': '❌ Amount out of range, please re-enter:',
            'amount_format_error': '❌ Invalid amount format, please re-enter:',
            'recharge_bonus': '🎁 Recharge offer: Recharge 20u or more to get 10% bonus\nActual amount: {amount:.2f}u',
            'select_payment': '💳 Custom Recharge\nRecharge amount: {amount:.2f}u\nPlease select payment method',
            'alipay': '🧧 Alipay QR Code',
            'usdt': '💲 USDT Transfer',
            'trx': '⚡ TRX Transfer',
            'reenter_amount': '🔄 Re-enter Amount',
            'alipay_payment': '🧧 Alipay QR Code\nProduct: Custom Recharge\nAmount: {amount:.2f}u\nCNY amount: ¥{rmb:.2f}\nOrder ID: {order_id}\nReceiving address: Alipay account: 12345678901\n\nPlease pay using Alipay QR code',
            'check_payment': '✅ I have paid, check arrival',
            'select_other': '🔄 Select other package',
            'usdt_payment': '💲 USDT Recharge\nProduct: Custom Recharge\nAmount: {amount:.2f}u\nOrder ID: {order_id}\nReceiving address: TRC20: TXXXXXXXXXXXXXXXXXXXXXXXXXX\n\nNote: After transfer, the system will automatically monitor, you will receive a notification when it arrives, no need to contact customer service\nPlease transfer the exact amount above, order is valid for 24 hours',
            'trx_payment': '⚡ TRX Recharge\nProduct: Custom Recharge\nAmount: {amount:.2f}u\nOrder ID: {order_id}\nReceiving address: TRC20: TXXXXXXXXXXXXXXXXXXXXXXXXXX\n\nNote: After transfer, the system will automatically monitor, you will receive a notification when it arrives, no need to contact customer service\nPlease transfer the exact amount above, order is valid for 24 hours',
            'card_code_title': '🎫 Card Code Exchange\nPlease directly send the card code\nExample: XXXXXXX\n\nSend /cancel to cancel',
            'invalid_code': '❌ Invalid card code, please re-enter:',
            'code_used': '❌ Card code has been used, please re-enter:',
            'code_success': '✅ Card code exchange successful!\nRecharged {value:.2f}u to your account',
            'code_failed': '❌ Card code exchange failed, please re-enter:',
            'personal_info': '👤 Personal Center\nTG ID: {tg_id}\nUsername: {username}\n💰 Current balance: {balance:.2f}\n💳 Total recharge: {recharge:.2f}\n📱 Total applications: {applications}',
            'help_text': '❓ Instructions\n1. Click [Apply for Telegram API]\n2. Send your phone number (with international code, e.g., +8613800000000)\n3. Check Telegram for the verification code\n4. Reply with the verification code\n5. The system will automatically complete the application and return api_id and api_hash\n\nNotes:\nPhone number must be registered on Telegram\nEach phone number has a daily application limit\nPlease keep your credentials safe after successful application',
            'contact_text': '📞 Contact Support\nPlease click the link below to contact support',
            'contact_support': '📞 Contact Support',
            'operation_canceled': '❌ Operation canceled. Send /start to restart.',
            'session_expired': '❌ Session expired, please send /start again',
            'error': '❌ Error occurred: {error}',
            'menu': '📋 Main menu displayed, click the button below to start.',
            'start': '🚀 Start Bot',
            'language': '🌐 我的语言',
            'select_language': '🌐 Please select language / 请选择语言',
            'chinese': '🇨🇳 中文',
            'english': '🇺🇸 English'
        }
    }

    # 从环境变量获取配置
    BOT_TOKEN = os.getenv("BOT_TOKEN", "")
    OKPAY_WEBHOOK_URL = os.getenv("OKPAY_WEBHOOK_URL", "")
    TRC20_ADDRESS = os.getenv("TRC20_ADDRESS", "")
    
    # OKPay 配置
    OKPAY_ID = os.getenv("OKPAY_ID", "")
    OKPAY_TOKEN = os.getenv("OKPAY_TOKEN", "")
    OKPAY_PAYED = os.getenv("OKPAY_PAYED", "USDT")
    OKPAY_RETURN_URL = os.getenv("OKPAY_RETURN_URL", "https://t.me/")
    
    # 价格配置
    PRICE_1 = float(os.getenv("PRICE_1", "1.0"))
    PRICE_5 = float(os.getenv("PRICE_5", "4.0"))
    BONUS_THRESHOLD = float(os.getenv("BONUS_THRESHOLD", "20"))
    BONUS_RATE = float(os.getenv("BONUS_RATE", "0.1"))
    
    # 初始化 OkayPay
    okay_pay = OkayPay(OKPAY_ID, OKPAY_TOKEN)
    
    if not BOT_TOKEN or BOT_TOKEN == "your_bot_token_here":
        print("❌ 请在 .env 文件中设置 BOT_TOKEN")
        sys.exit(1)

    # 管理员用户 ID
    ADMIN_USERS_STR = os.getenv("ADMIN_USERS", "").strip()
    ADMIN_USERS: set[str] = set()
    if ADMIN_USERS_STR:
        ADMIN_USERS = {uid.strip() for uid in ADMIN_USERS_STR.split(",") if uid.strip()}

    # 强制关注的频道/群组
    REQUIRED_CHANNELS_STR = os.getenv("REQUIRED_CHANNELS", "").strip()
    REQUIRED_CHANNELS: list[str] = []
    if REQUIRED_CHANNELS_STR:
        REQUIRED_CHANNELS = [ch.strip() for ch in REQUIRED_CHANNELS_STR.split(",") if ch.strip()]

    # 会话状态常量
    MAIN_MENU, API_APPLY, SELECT_QUANTITY, ENTER_PHONE, VERIFY_CODE, RECHARGE, ENTER_AMOUNT, SELECT_PAYMENT, ALIPAY_PAYMENT, USDT_PAYMENT, TRX_PAYMENT, CARD_CODE, PERSONAL_CENTER, HELP, CONTACT_SUPPORT, LANGUAGE_SETTINGS = range(16)

    # 获取用户语言
    def get_user_language(user_id):
        """获取用户的语言设置"""
        user = db.get_user(user_id)
        if user:
            return user[6]  # language字段
        return 'zh'  # 默认中文

    # 设置用户语言
    def set_user_language(user_id, language):
        """设置用户的语言"""
        db.cursor.execute(
            "UPDATE users SET language = ? WHERE telegram_id = ?",
            (language, user_id)
        )
        db.conn.commit()

    # 获取翻译
    def _(user_id, key, **kwargs):
        """获取翻译文本"""
        language = get_user_language(user_id)
        if language not in LANGUAGES:
            language = 'zh'
        return LANGUAGES[language].get(key, key).format(**kwargs)


    def is_admin(user_id: int, username: str = None) -> bool:
        user_id_str = str(user_id)
        return user_id_str in ADMIN_USERS or (username and username in ADMIN_USERS)

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

    def build_channel_buttons(not_joined: list[str]) -> InlineKeyboardMarkup:
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
                buttons.append([InlineKeyboardButton(f"加入 {label}", url=url)])
        buttons.append([InlineKeyboardButton("✅ 我已加入", callback_data="check_joined")])
        return InlineKeyboardMarkup(buttons)

    ads_text = load_ads()

    def build_welcome() -> str:
        """构建欢迎消息，包含广告。"""
        lines = ['<tg-emoji emoji-id="5463253135575235218">🫰</tg-emoji>您好 {USER},本机器人是自助申请飞机API的机器人']
        lines.append('<tg-emoji emoji-id="5985630530111020079">💬</tg-emoji>击下方按钮<开始注册>开始申请API')
        return "\n".join(lines)

    # ── /start ──
    async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = str(update.effective_user.id)
        username = update.effective_user.username
        
        # 确保用户存在于数据库中
        user = db.get_user(user_id)
        if not user:
            db.create_user(user_id, username)
        
        # 获取用户余额
        user = db.get_user(user_id)
        balance = user[3] if user else 0.0
        
        # 构建主菜单
        keyboard = [
            [InlineKeyboardButton(_(user_id, 'api_apply'), callback_data="api_apply")],
            [InlineKeyboardButton(_(user_id, 'personal_center'), callback_data="personal_center"), InlineKeyboardButton(_(user_id, 'recharge'), callback_data="recharge")],
            [InlineKeyboardButton(_(user_id, 'card_code'), callback_data="card_code"), InlineKeyboardButton(_(user_id, 'help'), callback_data="help")],
            [InlineKeyboardButton(_(user_id, 'contact_support'), callback_data="contact_support")],
            [InlineKeyboardButton(_(user_id, 'language'), callback_data="language")]
        ]

        # 检查是否是回调查询
        if update.message:
            # 从命令或消息触发
            await update.message.reply_text(
                f"{_(user_id, 'welcome')}\n\n{_(user_id, 'balance', balance=balance)}\n{_(user_id, 'price')}\n\n{_(user_id, 'text1')}",
                reply_markup=InlineKeyboardMarkup(keyboard),
            )
        elif update.callback_query:
            # 从回调按钮触发
            await update.callback_query.answer()
            await update.callback_query.edit_message_text(
                f"{_(user_id, 'welcome')}\n{_(user_id, 'balance', balance=balance)}\n{_(user_id, 'price')}\n\n{_(user_id, 'text1')}:",
                reply_markup=InlineKeyboardMarkup(keyboard),
            )
        return MAIN_MENU



    # ── 处理主菜单按钮点击 ──
    async def handle_main_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
        query = update.callback_query
        await query.answer()
        
        user_id = str(query.from_user.id)
        
        if query.data == "api_apply":
            # 进入API申请流程
            user = db.get_user(user_id)
            balance = user[3] if user else 0.0
            
            keyboard = [
                [InlineKeyboardButton(_(user_id, 'quantity_1'), callback_data="quantity_1")],
                [InlineKeyboardButton(_(user_id, 'quantity_5'), callback_data="quantity_5")],
                [InlineKeyboardButton(_(user_id, 'back_to_menu'), callback_data="back_to_menu")]
            ]
            
            await query.edit_message_text(
                _(user_id, 'select_quantity', balance=balance),
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
            return SELECT_QUANTITY
        
        elif query.data == "personal_center":
            # 进入个人中心
            user = db.get_user(user_id)
            if user:
                telegram_id, username, balance, total_recharge, total_applications = user[1], user[2], user[3], user[4], user[5]
                keyboard = [[InlineKeyboardButton(_(user_id, 'back_to_menu'), callback_data="back_to_menu")]]
                await query.edit_message_text(
                    _(user_id, 'personal_info', tg_id=telegram_id, username=username or 'N/A', balance=balance, recharge=total_recharge, applications=total_applications),
                    reply_markup=InlineKeyboardMarkup(keyboard)
                )
                return PERSONAL_CENTER
        
        elif query.data == "recharge":
            # 进入充值页面
            keyboard = [
                [InlineKeyboardButton(_(user_id, 'enter_amount'), callback_data="enter_amount")],
                [InlineKeyboardButton(_(user_id, 'back_to_menu'), callback_data="back_to_menu")]
            ]
            await query.edit_message_text(
                f"{_(user_id, 'recharge_title')}\n\n{_(user_id, 'recharge_promo')}",
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
            return RECHARGE
        
        elif query.data == "card_code":
            # 进入卡密兑换页面
            keyboard = [[InlineKeyboardButton(_(user_id, 'back_to_menu'), callback_data="back_to_menu")]]
            await query.edit_message_text(
                _(user_id, 'card_code_title'),
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
            return CARD_CODE
        
        elif query.data == "help":
            # 进入帮助说明页面
            keyboard = [[InlineKeyboardButton(_(user_id, 'back_to_menu'), callback_data="back_to_menu")]]
            await query.edit_message_text(
                _(user_id, 'help_text'),
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
            return HELP
        
        elif query.data == "contact_support":
            # 联系客服
            keyboard = [[InlineKeyboardButton(_(user_id, 'back_to_menu'), callback_data="back_to_menu")]]
            await query.edit_message_text(
                _(user_id, 'contact_text'),
                reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(_(user_id, 'contact_support'), url="https://t.me/@r7tg1")], [InlineKeyboardButton(_(user_id, 'back_to_menu'), callback_data="back_to_menu")]])
            )
            return CONTACT_SUPPORT
        
        elif query.data == "language":
            # 进入语言设置
            keyboard = [
                [InlineKeyboardButton(_(user_id, 'chinese'), callback_data="lang_zh")],
                [InlineKeyboardButton(_(user_id, 'english'), callback_data="lang_en")],
                [InlineKeyboardButton(_(user_id, 'back_to_menu'), callback_data="back_to_menu")]
            ]
            await query.edit_message_text(
                _(user_id, 'select_language'),
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
            return LANGUAGE_SETTINGS
        
        elif query.data.startswith("lang_"):
            # 设置语言
            language = query.data.split("_")[1]
            set_user_language(user_id, language)
            await query.edit_message_text(
                f"✅ 语言已设置为 {_(user_id, 'chinese') if language == 'zh' else _(user_id, 'english')}"
            )
            # 返回主菜单
            await cmd_start(update, context)
            return MAIN_MENU
        
        elif query.data == "back_to_menu":
            # 返回主菜单
            await cmd_start(update, context)
            return MAIN_MENU

    # ── 处理申请数量选择 ──
    async def handle_quantity_selection(update: Update, context: ContextTypes.DEFAULT_TYPE):
        query = update.callback_query
        await query.answer()
        
        user_id = str(query.from_user.id)
        user = db.get_user(user_id)
        balance = user[3] if user else 0.0
        
        if query.data == "quantity_1":
            # 申请1个
            price = PRICE_1
            if balance < price:
                # 余额不足
                keyboard = [
                    [InlineKeyboardButton(_(user_id, 'recharge_amount', amount=price), callback_data=f"recharge_{price}")],
                    [InlineKeyboardButton(_(user_id, 'reselect_quantity'), callback_data="back_to_quantity")]
                ]
                await query.edit_message_text(
                    _(user_id, 'insufficient_balance', balance=balance, count=1, price=price, needed=price - balance),
                    reply_markup=InlineKeyboardMarkup(keyboard)
                )
            else:
                # 余额充足，扣除费用
                db.update_balance(user_id, -price)
                context.user_data["application_count"] = 1
                await query.edit_message_text(
                    _(user_id, 'enter_phone')
                )
                return ENTER_PHONE
        
        elif query.data == "quantity_5":
            # 申请5个
            price = PRICE_5
            if balance < price:
                # 余额不足
                keyboard = [
                    [InlineKeyboardButton(_(user_id, 'recharge_amount', amount=price), callback_data=f"recharge_{price}")],
                    [InlineKeyboardButton(_(user_id, 'reselect_quantity'), callback_data="back_to_quantity")]
                ]
                await query.edit_message_text(
                    _(user_id, 'insufficient_balance', balance=balance, count=5, price=price, needed=price - balance),
                    reply_markup=InlineKeyboardMarkup(keyboard)
                )
            else:
                # 余额充足，扣除费用
                db.update_balance(user_id, -price)
                context.user_data["application_count"] = 5
                await query.edit_message_text(
                    _(user_id, 'enter_phone')
                )
                return ENTER_PHONE
        
        elif query.data == "back_to_quantity":
            # 返回数量选择
            user = db.get_user(user_id)
            balance = user[3] if user else 0.0
            
            keyboard = [
                [InlineKeyboardButton(_(user_id, 'quantity_1'), callback_data="quantity_1")],
                [InlineKeyboardButton(_(user_id, 'quantity_5'), callback_data="quantity_5")],
                [InlineKeyboardButton(_(user_id, 'back_to_menu'), callback_data="back_to_menu")]
            ]
            
            await query.edit_message_text(
                _(user_id, 'select_quantity', balance=balance),
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
            return SELECT_QUANTITY
        
        elif query.data.startswith("recharge_"):
            # 进入充值页面
            keyboard = [
                [InlineKeyboardButton(_(user_id, 'enter_amount'), callback_data="enter_amount")],
                [InlineKeyboardButton(_(user_id, 'back_to_menu'), callback_data="back_to_menu")]
            ]
            await query.edit_message_text(
                f"{_(user_id, 'recharge_title')}\n\n{_(user_id, 'recharge_promo')}",
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
            return RECHARGE



    # ── 未在会话中时收到普通消息，自动进入流程 ──
    async def auto_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = str(update.effective_user.id)
        
        # 确保用户存在于数据库中
        user = db.get_user(user_id)
        if not user:
            db.create_user(user_id, update.effective_user.username)
        
        # 获取用户余额
        user = db.get_user(user_id)
        balance = user[3] if user else 0.0
        
        # 构建主菜单
        keyboard = [
            [InlineKeyboardButton(_(user_id, 'api_apply'), callback_data="api_apply")],
            [InlineKeyboardButton(_(user_id, 'personal_center'), callback_data="personal_center"), InlineKeyboardButton(_(user_id, 'recharge'), callback_data="recharge")],
            [InlineKeyboardButton(_(user_id, 'card_code'), callback_data="card_code"), InlineKeyboardButton(_(user_id, 'help'), callback_data="help")],
            [InlineKeyboardButton(_(user_id, 'contact_support'), callback_data="contact_support")],
            [InlineKeyboardButton(_(user_id, 'language'), callback_data="language")]
        ]

        await update.message.reply_text(
            f"{_(user_id, 'welcome')}\n{_(user_id, 'balance', balance=balance)}\n{_(user_id, 'price')}",
            reply_markup=InlineKeyboardMarkup(keyboard),
        )
        return MAIN_MENU

    # ── 收到手机号 ──
    async def handle_phone(update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = str(update.effective_user.id)
        # 处理手机号
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

            # 更新数据库，增加申请次数
            user_id = str(update.effective_user.id)
            db.increment_application_count(user_id)
            
            # 保存API申请记录
            db.add_api_application(user_id, phone, result.get('api_id'), result.get('api_hash'))

            # 发送文字结果
            await update.message.reply_text(
                _(user_id, 'register_success', api_id=result.get('api_id'), api_hash=result.get('api_hash'))
            )

            # 发送 txt 文件（附带广告）
            caption = "API 信息文件"
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
            await update.message.reply_text(f"❌ 发生错误: {e}")
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
        await update.message.reply_text(
            "📋 主菜单已显示，点击下方按钮开始。",
            reply_markup=reply_markup
        )

    # ── /cancel ──
    async def cmd_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = str(update.effective_user.id)
        reg = context.user_data.get("registrar")
        if reg:
            await reg.close()
        context.user_data.clear()
        await update.message.reply_text(_(user_id, 'operation_canceled'))
        return ConversationHandler.END

    # ── 处理充值相关操作 ──
    async def handle_recharge(update: Update, context: ContextTypes.DEFAULT_TYPE):
        query = update.callback_query
        await query.answer()
        
        user_id = str(query.from_user.id)
        
        if query.data == "enter_amount":
            # 进入输入金额页面
            keyboard = [[InlineKeyboardButton(_(user_id, 'cancel'), callback_data="cancel_recharge")]]
            await query.edit_message_text(
                _(user_id, 'custom_amount'),
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
            return ENTER_AMOUNT
        
        elif query.data.startswith("recharge_"):
            # 进入充值页面
            keyboard = [
                [InlineKeyboardButton(_(user_id, 'enter_amount'), callback_data="enter_amount")],
                [InlineKeyboardButton(_(user_id, 'back_to_menu'), callback_data="back_to_menu")]
            ]
            await query.edit_message_text(
                f"{_(user_id, 'recharge_title')}\n\n{_(user_id, 'recharge_promo')}",
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
            return RECHARGE
        
        elif query.data == "cancel_recharge":
            # 取消充值
            await cmd_start(update, context)
            return MAIN_MENU

    # ── 处理输入金额 ──
    async def handle_enter_amount(update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = str(update.effective_user.id)
        amount_text = update.message.text.strip()
        
        try:
            amount = float(amount_text)
            if 1 <= amount <= 9999:
                # 检查是否有充值优惠
                if amount >= BONUS_THRESHOLD:
                    amount_with_bonus = amount * (1 + BONUS_RATE)
                    await update.message.reply_text(_(user_id, 'recharge_bonus', amount=amount_with_bonus))
                
                context.user_data["recharge_amount"] = amount
                
                # 进入选择支付方式页面
                # keyboard = [
                #     [InlineKeyboardButton(_(user_id, 'alipay'), callback_data="alipay")],
                #     [InlineKeyboardButton(_(user_id, 'usdt'), callback_data="usdt")],
                #     [InlineKeyboardButton(_(user_id, 'trx'), callback_data="trx")],
                #     [InlineKeyboardButton(_(user_id, 'reenter_amount'), callback_data="enter_amount")],
                #     [InlineKeyboardButton(_(user_id, 'back_to_menu'), callback_data="back_to_menu")]
                # ]

                keyboard = [
                    [InlineKeyboardButton(_(user_id, 'usdt'), callback_data="usdt")],
                    [InlineKeyboardButton(_(user_id, 'reenter_amount'), callback_data="enter_amount")],
                    [InlineKeyboardButton(_(user_id, 'back_to_menu'), callback_data="back_to_menu")]
                ]
                await update.message.reply_text(
                    _(user_id, 'select_payment', amount=amount),
                    reply_markup=InlineKeyboardMarkup(keyboard)
                )
                return SELECT_PAYMENT
            else:
                await update.message.reply_text(_(user_id, 'amount_range_error'))
                return ENTER_AMOUNT
        except ValueError:
            await update.message.reply_text(_(user_id, 'amount_format_error'))
            return ENTER_AMOUNT

    # ── 处理支付方式选择 ──
    async def handle_payment_selection(update: Update, context: ContextTypes.DEFAULT_TYPE):
        query = update.callback_query
        await query.answer()
        
        user_id = str(query.from_user.id)
        amount = context.user_data.get("recharge_amount", 0)
        # 生成数字日期格式的订单号，精确到毫秒
        order_id = datetime.datetime.now().strftime('%Y%m%d%H%M%S%f')[:-3]
        
        # 取消用户的所有未支付订单
        db.cancel_pending_orders(user_id)
        
        # 创建订单
        db.create_order(order_id, user_id, amount, query.data)
        
        if query.data == "alipay":
            # 支付宝扫码页面
            keyboard = [
                [InlineKeyboardButton(_(user_id, 'check_payment'), callback_data="check_payment")],
                [InlineKeyboardButton(_(user_id, 'select_other'), callback_data="enter_amount")],
                [InlineKeyboardButton(_(user_id, 'back_to_menu'), callback_data="back_to_menu")]
            ]
            await query.edit_message_text(
                _(user_id, 'alipay_payment', amount=amount, rmb=amount * 7, order_id=order_id),
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
            return ALIPAY_PAYMENT
        
        elif query.data == "usdt":
            # USDT 充值页面 (Okay 支付)
            # 使用 OkayPay 类生成支付链接
            pay_url, okpay_order_id = okay_pay.get_pay_link(order_id, amount, OKPAY_PAYED, "Telegram API")
            
            keyboard = [
                [InlineKeyboardButton(_(user_id, 'select_other'), callback_data="enter_amount")],
                [InlineKeyboardButton(_(user_id, 'back_to_menu'), callback_data="back_to_menu")]
            ]
            
            # 更新 USDT 支付信息，使用 Okay 支付
            if pay_url:
                usdt_payment_text = f"💲 USDT充值\n产品: 自定义充值\n金额: {amount:.2f}u\n订单号: {order_id}\n\n提示:请点击以下链接跳转到 Okay 机器人进行付款\n[使用 Okay 支付]({pay_url})\n\n订单24小时有效"
            else:
                # 如果生成支付链接失败，显示备用信息
                trc20_address = TRC20_ADDRESS or 'TXXXXXXXXXXXXXXXXXXXXXXXXXX'
                usdt_payment_text = f"💲 USDT充值\n产品: 自定义充值\n金额: {amount:.2f}u\n订单号: {order_id}\n收款地址: TRC20: {trc20_address}\n\n提示:请按照上述地址转账，订单24小时有效"
            
            await query.edit_message_text(
                usdt_payment_text,
                reply_markup=InlineKeyboardMarkup(keyboard),
                parse_mode="Markdown"
            )
            return USDT_PAYMENT
        
        elif query.data == "trx":
            # TRX充值页面
            keyboard = [
                [InlineKeyboardButton(_(user_id, 'select_other'), callback_data="enter_amount")],
                [InlineKeyboardButton(_(user_id, 'back_to_menu'), callback_data="back_to_menu")]
            ]
            trc20_address = TRC20_ADDRESS or 'TXXXXXXXXXXXXXXXXXXXXXXXXXX'
            trx_payment_text = f"⚡ TRX充值\n产品: 自定义充值\n金额: {amount:.2f}u\n订单号: {order_id}\n收款地址: TRC20: {trc20_address}\n\n提示:转账后系统自动监听,到账既发通知,无需联系客服\n请务必按照上方金额转账,订单24小时有效"
            await query.edit_message_text(
                trx_payment_text,
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
            return TRX_PAYMENT

    # ── 处理卡密兑换 ──
    async def handle_card_code(update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = str(update.effective_user.id)
        code = update.message.text.strip()
        
        if code == "/cancel":
            await update.message.reply_text(_(user_id, 'operation_canceled'))
            return ConversationHandler.END
        
        # 验证卡密
        code_info = db.get_code(code)
        if not code_info:
            await update.message.reply_text(_(user_id, 'invalid_code'))
            return CARD_CODE
        
        if code_info[3] != "unused":
            await update.message.reply_text(_(user_id, 'code_used'))
            return CARD_CODE
        
        # 使用卡密
        if db.use_code(code, user_id):
            # 更新余额
            value = code_info[2]
            db.update_balance(user_id, value)
            db.update_total_recharge(user_id, value)
            
            await update.message.reply_text(_(user_id, 'code_success', value=value))
            return ConversationHandler.END
        else:
            await update.message.reply_text(_(user_id, 'code_failed'))
            return CARD_CODE

    async def post_init(application):
        from telegram import BotCommand,MenuButtonCommands
        commands = [
            BotCommand("start", "开启机器人"),
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
            SELECT_QUANTITY: [
                CallbackQueryHandler(handle_quantity_selection)
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
            ENTER_AMOUNT: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, handle_enter_amount),
                CallbackQueryHandler(handle_recharge)
            ],
            SELECT_PAYMENT: [
                CallbackQueryHandler(handle_payment_selection)
            ],
            ALIPAY_PAYMENT: [
                CallbackQueryHandler(handle_main_menu)
            ],
            USDT_PAYMENT: [
                CallbackQueryHandler(handle_main_menu)
            ],
            TRX_PAYMENT: [
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
            CONTACT_SUPPORT: [
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

    async def main():
        """启动机器人"""
        logger.info("Bot 已启动，等待消息...")
        print("Bot 已启动！按 Ctrl+C 停止。")

        await app.initialize()
        await app.start()
        await app.updater.start_polling()

        try:
            while True:
                await asyncio.sleep(1)
        except (KeyboardInterrupt, SystemExit):
            pass
        finally:
            await app.updater.stop()
            await app.stop()

    # 启动机器人
    await main()

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_bot())
