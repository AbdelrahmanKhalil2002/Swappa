'use client'

import {
  BarChart3,
  Box,
  ChevronDown,
  Layers,
  LayoutDashboard,
  ShoppingBag,
  Tag,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink } from './nav-link'
import { useAuth } from '../../context/auth-context'

interface NavSectionProps {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}

function NavSection({ label, icon, children, defaultOpen = false }: NavSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-white/5 transition-colors"
      >
        {icon}
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="mt-0.5 ml-3 pl-3 border-l border-white/10 space-y-0.5">{children}</div>}
    </div>
  )
}

export function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-sidebar flex flex-col z-40">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-baseline gap-2">
          <span className="font-display tracking-widest text-sidebar-foreground text-base uppercase">
            Antigravity
          </span>
          <span className="text-[10px] text-accent font-sans font-medium tracking-wider uppercase">
            Admin
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <NavLink href="/dashboard" exact>
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          Dashboard
        </NavLink>

        <NavSection
          label="Catalog"
          icon={<ShoppingBag className="w-4 h-4 shrink-0" />}
          defaultOpen={true}
        >
          <NavLink href="/catalog/categories">
            <Tag className="w-3.5 h-3.5 shrink-0" />
            Categories
          </NavLink>
          <NavLink href="/catalog/shoes">
            <Box className="w-3.5 h-3.5 shrink-0" />
            Base Shoes
          </NavLink>
          <NavLink href="/catalog/heel-styles">
            <Layers className="w-3.5 h-3.5 shrink-0" />
            Heel Styles
          </NavLink>
        </NavSection>

        {/* Future modules — greyed out */}
        <div className="pt-3 space-y-0.5">
          <p className="px-3 text-[10px] text-sidebar-foreground/30 uppercase tracking-wider mb-1">
            Coming soon
          </p>
          {['Inventory', 'Orders', 'Manufacturing', 'Analytics'].map((m) => (
            <div
              key={m}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-sidebar-foreground/25 cursor-not-allowed"
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              {m}
            </div>
          ))}
        </div>
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm text-sidebar-foreground truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-sidebar-foreground/40 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="text-xs text-sidebar-foreground/40 hover:text-accent transition-colors ml-2 shrink-0"
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}
