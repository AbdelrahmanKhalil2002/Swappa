'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useCart } from '../../context/cart-context'
import { post } from '../../lib/api-client'
import { ChevronRight, Loader2 } from 'lucide-react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '')

const GOVERNORATES = [
  'Cairo', 'Giza', 'Alexandria', 'Luxor', 'Aswan', 'Asyut', 'Beheira',
  'Beni Suef', 'Dakahlia', 'Damietta', 'Fayoum', 'Gharbia', 'Ismailia',
  'Kafr El Sheikh', 'Matruh', 'Minya', 'Monufia', 'New Valley', 'North Sinai',
  'Port Said', 'Qalyubia', 'Qena', 'Red Sea', 'Sharqia', 'Sohag',
  'South Sinai', 'Suez',
]

const SHIPPING_OPTIONS = [
  { id: 'standard', label: 'Standard delivery', eta: '3–5 business days', cost: 50, freeAbove: 500 },
  { id: 'express', label: 'Express delivery', eta: '1–2 business days', cost: 120, freeAbove: null },
]

type Step = 'address' | 'shipping' | 'payment'

interface AddressForm {
  email: string; firstName: string; lastName: string; phone: string
  addressLine1: string; addressLine2: string; city: string; governorate: string; notes: string
}

function CheckoutForm({ couponCode }: { couponCode: string }) {
  const router = useRouter()
  const { items, subtotal, clearCart } = useCart()
  const stripe = useStripe()
  const elements = useElements()

  const [step, setStep] = useState<Step>('address')
  const [address, setAddress] = useState<AddressForm>({
    email: '', firstName: '', lastName: '', phone: '',
    addressLine1: '', addressLine2: '', city: '', governorate: 'Cairo', notes: '',
  })
  const [shipping, setShipping] = useState('standard')
  const [clientSecret, setClientSecret] = useState('')
  const [orderId, setOrderId] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [totals, setTotals] = useState<{ subtotal: number; shippingCost: number; discountAmount: number; total: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function setA(field: keyof AddressForm, value: string) { setAddress((a) => ({ ...a, [field]: value })) }

  const shippingRate = SHIPPING_OPTIONS.find((o) => o.id === shipping)!
  const shippingCost = shippingRate.freeAbove != null && subtotal >= shippingRate.freeAbove ? 0 : shippingRate.cost
  const previewTotal = subtotal + shippingCost

  async function handleAddressNext(e: React.FormEvent) {
    e.preventDefault()
    setStep('shipping')
  }

  async function handleShippingNext(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await post<{
        clientSecret: string; orderId: string; orderNumber: string
        subtotal: number; shippingCost: number; discountAmount: number; total: number
      }>('/checkout/intent', {
        items: items.map((i) => ({
          variantId: i.variant.id,
          heelStyleId: i.heel?.id ?? undefined,
          quantity: i.quantity,
        })),
        ...address,
        shippingMethod: shipping,
        couponCode: couponCode || undefined,
      })
      setClientSecret(res.clientSecret)
      setOrderId(res.orderId)
      setOrderNumber(res.orderNumber)
      setTotals({ subtotal: res.subtotal, shippingCost: res.shippingCost, discountAmount: res.discountAmount, total: res.total })
      setStep('payment')
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong') }
    finally { setLoading(false) }
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements || !clientSecret) return
    setLoading(true); setError('')
    const card = elements.getElement(CardElement)
    if (!card) return
    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    })
    if (stripeError) {
      setError(stripeError.message ?? 'Payment failed')
      setLoading(false)
      return
    }
    if (paymentIntent?.status === 'succeeded') {
      clearCart()
      router.push(`/checkout/success?orderId=${orderId}&orderNumber=${orderNumber}`)
    }
  }

  const inputCls = 'w-full px-3 py-2.5 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-accent/40'

  if (items.length === 0) {
    router.replace('/cart')
    return null
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Steps indicator */}
        <div className="flex items-center gap-2 text-sm mb-10">
          {(['address', 'shipping', 'payment'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />}
              <span className={step === s ? 'font-medium' : step === 'payment' && s === 'address' ? 'text-muted-foreground line-through' : 'text-muted-foreground capitalize'}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">

            {/* Step 1: Address */}
            {step === 'address' && (
              <form onSubmit={handleAddressNext} className="space-y-4">
                <h2 className="font-semibold mb-4">Contact & delivery address</h2>
                <input required placeholder="Email address" type="email" value={address.email} onChange={(e) => setA('email', e.target.value)} className={inputCls} />
                <div className="grid grid-cols-2 gap-3">
                  <input required placeholder="First name" value={address.firstName} onChange={(e) => setA('firstName', e.target.value)} className={inputCls} />
                  <input required placeholder="Last name" value={address.lastName} onChange={(e) => setA('lastName', e.target.value)} className={inputCls} />
                </div>
                <input required placeholder="Phone number" type="tel" value={address.phone} onChange={(e) => setA('phone', e.target.value)} className={inputCls} />
                <input required placeholder="Address line 1" value={address.addressLine1} onChange={(e) => setA('addressLine1', e.target.value)} className={inputCls} />
                <input placeholder="Address line 2 (optional)" value={address.addressLine2} onChange={(e) => setA('addressLine2', e.target.value)} className={inputCls} />
                <div className="grid grid-cols-2 gap-3">
                  <input required placeholder="City" value={address.city} onChange={(e) => setA('city', e.target.value)} className={inputCls} />
                  <select required value={address.governorate} onChange={(e) => setA('governorate', e.target.value)} className={inputCls}>
                    {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <textarea placeholder="Order notes (optional)" value={address.notes} onChange={(e) => setA('notes', e.target.value)} rows={2}
                  className={`${inputCls} resize-none`} />
                <button type="submit" className="w-full py-3 bg-foreground text-background text-sm font-medium rounded-xl hover:bg-foreground/90 transition-colors">
                  Continue to shipping
                </button>
              </form>
            )}

            {/* Step 2: Shipping */}
            {step === 'shipping' && (
              <form onSubmit={handleShippingNext} className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="font-semibold">Shipping method</h2>
                  <button type="button" onClick={() => setStep('address')} className="text-xs text-muted-foreground underline ml-auto">Edit address</button>
                </div>
                {SHIPPING_OPTIONS.map((opt) => {
                  const cost = opt.freeAbove != null && subtotal >= opt.freeAbove ? 0 : opt.cost
                  return (
                    <label key={opt.id} className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-colors ${shipping === opt.id ? 'border-foreground' : 'hover:border-muted-foreground/40'}`}>
                      <input type="radio" name="shipping" value={opt.id} checked={shipping === opt.id} onChange={() => setShipping(opt.id)} className="accent-foreground" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.eta}</p>
                      </div>
                      <p className="text-sm font-medium">
                        {cost === 0 ? <span className="text-emerald-600">Free</span> : `EGP ${cost}`}
                        {opt.freeAbove && cost > 0 && <span className="ml-1 text-xs text-muted-foreground">(free over EGP {opt.freeAbove})</span>}
                      </p>
                    </label>
                  )
                })}
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-foreground text-background text-sm font-medium rounded-xl hover:bg-foreground/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Preparing payment…' : 'Continue to payment'}
                </button>
              </form>
            )}

            {/* Step 3: Payment */}
            {step === 'payment' && (
              <form onSubmit={handlePayment} className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="font-semibold">Payment</h2>
                  <button type="button" onClick={() => setStep('shipping')} className="text-xs text-muted-foreground underline ml-auto">Back</button>
                </div>
                <div className="p-4 border rounded-xl">
                  <p className="text-xs text-muted-foreground mb-3">Card details</p>
                  <CardElement options={{ style: { base: { fontSize: '14px', color: '#0a0a0a', '::placeholder': { color: '#a3a3a3' } } } }} />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button type="submit" disabled={loading || !stripe}
                  className="w-full py-3 bg-foreground text-background text-sm font-medium rounded-xl hover:bg-foreground/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Processing…' : `Pay EGP ${(totals?.total ?? previewTotal).toLocaleString()}`}
                </button>
                <p className="text-center text-xs text-muted-foreground">Secured by Stripe. We never store your card details.</p>
              </form>
            )}
          </div>

          {/* Order summary sidebar */}
          <div className="border rounded-xl p-5 h-fit sticky top-6 space-y-3">
            <h3 className="text-sm font-semibold">Summary</h3>
            <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
              {items.map((i) => (
                <div key={i.key} className="flex justify-between gap-2">
                  <span className="text-muted-foreground truncate">
                    {i.variant.baseShoe.name}
                    {i.heel ? ` + ${i.heel.name}` : ''} × {i.quantity}
                  </span>
                  <span className="shrink-0">
                    EGP {((Number(i.variant.baseShoe.basePrice) + Number(i.heel?.addedPrice ?? 0)) * i.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>EGP {(totals?.subtotal ?? subtotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span>{(totals?.shippingCost ?? shippingCost) === 0 ? 'Free' : `EGP ${(totals?.shippingCost ?? shippingCost)}`}</span>
              </div>
              {(totals?.discountAmount ?? 0) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span><span>−EGP {(totals!.discountAmount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t pt-1.5">
                <span>Total</span><span>EGP {(totals?.total ?? previewTotal).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CheckoutPageInner() {
  const searchParams = useSearchParams()
  const couponCode = searchParams.get('coupon') ?? ''
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm couponCode={couponCode} />
    </Elements>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutPageInner />
    </Suspense>
  )
}
