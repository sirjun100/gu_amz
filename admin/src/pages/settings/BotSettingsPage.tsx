import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Settings } from 'lucide-react'
import { deleteTrc20Qr, fetchBotConfig, putBotConfig, uploadTrc20Qr } from '@/api/tgApi'
import type { BotConfig } from '@/types/tg'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/utils/cn'
import { getApiBase } from '@/utils/apiBase'

const emptyConfig: BotConfig = {
  APPLY_PACK_100_PRICE: '',
  APPLY_PACK_10_PRICE: '',
  APPLY_PACK_1_PRICE: '',
  APPLY_PACK_50_PRICE: '',
  TRC20_ADDRESS: '',
  OKPAY_ID: '',
  OKPAY_TOKEN: '',
  OKPAY_PAYED: 'USDT',
  OKPAY_RETURN_URL: '',
  BOT_CUSTOM_MENU_JSON: '[]',
  TRON_MONITOR_ENABLED: '0',
  TRONGRID_API_KEY: '',
  TRON_API_BASE: 'https://api.trongrid.io',
  TRON_USDT_CONTRACT: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  TRON_POLL_SECONDS: '45',
  TRON_MIN_CONFIRMATIONS: '0',
}

type CustomMenuRow = { text: string; url: string }

const MENU_SLOTS = 6

function parseMenuRows(jsonStr: string): CustomMenuRow[] {
  try {
    const a = JSON.parse(jsonStr || '[]') as unknown
    if (!Array.isArray(a)) return Array.from({ length: MENU_SLOTS }, () => ({ text: '', url: '' }))
    const rows: CustomMenuRow[] = []
    for (const x of a.slice(0, MENU_SLOTS)) {
      if (x && typeof x === 'object' && 'text' in x && 'url' in x) {
        rows.push({
          text: String((x as { text: unknown }).text ?? ''),
          url: String((x as { url: unknown }).url ?? ''),
        })
      }
    }
    while (rows.length < MENU_SLOTS) rows.push({ text: '', url: '' })
    return rows.slice(0, MENU_SLOTS)
  } catch {
    return Array.from({ length: MENU_SLOTS }, () => ({ text: '', url: '' }))
  }
}

function compactMenuRows(rows: CustomMenuRow[]): CustomMenuRow[] {
  return rows
    .map((r) => ({ text: r.text.trim(), url: r.url.trim() }))
    .filter((r) => r.text && r.url)
    .slice(0, MENU_SLOTS)
}

