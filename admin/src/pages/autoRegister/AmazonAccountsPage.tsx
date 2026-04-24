import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  clearAmazonAccounts,
  deleteAmazonAccount,
  deleteAmazonAccounts,
  fetchAmazonAccountTotpImageBlob,
  fetchAmazonAccountsPage,
  fetchTaskCenterDetail,
} from '@/api/amzApi'
import type { AmazonAccountRow, TaskCenterDetail } from '@/types/amz'
import { PaginationBar } from '@/components/common/PaginationBar'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/utils/cn'

const inp =
  'rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm'

export function AmazonAccountsPage() {
  const { addToast } = useUIStore()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 30
  const [data, setData] = useState({ items: [] as AmazonAccountRow[], total: 0, total_pages: 1 })
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [taskDetail, setTaskDetail] = useState<TaskCenterDetail | null>(null)
  const [taskLoadingId, setTaskLoadingId] = useState<number | null>(null)
  const [totpImgLoadingId, setTotpImgLoadingId] = useState<number | null>(null)
  const [totpImgUrl, setTotpImgUrl] = useState<string | null>(null)
  const [totpImgTitle, setTotpImgTitle] = useState<string>('')

  useEffect(() => {
    return () => {
      if (totpImgUrl) URL.revokeObjectURL(totpImgUrl)
    }
  }, [totpImgUrl])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetchAmazonAccountsPage(page, perPage, q.trim() || undefined)
      setData({
        items: r.items as AmazonAccountRow[],
        total: r.total,
        total_pages: r.total_pages,
      })
      setSelectedIds(new Set())
    } finally {
      setLoading(false)
    }
  }, [page, q])

  useEffect(() => {
    load()
  }, [load])

  const visibleIds = useMemo(() => data.items.map((row) => row.id), [data.items])
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

  const onDeleteOne = async (id: number) => {
    if (!window.confirm('确定删除该账号记录吗？')) return
    setDeleting(true)
    try {
      await deleteAmazonAccount(id)
      addToast({ message: '已删除', type: 'success' })
      await load()
    } catch {
      addToast({ message: '删除失败', type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  const onDeleteSelected = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      addToast({ message: '请先选择要删除的记录', type: 'error' })
      return
    }
    if (!window.confirm(`确定删除选中的 ${ids.length} 条账号记录吗？`)) return
    setDeleting(true)
    try {
      const r = await deleteAmazonAccounts(ids)
      addToast({ message: `已删除 ${r.deleted} 条记录`, type: 'success' })
      await load()
    } catch {
      addToast({ message: '批量删除失败', type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  const onClearAll = async () => {
    if (!window.confirm('确定清空全部亚马逊账号记录吗？此操作不可撤销。')) return
    setDeleting(true)
    try {
      const r = await clearAmazonAccounts()
      addToast({ message: `已清空 ${r.deleted} 条记录`, type: 'success' })
      setPage(1)
      await load()
    } catch {
      addToast({ message: '清空失败', type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  const openTaskInfo = async (taskId: number) => {
    setTaskLoadingId(taskId)
    try {
      const d = await fetchTaskCenterDetail(taskId)
      setTaskDetail(d)
    } catch {
      addToast({ message: '加载任务详情失败', type: 'error' })
    } finally {
      setTaskLoadingId(null)
    }
  }

  const openTotpImage = async (row: AmazonAccountRow) => {
    setTotpImgLoadingId(row.id)
    try {
      const blob = await fetchAmazonAccountTotpImageBlob(row.id)
      const url = URL.createObjectURL(blob)
      if (totpImgUrl) URL.revokeObjectURL(totpImgUrl)
      setTotpImgUrl(url)
      setTotpImgTitle(`账号ID ${row.id} / 手机 ${row.phone ?? '—'}`)
    } catch {
      addToast({ message: '加载TOTP图片失败', type: 'error' })
    } finally {
      setTotpImgLoadingId(null)
    }
  }

  const closeTotpImage = () => {
    if (totpImgUrl) URL.revokeObjectURL(totpImgUrl)
    setTotpImgUrl(null)
    setTotpImgTitle('')
  }

  const renderStatus = (ok: boolean, okText: string, noText: string) => (
    <span className={cn('text-xs font-medium', ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-300')}>
      {ok ? okText : noText}
    </span>
  )

  return (
    <div className="space-y-4 w-full">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">亚马逊账号管理</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          仅在注册成功节点创建账号记录，后续分别更新地址状态与 TOTP 状态。本页已移除 6 秒自动刷新。
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30">
        <input
          className={cn(inp, 'max-w-sm')}
          placeholder="搜索：手机 / 用户名 / 密码 / 任务ID / 设备 / 环境"
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
        <button
          type="button"
          onClick={() => load()}
          className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm"
        >
          立即刷新
        </button>
        <button
          type="button"
          disabled={deleting || selectedIds.size === 0}
          onClick={onDeleteSelected}
          className="px-3 py-1.5 rounded-md text-sm border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          删除选中（{selectedIds.size}）
        </button>
        <button
          type="button"
          disabled={deleting || data.total === 0}
          onClick={onClearAll}
          className="px-3 py-1.5 rounded-md text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        >
          清空全部
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800/30 overflow-x-auto">
        <table className="w-full text-sm min-w-[88rem]">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
            <tr>
              <th className="px-2 py-2 text-left w-10">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  disabled={data.items.length === 0}
                  onChange={toggleAllVisible}
                />
              </th>
              <th className="px-2 py-2 text-left">ID</th>
              <th className="px-2 py-2 text-left">任务ID</th>
              <th className="px-2 py-2 text-left">设备</th>
              <th className="px-2 py-2 text-left">手机</th>
              <th className="px-2 py-2 text-left">用户名</th>
              <th className="px-2 py-2 text-left">密码</th>
              <th className="px-2 py-2 text-left">环境</th>
              <th className="px-2 py-2 text-left">地址状态</th>
              <th className="px-2 py-2 text-left">TOTP状态</th>
              <th className="px-2 py-2 text-left">TOTP图片</th>
              <th className="px-2 py-2 text-left">TOTP动态码</th>
              <th className="px-2 py-2 text-left">更新时间</th>
              <th className="px-2 py-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading ? (
              <tr>
                <td colSpan={14} className="px-3 py-8 text-center text-slate-500">
                  加载中…
                </td>
              </tr>
            ) : data.items.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-3 py-8 text-center text-slate-500">
                  暂无记录
                </td>
              </tr>
            ) : (
              data.items.map((row) => {
                const addrOk = Boolean(row.address_configured || row.address_set_at)
                const totpOk = Boolean(row.totp_configured || row.totp_set_at || row.totp_image_stored_name)
                return (
                  <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                    <td className="px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleOne(row.id)}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-slate-500">{row.id}</td>
                    <td className="px-2 py-1.5 font-mono text-xs">{row.task_id}</td>
                    <td className="px-2 py-1.5 text-xs font-mono truncate max-w-[8rem]" title={row.device_id ?? ''}>
                      {row.device_id ?? '—'}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-xs">{row.phone ?? '—'}</td>
                    <td className="px-2 py-1.5 max-w-[10rem] truncate" title={row.account_username ?? ''}>
                      {row.account_username ?? '—'}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-xs">{row.account_password ?? '—'}</td>
                    <td className="px-2 py-1.5 text-xs max-w-[12rem] truncate" title={row.env_name ?? ''}>
                      {row.env_name ?? '—'}
                    </td>
                    <td className="px-2 py-1.5">{renderStatus(addrOk, '已设置地址', '未设置地址')}</td>
                    <td className="px-2 py-1.5">{renderStatus(totpOk, '已设置TOTP', '未设置TOTP')}</td>
                    <td className="px-2 py-1.5">
                      {row.totp_image_stored_name ? (
                        <button
                          type="button"
                          onClick={() => openTotpImage(row)}
                          className="px-2 py-1 rounded text-xs border border-slate-200 dark:border-slate-600"
                          disabled={totpImgLoadingId === row.id}
                        >
                          {totpImgLoadingId === row.id ? '加载中...' : '查看图片'}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-base font-semibold text-blue-700 dark:text-blue-300">
                      {row.totp_code_now ?? '—'}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-slate-500 whitespace-nowrap">{row.updated_at ?? '—'}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openTaskInfo(row.task_id)}
                          className="px-2 py-1 rounded text-xs border border-slate-200 dark:border-slate-600"
                          disabled={taskLoadingId === row.task_id}
                        >
                          {taskLoadingId === row.task_id ? '加载中…' : '查看任务信息'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteOne(row.id)}
                          disabled={deleting}
                          className="px-2 py-1 rounded text-xs border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
        <div className="p-3 border-t border-slate-100 dark:border-slate-700">
          <PaginationBar page={page} totalPages={data.total_pages} total={data.total} perPage={perPage} onPageChange={setPage} />
        </div>
      </div>

      {taskDetail && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">任务信息</h2>
            <button
              type="button"
              onClick={() => setTaskDetail(null)}
              className="px-2 py-1 rounded text-xs border border-slate-200 dark:border-slate-600"
            >
              关闭
            </button>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <p>任务ID：{taskDetail.task.id}</p>
            <p>类型：{taskDetail.task.task_type}</p>
            <p>状态：{taskDetail.task.status}</p>
            <p>设备：{taskDetail.task.device_id ?? '—'}</p>
            <p>创建时间：{taskDetail.task.created_at ?? '—'}</p>
            <p>失败原因：{taskDetail.task.failure_detail ?? '—'}</p>
          </div>
        </div>
      )}

      {totpImgUrl && (
        <div className="fixed inset-0 z-50 bg-black/75 p-4 flex items-center justify-center" onClick={closeTotpImage}>
          <div
            className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 max-w-5xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{totpImgTitle}</h3>
              <button
                type="button"
                onClick={closeTotpImage}
                className="px-2 py-1 rounded text-xs border border-slate-200 dark:border-slate-600"
              >
                关闭
              </button>
            </div>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 flex items-center justify-center max-h-[calc(90vh-48px)] overflow-auto">
              <img src={totpImgUrl} alt="totp" className="max-w-full max-h-[78vh] object-contain rounded" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
