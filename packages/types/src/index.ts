// ─── Primitives ────────────────────────────────────────────────────────────────

export type ID = string

// ─── API Response Shapes ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ApiError {
  statusCode: number
  message: string
  errors?: Record<string, string[]>
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

export type AuthRole = 'customer' | 'admin' | 'factory_worker' | 'supplier'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

// ─── Enums ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

export type ReturnStatus =
  | 'requested'
  | 'received'
  | 'inspected'
  | 'approved'
  | 'rejected'
  | 'refunded'

export type ProductionOrderStatus =
  | 'planned'
  | 'in_progress'
  | 'quality_check'
  | 'completed'
  | 'cancelled'

export type StockState = 'available' | 'reserved' | 'damaged' | 'quarantine'
