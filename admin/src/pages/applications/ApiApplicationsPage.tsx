import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react'
import { fetchApiApplications } from '@/api/tgApi'
import { PaginationBar } from '@/components/common/PaginationBar'

export function ApiApplicationsPage() {
  const [page, setPage] = useState(1)
  const perPage = 15

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'api-applications', page],
    queryFn: () => fetchApiApplications(page, perPage),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <KeyRound className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">申请记录</h1>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">用户通过机器人申请 Telegram API 的记录</p>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">申请记录列表</h2>
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
                  <th className="px-3 py-2 font-medium whitespace-nowrap">用户 ID</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">手机号</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">API ID</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">API Hash</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">创建时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
                {data?.items.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-3 py-2 whitespace-nowrap">{r.id}</td>
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{r.telegram_id}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.phone}</td>
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{r.api_id}</td>
                    <td className="px-3 py-2 max-w-[200px] truncate font-mono text-xs" title={r.api_hash}>
                      {r.api_hash}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">{r.created_at}</td>
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
