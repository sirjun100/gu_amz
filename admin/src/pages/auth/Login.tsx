import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MessageSquare, User, Lock, Sun, Moon } from 'lucide-react'
import { loginToken, fetchMe } from '@/api/tgApi'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/utils/cn'
import { ButtonLoading } from '@/components/common/Loading'

export function Login() {
  const navigate = useNavigate()
  const { setAuth, isAuthenticated } = useAuthStore()
  const { addToast } = useUIStore()
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const shouldBeDark = savedTheme === 'dark'
    setIsDark(shouldBeDark)
    document.documentElement.classList.toggle('dark', shouldBeDark)
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      addToast({ message: '请输入用户名和密码', type: 'error' })
      return
    }
    setLoading(true)
    try {
      const { access_token } = await loginToken(username.trim(), password)
      localStorage.setItem('auth_token', access_token)
      const me = await fetchMe()
      setAuth(access_token, {
        user_id: me.id,
        username: me.username,
        is_admin: me.is_admin,
      })
      addToast({ message: '登录成功', type: 'success' })
      navigate('/dashboard', { replace: true })
    } catch {
      addToast({ message: '登录失败，请检查用户名或密码', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed top-4 right-4 p-2 rounded-md text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
        title="切换主题"
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-8"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mb-3">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">TG-API 管理后台</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">登录后管理用户、订单、卡密与机器人配置</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">用户名</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={cn(
                  'w-full pl-10 pr-3 py-2 rounded-lg border',
                  'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600',
                  'text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none'
                )}
                autoComplete="username"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  'w-full pl-10 pr-3 py-2 rounded-lg border',
                  'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600',
                  'text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none'
                )}
                autoComplete="current-password"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className={cn(
              'w-full py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700',
              'disabled:opacity-50 flex items-center justify-center gap-2'
            )}
          >
            {loading ? <ButtonLoading /> : '登录'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
