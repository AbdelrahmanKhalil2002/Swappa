export const metadata = { title: 'Dashboard' }

export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-muted-foreground text-sm">
        Analytics and KPIs — coming in Sprint 7.
      </p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {['Revenue', 'Orders', 'Low Stock', 'Open Tickets'].map((label) => (
          <div key={label} className="bg-surface border rounded-xl p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-muted-foreground/40">—</p>
          </div>
        ))}
      </div>
    </div>
  )
}
