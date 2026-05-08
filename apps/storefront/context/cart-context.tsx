'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

export interface CartHeel {
  id: string
  name: string
  slug: string
  addedPrice: string
  media: { url: string; alt: string | null }[]
}

export interface CartVariant {
  id: string
  size: string
  color: string
  sku: string
  baseShoe: { id: string; name: string; slug: string; basePrice: string; media: { url: string; alt: string | null }[] }
}

export interface CartItem {
  key: string // `${variantId}:${heelStyleId ?? 'none'}`
  variant: CartVariant
  heel: CartHeel | null
  quantity: number
}

interface CartContext {
  items: CartItem[]
  count: number
  subtotal: number
  addItem: (variant: CartVariant, heel: CartHeel | null, quantity?: number) => void
  removeItem: (key: string) => void
  updateQty: (key: string, qty: number) => void
  clearCart: () => void
}

const CartCtx = createContext<CartContext | null>(null)

const STORAGE_KEY = 'swappa_cart'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw) as CartItem[])
    } catch { /* ignore */ }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items, ready])

  const addItem = useCallback((variant: CartVariant, heel: CartHeel | null, quantity = 1) => {
    const key = `${variant.id}:${heel?.id ?? 'none'}`
    setItems((prev) => {
      const existing = prev.find((i) => i.key === key)
      if (existing) return prev.map((i) => i.key === key ? { ...i, quantity: i.quantity + quantity } : i)
      return [...prev, { key, variant, heel, quantity }]
    })
  }, [])

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key))
  }, [])

  const updateQty = useCallback((key: string, qty: number) => {
    if (qty <= 0) { removeItem(key); return }
    setItems((prev) => prev.map((i) => i.key === key ? { ...i, quantity: qty } : i))
  }, [removeItem])

  const clearCart = useCallback(() => setItems([]), [])

  const subtotal = items.reduce((sum, i) => {
    const base = Number(i.variant.baseShoe.basePrice)
    const heel = Number(i.heel?.addedPrice ?? 0)
    return sum + (base + heel) * i.quantity
  }, 0)

  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartCtx.Provider value={{ items, count, subtotal, addItem, removeItem, updateQty, clearCart }}>
      {children}
    </CartCtx.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartCtx)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
