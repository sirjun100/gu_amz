import axios from 'axios'
import { del, get, patch, post, put } from '@/utils/request'
import { getApiBase } from '@/utils/apiBase'
import type {
  MeResponse,
  PaginatedTasks,
  PaginatedRows,
  TaskCenterDetail,
  DeviceOption,
  DeviceRow,
  KeywordRow,
  AddressRow,
  TargetAsinRow,
  AsinClickRecordRow,
  AsinKeywordClickStatRow,
  RegisterPhonePoolRow,
  RegisterEmailPoolRow,
  RegisterCodePoolsStats,
  AdminSettings,
  TaskSavedRecordRow,
  ScreenshotUploadPolicy,
  AmazonAccountRow,
  CaptchaAssistPendingItem,
} from '@/types/amz'

export type { MeResponse, PaginatedTasks, TaskCenterDetail, DeviceOption, AddressRow }

export async function loginToken(username: string, password: string) {
  const params = new URLSearchParams()
  params.append('username', username)
  params.append('password', password)
  const { data } = await axios.post<{ access_token: string; token_type: string }>(
    `${getApiBase()}/auth/token`,
    params,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 30000 }
  )
  return data
}

export const fetchMe = () => get<MeResponse>('/auth/me')

export const fetchDeviceOptions = () => get<{ items: DeviceOption[] }>('/admin/devices/options')

export function fetchDevicesPage(page: number, perPage = 30, q?: string) {
  const qs = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (q) qs.set('q', q)
  return get<PaginatedRows<DeviceRow>>(`/admin/devices?${qs}`)
}

export function patchDeviceAlias(deviceId: string, alias: string | null) {
  const enc = encodeURIComponent(deviceId)
  return patch<{ ok: boolean }>(`/admin/devices/${enc}/alias`, { alias })
}

export function patchDeviceScreenshotUploadPolicy(deviceId: string, screenshot_upload_policy: ScreenshotUploadPolicy) {
  const enc = encodeURIComponent(deviceId)
  return patch<{ ok: boolean; screenshot_upload_policy: string }>(
    `/admin/devices/${enc}/screenshot-upload-policy`,
    { screenshot_upload_policy }
  )
}

export function fetchKeywordsPage(page: number, perPage = 30, q?: string) {
  const qs = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (q) qs.set('q', q)
  return get<PaginatedRows<KeywordRow>>(`/admin/keywords?${qs}`)
}

