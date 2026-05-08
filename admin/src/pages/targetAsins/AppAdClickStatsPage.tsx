import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchAppAdClickRecordKeywords,
  fetchAppAdClickRecordSearchKeywords,
  fetchAppAdKeywordClickStatsPage,
} from '@/api/amzApi'
import type { AppAdKeywordClickStatRow } from '@/types/amz'
import { PaginationBar } from '@/components/common/PaginationBar'
import { cn } from '@/utils/cn'

const inp =
  'rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm'
const nyTodayYmd = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

export function AppAdClickStatsPage() {
  const navigate = useNavigate()
  const [selectedKeyword, setSelectedKeyword] = useState('')
  const [selectedIdentifyWord, setSelectedIdentifyWord] = useState('')
  const [keywordOptions, setKeywordOptions] = useState<string[]>([])
  const [identifyWordOptions, setIdentifyWordOptions] = useState<string[]>([])
  const [startDate, setStartDate] = useState(nyTodayYmd())
  const [endDate, setEndDate] = useState(nyTodayYmd())
  const [page, setPage] = useState(1)
  const perPage = 40
  const [data, setData] = useState({ items: [] as AppAdKeywordClickStatRow[], total: 0, total_pages: 1 })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [kw, iw, s] = await Promise.all([
        fetchAppAdClickRecordSearchKeywords(startDate, endDate),
        fetchAppAdClickRecordKeywords(startDate, endDate),
        fetchAppAdKeywordClickStatsPage({
          page,
          perPage,
          keyword: selectedKeyword || undefined,
          identify_word: selectedIdentifyWord || undefined,
          start_date: startDate,
          end_date: endDate,
        }),
      ])
      setKeywordOptions(kw.items ?? [])
      setIdentifyWordOptions(iw.items ?? [])
      setData({ items: s.items as AppAdKeywordClickStatRow[], total: s.total, total_pages: s.total_pages })
    } finally {
      setLoading(false)
    }
  }, [endDate, page, perPage, selectedIdentifyWord, selectedKeyword, startDate])

  useEffect(() => {
    void load()
  }, [load])

  const periodText = useMemo(() => `${startDate} ~ ${endDate}（纽约时间）`, [endDate, startDate])

  return (
    <div className="space-y-4 w-full">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">APP广告点击统计</h1>
      </div>
      <div className="flex flex-wrap gap-2 items-center p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30">
        <select className={cn(inp, 'max-w-[16rem]')} value={selectedKeyword} onChange={(e) => { setSelectedKeyword(e.target.value); setPage(1) }}>
          <option value="">全部关键词</option>
          {keywordOptions.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <select className={cn(inp, 'max-w-[16rem]')} value={selectedIdentifyWord} onChange={(e) => { setSelectedIdentifyWord(e.target.value); setPage(1) }}>
          <option value="">全部识别词</option>
          {identifyWordOptions.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <input type="date" className={cn(inp, 'max-w-[10.5rem]')} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <span>~</span>
        <input type="date" className={cn(inp, 'max-w-[10.5rem]')} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button type="button" onClick={() => { setPage(1); void load() }} className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm">刷新</button>
        <span className="text-xs text-slate-500">{periodText}</span>
      </div>
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800/30 overflow-x-auto">
        <table className="w-full text-sm min-w-[48rem]">
          <thead className="bg-slate-50 dark:bg-slate-800/80">
            <tr>
              <th className="px-3 py-2 text-left">关键词</th>
              <th className="px-3 py-2 text-left">识别词</th>
              <th className="px-3 py-2 text-right">点击次数</th>
              <th className="px-3 py-2 text-left">统计日</th>
              <th className="px-3 py-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">加载中…</td></tr>
            ) : data.items.map((row, i) => (
              <tr key={`${row.keyword}-${row.identify_word}-${row.stats_date}-${i}`}>
                <td className="px-3 py-2">{row.keyword || '-'}</td>
                <td className="px-3 py-2">{row.identify_word}</td>
                <td className="px-3 py-2 text-right">{row.click_count}</td>
                <td className="px-3 py-2">{row.stats_date}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="text-xs px-2 py-0.5 rounded border"
                    onClick={() =>
                      navigate(
                        `/app-ad-click-records?keyword=${encodeURIComponent(row.keyword || '')}&identify_word=${encodeURIComponent(
                          row.identify_word
                        )}&start_date=${row.stats_date}&end_date=${row.stats_date}`
                      )
                    }
                  >
                    查看详情
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3 border-t border-slate-100 dark:border-slate-700">
          <PaginationBar page={page} totalPages={data.total_pages} total={data.total} perPage={perPage} onPageChange={setPage} />
        </div>
      </div>
    </div>
  )
}

