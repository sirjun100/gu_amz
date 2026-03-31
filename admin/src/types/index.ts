export type {
  MeResponse,
  PaginatedTasks,
  TaskCenterDetail,
  DeviceOption,
  DeviceRow,
  KeywordRow,
  AddressRow,
  TaskRow,
} from './amz'

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