export async function importKeywordsTxt(file: File) {
  const token = localStorage.getItem('auth_token')
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${getApiBase()}/admin/keywords/import`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  if (!res.ok) throw new Error('导入失败')
  return res.json() as Promise<{ ok: boolean; imported: number }>
}

export function deleteKeyword(id: number) {
  return del<{ ok: boolean }>(`/admin/keywords/${id}`)
}

export function postBatchClick(body: {
  task_type: string
  keyword: string
  /** 与关键词 1:1；客户端 res 下资源文件夹名 */
  res_folder_name: string
  mode: 'manual' | 'smart'
  device_ids: string[]
  per_device_counts: Record<string, number>
  total_count: number
  /** 默认 false：仅成功结案时写入归档 */
  save_data_record?: boolean
}) {
  return post<{ ok: boolean; created: number }>('/admin/tasks/batch-click', body)
}

export function postBatchRegister(body: {
  mode: 'manual' | 'smart'
  device_ids: string[]
  per_device_counts: Record<string, number>
  /** 智能均分时必填：创建任务条数（每条消耗手机接码库 1 条；勾选绑定邮箱时再消耗邮箱库 1 条） */
  total_count: number
  /** 是否为每个任务绑定一条邮箱接码库记录 */
  bind_email?: boolean
  /** 默认 true */
  save_data_record?: boolean
}) {
  return post<{ ok: boolean; created: number }>('/admin/tasks/batch-register', body)
}

export function fetchRegisterCodePoolsStats() {
  return get<RegisterCodePoolsStats>('/admin/register-code-pools/stats')
}

export function importRegisterPhonePool(text: string) {
  return post<{ ok: boolean; imported: number }>('/admin/register-phone-pool/import', { text })
}

export function importRegisterEmailPool(text: string) {
  return post<{ ok: boolean; imported: number }>('/admin/register-email-pool/import', { text })
}

export function fetchRegisterPhonePoolPage(page: number, perPage = 30, q?: string) {
  const qs = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (q) qs.set('q', q)
  return get<PaginatedRows<RegisterPhonePoolRow>>(`/admin/register-phone-pool?${qs}`)
}

export function deleteRegisterPhonePool(ids: number[]) {
  return post<{ ok: boolean; deleted: number }>('/admin/register-phone-pool/delete', { ids })
}

export function clearRegisterPhonePool() {
  return post<{ ok: boolean; deleted: number }>('/admin/register-phone-pool/clear')
}

export function fetchRegisterEmailPoolPage(page: number, perPage = 30, q?: string) {
  const qs = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (q) qs.set('q', q)
  return get<PaginatedRows<RegisterEmailPoolRow>>(`/admin/register-email-pool?${qs}`)
}

export function deleteRegisterEmailPool(ids: number[]) {
  return post<{ ok: boolean; deleted: number }>('/admin/register-email-pool/delete', { ids })
}

export function clearRegisterEmailPool() {
  return post<{ ok: boolean; deleted: number }>('/admin/register-email-pool/clear')
}

export function fetchAmazonAccountsPage(page: number, perPage = 30, q?: string) {
  const qs = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (q) qs.set('q', q)
  return get<PaginatedRows<AmazonAccountRow>>(`/admin/amazon-accounts?${qs}`)
}

export function deleteAmazonAccount(id: number) {
  return del<{ ok: boolean }>(`/admin/amazon-accounts/${id}`)
}

export function deleteAmazonAccounts(ids: number[]) {
  return post<{ ok: boolean; deleted: number }>('/admin/amazon-accounts/delete', { ids })
}

export function clearAmazonAccounts() {
  return post<{ ok: boolean; deleted: number }>('/admin/amazon-accounts/clear')
}

export async function fetchAmazonAccountTotpImageBlob(accountId: number) {
  const token = localStorage.getItem('auth_token')
  const res = await fetch(`${getApiBase()}/admin/amazon-accounts/${accountId}/totp-image`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.blob()
}

export function fetchCaptchaAssistPending() {
  return get<{ items: CaptchaAssistPendingItem[] }>('/admin/captcha-assist/pending')
}

export function postCaptchaAssistSubmit(sessionId: number, clicks: { x: number; y: number }[]) {
  return post<{ ok: boolean }>(`/admin/captcha-assist/sessions/${sessionId}/submit`, { clicks })
}

export const fetchAdminSettings = () => get<AdminSettings>('/admin/settings')

export function patchAdminSettings(body: { task_retention_days: number }) {
  return patch<AdminSettings>('/admin/settings', body)
}

export function fetchTaskSavedRecordsPage(params: {
  page: number
  per_page?: number
  task_type?: string
  q?: string
}) {
  const q = new URLSearchParams()
  q.set('page', String(params.page))
  q.set('per_page', String(params.per_page ?? 30))
  if (params.task_type) q.set('task_type', params.task_type)
  if (params.q && params.q.trim()) q.set('q', params.q.trim())
  return get<PaginatedRows<TaskSavedRecordRow>>(`/admin/task-saved-records?${q.toString()}`)
}

export function fetchAddressesPage(page: number, perPage = 30, q?: string) {
  const qs = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (q) qs.set('q', q)
  return get<PaginatedRows<AddressRow>>(`/admin/addresses?${qs}`)
}

export const fetchAddressOne = (id: number) => get<AddressRow>(`/admin/addresses/${id}`)

export function createAddress(body: Partial<AddressRow>) {
  return post<{ ok: boolean; id: number }>('/admin/addresses', body)
}

export function updateAddress(id: number, body: Partial<AddressRow>) {
  return put<{ ok: boolean }>(`/admin/addresses/${id}`, body)
}

export function deleteAddress(id: number) {
  return del<{ ok: boolean }>(`/admin/addresses/${id}`)
}

export function fetchTargetAsinsPage(page: number, perPage = 30, q?: string) {
  const qs = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (q) qs.set('q', q)
  return get<PaginatedRows<TargetAsinRow>>(`/admin/target-asins?${qs}`)
}

export function createTargetAsin(body: { asin: string; note?: string }) {
  return post<{ ok: boolean; id: number }>('/admin/target-asins', body)
}

export function updateTargetAsin(id: number, body: { asin?: string; note?: string | null }) {
  return put<{ ok: boolean }>(`/admin/target-asins/${id}`, body)
}

export function deleteTargetAsin(id: number) {
  return del<{ ok: boolean }>(`/admin/target-asins/${id}`)
}

export function fetchAsinClickRecordsPage(params: {
  page: number
  perPage?: number
  q?: string
  asin?: string
  keyword?: string
  start_date?: string
  end_date?: string
}) {
  const { page, perPage = 40, q, asin, keyword, start_date, end_date } = params
  const qs = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (q) qs.set('q', q)
  if (asin) qs.set('asin', asin)
  if (keyword) qs.set('keyword', keyword)
  if (start_date) qs.set('start_date', start_date)
  if (end_date) qs.set('end_date', end_date)
  return get<PaginatedRows<AsinClickRecordRow>>(`/admin/asin-click-records?${qs}`)
}

export function fetchAsinClickRecordKeywords(start_date?: string, end_date?: string) {
  const qs = new URLSearchParams()
  if (start_date) qs.set('start_date', start_date)
  if (end_date) qs.set('end_date', end_date)
  return get<{ items: string[] }>(`/admin/asin-click-record-keywords${qs.toString() ? `?${qs}` : ''}`)
}

export function fetchAsinKeywordClickStatsPage(params: {
  page: number
  perPage?: number
  keyword?: string
  start_date?: string
  end_date?: string
}) {
  const { page, perPage = 40, keyword, start_date, end_date } = params
  const qs = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (keyword) qs.set('keyword', keyword)
  if (start_date) qs.set('start_date', start_date)
  if (end_date) qs.set('end_date', end_date)
  return get<PaginatedRows<AsinKeywordClickStatRow>>(`/admin/asin-keyword-click-stats?${qs}`)
}

export async function importAddressesXlsx(file: File) {
  const token = localStorage.getItem('auth_token')
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${getApiBase()}/admin/addresses/import-xlsx`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  if (!res.ok) throw new Error('导入失败')
  return res.json() as Promise<{ ok: boolean; imported: number }>
}

