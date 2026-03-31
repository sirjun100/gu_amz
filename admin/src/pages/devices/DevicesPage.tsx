import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchDevicesPage, patchDeviceAlias, patchDeviceScreenshotUploadPolicy } from '@/api/amzApi'
import type { DeviceRow, ScreenshotUploadPolicy } from '@/types/amz'
import { PaginationBar } from '@/components/common/PaginationBar'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/utils/cn'
import { panelPositionNearPointer } from '@/utils/followPointer'

/** 与任务中心 task_type 一致；仅统计 status=pending */
const PENDING_TASK_LINES: { task_type: string; label: string }[] = [
  { task_type: 'register', label: '待执行自动注册' },
  { task_type: 'search_click', label: '待执行搜索产品点击' },
  { task_type: 'related_click', label: '待执行相关产品点击' },
  { task_type: 'similar_click', label: '待执行同类产品点击' },
]

function pendingTotal(pending?: Record<string, number>): number {
  if (!pending) return 0
  return Object.values(pending).reduce((s, n) => s + (typeof n === 'number' ? n : 0), 0)
}

const inp =
  'w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm'

const SCREENSHOT_POLICY_OPTIONS: { value: ScreenshotUploadPolicy; label: string }[] = [
  { value: 'all', label: '允许全部任务上传' },
  { value: 'failed_only', label: '仅失败任务上传' },
  { value: 'none', label: '禁止上传' },
]

function normalizePolicy(p: string | undefined): ScreenshotUploadPolicy {
  if (p === 'failed_only' || p === 'none' || p === 'all') return p
  return 'all'
}

