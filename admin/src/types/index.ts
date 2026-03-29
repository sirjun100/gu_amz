export type { MeResponse, BotConfig, Paginated, StatsResponse } from './tg'

export interface User {
  user_id: number
  username: string
  is_admin: boolean
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}
