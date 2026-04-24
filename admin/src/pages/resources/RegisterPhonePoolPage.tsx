import { useCallback, useEffect, useState } from 'react'
import {
  clearRegisterPhonePool,
  deleteRegisterPhonePool,
  fetchRegisterCodePoolsStats,
  fetchRegisterPhonePoolPage,
  importRegisterPhonePool,
} from '@/api/amzApi'
import type { RegisterPhonePoolRow } from '@/types/amz'
import { PaginationBar } from '@/components/common/PaginationBar'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/utils/cn'

const ta =
  'w-full min-h-[120px] rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono'
const inp =
  'rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm'

export function RegisterPhonePoolPage() {
  const { addToast } = useUIStore()
  const [stats, setStats] = useState<{
    phone_available: number
    phone_total: number
  } | null>(null)

  const [phoneText, setPhoneText] = useState('')
  const [phoneQ, setPhoneQ] = useState('')
  const [phonePage, setPhonePage] = useState(1)
  const perPage = 30
  const [phoneData, setPhoneData] = useState({
    items: [] as RegisterPhonePoolRow[],
    total: 0,
    total_pages: 1,
  })
  const [loadingPhone, setLoadingPhone] = useState(true)
  const [importing, setImporting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const loadStats = useCallback(() => {
    fetchRegisterCodePoolsStats()
      .then((s) => setStats({ phone_available: s.phone_available, phone_total: s.phone_total }))
      .catch(() => setStats(null))
  }, [])

  const loadPhones = useCallback(async () => {
    setLoadingPhone(true)
    try {
      const r = await fetchRegisterPhonePoolPage(phonePage, perPage, phoneQ.trim() || undefined)
      setPhoneData({
        items: r.items as RegisterPhonePoolRow[],
        total: r.total,
        total_pages: r.total_pages,
      })
      setSelectedIds(new Set())
    } finally {
      setLoadingPhone(false)
    }
  }, [phonePage, phoneQ])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    loadPhones()
  }, [loadPhones])

  const doImportPhone = async () => {
    if (!phoneText.trim()) {
      addToast({ message: '请粘贴要导入的文本', type: 'error' })
      return
    }
    setImporting(true)
    try {
      const r = await importRegisterPhonePool(phoneText)
      addToast({ message: `已导入 ${r.imported} 条手机接码`, type: 'success' })
      setPhoneText('')
      setPhonePage(1)
      loadStats()
      loadPhones()
    } catch {
      addToast({ message: '导入失败（请检查格式）', type: 'error' })
    } finally {
      setImporting(false)
    }
  }

  const visibleIds = phoneData.items.map((row) => row.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(visibleIds))
  }

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const refreshAfterDelete = () => {
    setSelectedIds(new Set())
    loadStats()
    loadPhones()
  }

  const deleteSelected = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      addToast({ message: '请先选择要删除的记录', type: 'error' })
      return
    }
    if (!window.confirm(`确定删除选中的 ${ids.length} 条手机接码记录吗？`)) return
    setDeleting(true)
    try {
      const r = await deleteRegisterPhonePool(ids)
      addToast({ message: `已删除 ${r.deleted} 条记录`, type: 'success' })
      refreshAfterDelete()
    } catch {
      addToast({ message: '删除失败', type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  const clearAll = async () => {
    if (!window.confirm('确定清空全部手机接码记录吗？此操作不可撤销。')) return
    setDeleting(true)
    try {
      const r = await clearRegisterPhonePool()
      addToast({ message: `已清空 ${r.deleted} 条记录`, type: 'success' })
      setPhonePage(1)
      refreshAfterDelete()
    } catch {
      addToast({ message: '清空失败', type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">手机接码管理</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          每条记录<strong>一次性</strong>：在「自动注册 → 创建亚马逊注册任务」中按顺序取用，并写入任务参数；用过后显示关联的{' '}
          <span className="font-mono">register_task_id</span>。
        </p>
        {stats && (
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
            可用 <strong>{stats.phone_available}</strong> / 共 {stats.phone_total} 条
          </p>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-xs text-slate-500">
          批量导入，一行一条：<span className="font-mono">手机号----接码链接</span>（四个英文横线分隔）
        </p>
        <textarea
          className={cn(ta)}
          placeholder={'+11234567890----https://sms.example/get/xxx'}
          value={phoneText}
          onChange={(e) => setPhoneText(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={importing}
            onClick={doImportPhone}
            className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {importing ? '导入中…' : '导入'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            className={cn(inp, 'max-w-xs')}
            placeholder="筛选：手机号或链接"
            value={phoneQ}
            onChange={(e) => setPhoneQ(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setPhonePage(1)}
            className="px-2 py-1 rounded text-xs border border-slate-200 dark:border-slate-600"
          >
            筛选
          </button>
          <button type="button" onClick={() => loadPhones()} className="text-xs text-slate-500">
            刷新列表
          </button>
          <button
            type="button"
            disabled={deleting || selectedIds.size === 0}
            onClick={deleteSelected}
            className="px-2 py-1 rounded text-xs border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            删除选中（{selectedIds.size}）
          </button>
          <button
            type="button"
            disabled={deleting || phoneData.total === 0}
            onClick={clearAll}
            className="px-2 py-1 rounded text-xs bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            清空全部
          </button>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto bg-white dark:bg-slate-800/30">
          <table className="w-full text-sm min-w-[48rem]">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-2 py-2 text-left w-10">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    disabled={phoneData.items.length === 0}
                    onChange={toggleAllVisible}
                  />
                </th>
                <th className="px-2 py-2 text-left">ID</th>
                <th className="px-2 py-2 text-left">手机</th>
                <th className="px-2 py-2 text-left min-w-[14rem]">接码链接</th>
                <th className="px-2 py-2 text-left">已用</th>
                <th className="px-2 py-2 text-left">任务 ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loadingPhone ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    加载中…
                  </td>
                </tr>
              ) : phoneData.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                phoneData.items.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                    <td className="px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleOne(row.id)}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-slate-500">{row.id}</td>
                    <td className="px-2 py-1.5 font-mono text-xs">{row.phone}</td>
                    <td className="px-2 py-1.5 text-xs truncate max-w-[20rem]" title={row.sms_link}>
                      {row.sms_link}
                    </td>
                    <td className="px-2 py-1.5 text-xs">{row.consumed_at ? '是' : '否'}</td>
                    <td className="px-2 py-1.5 font-mono text-xs">
                      {row.register_task_id != null ? row.register_task_id : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="p-2 border-t border-slate-100 dark:border-slate-700">
            <PaginationBar
              page={phonePage}
              totalPages={phoneData.total_pages}
              total={phoneData.total}
              perPage={perPage}
              onPageChange={setPhonePage}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
