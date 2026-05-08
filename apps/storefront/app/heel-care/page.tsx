import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, RotateCcw, Shield, Wrench, Droplets, Package } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Heel Care & Mechanism Guide — Swappa',
  description: 'Learn how to click, detach, clean, and store your Swappa interchangeable heels.',
}

const SECTIONS = [
  {
    icon: RotateCcw,
    title: 'How to click heels in',
    steps: [
      'Hold the base shoe steady on a flat surface.',
      'Align the heel connector with the slot on the base — you\'ll feel it slot into place.',
      'Press firmly downward until you hear a click. The heel is now locked.',
      'Give a gentle pull to confirm it won\'t move — if it does, repeat.',
    ],
  },
  {
    icon: Wrench,
    title: 'How to remove heels',
    steps: [
      'Hold the shoe with one hand, heel with the other.',
      'Press the release button (or squeeze the side clips, depending on your model).',
      'Pull the heel straight down — do not twist.',
      'Store the removed heel in its protective pouch to avoid scratches.',
    ],
  },
  {
    icon: Droplets,
    title: 'Cleaning your heels',
    steps: [
      'Wipe the heel mechanism with a dry cloth after each use.',
      'For the heel body, use a slightly damp cloth with mild soap.',
      'Never submerge heels in water — this can damage the locking mechanism.',
      'For metal heels, a dry polish cloth keeps the finish looking new.',
    ],
  },
  {
    icon: Shield,
    title: 'The locking mechanism',
    steps: [
      'The Swappa mechanism is rated for 5,000+ click cycles — equivalent to swapping daily for 13 years.',
      'If the click feels loose, inspect the connector for debris and clean gently.',
      'The mechanism is replaceable — contact support if you notice persistent looseness.',
      'Avoid forcing a heel that resists — check alignment first.',
    ],
  },
  {
    icon: Package,
    title: 'Storage & travel',
    steps: [
      'Store each heel in its individual pouch — included with every heel style.',
      'Keep heels in a cool, dry place away from direct sunlight.',
      'When travelling, place heels in their pouches before packing to protect finishes.',
      'Do not stack bare heels — the finish on metal and acrylic heels scratches easily.',
    ],
  },
]

const FAQS = [
  {
    q: 'Can I use any heel style with any base shoe?',
    a: 'Not all combinations are compatible. Check the product page for a list of compatible heel styles, or use the Heel Configurator to preview combinations.',
  },
  {
    q: 'My heel clicked in but feels slightly wobbly — is that normal?',
    a: 'A very slight flex is normal at extreme angles. If the heel moves when weight is applied normally, clean the connector and try again. Persistent wobble should be reported to support.',
  },
  {
    q: 'Can I wear Swappa shoes in the rain?',
    a: 'The base shoe is water-resistant, but we recommend avoiding prolonged exposure to water as it can affect the connector over time. Metal heels may develop surface rust if left wet.',
  },
  {
    q: 'How do I know if my mechanism needs replacing?',
    a: 'Signs include: heel doesn\'t click securely, release button is hard to press, or the connector is visibly damaged. Contact our support team — mechanism replacement is covered under warranty.',
  },
]

export default function HeelCarePage() {
  return (
    <div className="min-h-screen">
      <div className="border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3">
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground">Heel Care Guide</span>
          </nav>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="font-display text-4xl font-light leading-tight mb-3">Heel Care &amp; Mechanism Guide</h1>
        <p className="text-muted-foreground leading-relaxed mb-12">
          Everything you need to know about using, maintaining, and getting the most from your Swappa
          interchangeable heels — from your first click to your thousandth.
        </p>

        <div className="space-y-10">
          {SECTIONS.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.title} className="border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center shrink-0">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <h2 className="font-semibold text-lg">{s.title}</h2>
                </div>
                <ol className="space-y-2.5">
                  {s.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-muted-foreground leading-relaxed">
                      <span className="shrink-0 w-5 h-5 bg-muted text-foreground rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )
          })}
        </div>

        {/* FAQ */}
        <div className="mt-14">
          <h2 className="font-display text-2xl font-light mb-6">Frequently asked questions</h2>
          <div className="space-y-6">
            {FAQS.map((f) => (
              <div key={f.q}>
                <p className="font-medium text-sm mb-1.5">{f.q}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 p-6 bg-muted/40 rounded-2xl text-center">
          <p className="text-sm text-muted-foreground">
            Still have a question?{' '}
            <Link href="/shop" className="text-foreground underline hover:no-underline">
              Browse our shoes
            </Link>{' '}
            or{' '}
            <a href="mailto:hello@swappa.com" className="text-foreground underline hover:no-underline">
              contact support
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
