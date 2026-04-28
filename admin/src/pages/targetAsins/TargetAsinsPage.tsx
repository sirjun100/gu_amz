import { useCallback, useEffect, useState } from 'react'
import { fetchTargetAsinsPage, createTargetAsin, updateTargetAsin, deleteTargetAsin } from '@/api/amzApi'
import type { TargetAsinRow } from '@/types/amz'
import { PaginationBar } from '@/components/common/PaginationBar'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/utils/cn'

const inp =
  'w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm'

export function TargetAsinsPage() {
  const { addToast } = useUIStore()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 30
  const [data, setData] = useState({ items: [] as TargetAsinRow[], total: 0, total_pages: 1 })
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formAsin, setFormAsin] = useState('')
  const [formNote, setFormNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetchTargetAsinsPage(page, perPage, q.trim() || undefined)
      setData({ items: r.items as TargetAsinRow[], total: r.total, total_pages: r.total_pages })
    } finally {
      setLoading(false)
    }
  }, [page, q])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setFormAsin('')
    setFormNote('')
    setEditingId(null)
    setModal('create')
  }

  const openEdit = (row: TargetAsinRow) => {
    setEditingId(row.id)
    setFormAsin(row.asin)
    setFormNote(row.note ?? '')
    setModal('edit')
  }

  const save = async () => {
    const asin = formAsin.trim()
    if (asin.length < 10) {
      addToast({ message: 'ASIN 至少 10 位（一般为 10 位字母数字）', type: 'error' })
      return
    }
    try {
      if (modal === 'create') {
        await createTargetAsin({ asin, note: formNote.trim() || undefined })
        addToast({ message: '已添加', type: 'success' })
      } else if (modal === 'edit' && editingId != null) {
        await updateTargetAsin(editingId, { asin, note: formNote.trim() || null })
        addToast({ message: '已保存', type: 'success' })
      }
      setModal(null)
      load()
    } catch {
      addToast({ message: '保存失败（ASIN 可能重复或格式无效）', type: 'error' })
    }
  }

  const onDel = async (row: TargetAsinRow) => {
    if (!confirm(`删除 ASIN ${row.asin}？统计将一并删除。`)) return
    try {
      await deleteTargetAsin(row.id)
      addToast({ message: '已删除', type: 'success' })
      load()
    } catch {
      addToast({ message: '删除失败', type: 'error' })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">目标 ASIN 管理</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          仅已登记的 ASIN 客户端上报才会累加；服务端按<strong className="font-medium">美国纽约日期</strong>维护「今日点击」，跨日自动清零今日计数。
        </p>
      </div>
      <div className="flex flex-wrap gap-2 items-center p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30">
        <input
          className={cn(inp, 'max-w-xs')}
          placeholder="搜索 ASIN / 备注"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="button" onClick={() => setPage(1)} className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm">
          筛选
        </button>
        <button type="button" onClick={() => load()} className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm">
          刷新
        </button>
        <button type="button" onClick={openCreate} className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700">
          新增 ASIN
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800/30 overflow-x-auto">
        <table className="w-full text-sm min-w-[48rem]">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left font-medium">ID</th>
              <th className="px-3 py-2 text-left font-medium">ASIN</th>
              <th className="px-3 py-2 text-left font-medium">备注</th>
              <th className="px-3 py-2 text-right font-medium">总点击</th>
              <th className="px-3 py-2 text-right font-medium">今日点击</th>
              <th className="px-3 py-2 text-left font-medium whitespace-nowrap">统计日</th>
              <th className="px-3 py-2 text-left font-medium whitespace-nowrap">更新时间</th>
              <th className="px-3 py-2 text-left font-medium min-w-[8rem]">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                  加载中…
                </td>
              </tr>
            ) : data.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              data.items.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{row.id}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-800 dark:text-slate-100">{row.asin}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300 max-w-[14rem] truncate" title={row.note ?? ''}>
                    {row.note?.trim() ? row.note : '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.total_clicks ?? 0}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.today_clicks ?? 0}</td>
                  <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{row.stats_date ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{row.updated_at ?? '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <button type="button" className="text-xs px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600" onClick={() => openEdit(row)}>
                        编辑
                      </button>
                      <button
                        type="button"
                        className="text-xs px-2 py-0.5 rounded border border-red-200 text-red-700 dark:border-red-900 dark:text-red-400"
                        onClick={() => void onDel(row)}
                      >
                        删除
                      </button>
                    </div>
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

      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" role="presentation" onClick={() => setModal(null)}>
          <div
            className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full p-4 border border-slate-200 dark:border-slate-700"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold text-slate-900 dark:text-white mb-3">{modal === 'create' ? '新增 ASIN' : '编辑 ASIN'}</h2>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="text-slate-600 dark:text-slate-400">ASIN</span>
                <input
                  className={cn(inp, 'mt-1 font-mono')}
                  value={formAsin}
                  onChange={(e) => setFormAsin(e.target.value)}
                  placeholder="B0XXXXXXXXX"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600 dark:text-slate-400">备注（可选）</span>
                <input className={cn(inp, 'mt-1')} value={formNote} onChange={(e) => setFormNote(e.target.value)} />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="px-3 py-1.5 rounded-md text-sm border border-slate-200 dark:border-slate-600" onClick={() => setModal(null)}>
                取消
              </button>
              <button type="button" className="px-3 py-1.5 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700" onClick={() => void save()}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