export function DevicesPage() {
  const navigate = useNavigate()
  const { addToast } = useUIStore()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 30
  const [data, setData] = useState({ items: [] as DeviceRow[], total: 0, total_pages: 1 })
  const [loading, setLoading] = useState(true)
  const [aliases, setAliases] = useState<Record<string, string>>({})
  const [shotPolicies, setShotPolicies] = useState<Record<string, ScreenshotUploadPolicy>>({})

  const [pendingTip, setPendingTip] = useState<{
    deviceId: string
    clientX: number
    clientY: number
    pending: Record<string, number>
  } | null>(null)
  const tipLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTipTimer = useCallback(() => {
    if (tipLeaveTimer.current) {
      clearTimeout(tipLeaveTimer.current)
      tipLeaveTimer.current = null
    }
  }, [])

  const onPendingTipEnter = useCallback(() => clearTipTimer(), [clearTipTimer])

  const onPendingTipLeave = useCallback(() => {
    clearTipTimer()
    tipLeaveTimer.current = setTimeout(() => setPendingTip(null), 150)
  }, [clearTipTimer])

  const onDeviceRowEnter = useCallback(
    (e: React.MouseEvent<HTMLTableRowElement>, d: DeviceRow) => {
      clearTipTimer()
      setPendingTip({
        deviceId: d.device_id,
        clientX: e.clientX,
        clientY: e.clientY,
        pending: d.pending_tasks ?? {},
      })
    },
    [clearTipTimer]
  )

  const onDeviceRowMove = useCallback((e: React.MouseEvent<HTMLTableRowElement>, d: DeviceRow) => {
    setPendingTip((prev) => {
      if (!prev || prev.deviceId !== d.device_id) return prev
      return { ...prev, clientX: e.clientX, clientY: e.clientY }
    })
  }, [])

  const onDeviceRowLeave = useCallback(() => {
    clearTipTimer()
    tipLeaveTimer.current = setTimeout(() => setPendingTip(null), 200)
  }, [clearTipTimer])

  useEffect(() => () => clearTipTimer(), [clearTipTimer])

  const pendingTipPos = useMemo(() => {
    if (!pendingTip) return { left: 0, top: 0 }
    return panelPositionNearPointer(pendingTip.clientX, pendingTip.clientY, 288, 288)
  }, [pendingTip])

  const goTaskCenterAllPending = (deviceId: string) => {
    const q = new URLSearchParams({ device_id: deviceId, status: 'pending' })
    navigate(`/tasks?${q.toString()}`)
  }

  const goTaskCenterByType = (deviceId: string, taskType: string) => {
    const q = new URLSearchParams({
      device_id: deviceId,
      status: 'pending',
      task_type: taskType,
    })
    navigate(`/tasks?${q.toString()}`)
    setPendingTip(null)
    clearTipTimer()
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetchDevicesPage(page, perPage, q.trim() || undefined)
      setData({ items: r.items, total: r.total, total_pages: r.total_pages })
      const m: Record<string, string> = {}
      const pm: Record<string, ScreenshotUploadPolicy> = {}
      r.items.forEach((d) => {
        m[d.device_id] = d.alias ?? ''
        pm[d.device_id] = normalizePolicy(d.screenshot_upload_policy as string | undefined)
      })
      setAliases((prev) => ({ ...m, ...prev }))
      setShotPolicies(pm)
    } finally {
      setLoading(false)
    }
  }, [page, q])

  useEffect(() => {
    load()
  }, [load])

  const saveAlias = async (deviceId: string) => {
    const v = aliases[deviceId] ?? ''
    try {
      await patchDeviceAlias(deviceId, v.trim() || null)
      addToast({ message: '已保存备注', type: 'success' })
      load()
    } catch {
      addToast({ message: '保存失败', type: 'error' })
    }
  }

  const saveScreenshotPolicy = async (deviceId: string) => {
    const p = shotPolicies[deviceId] ?? 'all'
    try {
      await patchDeviceScreenshotUploadPolicy(deviceId, p)
      addToast({ message: '截图策略已保存（客户端随心跳/领任务生效）', type: 'success' })
      load()
    } catch {
      addToast({ message: '保存失败', type: 'error' })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">设备管理</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          由客户端心跳自动登记；可编辑备注与过程截图上传策略（省流量：仅失败再上传时客户端先压缩为 webp
          暂存本地，结案后再传）。「待执行任务栏」显示未执行合计；鼠标在行上移动时明细浮层跟随指针。
        </p>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className={cn(inp, 'max-w-xs')}
          placeholder="搜索设备 ID / 备注"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (setPage(1), load())}
        />
        <button
          type="button"
          onClick={() => setPage(1)}
          className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm"
        >
          搜索
        </button>
        <button type="button" onClick={() => load()} className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm">
          刷新
        </button>
      </div>
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800/30">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-3 py-2 text-left">设备 ID</th>
                <th className="px-3 py-2 text-left">备注</th>
                <th className="px-3 py-2 text-left min-w-[200px]">截图策略</th>
                <th className="px-3 py-2 text-left">最后在线</th>
                <th className="px-3 py-2 text-left w-28">待执行任务</th>
                <th className="px-3 py-2 w-36">操作</th>
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
                    暂无设备（等待客户端心跳）
                  </td>
                </tr>
              ) : (
                data.items.map((d) => {
                  const total = pendingTotal(d.pending_tasks)
                  return (
                    <tr
                      key={d.device_id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 relative"
                      onMouseEnter={(e) => onDeviceRowEnter(e, d)}
                      onMouseMove={(e) => onDeviceRowMove(e, d)}
                      onMouseLeave={onDeviceRowLeave}
                    >
                      <td className="px-3 py-2 font-mono text-xs text-slate-800 dark:text-slate-200">{d.device_id}</td>
                      <td className="px-3 py-2">
                        <input
                          className={inp}
                          value={aliases[d.device_id] ?? ''}
                          onChange={(e) => setAliases((prev) => ({ ...prev, [d.device_id]: e.target.value }))}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className={cn(inp, 'max-w-[220px]')}
                          value={shotPolicies[d.device_id] ?? normalizePolicy(d.screenshot_upload_policy as string | undefined)}
                          onChange={(e) =>
                            setShotPolicies((prev) => ({
                              ...prev,
                              [d.device_id]: normalizePolicy(e.target.value),
                            }))
                          }
                        >
                          {SCREENSHOT_POLICY_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400 text-xs">{d.last_seen_at || '—'}</td>
                      <td className="px-3 py-2">
                        {total === 0 ? (
                          <span className="text-slate-400 dark:text-slate-500 tabular-nums">0</span>
                        ) : (
                          <button
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation()
                              goTaskCenterAllPending(d.device_id)
                            }}
                            className="font-semibold tabular-nums text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {total}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => saveAlias(d.device_id)}
                            className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                          >
                            保存备注
                          </button>
                          <button
                            type="button"
                            onClick={() => saveScreenshotPolicy(d.device_id)}
                            className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
                          >
                            保存策略
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-slate-100 dark:border-slate-700">
          <PaginationBar
            page={page}
            totalPages={data.total_pages}
            total={data.total}
            perPage={perPage}
            onPageChange={setPage}
          />
        </div>
      </div>

      {pendingTip && (
        <div
          className="fixed z-[80] w-72 max-h-72 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-xl"
          style={{ top: pendingTipPos.top, left: pendingTipPos.left }}
          onMouseEnter={onPendingTipEnter}
          onMouseLeave={onPendingTipLeave}
        >
          <div className="sticky top-0 px-3 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50/95 dark:bg-slate-800/95 text-xs text-slate-600 dark:text-slate-300">
            待执行明细 · {pendingTip.deviceId}
          </div>
          <div className="p-2 flex flex-col gap-0.5 text-xs">
            {pendingTotal(pendingTip.pending) === 0 ? (
              <div className="px-2 py-3 text-slate-500 text-center">暂无待执行任务</div>
            ) : (
              PENDING_TASK_LINES.map(({ task_type, label }) => {
                const n = pendingTip.pending[task_type] ?? 0
                if (n > 0) {
                  return (
                    <button
                      key={task_type}
                      type="button"
                      onClick={() => goTaskCenterByType(pendingTip.deviceId, task_type)}
                      className="text-left px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400"
                    >
                      <span className="tabular-nums font-medium">{n}</span>
                      <span className="text-slate-700 dark:text-slate-300 ml-1.5">{label}</span>
                    </button>
                  )
                }
                return (
                  <div key={task_type} className="px-2 py-1 text-slate-400 dark:text-slate-500">
                    <span className="tabular-nums">0</span>
                    <span className="ml-1.5">{label}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
