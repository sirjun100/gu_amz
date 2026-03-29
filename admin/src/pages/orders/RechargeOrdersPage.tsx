import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CreditCard } from 'lucide-react'
import { fetchOrders } from '@/api/tgApi'
import { PaginationBar } from '@/components/common/PaginationBar'

function statusLabel(s: string) {
  if (s === 'pending') return { text: '待支付', className: 'text-amber-600 dark:text-amber-400' }
  if (s === 'completed') return { text: '已完成', className: 'text-emerald-600 dark:text-emerald-400' }
  if (s === 'cancelled') return { text: '已取消', className: 'text-red-600 dark:text-red-400' }
  return { text: s, className: '' }
}

export function RechargeOrdersPage() {
  const [page, setPage] = useState(1)
  const perPage = 15

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'orders', page],
    queryFn: () => fetchOrders(page, perPage),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CreditCard className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">购买订单</h1>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">购买申请次数订单（支付成功后需回调入账）</p>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">订单列表</h2>
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
                  <th className="px-3 py-2 font-medium whitespace-nowrap">订单号</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">用户 ID</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">金额(u)</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">次数包</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">支付方式</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">状态</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">创建时间</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">完成时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
                {data?.items.map((o) => {
                  const st = statusLabel(o.status)
                  return (
                    <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-3 py-2 whitespace-nowrap">{o.id}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{o.order_id}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{o.telegram_id}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{o.amount}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{o.credit_pack ?? '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{o.payment_method}</td>
                      <td className={`px-3 py-2 whitespace-nowrap ${st.className}`}>{st.text}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{o.created_at}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{o.completed_at ?? '—'}</td>
                    </tr>
                  )
                })}
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
