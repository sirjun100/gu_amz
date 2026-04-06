import { useCallback, useEffect, useState } from 'react'
import { fetchAsinClickRecordsPage } from '@/api/amzApi'
import type { AsinClickRecordRow } from '@/types/amz'
import { PaginationBar } from '@/components/common/PaginationBar'
import { cn } from '@/utils/cn'

const inp =
  'rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm'

export function AsinClickRecordsPage() {
  const [q, setQ] = useState('')
  const [asinF, setAsinF] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 40
  const [data, setData] = useState({ items: [] as AsinClickRecordRow[], total: 0, total_pages: 1 })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetchAsinClickRecordsPage(page, perPage, q.trim() || undefined, asinF.trim() || undefined)
      setData({ items: r.items as AsinClickRecordRow[], total: r.total, total_pages: r.total_pages })
    } finally {
      setLoading(false)
    }
  }, [page, q, asinF])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">ASIN 点击记录</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          客户端每次上报一条：时间（created_at）、ASIN、搜索关键词、设备。统计汇总仍在「目标 ASIN」页。
        </p>
      </div>
      <div className="flex flex-wrap gap-2 items-center p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30">
        <input className={cn(inp, 'max-w-[14rem]')} placeholder="关键词 / ASIN / 设备 模糊" value={q} onChange={(e) => setQ(e.target.value)} />
        <input className={cn(inp, 'max-w-[11rem] font-mono text-xs')} placeholder="按 ASIN 精确筛选" value={asinF} onChange={(e) => setAsinF(e.target.value)} />
        <button type="button" onClick={() => setPage(1)} className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm">
          筛选
        </button>
        <button type="button" onClick={() => load()} className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm">
          刷新
        </button>
      </div>
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800/30 overflow-x-auto">
        <table className="w-full text-sm min-w-[36rem]">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left font-medium">ID</th>
              <th className="px-3 py-2 text-left font-medium whitespace-nowrap">时间</th>
              <th className="px-3 py-2 text-left font-medium">ASIN</th>
              <th className="px-3 py-2 text-left font-medium min-w-[10rem]">关键词</th>
              <th className="px-3 py-2 text-left font-medium">设备</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                  加载中…
                </td>
              </tr>
            ) : data.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                  暂无记录
                </td>
              </tr>
            ) : (
              data.items.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{row.id}</td>
                  <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {row.created_at ?? '—'}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{row.asin}</td>
                  <td className="px-3 py-2 text-slate-800 dark:text-slate-200 max-w-[20rem] truncate" title={row.keyword}>
                    {row.keyword}
                  </td>
                  <td className="px-3 py-2 text-xs font-mono text-slate-500 max-w-[10rem] truncate" title={row.device_id ?? ''}>
                    {row.device_id ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="p-3 border-t border-slate-100 dark:border-slate-700">
          <PaginationBar page={page} totalPages={data.total_pages} total={data.total} perPage={perPage} onPageChange={setPage} />
        </div>
      </div>
    </div>
  )
}
