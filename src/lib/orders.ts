import type { PurchaseDetails } from '../store/StoreContext'

export type StoredOrder = PurchaseDetails & {
  id: string
  placedAt: string
}

const STORAGE_KEY = 'teststore_orders_v1'

export const createOrderId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `ord_${crypto.randomUUID()}`
  }
  return `ord_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export const loadOrders = (): StoredOrder[] => {
  if (typeof localStorage === 'undefined') {
    return []
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(isStoredOrder)
  } catch {
    return []
  }
}

export const persistOrder = (order: StoredOrder): StoredOrder[] => {
  const existing = loadOrders()
  const next = [order, ...existing]
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }
  return next
}

export const buildStoredOrder = (purchase: PurchaseDetails): StoredOrder => ({
  ...purchase,
  id: createOrderId(),
  placedAt: new Date().toISOString(),
})

const isStoredOrder = (value: unknown): value is StoredOrder => {
  if (!value || typeof value !== 'object') {
    return false
  }
  const order = value as Partial<StoredOrder>
  return (
    typeof order.id === 'string' &&
    typeof order.placedAt === 'string' &&
    typeof order.orderTotal === 'number' &&
    typeof order.subtotal === 'number' &&
    Array.isArray(order.items)
  )
}
