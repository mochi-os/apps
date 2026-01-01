import { createFileRoute } from '@tanstack/react-router'
import { RoutingClasses } from '@/features/routing/classes'

export const Route = createFileRoute('/_authenticated/routing/classes')({
  component: RoutingClasses,
})
