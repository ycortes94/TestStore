import { products } from '../data/products'
import type { CartItem } from '../types'

const STORAGE_KEY = 'teststore_cart_v1'

export type PersistedCartLine = {
  productId: string
  quantity: number
}

const productsById = new Map(products.map((product) => [product.id, product]))

export const loadPersistedCart = (): PersistedCartLine[] => {
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
    return parsed.filter(isPersistedCartLine)
  } catch {
    return []
  }
}

export const cartToPersistedLines = (cart: Record<string, CartItem>): PersistedCartLine[] =>
  Object.values(cart).map(({ product, quantity }) => ({
    productId: product.id,
    quantity,
  }))

export const persistCartLines = (lines: PersistedCartLine[]): void => {
  if (typeof localStorage === 'undefined') {
    return
  }

  if (lines.length === 0) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
}

export const clearPersistedCart = (): void => {
  if (typeof localStorage === 'undefined') {
    return
  }
  localStorage.removeItem(STORAGE_KEY)
}

export const hydrateCart = (lines: PersistedCartLine[]): Record<string, CartItem> => {
  const cart: Record<string, CartItem> = {}

  for (const line of lines) {
    if (line.quantity <= 0) {
      continue
    }

    const product = productsById.get(line.productId)
    if (!product) {
      continue
    }

    // Cap to stock when in stock; keep OOS lines so Notify me still works from the bag.
    if (product.stock > 0) {
      cart[product.id] = { product, quantity: Math.min(line.quantity, product.stock) }
    } else {
      cart[product.id] = { product, quantity: line.quantity }
    }
  }

  return cart
}

const isPersistedCartLine = (value: unknown): value is PersistedCartLine => {
  if (!value || typeof value !== 'object') {
    return false
  }
  const line = value as Partial<PersistedCartLine>
  return typeof line.productId === 'string' && typeof line.quantity === 'number' && line.quantity > 0
}
