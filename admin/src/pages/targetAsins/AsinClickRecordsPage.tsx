import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchAsinClickRecordsPage } from '@/api/amzApi'
import type { AsinClickRecordRow } from '@/types/amz'
import { PaginationBar } from '@/components/common/PaginationBar'
import { cn } from '@/utils/cn'

const inp =
  'rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm'

function nyTodayYmd() {
  const s = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  return s
}

function addDays(ymd: string, days: number) {
  const [y, m, d] = ymd.split('-').map((v) => Number(v))
  if (!y || !m || !d) return ymd
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function AsinClickRecordsPage() {
  const [sp, setSp] = useSearchParams()
  const [q, setQ] = useState(sp.get('q') ?? '')
  const [asinF, setAsinF] = useState(sp.get('asin') ?? '')
  const [keywordF, setKeywordF] = useState(sp.get('keyword') ?? '')
  const [startDate, setStartDate] = useState(sp.get('start_date') ?? '')
  const [endDate, setEndDate] = useState(sp.get('end_date') ?? '')
  const [page, setPage] = useState(1)
  const perPage = 40
  const [data, setData] = useState({ items: [] as AsinClickRecordRow[], total: 0, total_pages: 1 })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetchAsinClickRecordsPage({
        page,
        perPage,
        q: q.trim() || undefined,
        asin: asinF.trim() || undefined,
        keyword: keywordF.trim() || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      })
      setData({ items: r.items as AsinClickRecordRow[], total: r.total, total_pages: r.total_pages })
    } finally {
      setLoading(false)
    }
  }, [page, q, asinF, keywordF, startDate, endDate])

  useEffect(() => {
    load()
  }, [load])

  const syncQuery = useCallback(
    (nextPage = 1) => {
      const next = new URLSearchParams()
      if (q.trim()) next.set('q', q.trim())
      if (asinF.trim()) next.set('asin', asinF.trim())
      if (keywordF.trim()) next.set('keyword', keywordF.trim())
      if (startDate) next.set('start_date', startDate)
      if (endDate) next.set('end_date', endDate)
      setSp(next, { replace: true })
      setPage(nextPage)
    },
    [asinF, endDate, keywordF, q, setSp, startDate]
  )

  const applyRecentDays = useCallback(
    (days: number) => {
      const today = nyTodayYmd()
      const st = addDays(today, -(days - 1))
      setStartDate(st)
      setEndDate(today)
      const next = new URLSearchParams()
      if (q.trim()) next.set('q', q.trim())
      if (asinF.trim()) next.set('asin', asinF.trim())
      if (keywordF.trim()) next.set('keyword', keywordF.trim())
      next.set('start_date', st)
      next.set('end_date', today)
      setSp(next, { replace: true })
      setPage(1)
    },
    [asinF, keywordF, q, setSp]
  )

  const periodText = useMemo(() => {
    if (startDate && endDate) return `${startDate} ~ ${endDate}（纽约时间）`
    if (startDate) return `${startDate}（纽约时间）`
    if (endDate) return `${endDate}（纽约时间）`
    return '未限制'
  }, [endDate, startDate])

  return (
    <div className="space-y-4 w-full">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">ASIN 点击记录</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          客户端每次上报一条：时间（created_at）、ASIN、搜索关键词、设备。统计与日期筛选均按纽约时间口径。
        </p>
      </div>
      <div className="flex flex-wrap gap-2 items-center p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30">
        <input className={cn(inp, 'max-w-[14rem]')} placeholder="关键词 / ASIN / 设备 模糊" value={q} onChange={(e) => setQ(e.target.value)} />
        <input className={cn(inp, 'max-w-[11rem] font-mono text-xs')} placeholder="按 ASIN 精确筛选" value={asinF} onChange={(e) => setAsinF(e.target.value)} />
        <input className={cn(inp, 'max-w-[13rem]')} placeholder="按关键词精确筛选" value={keywordF} onChange={(e) => setKeywordF(e.target.value)} />
        <input type="date" className={cn(inp, 'max-w-[10.5rem]')} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <span className="text-slate-400 text-sm">~</span>
        <input type="date" className={cn(inp, 'max-w-[10.5rem]')} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button type="button" onClick={() => applyRecentDays(1)} className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm">
          最近1天
        </button>
        <button type="button" onClick={() => applyRecentDays(3)} className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm">
          最近3天
        </button>
        <button type="button" onClick={() => applyRecentDays(7)} className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm">
          最近7天
        </button>
        <button type="button" onClick={() => applyRecentDays(30)} className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm">
          最近1个月
        </button>
        <button type="button" onClick={() => syncQuery(1)} className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm">
          筛选
        </button>
        <button type="button" onClick={() => void load()} className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm">
          刷新
        </button>
        <span className="text-xs text-slate-500">统计范围：{periodText}</span>
      </div>
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800/30 overflow-x-auto">
        <table className="w-full text-sm min-w-[42rem]">
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
                  <td
                    className="px-3 py-2 text-xs font-mono text-slate-500 max-w-[14rem] truncate"
                    title={`${row.device_alias ? `[${row.device_alias}]` : ''}${row.device_id ?? ''}`}
                  >
                    {row.device_alias ? `[${row.device_alias}]` : ''}
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
