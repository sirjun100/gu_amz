import React, { useEffect, useState, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { MainLayout } from '@/components/layout/MainLayout'
import { Login } from '@/pages/auth/Login'
import { fetchMe } from '@/api/tgApi'
import { DashboardHome } from '@/pages/dashboard/DashboardHome'
import { TgUsersPage } from '@/pages/tg-users/TgUsersPage'
import { RechargeOrdersPage } from '@/pages/orders/RechargeOrdersPage'
import { ApiApplicationsPage } from '@/pages/applications/ApiApplicationsPage'
import { CardCodesPage } from '@/pages/codes/CardCodesPage'
import { BotSettingsPage } from '@/pages/settings/BotSettingsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { setAuth, clearAuth, token: storeToken, _hasHydrated } = useAuthStore()
  const [authState, setAuthState] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking')
  const checkingRef = useRef(false)

  useEffect(() => {
    if (!_hasHydrated) return
    if (checkingRef.current) return

    const checkAuth = async () => {
      checkingRef.current = true
      const token = storeToken || localStorage.getItem('auth_token')
      if (!token) {
        setAuthState('unauthenticated')
        checkingRef.current = false
        return
      }

      try {
        const me = await fetchMe()
        setAuth(token, {
          user_id: me.id,
          username: me.username,
          is_admin: me.is_admin,
        })
        setAuthState('authenticated')
      } catch {
        clearAuth()
        setAuthState('unauthenticated')
      } finally {
        checkingRef.current = false
      }
    }

    checkAuth()
  }, [_hasHydrated, storeToken, setAuth, clearAuth])

  if (!_hasHydrated || authState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (authState === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardHome />} />
          <Route path="users" element={<TgUsersPage />} />
          <Route path="orders" element={<RechargeOrdersPage />} />
          <Route path="applications" element={<ApiApplicationsPage />} />
          <Route path="codes" element={<CardCodesPage />} />
          <Route path="settings" element={<BotSettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
