type Status = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'

const styles: Record<Status, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  ARCHIVED: 'bg-red-50 text-red-600 border border-red-200',
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}
