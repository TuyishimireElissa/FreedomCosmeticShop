'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { AdminLoginScreen } from '@/components/admin/AdminLoginScreen'
import { useStore } from '@/store/useStore'

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'STAFF', 'MANAGER'])

export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, authLoading, fetchUser, goHome } = useStore()

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  useEffect(() => {
    if (!authLoading && user?.mustChangePassword) router.replace('/change-password')
  }, [authLoading, router, user?.mustChangePassword])

  const returnToStore = () => {
    goHome()
    router.push('/')
  }

  if (authLoading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#f8f9fa] px-4">
        <div className="text-center" role="status" aria-live="polite">
          <div className="mx-auto mb-4 h-14 w-14 animate-spin rounded-full border-4 border-[#B76E79]/20 border-t-[#B76E79]" />
          <p className="text-sm font-semibold text-[#1a1a1a]">Loading admin workspace</p>
          <p className="mt-1 text-xs text-gray-500">Verifying secure access…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AdminLoginScreen onBack={returnToStore} />
  }

  if (user.mustChangePassword) {
    return <div className="grid min-h-dvh place-items-center bg-[#f8f9fa] text-sm font-semibold text-gray-600">Redirecting to secure password change…</div>
  }

  if (!ADMIN_ROLES.has(user.role)) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#f8f9fa] px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-7 text-center shadow-xl shadow-black/5 sm:p-9">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-50 text-red-600">
            <ShieldAlert className="h-8 w-8" />
          </span>
          <h1 className="mt-5 text-xl font-bold text-[#1a1a1a]">Admin access required</h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Your account does not have permission to open the FreedomCosmeticShop administration workspace.
          </p>
          <button type="button" onClick={returnToStore} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1a1a1a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-black">
            <ArrowLeft className="h-4 w-4" /> Return to store
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
