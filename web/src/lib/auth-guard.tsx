import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { useUser } from '@/contexts/UserContext'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useUser()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    const params = new URLSearchParams(searchParams)
    params.set('redirect', location.pathname)

    return <Navigate to={`/auth/login?${params.toString()}`} replace />
  }

  return <>{children}</>
}
