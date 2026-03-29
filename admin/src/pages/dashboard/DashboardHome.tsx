import { useQuery } from '@tanstack/react-query'
import { LayoutDashboard } from 'lucide-react'
import { fetchStats } from '@/api/tgApi'

export function DashboardHome() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['admin', 'stats'], queryFn: fetchStats })

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (isError || !data) {
    return <p className="text-red-600 dark:text-red-400">加载统计数据失败</p>
  }

  const cards = [
    { label: '总用户数', value: data.total_users },
    { label: '总订单数', value: data.total_orders },
    { label: '总卡密数', value: data.total_codes },
    { label: 'API 申请次数（累计）', value: data.total_applications },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <LayoutDashboard className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">仪表盘</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 shadow-sm"
          >
            <p className="text-2xl font-semibold text-slate-900 dark:text-white tabular-nums">{c.value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
