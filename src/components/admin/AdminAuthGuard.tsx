'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminAuthGuard({
  children
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login?callbackUrl=/admin')
      return
    }
    const role = (session.user as any)?.role
    if (role !== 'ADMIN' && 
        role !== 'SUPER_ADMIN' && 
        role !== 'STAFF') {
      router.push('/')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#B76E79] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading admin...</p>
        </div>
      </div>
    )
  }

  const role = (session?.user as any)?.role
  if (!session || 
     (role !== 'ADMIN' && 
      role !== 'SUPER_ADMIN' && 
      role !== 'STAFF')) {
    return null
  }

  return <>{children}</>
}