export function BotSettingsPage() {
  const qc = useQueryClient()
  const { addToast } = useUIStore()
  const [form, setForm] = useState<BotConfig>(emptyConfig)
  const [customMenuRows, setCustomMenuRows] = useState<CustomMenuRow[]>(() =>
    parseMenuRows('[]')
  )
  const [qrPreview, setQrPreview] = useState<string | null>(null)
  const [qrUploading, setQrUploading] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'bot-config'],
    queryFn: fetchBotConfig,
  })

  useEffect(() => {
    if (data) {
      setForm({ ...emptyConfig, ...data })
      setCustomMenuRows(parseMenuRows(data.BOT_CUSTOM_MENU_JSON || '[]'))
    }
  }, [data])

  const menuJsonForSave = useMemo(
    () => JSON.stringify(compactMenuRows(customMenuRows)),
    [customMenuRows]
  )

  const loadQrPreview = useCallback(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setQrPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      return
    }
    fetch(`${getApiBase()}/admin/trc20-qr`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((blob) => {
        setQrPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return URL.createObjectURL(blob)
        })
      })
      .catch(() => {
        setQrPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return null
        })
      })
  }, [])

  useEffect(() => {
    if (data) loadQrPreview()
  }, [data, loadQrPreview])

  const onQrFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setQrUploading(true)
    try {
      await uploadTrc20Qr(f)
      addToast({ message: '二维码已上传', type: 'success' })
      loadQrPreview()
    } catch {
      addToast({ message: '上传失败', type: 'error' })
    } finally {
      setQrUploading(false)
    }
  }

  const onQrDelete = async () => {
    try {
      await deleteTrc20Qr()
      addToast({ message: '已删除二维码', type: 'success' })
      loadQrPreview()
    } catch {
      addToast({ message: '删除失败', type: 'error' })
    }
  }

  const save = useMutation({
    mutationFn: () => putBotConfig({ ...form, BOT_CUSTOM_MENU_JSON: menuJsonForSave }),
    onSuccess: () => {
      addToast({ message: '配置已保存', type: 'success' })
      qc.invalidateQueries({ queryKey: ['admin', 'bot-config'] })
    },
    onError: () => addToast({ message: '保存失败', type: 'error' }),
  })

  const field = (key: keyof BotConfig, label: string, type: 'text' | 'number' = 'text', step?: string) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
      <input
        type={type}
        step={step}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className={cn(
          'w-full max-w-md px-3 py-2 rounded-lg border text-sm',
          'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600',
          'text-slate-900 dark:text-white'
        )}
      />
    </div>
  )

  if (isLoading && !data) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">系统设置</h1>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 sm:p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">
          购买套餐价格（u）
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          对应次数：1 / 10 / 50 / 100 次。机器人内展示与下单均读取此处。
        </p>
        {field('APPLY_PACK_1_PRICE', '1 次套餐价格 (u)', 'number', '0.01')}
        {field('APPLY_PACK_10_PRICE', '10 次套餐价格 (u)', 'number', '0.01')}
        {field('APPLY_PACK_50_PRICE', '50 次套餐价格 (u)', 'number', '0.01')}
        {field('APPLY_PACK_100_PRICE', '100 次套餐价格 (u)', 'number', '0.01')}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 sm:p-5 shadow-sm space-y-6">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">
          机器人 / 支付
        </h2>

        <div className="space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            主菜单在「我的语言」下方展示，最多 6 条；按钮文案与链接均可自定义（如联系客服填按钮文字 + t.me 或 https 链接）。机器人排版：文案超过 6
            个字单独占一行；不超过 6 个字的相邻两项会并排一行（若下一项超过 6 个字则当前项单独一行）。
          </p>
          <div className="space-y-3">
            {customMenuRows.map((row, idx) => (
              <div
                key={idx}
                className="grid gap-2 sm:grid-cols-2 sm:gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-900/40"
              >
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    按钮文字 #{idx + 1}
                  </label>
                  <input
                    type="text"
                    value={row.text}
                    maxLength={64}
                    placeholder="例如：联系客服"
                    onChange={(e) =>
                      setCustomMenuRows((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, text: e.target.value } : r))
                      )
                    }
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border text-sm',
                      'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600',
                      'text-slate-900 dark:text-white'
                    )}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    链接 #{idx + 1}
                  </label>
                  <input
                    type="text"
                    value={row.url}
                    placeholder="https://t.me/username 或 @username"
                    onChange={(e) =>
                      setCustomMenuRows((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, url: e.target.value } : r))
                      )
                    }
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border text-sm',
                      'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600',
                      'text-slate-900 dark:text-white'
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">TRC20 收款</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            链上转账时使用：机器人支付页会展示收款地址；若上传二维码，会一并发送给用户。修改后请点击页面底部「保存全部配置」保存地址；二维码上传后立即生效。
          </p>
          {field('TRC20_ADDRESS', 'TRC20 收款地址')}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">收款二维码</label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              支持 png / jpg / webp，最大 5MB。
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={qrUploading}
                onChange={onQrFile}
                className="text-sm text-slate-600 dark:text-slate-300 max-w-full"
              />
              <button
                type="button"
                onClick={() => void onQrDelete()}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                删除二维码
              </button>
            </div>
            {qrPreview ? (
              <img
                src={qrPreview}
                alt="TRC20 收款二维码"
                className="mt-3 max-w-xs rounded-lg border border-slate-200 dark:border-slate-600"
              />
            ) : null}
          </div>
          <div className="pt-4 space-y-3 border-t border-dashed border-slate-200 dark:border-slate-600">
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">链上自动确认（TronGrid）</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              填 1 / true 开启后，机器人将轮询收款地址的 USDT(TRC20) 入账，金额需与订单「精确金额」一致。建议填写 TronGrid API Key；确认数填 0
              时仅依赖接口的已确认交易；若列表返回含区块高度，可设为 19 更稳妥。
            </p>
            {field('TRON_MONITOR_ENABLED', '开启链上监听 (1 / true / 0 / false)', 'text')}
            {field('TRONGRID_API_KEY', 'TronGrid API Key（可选，提高限额）')}
            {field('TRON_API_BASE', 'TronGrid API 根地址')}
            {field('TRON_USDT_CONTRACT', 'USDT TRC20 合约（主网默认已填）')}
            {field('TRON_POLL_SECONDS', '轮询间隔（秒，≥15）', 'number')}
            {field('TRON_MIN_CONFIRMATIONS', '最小确认数（0=不校验深度；19 需接口返回区块号）', 'number')}
          </div>
        </div>

        <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">OKPay 在线支付</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            商户信息存数据库，机器人下单时读取；若未配置或创建支付链接失败，则仅展示上方 TRC20 收款方式。
          </p>
          {field('OKPAY_ID', 'OKPay 商户 ID')}
          {field('OKPAY_TOKEN', 'OKPay Token')}
          {field('OKPAY_PAYED', 'OKPay 支付币种', 'text')}
          {field('OKPAY_RETURN_URL', 'OKPay 回跳 URL（支付完成跳转）')}
        </div>
      </div>

      <button
        type="button"
        disabled={save.isPending}
        onClick={() => save.mutate()}
        className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        保存全部配置
      </button>
    </div>
  )
}
