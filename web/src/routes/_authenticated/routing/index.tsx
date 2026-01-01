import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/routing/')({
  component: () => <Navigate to='/routing/classes' />,
})
