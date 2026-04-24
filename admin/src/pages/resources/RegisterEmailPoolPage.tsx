import { useCallback, useEffect, useState } from 'react'
import {
  clearRegisterEmailPool,
  deleteRegisterEmailPool,
  fetchRegisterCodePoolsStats,
  fetchRegisterEmailPoolPage,
  importRegisterEmailPool,
} from '@/api/amzApi'
import type { RegisterEmailPoolRow } from '@/types/amz'
import { PaginationBar } from '@/components/common/PaginationBar'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/utils/cn'

const ta =
  'w-full min-h-[120px] rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono'
const inp =
  'rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm'

export function RegisterEmailPoolPage() {
  const { addToast } = useUIStore()
  const [stats, setStats] = useState<{
    email_available: number
    email_total: number
  } | null>(null)

  const [emailText, setEmailText] = useState('')
  const [emailQ, setEmailQ] = useState('')
  const [emailPage, setEmailPage] = useState(1)
  const perPage = 30
  const [emailData, setEmailData] = useState({
    items: [] as RegisterEmailPoolRow[],
    total: 0,
    total_pages: 1,
  })
  const [loadingEmail, setLoadingEmail] = useState(true)
  const [importing, setImporting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const loadStats = useCallback(() => {
    fetchRegisterCodePoolsStats()
      .then((s) => setStats({ email_available: s.email_available, email_total: s.email_total }))
      .catch(() => setStats(null))
  }, [])

  const loadEmails = useCallback(async () => {
    setLoadingEmail(true)
    try {
      const r = await fetchRegisterEmailPoolPage(emailPage, perPage, emailQ.trim() || undefined)
      setEmailData({
        items: r.items as RegisterEmailPoolRow[],
        total: r.total,
        total_pages: r.total_pages,
      })
      setSelectedIds(new Set())
    } finally {
      setLoadingEmail(false)
    }
  }, [emailPage, emailQ])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    loadEmails()
  }, [loadEmails])

  const doImportEmail = async () => {
    if (!emailText.trim()) {
      addToast({ message: '请粘贴要导入的文本', type: 'error' })
      return
    }
    setImporting(true)
    try {
      const r = await importRegisterEmailPool(emailText)
      addToast({ message: `已导入 ${r.imported} 条邮箱接码`, type: 'success' })
      setEmailText('')
      setEmailPage(1)
      loadStats()
      loadEmails()
    } catch {
      addToast({ message: '导入失败（请检查格式）', type: 'error' })
    } finally {
      setImporting(false)
    }
  }

  const visibleIds = emailData.items.map((row) => row.id)
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
    loadEmails()
  }

  const deleteSelected = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      addToast({ message: '请先选择要删除的记录', type: 'error' })
      return
    }
    if (!window.confirm(`确定删除选中的 ${ids.length} 条邮箱接码记录吗？`)) return
    setDeleting(true)
    try {
      const r = await deleteRegisterEmailPool(ids)
      addToast({ message: `已删除 ${r.deleted} 条记录`, type: 'success' })
      refreshAfterDelete()
    } catch {
      addToast({ message: '删除失败', type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  const clearAll = async () => {
    if (!window.confirm('确定清空全部邮箱接码记录吗？此操作不可撤销。')) return
    setDeleting(true)
    try {
      const r = await clearRegisterEmailPool()
      addToast({ message: `已清空 ${r.deleted} 条记录`, type: 'success' })
      setEmailPage(1)
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
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">邮箱接码管理</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          适用于 Outlook / Hotmail 等。每条<strong>一次性</strong>：勾选「绑定邮箱」的注册任务会取用一条并写入任务参数。
        </p>
        {stats && (
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
            可用 <strong>{stats.email_available}</strong> / 共 {stats.email_total} 条
          </p>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-xs text-slate-500">
          一行一条：<span className="font-mono">邮箱----密码----接码地址</span>（三段用 ---- 分隔；密码勿含连续四个横线）
        </p>
        <textarea
          className={cn(ta)}
          placeholder={'user@outlook.com----YourPass----https://...'}
          value={emailText}
          onChange={(e) => setEmailText(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={importing}
            onClick={doImportEmail}
            className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {importing ? '导入中…' : '导入'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            className={cn(inp, 'max-w-xs')}
            placeholder="筛选：邮箱或链接"
            value={emailQ}
            onChange={(e) => setEmailQ(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setEmailPage(1)}
            className="px-2 py-1 rounded text-xs border border-slate-200 dark:border-slate-600"
          >
            筛选
          </button>
          <button type="button" onClick={() => loadEmails()} className="text-xs text-slate-500">
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
            disabled={deleting || emailData.total === 0}
            onClick={clearAll}
            className="px-2 py-1 rounded text-xs bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            清空全部
          </button>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto bg-white dark:bg-slate-800/30">
          <table className="w-full text-sm min-w-[52rem]">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-2 py-2 text-left w-10">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    disabled={emailData.items.length === 0}
                    onChange={toggleAllVisible}
                  />
                </th>
                <th className="px-2 py-2 text-left">ID</th>
                <th className="px-2 py-2 text-left">邮箱</th>
                <th className="px-2 py-2 text-left">密码（脱敏）</th>
                <th className="px-2 py-2 text-left min-w-[12rem]">接码地址</th>
                <th className="px-2 py-2 text-left">已用</th>
                <th className="px-2 py-2 text-left">任务 ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loadingEmail ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                    加载中…
                  </td>
                </tr>
              ) : emailData.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                emailData.items.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                    <td className="px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleOne(row.id)}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-slate-500">{row.id}</td>
                    <td className="px-2 py-1.5 font-mono text-xs">{row.email}</td>
                    <td className="px-2 py-1.5 text-xs">{row.email_login_password_masked ?? '—'}</td>
                    <td className="px-2 py-1.5 text-xs truncate max-w-[18rem]" title={row.code_link}>
                      {row.code_link}
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
              page={emailPage}
              totalPages={emailData.total_pages}
              total={emailData.total}
              perPage={perPage}
              onPageChange={setEmailPage}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
