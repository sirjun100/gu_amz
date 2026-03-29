export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface MeResponse {
  id: number
  username: string
  is_admin: boolean
}

export interface StatsResponse {
  total_users: number
  total_orders: number
  total_codes: number
  total_applications: number
}

export interface Paginated<T = Record<string, unknown>> {
  items: T[]
  page: number
  per_page: number
  total: number
  total_pages: number
}

export interface BotConfig {
  APPLY_PACK_100_PRICE: string
  APPLY_PACK_10_PRICE: string
  APPLY_PACK_1_PRICE: string
  APPLY_PACK_50_PRICE: string
  TRC20_ADDRESS: string
  OKPAY_ID: string
  OKPAY_TOKEN: string
  OKPAY_PAYED: string
  OKPAY_RETURN_URL: string
  /** JSON array: { text, url }[] max 6 */
  BOT_CUSTOM_MENU_JSON: string
  TRON_MONITOR_ENABLED: string
  TRONGRID_API_KEY: string
  TRON_API_BASE: string
  TRON_USDT_CONTRACT: string
  TRON_POLL_SECONDS: string
  TRON_MIN_CONFIRMATIONS: string
}

export type TgUserRow = {
  id: number
  telegram_id: string
  username: string | null
  balance: number
  total_recharge: number
  total_applications: number
  apply_credits: number
  language: string
  created_at: string
}

export type OrderRow = {
  id: number
  order_id: string
  telegram_id: string
  amount: number
  payment_method: string
  credit_pack: number | null
  status: string
  created_at: string
  completed_at: string | null
}

export type CodeRow = {
  id: number
  code: string
  credits: number
  status: string
  created_at: string
  used_at: string | null
  used_by: string | null
}

export type ApiApplicationRow = {
  id: number
  telegram_id: string
  phone: string
  api_id: string
  api_hash: string
  created_at: string
}
