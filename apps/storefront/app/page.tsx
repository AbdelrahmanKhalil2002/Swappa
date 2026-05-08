export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
      <div className="text-center space-y-3">
        <h1 className="font-display text-7xl font-light tracking-tight leading-none">
          Antigravity
        </h1>
        <p className="text-muted-foreground text-lg font-light tracking-wide uppercase text-sm">
          Interchangeable Heels
        </p>
      </div>
      <div className="w-px h-16 bg-border" />
      <p className="text-muted-foreground text-base max-w-sm text-center leading-relaxed">
        Design your perfect heel. Change your look in seconds.
      </p>
    </main>
  )
}
