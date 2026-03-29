import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/health')({
  server: {
    handlers: {
      GET: () => json({ ok: true }),
    },
  },
})
