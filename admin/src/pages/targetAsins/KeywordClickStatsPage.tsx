import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAsinClickRecordKeywords, fetchAsinKeywordClickStatsPage } from '@/api/amzApi'
import type { AsinKeywordClickStatRow } from '@/types/amz'
import { PaginationBar } from '@/components/common/PaginationBar'
import { cn } from '@/utils/cn'

const inp =
  'rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm'

function nyTodayYmd() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
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

export function KeywordClickStatsPage() {
  const navigate = useNavigate()
  const [selectedKeyword, setSelectedKeyword] = useState('')
  const [keywordOptions, setKeywordOptions] = useState<string[]>([])
  const [singleDate, setSingleDate] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 40
  const [data, setData] = useState({ items: [] as AsinKeywordClickStatRow[], total: 0, total_pages: 1 })
  const [loading, setLoading] = useState(true)

  const applyRecentDays = useCallback((days: number) => {
    const today = nyTodayYmd()
    const st = addDays(today, -(days - 1))
    setStartDate(st)
    setEndDate(today)
    setPage(1)
  }, [])

  useEffect(() => {
    applyRecentDays(1)
  }, [applyRecentDays])

  const loadKeywords = useCallback(async () => {
    const r = await fetchAsinClickRecordKeywords()
    setKeywordOptions(r.items ?? [])
  }, [])

  const load = useCallback(async () => {
    if (!startDate || !endDate) return
    setLoading(true)
    try {
      const r = await fetchAsinKeywordClickStatsPage({
        page,
        perPage,
        keyword: selectedKeyword || undefined,
        start_date: startDate,
        end_date: endDate,
      })
      setData({ items: r.items as AsinKeywordClickStatRow[], total: r.total, total_pages: r.total_pages })
    } finally {
      setLoading(false)
    }
  }, [endDate, page, selectedKeyword, startDate])

  useEffect(() => {
    void loadKeywords()
  }, [loadKeywords])

  useEffect(() => {
    void load()
  }, [load])

  const periodText = useMemo(() => `${startDate || '-'} ~ ${endDate || '-'}（纽约时间）`, [endDate, startDate])

  return (
    <div className="space-y-4 w-full">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">关键词点击统计</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          按关键词 + ASIN + 统计日汇总点击次数；默认展示最近1天（纽约时间）。
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30">
        <select className={cn(inp, 'max-w-[16rem]')} value={selectedKeyword} onChange={(e) => { setSelectedKeyword(e.target.value); setPage(1) }}>
          <option value="">全部关键词</option>
          {keywordOptions.map((kw) => (
            <option key={kw} value={kw}>
              {kw}
            </option>
          ))}
        </select>
        <input type="date" className={cn(inp, 'max-w-[10.5rem]')} value={singleDate} onChange={(e) => setSingleDate(e.target.value)} />
        <button
          type="button"
          onClick={() => {
            if (!singleDate) return
            setStartDate(singleDate)
            setEndDate(singleDate)
            setPage(1)
          }}
          className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm"
        >
          统计当天
        </button>
        <input type="date" className={cn(inp, 'max-w-[10.5rem]')} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <span className="text-slate-400 text-sm">~</span>
        <input type="date" className={cn(inp, 'max-w-[10.5rem]')} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button type="button" onClick={() => setPage(1)} className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm">
          统计区间
        </button>
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
        <button type="button" onClick={() => void load()} className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm">
          刷新
        </button>
        <span className="text-xs text-slate-500">统计范围：{periodText}</span>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800/30 overflow-x-auto">
        <table className="w-full text-sm min-w-[48rem]">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left font-medium">关键词</th>
              <th className="px-3 py-2 text-left font-medium">ASIN</th>
              <th className="px-3 py-2 text-right font-medium">点击次数</th>
              <th className="px-3 py-2 text-left font-medium whitespace-nowrap">统计日</th>
              <th className="px-3 py-2 text-left font-medium whitespace-nowrap">操作</th>
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
                  暂无数据
                </td>
              </tr>
            ) : (
              data.items.map((row, idx) => (
                <tr key={`${row.keyword}-${row.asin}-${row.stats_date}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-2 text-slate-800 dark:text-slate-200 max-w-[20rem] truncate" title={row.keyword}>
                    {row.keyword}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{row.asin}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.click_count}</td>
                  <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{row.stats_date}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-xs px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600"
                      onClick={() =>
                        navigate(
                          `/asin-click-records?keyword=${encodeURIComponent(row.keyword)}&asin=${encodeURIComponent(
                            row.asin
                          )}&start_date=${row.stats_date}&end_date=${row.stats_date}`
                        )
                      }
                    >
                      查看详情
                    </button>
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

