export type MeResponse = {
  id: number
  username: string
  is_admin: boolean
}

export type DeviceOption = {
  device_id: string
  alias: string | null
  last_seen_at: string | null
}

/** 设备截图上传策略（管理端可配，心跳/领任务下发客户端） */
export type ScreenshotUploadPolicy = 'all' | 'failed_only' | 'none'

export type DeviceRow = {
  id: number
  device_id: string
  alias: string | null
  last_seen_at: string | null
  created_at: string | null
  screenshot_upload_policy?: ScreenshotUploadPolicy | string
  /** status=pending 按 task_type 计数，仅本页设备；无键表示 0 */
  pending_tasks?: Record<string, number>
}

export type KeywordRow = {
  id: number
  keyword: string
  created_at: string | null
}

export type AddressRow = {
  id: number
  recipient_name: string | null
  state: string | null
  city: string | null
  address_line1: string | null
  address_line2: string | null
  zip_code: string | null
  phone: string | null
  full_line: string | null
  created_at: string | null
}

export type TargetAsinRow = {
  id: number
  asin: string
  note: string | null
  total_clicks: number
  today_clicks: number
  /** 服务端用于「今日」的日历日，与 today_clicks 对齐 */
  stats_date: string | null
  created_at: string | null
  updated_at: string | null
}

/** 客户端 ASIN 点击上报落库的一条明细 */
export type AsinClickRecordRow = {
  id: number
  asin: string
  keyword: string
  device_id: string | null
  created_at: string | null
}

/** 手机接码库一行（任务创建后 consumed_at / register_task_id 有值） */
export type RegisterPhonePoolRow = {
  id: number
  phone: string
  sms_link: string
  consumed_at: string | null
  register_task_id: number | null
  created_at: string | null
}

/** 邮箱接码库一行；列表接口不返回明文密码，仅 masked */
export type RegisterEmailPoolRow = {
  id: number
  email: string
  code_link: string
  email_login_password_masked?: string
  consumed_at: string | null
  register_task_id: number | null
  created_at: string | null
}

export type RegisterCodePoolsStats = {
  phone_available: number
  phone_total: number
  email_available: number
  email_total: number
}

/** 亚马逊账号快照（管理端列表含当前 TOTP，不含密钥） */
export type AmazonAccountRow = {
  id: number
  task_id: number
  device_id: string | null
  phone: string | null
  account_username: string | null
  account_password: string | null
  env_name: string | null
  registration_json: string | null
  address_set_at: string | null
  totp_set_at: string | null
  totp_image_stored_name: string | null
  totp_image_url?: string | null
  totp_code_now: string | null
  address_configured?: boolean
  totp_configured?: boolean
  created_at: string | null
  updated_at: string | null
}

/** 人工验证码协助队列项 */
export type CaptchaAssistPendingItem = {
  id: number
  task_id: number
  device_id: string | null
  image_stored_name: string | null
  img_width: number
  img_height: number
  status: string
  created_at: string | null
}

export type PaginatedRows<T = Record<string, unknown>> = {
  items: T[]
  page: number
  per_page: number
  total: number
  total_pages: number
}

export type TaskRow = {
  id: number
  device_id: string | null
  device_alias?: string | null
  task_type: string
  status: string
  /** 任务类型相关参数（点击：keyword、res_folder_name；注册：phone、address_snapshot 等） */
  params: Record<string, unknown>
  failure_detail: string | null
  retry_count: number
  created_at: string | null
  updated_at: string | null
  started_at: string | null
  finished_at: string | null
  /** 客户端上报日志中的环境名（AMZ_REPORT.environment），可选 */
  environment?: string | null
}

export type PaginatedTasks = {
  items: TaskRow[]
  page: number
  per_page: number
  total: number
  total_pages: number
}

export type TaskLogRow = {
  id: number
  body: string
  created_at: string | null
}

export type TaskScreenshotRow = {
  id: number
  stored_name: string
  /** 客户端上传时传入的说明（过程截图名称） */
  description?: string | null
  created_at: string | null
}

export type TaskCenterDetail = {
  task: TaskRow
  logs: TaskLogRow[]
  screenshots: TaskScreenshotRow[]
}

export type AdminSettings = {
  task_retention_days: number
}

/** 任务数据归档表一行；content 为服务端解析后的 JSON */
export type TaskSavedRecordRow = {
  id: number
  task_type: string
  content: Record<string, unknown>
  source_task_id: number | null
  device_id: string | null
  created_at: string | null
}
