import { useCallback, useEffect, useState } from 'react'
import { fetchTaskSavedRecordsPage } from '@/api/amzApi'
import type { TaskSavedRecordRow } from '@/types/amz'
import { PaginationBar } from '@/components/common/PaginationBar'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/utils/cn'

const inp =
  'rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm'

const TASK_TYPES = [
  { value: '', label: '全部类型' },
  { value: 'register', label: 'register' },
  { value: 'search_click', label: 'search_click' },
  { value: 'related_click', label: 'related_click' },
  { value: 'similar_click', label: 'similar_click' },
]

function contentPreview(c: unknown): string {
  try {
    return JSON.stringify(c, null, 0).slice(0, 200)
  } catch {
    return String(c).slice(0, 200)
  }
}

export function TaskSavedRecordsPage() {
  const { addToast } = useUIStore()
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 30
  const [data, setData] = useState({ items: [] as TaskSavedRecordRow[], total: 0, total_pages: 1 })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetchTaskSavedRecordsPage({
        page,
        per_page: perPage,
        task_type: typeFilter.trim() || undefined,
        q: q.trim() || undefined,
      })
      setData({ items: r.items, total: r.total, total_pages: r.total_pages })
    } catch {
      addToast({ message: '加载失败', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [page, q, typeFilter, addToast])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">任务数据归档</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          长期保存：注册任务默认可保留账号/地址等参数及结案状态；点击类任务仅在创建时勾选「保存数据记录」且<strong>执行成功</strong>后写入一条归档。
        </p>
      </div>
      <div className="flex flex-wrap gap-3 items-center p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30">
        <select
          className={cn(inp, 'min-w-[140px]')}
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value)
            setPage(1)
          }}
        >
          {TASK_TYPES.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          className={cn(inp, 'max-w-xs')}
          placeholder="搜索原文 / ID / 设备"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setPage(1)}
          className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm"
        >
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
              <th className="px-3 py-2 text-left w-16">ID</th>
              <th className="px-3 py-2 text-left w-28">类型</th>
              <th className="px-3 py-2 text-left w-24">任务ID</th>
              <th className="px-3 py-2 text-left">设备</th>
              <th className="px-3 py-2 text-left">数据（节选）</th>
              <th className="px-3 py-2 text-left w-40">创建时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  加载中…
                </td>
              </tr>
            ) : data.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              data.items.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-2 font-mono text-xs">{row.id}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.task_type}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.source_task_id ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs truncate max-w-[140px]" title={row.device_id ?? ''}>
                    {row.device_id ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300 font-mono break-all max-w-xl">
                    <span title={JSON.stringify(row.content)}>{contentPreview(row.content)}…</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{row.created_at ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <PaginationBar
        page={page}
        totalPages={data.total_pages}
        total={data.total}
        perPage={perPage}
        onPageChange={setPage}
      />
    </div>
  )
}
