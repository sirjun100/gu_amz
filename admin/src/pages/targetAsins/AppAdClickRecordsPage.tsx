import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchAppAdClickRecordsPage } from '@/api/amzApi'
import type { AppAdClickRecordRow } from '@/types/amz'
import { PaginationBar } from '@/components/common/PaginationBar'
import { cn } from '@/utils/cn'

const inp = 'rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm'

export function AppAdClickRecordsPage() {
  const [sp, setSp] = useSearchParams()
  const [q, setQ] = useState(sp.get('q') ?? '')
  const [keyword, setKeyword] = useState(sp.get('keyword') ?? '')
  const [identifyWord, setIdentifyWord] = useState(sp.get('identify_word') ?? '')
  const [startDate, setStartDate] = useState(sp.get('start_date') ?? '')
  const [endDate, setEndDate] = useState(sp.get('end_date') ?? '')
  const [page, setPage] = useState(1)
  const perPage = 40
  const [data, setData] = useState({ items: [] as AppAdClickRecordRow[], total: 0, total_pages: 1 })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qq = [q.trim(), keyword.trim()].filter(Boolean).join(' ')
      const r = await fetchAppAdClickRecordsPage({ page, perPage, q: qq || undefined, identify_word: identifyWord.trim() || undefined, start_date: startDate || undefined, end_date: endDate || undefined })
      setData({ items: r.items as AppAdClickRecordRow[], total: r.total, total_pages: r.total_pages })
    } finally { setLoading(false) }
  }, [endDate, identifyWord, keyword, page, perPage, q, startDate])

  useEffect(() => { void load() }, [load])

  const sync = () => {
    const next = new URLSearchParams()
    if (q.trim()) next.set('q', q.trim())
    if (keyword.trim()) next.set('keyword', keyword.trim())
    if (identifyWord.trim()) next.set('identify_word', identifyWord.trim())
    if (startDate) next.set('start_date', startDate)
    if (endDate) next.set('end_date', endDate)
    setSp(next, { replace: true })
    setPage(1)
  }

  return (
    <div className="space-y-4 w-full">
      <div><h1 className="text-lg font-semibold text-slate-900 dark:text-white">APP广告点击记录</h1></div>
      <div className="flex flex-wrap gap-2 items-center p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30">
        <input className={cn(inp, 'max-w-[14rem]')} placeholder="识别词/关键词/设备" value={q} onChange={(e) => setQ(e.target.value)} />
        <input className={cn(inp, 'max-w-[13rem]')} placeholder="按关键词筛选" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <input className={cn(inp, 'max-w-[13rem]')} placeholder="按识别词精确筛选" value={identifyWord} onChange={(e) => setIdentifyWord(e.target.value)} />
        <input type="date" className={cn(inp, 'max-w-[10.5rem]')} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <span>~</span>
        <input type="date" className={cn(inp, 'max-w-[10.5rem]')} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button type="button" onClick={sync} className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm">筛选</button>
        <button type="button" onClick={() => void load()} className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm">刷新</button>
      </div>
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800/30 overflow-x-auto">
        <table className="w-full text-sm min-w-[44rem]">
          <thead className="bg-slate-50 dark:bg-slate-800/80"><tr><th className="px-3 py-2 text-left">ID</th><th className="px-3 py-2 text-left">时间</th><th className="px-3 py-2 text-left">识别词</th><th className="px-3 py-2 text-left">搜索词</th><th className="px-3 py-2 text-left">设备</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">加载中…</td></tr> : data.items.map((row) => <tr key={row.id}><td className="px-3 py-2">{row.id}</td><td className="px-3 py-2 text-xs">{row.created_at ?? '-'}</td><td className="px-3 py-2">{row.identify_word}</td><td className="px-3 py-2">{row.keyword ?? '-'}</td><td className="px-3 py-2 text-xs">{row.device_alias ? `[${row.device_alias}]` : ''}{row.device_id ?? '-'}</td></tr>)}</tbody>
        </table>
        <div className="p-3 border-t border-slate-100 dark:border-slate-700"><PaginationBar page={page} totalPages={data.total_pages} total={data.total} perPage={perPage} onPageChange={setPage} /></div>
      </div>
    </div>
  )
}
