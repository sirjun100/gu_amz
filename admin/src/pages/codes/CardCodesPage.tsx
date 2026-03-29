import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ticket } from 'lucide-react'
import { fetchCodes, generateCodes } from '@/api/tgApi'
import { PaginationBar } from '@/components/common/PaginationBar'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/utils/cn'

export function CardCodesPage() {
  const qc = useQueryClient()
  const { addToast } = useUIStore()
  const [page, setPage] = useState(1)
  const perPage = 15
  const [creditsPerCard, setCreditsPerCard] = useState('1')
  const [count, setCount] = useState('10')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'codes', page],
    queryFn: () => fetchCodes(page, perPage),
  })

  const gen = useMutation({
    mutationFn: () => {
      const cred = parseInt(creditsPerCard, 10)
      const c = parseInt(count, 10)
      if (!Number.isFinite(cred) || cred < 1 || !Number.isFinite(c) || c < 1 || c > 500) {
        return Promise.reject(new Error('每张兑换次数须为 ≥1 的整数，生成数量 1–500'))
      }
      return generateCodes({ credits: cred, count: c })
    },
    onSuccess: (res) => {
      addToast({ message: `已生成 ${res.count} 张，每张兑换 ${res.credits} 次申请`, type: 'success' })
      qc.invalidateQueries({ queryKey: ['admin', 'codes'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
    onError: (e: unknown) => {
      addToast({ message: e instanceof Error ? e.message : '生成失败', type: 'error' })
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Ticket className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">卡密管理</h1>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        卡密仅表示「兑换申请次数」，与金额无关；用户兑换后增加对应 `apply_credits`。
      </p>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 sm:p-5 shadow-sm">
        <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">生成卡密</h2>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-1">每张可兑换次数（整数）</label>
            <input
              type="number"
              min={1}
              step={1}
              value={creditsPerCard}
              onChange={(e) => setCreditsPerCard(e.target.value)}
              className={cn(
                'w-full sm:w-36 px-3 py-2 rounded-lg border text-sm',
                'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600',
                'text-slate-900 dark:text-white'
              )}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">生成数量（最多 500）</label>
            <input
              type="number"
              min={1}
              max={500}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className={cn(
                'w-full sm:w-36 px-3 py-2 rounded-lg border text-sm',
                'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600',
                'text-slate-900 dark:text-white'
              )}
            />
          </div>
          <button
            type="button"
            disabled={gen.isPending}
            onClick={() => gen.mutate()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            生成
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">卡密列表</h2>
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
                  <th className="px-3 py-2 font-medium whitespace-nowrap">卡密</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">兑换次数</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">状态</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">创建时间</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">使用时间</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">使用用户</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
                {data?.items.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-3 py-2 whitespace-nowrap">{row.id}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{row.code}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{row.credits}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {row.status === 'unused' ? (
                          <span className="text-emerald-600 dark:text-emerald-400">未使用</span>
                        ) : (
                          <span className="text-slate-500">已使用</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{row.created_at}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{row.used_at ?? '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{row.used_by ?? '—'}</td>
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
