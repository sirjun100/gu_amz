import { useState } from 'react'
import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { addTgUserApplyCredits, fetchTgUsers } from '@/api/tgApi'
import { PaginationBar } from '@/components/common/PaginationBar'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/utils/cn'

export function TgUsersPage() {
  const qc = useQueryClient()
  const { addToast } = useUIStore()
  const [page, setPage] = useState(1)
  const perPage = 15
  const [tgId, setTgId] = useState('')
  const [count, setCount] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'tg-users', page],
    queryFn: () => fetchTgUsers(page, perPage),
  })

  const addCredits = useMutation({
    mutationFn: () => {
      const n = parseInt(count, 10)
      if (!tgId.trim() || !Number.isFinite(n) || n < 1) {
        return Promise.reject(new Error('请填写有效的用户 ID 与次数（正整数）'))
      }
      return addTgUserApplyCredits({ telegram_id: tgId.trim(), count: n })
    },
    onSuccess: () => {
      addToast({ message: '申请次数已增加', type: 'success' })
      setTgId('')
      setCount('')
      qc.invalidateQueries({ queryKey: ['admin', 'tg-users'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
    onError: (e: unknown) => {
      let msg = '操作失败'
      if (axios.isAxiosError(e)) {
        const d = e.response?.data as { detail?: string } | undefined
        if (typeof d?.detail === 'string') msg = d.detail
      } else if (e instanceof Error) msg = e.message
      addToast({ message: msg, type: 'error' })
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">用户管理</h1>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 sm:p-5 shadow-sm">
        <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">增加申请次数</h2>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1">Telegram 用户 ID</label>
            <input
              value={tgId}
              onChange={(e) => setTgId(e.target.value)}
              className={cn(
                'w-full px-3 py-2 rounded-lg border text-sm',
                'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600',
                'text-slate-900 dark:text-white'
              )}
              placeholder="telegram_id"
            />
          </div>
          <div className="w-full sm:w-36">
            <label className="block text-xs text-slate-500 mb-1">次数</label>
            <input
              type="number"
              min={1}
              step={1}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className={cn(
                'w-full px-3 py-2 rounded-lg border text-sm',
                'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600',
                'text-slate-900 dark:text-white'
              )}
            />
          </div>
          <button
            type="button"
            disabled={addCredits.isPending}
            onClick={() => addCredits.mutate()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            添加
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">用户列表</h2>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-500" />
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">ID</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Telegram ID</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">用户名</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">剩余次数</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">累计支付(u)</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">累计成功申请</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">语言</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">创建时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
                {data?.items.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-3 py-2 whitespace-nowrap">{u.id}</td>
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{u.telegram_id}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{u.username ?? '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{u.apply_credits ?? 0}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{u.total_recharge}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{u.total_applications}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{u.language}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">{u.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {data && (
          <div className="px-4 pb-4">
            <PaginationBar
              page={data.page}
              totalPages={data.total_pages}
              total={data.total}
              perPage={data.per_page}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  )
}