export function fetchTaskCenterTasks(params: {
  page: number
  per_page?: number
  device_id?: string
  status?: string
  task_type?: string
  /** params JSON 及遗留列模糊匹配 */
  params_q?: string
}) {
  const q = new URLSearchParams()
  q.set('page', String(params.page))
  q.set('per_page', String(params.per_page ?? 30))
  if (params.device_id) q.set('device_id', params.device_id)
  if (params.status) q.set('status', params.status)
  if (params.task_type) q.set('task_type', params.task_type)
  if (params.params_q && params.params_q.trim()) q.set('params_q', params.params_q.trim())
  return get<PaginatedTasks>(`/admin/task-center/tasks?${q.toString()}`)
}

export const fetchTaskCenterDetail = (taskId: number) =>
  get<TaskCenterDetail>(`/admin/task-center/tasks/${taskId}`)

export const postTaskRetry = (taskId: number) =>
  post<{ ok: boolean }>(`/admin/task-center/tasks/${taskId}/retry`)

export function deleteTaskCenterTask(taskId: number) {
  return del<{ ok: boolean }>(`/admin/task-center/tasks/${taskId}`)
}

/** 删除与当前筛选一致的全部任务；无任何筛选时删除库内全部任务 */
export function deleteTaskCenterTasksMatchingFilters(params: {
  device_id?: string
  status?: string
  task_type?: string
  params_q?: string
}) {
  const q = new URLSearchParams()
  if (params.device_id) q.set('device_id', params.device_id)
  if (params.status) q.set('status', params.status)
  if (params.task_type) q.set('task_type', params.task_type)
  if (params.params_q && params.params_q.trim()) q.set('params_q', params.params_q.trim())
  const qs = q.toString()
  return del<{ ok: boolean; deleted: number }>(`/admin/task-center/tasks${qs ? `?${qs}` : ''}`)
}

export const postTaskRedo = (taskId: number) =>
  post<{ ok: boolean; new_task_id: number }>(`/admin/task-center/tasks/${taskId}/redo`)

export function screenshotUrl(imageId: number) {
  return `${getApiBase()}/admin/task-center/screenshots/${imageId}`
}

/** 联调：按《客户端上报日志约定》解析 log_lines 尾部 AMZ_REPORT（管理员） */
export function postTaskReportParsePreview(log_lines: string[]) {
  return post<{ parsed: TaskReportParsePreviewParsed }>('/admin/task-report/parse-preview', { log_lines })
}

export type TaskReportParsePreviewParsed = {
  success: boolean
  environment: string | null
  finished_at: string | null
  failure_detail: string | null
  used_amz_report: boolean
}
