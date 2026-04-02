import React, { useEffect, useState, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { MainLayout } from '@/components/layout/MainLayout'
import { Login } from '@/pages/auth/Login'
import { fetchMe } from '@/api/amzApi'
import { TaskCenterPage } from '@/pages/tasks/TaskCenterPage'
import { DevicesPage } from '@/pages/devices/DevicesPage'
import { KeywordsPage } from '@/pages/keywords/KeywordsPage'
import { ClickTaskPage } from '@/pages/tasks/ClickTaskPage'
import { RegisterTasksPage } from '@/pages/tasks/RegisterTasksPage'
import { AddressesPage } from '@/pages/addresses/AddressesPage'
import { TaskReportParsePage } from '@/pages/tools/TaskReportParsePage'
import { SystemSettingsPage } from '@/pages/settings/SystemSettingsPage'
import { TaskSavedRecordsPage } from '@/pages/tasks/TaskSavedRecordsPage'

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
          <Route index element={<Navigate to="/tasks" replace />} />
          <Route path="tasks" element={<TaskCenterPage />} />
          <Route path="devices" element={<DevicesPage />} />
          <Route path="keywords" element={<KeywordsPage />} />
          <Route
            path="tasks/search-click"
            element={
              <ClickTaskPage
                taskType="search_click"
                title="搜索产品点击任务"
                description="关键词 + 多个产品标题（每行一条）；客户端在结果列表累计停留约 2～4 分钟，匹配任一标题即进详情浏览约 1～3 分钟后 Back 回列表"
              />
            }
          />
          <Route
            path="tasks/related-click"
            element={
              <ClickTaskPage taskType="related_click" title="相关产品点击任务" description="字段与分配方式同搜索产品点击，仅任务类型不同" />
            }
          />
          <Route
            path="tasks/similar-click"
            element={
              <ClickTaskPage taskType="similar_click" title="同类产品点击任务" description="字段与分配方式同搜索产品点击，仅任务类型不同" />
            }
          />
          <Route path="tasks/register" element={<RegisterTasksPage />} />
          <Route path="tasks/saved-records" element={<TaskSavedRecordsPage />} />
          <Route path="settings" element={<SystemSettingsPage />} />
          <Route path="addresses" element={<AddressesPage />} />
          <Route path="tools/task-report-parse" element={<TaskReportParsePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/tasks" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
