import { useCallback, useEffect, useState, useRef } from 'react'
import { fetchKeywordsPage, importKeywordsTxt, deleteKeyword } from '@/api/amzApi'
import type { KeywordRow } from '@/types/amz'
import { PaginationBar } from '@/components/common/PaginationBar'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/utils/cn'

const inp =
  'rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm'

export function KeywordsPage() {
  const { addToast } = useUIStore()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 30
  const [data, setData] = useState({ items: [] as KeywordRow[], total: 0, total_pages: 1 })
  const [loading, setLoading] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetchKeywordsPage(page, perPage, q.trim() || undefined)
      setData({ items: r.items, total: r.total, total_pages: r.total_pages })
    } finally {
      setLoading(false)
    }
  }, [page, q])

  useEffect(() => {
    load()
  }, [load])

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const r = await importKeywordsTxt(f)
      addToast({ message: `已导入 ${r.imported} 条`, type: 'success' })
      load()
    } catch {
      addToast({ message: '导入失败', type: 'error' })
    }
  }

  const onDel = async (id: number) => {
    if (!confirm('删除该关键词？')) return
    try {
      await deleteKeyword(id)
      addToast({ message: '已删除', type: 'success' })
      load()
    } catch {
      addToast({ message: '删除失败', type: 'error' })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">随机关键词管理</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">TXT 一行一个关键词；客户端接口见 README</p>
      </div>
      <div className="flex flex-wrap gap-3 items-center p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30">
        <input ref={fileRef} type="file" accept=".txt,text/plain" className="hidden" onChange={onFile} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          导入 TXT
        </button>
        <input
          className={cn(inp, 'max-w-xs')}
          placeholder="搜索关键词"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="button" onClick={() => setPage(1)} className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm">
          筛选
        </button>
        <button type="button" onClick={() => load()} className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm">
          刷新
        </button>
      </div>
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800/30">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/80">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">关键词</th>
              <th className="px-3 py-2 text-left">创建时间</th>
              <th className="w-24 px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                  加载中…
                </td>
              </tr>
            ) : data.items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              data.items.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2">{row.id}</td>
                  <td className="px-3 py-2 text-slate-800 dark:text-slate-200">{row.keyword}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{row.created_at || '—'}</td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => onDel(row.id)} className="text-xs text-red-600 hover:underline">
                      删除
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
