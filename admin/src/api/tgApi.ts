import axios from 'axios'
import { del, get, post, put } from '@/utils/request'
import { getApiBase } from '@/utils/apiBase'
import type {
  ApiApplicationRow,
  BotConfig,
  CodeRow,
  MeResponse,
  OrderRow,
  Paginated,
  StatsResponse,
  TokenResponse,
  TgUserRow,
} from '@/types/tg'

const formBase = () => getApiBase()

export async function loginToken(username: string, password: string): Promise<TokenResponse> {
  const params = new URLSearchParams()
  params.append('username', username)
  params.append('password', password)
  const { data } = await axios.post<TokenResponse>(`${formBase()}/auth/token`, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 30000,
  })
  return data
}

export const fetchMe = () => get<MeResponse>('/auth/me')

export const fetchStats = () => get<StatsResponse>('/admin/stats')

export function fetchTgUsers(page: number, perPage = 15) {
  return get<Paginated<TgUserRow>>(`/admin/tg-users?page=${page}&per_page=${perPage}`)
}

export const addTgUserApplyCredits = (body: { telegram_id: string; count: number }) =>
  post<{ ok: boolean }>('/admin/tg-users/add-apply-credits', body)

export function fetchOrders(page: number, perPage = 15) {
  return get<Paginated<OrderRow>>(`/admin/orders?page=${page}&per_page=${perPage}`)
}

export function fetchCodes(page: number, perPage = 15) {
  return get<Paginated<CodeRow>>(`/admin/codes?page=${page}&per_page=${perPage}`)
}

export const generateCodes = (body: { credits: number; count: number }) =>
  post<{ ok: boolean; count: number; credits: number }>('/admin/codes/generate', body)

export function fetchApiApplications(page: number, perPage = 15) {
  return get<Paginated<ApiApplicationRow>>(`/admin/api-applications?page=${page}&per_page=${perPage}`)
}

export const fetchBotConfig = () => get<BotConfig>('/admin/bot-config')

export const putBotConfig = (body: Partial<BotConfig>) => put<BotConfig>('/admin/bot-config', body)

export async function uploadTrc20Qr(file: File): Promise<{ ok: boolean }> {
  const token = localStorage.getItem('auth_token')
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${getApiBase()}/admin/trc20-qr`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  if (!res.ok) throw new Error('上传失败')
  return res.json() as Promise<{ ok: boolean }>
}

export const deleteTrc20Qr = () => del<{ ok: boolean }>('/admin/trc20-qr')
