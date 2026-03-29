import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/health')({
  component: HealthPage,
})

function HealthPage() {
  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <h1 className="display-title mb-4 text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-5xl">
          Dashboard health
        </h1>
        <pre className="rounded-xl bg-[rgba(23,58,64,0.08)] px-4 py-3 text-sm text-[var(--sea-ink)]">
          {JSON.stringify({ ok: true })}
        </pre>
      </section>
    </main>
  )
}
