'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LogOut, FileText, Package } from 'lucide-react'
import { useAuth } from '../../context/auth-context'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { supplier, loading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !supplier) router.replace('/login')
  }, [supplier, loading, router])

  if (loading || !supplier) return null

  const navItems = [
    { href: '/dashboard', label: 'Purchase Orders', icon: <Package className="w-4 h-4" /> },
    { href: '/documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <span className="font-semibold tracking-wide">Swappa</span>
            <span className="ml-2 text-xs text-accent font-medium uppercase tracking-wider">Supplier Portal</span>
          </div>
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map(({ href, label, icon }) => (
              <Link key={href} href={href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === href || pathname.startsWith(href + '/')
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}>
                {icon}{label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:block">{supplier.name}</span>
          <button onClick={logout} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Sign out">
            <LogOut className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </header>
      <main className="flex-1 bg-surface">{children}</main>
    </div>
  )
}
