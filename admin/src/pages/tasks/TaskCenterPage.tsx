import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  fetchDeviceOptions,
  fetchTaskCenterTasks,
  fetchTaskCenterDetail,
  postTaskRetry,
  deleteTaskCenterTask,
  postTaskRedo,
} from '@/api/amzApi'
import type { DeviceOption, TaskCenterDetail, TaskScreenshotRow } from '@/types/amz'
import { PaginationBar } from '@/components/common/PaginationBar'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/utils/cn'
import { getApiBase } from '@/utils/apiBase'

function formatParamsFullJson(params: unknown): string {
  try {
    return JSON.stringify(params ?? {}, null, 2)
  } catch {
    return String(params ?? '—')
  }
}

const PARAM_DISPLAY_KEY_ORDER = [
  'keyword',
  'product_title',
  'phone',
  'username',
  'password',
  'mode',
  'raw_text',
] as const

function formatParamValueOneLine(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') {
    try {
      const s = JSON.stringify(v)
      return s.length > 100 ? `${s.slice(0, 97)}…` : s
    } catch {
      return String(v)
    }
  }
  const s = String(v).trim()
  return s.length > 120 ? `${s.slice(0, 117)}…` : s
}

/** 用于列表：按业务字段顺序收集 params 的值，渲染为「值1 / 值2 / …」 */
function collectParamDisplayParts(params: unknown): string[] {
  if (params == null) return []
  if (typeof params !== 'object') return [formatParamValueOneLine(params)].filter(Boolean)
  const o = params as Record<string, unknown>
  const seen = new Set<string>()
  const parts: string[] = []
  const pushKey = (k: string) => {
    if (seen.has(k)) return
    seen.add(k)
    const line = formatParamValueOneLine(o[k])
    if (line) parts.push(line)
  }
  for (const k of PARAM_DISPLAY_KEY_ORDER) {
    if (k in o) pushKey(k)
  }
  for (const k of Object.keys(o).sort()) {
    if (!seen.has(k)) pushKey(k)
  }
  return parts
}

function formatParamsSummaryLine(params: unknown, maxParts = 3): string {
  const parts = collectParamDisplayParts(params)
  if (parts.length === 0) return '—'
  const shown = parts.slice(0, maxParts)
  const suffix = parts.length > maxParts ? ' …' : ''
  return `${shown.join(' / ')}${suffix}`
}

function TaskParamsCell({ params }: { params: unknown }) {
  const full = formatParamsFullJson(params)
  const summary = formatParamsSummaryLine(params)
  return (
    <div className="relative group min-w-0 max-w-[22rem]">
      <span
        className="block truncate text-xs text-slate-700 dark:text-slate-200 cursor-default border-b border-dotted border-slate-300 dark:border-slate-600"
        title={full}
      >
        {summary}
      </span>
      <div
        className="pointer-events-none invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute z-[200] left-0 bottom-full mb-1 w-[min(28rem,calc(100vw-2rem))] max-h-72 overflow-auto rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 shadow-lg p-2"
        role="tooltip"
      >
        <pre className="m-0 text-[11px] leading-snug font-mono whitespace-pre-wrap break-words text-slate-800 dark:text-slate-100">
          {full}
        </pre>
      </div>
    </div>
  )
}

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '未执行' },
  { value: 'running', label: '执行中' },
  { value: 'success', label: '成功' },
  { value: 'failed', label: '失败' },
]

const TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'search_click', label: '搜索产品点击' },
  { value: 'related_click', label: '相关产品点击' },
  { value: 'similar_click', label: '同类产品点击' },
  { value: 'register', label: '自动注册' },
]

const TASK_TYPE_LABEL = Object.fromEntries(TYPE_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label])) as Record<
  string,
  string
>

const selectCls =
  'rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm px-2 py-1.5 text-slate-800 dark:text-slate-200 min-w-[8rem]'

const inpFilter =
  'rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm px-2 py-1.5 text-slate-800 dark:text-slate-200 w-[min(20rem,calc(100vw-2rem))]'

const btnSm =
  'px-2 py-1 rounded text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-45'

async function loadScreenshotBlob(imageId: number): Promise<string> {
  const token = localStorage.getItem('auth_token')
  const res = await fetch(`${getApiBase()}/admin/task-center/screenshots/${imageId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('加载截图失败')
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

type SnapshotItem = TaskScreenshotRow & { blobUrl: string }

function TaskSnapshotViewer({
  taskId,
  loading,
  items,
  index,
  onClose,
  onSetIndex,
}: {
  taskId: number
  loading: boolean
  items: SnapshotItem[]
  index: number
  onClose: () => void
  onSetIndex: (i: number) => void
}) {
  useEffect(() => {
    if (!taskId || loading) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (items.length === 0) return
      if (e.key === 'ArrowLeft') onSetIndex(index <= 0 ? items.length - 1 : index - 1)
      if (e.key === 'ArrowRight') onSetIndex(index >= items.length - 1 ? 0 : index + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [taskId, loading, items.length, index, onClose, onSetIndex])

  const cur = items[index]
  const n = items.length

  return (
    <div
      className="fixed inset-0 z-[120] flex flex-col bg-black/92 text-white"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex shrink-0 items-center justify-between gap-2 px-4 py-3 border-b border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-medium truncate">
          任务快照 #{taskId}
          {!loading && n > 0 && (
            <span className="text-white/60 font-normal ml-2">
              {index + 1} / {n}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          {cur?.blobUrl && (
            <a
              href={cur.blobUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              原图
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl leading-none px-2"
            aria-label="关闭"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 p-3" onClick={(e) => e.stopPropagation()}>
        {loading && <div className="flex-1 flex items-center justify-center text-white/60">加载截图…</div>}
        {!loading && n === 0 && (
          <div className="flex-1 flex items-center justify-center text-white/60">暂无截图</div>
        )}
        {!loading && n > 0 && cur && (
          <>
            <div className="flex-1 flex items-center justify-center gap-2 min-h-0">
              <button
                type="button"
                className="hidden sm:flex shrink-0 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-lg"
                aria-label="上一张"
                onClick={() => onSetIndex(index <= 0 ? n - 1 : index - 1)}
              >
                ‹
              </button>
              <div className="flex-1 min-h-0 min-w-0 flex flex-col items-center justify-center max-h-[calc(100vh-11rem)]">
                {cur.blobUrl ? (
                  <img
                    src={cur.blobUrl}
                    alt={cur.description || `步骤 ${index + 1}`}
                    className="max-w-full max-h-full object-contain rounded shadow-lg"
                  />
                ) : (
                  <span className="text-white/50">无法加载</span>
                )}
                <div className="mt-2 text-center text-xs text-white/75 max-w-2xl px-2 space-y-0.5">
                  <div className="font-medium">{cur.description?.trim() || `步骤 ${index + 1} · ID ${cur.id}`}</div>
                  {cur.created_at && <div className="text-white/50">{cur.created_at}</div>}
                </div>
              </div>
              <button
                type="button"
                className="hidden sm:flex shrink-0 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-lg"
                aria-label="下一张"
                onClick={() => onSetIndex(index >= n - 1 ? 0 : index + 1)}
              >
                ›
              </button>
            </div>
            <div className="shrink-0 mt-2 flex gap-1.5 overflow-x-auto pb-1 max-h-24 justify-center">
              {items.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSetIndex(i)}
                  className={cn(
                    'shrink-0 w-16 h-16 rounded border-2 overflow-hidden bg-white/5',
                    i === index ? 'border-blue-400 ring-1 ring-blue-400/50' : 'border-transparent opacity-70 hover:opacity-100'
                  )}
                >
                  {s.blobUrl ? (
                    <img src={s.blobUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-white/40 flex items-center justify-center h-full">×</span>
                  )}
                </button>
              ))}
            </div>
            <p className="shrink-0 text-center text-[10px] text-white/40 mt-1">← → 切换 · Esc 关闭</p>
          </>
        )}
      </div>
    </div>
  )
}

export function TaskCenterPage() {
  const { addToast } = useUIStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const deviceId = searchParams.get('device_id') ?? ''
  const status = searchParams.get('status') ?? ''
  const taskType = searchParams.get('task_type') ?? ''
  const paramsQ = searchParams.get('params_q') ?? ''

  const setTaskFilters = (patch: Partial<{ device_id: string; status: string; task_type: string; params_q: string }>) => {
    const next = new URLSearchParams(searchParams)
    if ('device_id' in patch) {
      if (patch.device_id) next.set('device_id', patch.device_id)
      else next.delete('device_id')
    }
    if ('status' in patch) {
      if (patch.status) next.set('status', patch.status)
      else next.delete('status')
    }
    if ('task_type' in patch) {
      if (patch.task_type) next.set('task_type', patch.task_type)
      else next.delete('task_type')
    }
    if ('params_q' in patch) {
      const v = (patch.params_q ?? '').trim()
      if (v) next.set('params_q', v)
      else next.delete('params_q')
    }
    setSearchParams(next, { replace: true })
    setPage(1)
  }

  const [paramsInput, setParamsInput] = useState(paramsQ)
  const searchParamsRef = useRef(searchParams)
  searchParamsRef.current = searchParams

  useEffect(() => {
    setParamsInput(paramsQ)
  }, [paramsQ])

  useEffect(() => {
    const id = window.setTimeout(() => {
      const trimmed = paramsInput.trim()
      const cur = (searchParamsRef.current.get('params_q') ?? '').trim()
      if (trimmed === cur) return
      const next = new URLSearchParams(searchParamsRef.current)
      if (trimmed) next.set('params_q', trimmed)
      else next.delete('params_q')
      setSearchParams(next, { replace: true })
      setPage(1)
    }, 400)
    return () => window.clearTimeout(id)
  }, [paramsInput, setSearchParams])

  const [devices, setDevices] = useState<DeviceOption[]>([])
  const [page, setPage] = useState(1)
  const perPage = 30
  const [data, setData] = useState<{ items: Record<string, unknown>[]; total: number; total_pages: number }>({
    items: [],
    total: 0,
    total_pages: 1,
  })
  const [loading, setLoading] = useState(true)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<TaskCenterDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [blobUrls, setBlobUrls] = useState<string[]>([])
  const [busyId, setBusyId] = useState<number | null>(null)
  const [snapshotOpen, setSnapshotOpen] = useState(false)
  const [snapshotTaskId, setSnapshotTaskId] = useState<number | null>(null)
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [snapshotItems, setSnapshotItems] = useState<SnapshotItem[]>([])
  const [snapshotIndex, setSnapshotIndex] = useState(0)

  const closeSnapshot = useCallback(() => {
    setSnapshotItems((prev) => {
      prev.forEach((x) => {
        if (x.blobUrl) URL.revokeObjectURL(x.blobUrl)
      })
      return []
    })
    setSnapshotOpen(false)
    setSnapshotTaskId(null)
    setSnapshotIndex(0)
  }, [])

  const openSnapshot = useCallback(
    async (taskId: number) => {
      setSnapshotOpen(true)
      setSnapshotTaskId(taskId)
      setSnapshotLoading(true)
      setSnapshotIndex(0)
      setSnapshotItems([])
      try {
        const d = await fetchTaskCenterDetail(taskId)
        if (d.screenshots.length === 0) {
          addToast({ message: '该任务暂无截图', type: 'info' })
          setSnapshotLoading(false)
          setSnapshotOpen(false)
          setSnapshotTaskId(null)
          return
        }
        const items: SnapshotItem[] = []
        for (const s of d.screenshots) {
          try {
            const blobUrl = await loadScreenshotBlob(s.id)
            items.push({ ...s, blobUrl })
          } catch {
            items.push({ ...s, blobUrl: '' })
          }
        }
        setSnapshotItems(items)
      } catch {
        addToast({ message: '加载任务快照失败', type: 'error' })
        setSnapshotOpen(false)
        setSnapshotTaskId(null)
      } finally {
        setSnapshotLoading(false)
      }
    },
    [addToast]
  )

  const loadDevices = useCallback(async () => {
    try {
      const r = await fetchDeviceOptions()
      setDevices(r.items || [])
    } catch {
      setDevices([])
    }
  }, [])

  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetchTaskCenterTasks({
        page,
        per_page: perPage,
        device_id: deviceId || undefined,
        status: status || undefined,
        task_type: taskType || undefined,
        params_q: paramsQ.trim() || undefined,
      })
      setData({
        items: r.items as unknown as Record<string, unknown>[],
        total: r.total,
        total_pages: r.total_pages,
      })
    } finally {
      setLoading(false)
    }
  }, [page, deviceId, status, taskType, paramsQ])

  useEffect(() => {
    loadDevices()
  }, [loadDevices])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const closeDetail = () => {
    setDetailOpen(false)
    setDetail(null)
    blobUrls.forEach((u) => {
      if (u) URL.revokeObjectURL(u)
    })
    setBlobUrls([])
  }

  const openDetail = async (taskId: number) => {
    setDetailOpen(true)
    setDetail(null)
    blobUrls.forEach((u) => URL.revokeObjectURL(u))
    setBlobUrls([])
    setDetailLoading(true)
    try {
      const d = await fetchTaskCenterDetail(taskId)
      setDetail(d)
      const urls: string[] = []
      for (const s of d.screenshots) {
        try {
          urls.push(await loadScreenshotBlob(s.id))
        } catch {
          urls.push('')
        }
      }
      setBlobUrls(urls)
    } finally {
      setDetailLoading(false)
    }
  }

  const onRetry = async (taskId: number) => {
    setBusyId(taskId)
    try {
      await postTaskRetry(taskId)
      addToast({ message: '已重试，任务回到待执行', type: 'success' })
      await loadTasks()
      if (detail?.task.id === taskId) closeDetail()
    } catch {
      addToast({ message: '重试失败（仅失败任务可重试）', type: 'error' })
    } finally {
      setBusyId(null)
    }
  }

  const onDelete = async (taskId: number) => {
    if (!confirm('确定删除该任务？关联日志与截图会一并删除，不可恢复。')) return
    setBusyId(taskId)
    try {
      await deleteTaskCenterTask(taskId)
      addToast({ message: '已删除', type: 'success' })
      await loadTasks()
      if (detail?.task.id === taskId) closeDetail()
    } catch {
      addToast({ message: '删除失败', type: 'error' })
    } finally {
      setBusyId(null)
    }
  }

  const onRedo = async (taskId: number) => {
    if (
      !confirm('将新建一条「再做一次」任务：点击类参数与原任务相同；注册类会保留手机号并重新随机地址、姓名与密码。是否继续？')
    ) {
      return
    }
    setBusyId(taskId)
    try {
      const r = await postTaskRedo(taskId)
      addToast({ message: `已创建新任务 #${r.new_task_id}`, type: 'success' })
      await loadTasks()
    } catch {
      addToast({ message: '再做一次失败（注册类需地址库有数据）', type: 'error' })
    } finally {
      setBusyId(null)
    }
  }

  const taskJsonText = detail ? JSON.stringify(detail.task, null, 2) : ''
  const detailFailed = detail?.task.status === 'failed'

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">任务中心</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          列表 params 列展开为「值1 / 值2 / …」，鼠标悬停查看完整 JSON；「任务快照」按上传顺序全屏浏览该任务全部截图（过程上传与结案 report 附图在同一列表，按 id 时间顺序）。「params 包含」对 params
          原文及遗留关键词/标题/手机号等模糊匹配，输入约 400ms 后请求。筛选会同步到地址栏。
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 p-4 rounded-lg bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
        <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          设备
          <select
            className={selectCls}
            value={deviceId}
            onChange={(e) => setTaskFilters({ device_id: e.target.value })}
          >
            <option value="">全部设备</option>
            {devices.map((d) => (
              <option key={d.device_id} value={d.device_id}>
                {d.alias ? `${d.alias} (${d.device_id})` : d.device_id}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          状态
          <select
            className={selectCls}
            value={status}
            onChange={(e) => setTaskFilters({ status: e.target.value })}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          类型
          <select
            className={selectCls}
            value={taskType}
            onChange={(e) => setTaskFilters({ task_type: e.target.value })}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value || 'allt'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          params 包含
          <input
            type="text"
            className={inpFilter}
            placeholder="如关键词片段、手机号、用户名…"
            value={paramsInput}
            onChange={(e) => setParamsInput(e.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={() => loadTasks()}
          className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
        >
          刷新
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800/30">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-3 py-2 font-medium">ID</th>
                <th className="px-3 py-2 font-medium">设备</th>
                <th className="px-3 py-2 font-medium">类型</th>
                <th className="px-3 py-2 font-medium min-w-[10rem] max-w-[24rem]">params</th>
                <th className="px-3 py-2 font-medium">状态</th>
                <th className="px-3 py-2 font-medium max-w-[8rem]">环境</th>
                <th className="px-3 py-2 font-medium">完成时间</th>
                <th className="px-3 py-2 font-medium min-w-[20rem]">操作</th>
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
                    暂无任务
                  </td>
                </tr>
              ) : (
                data.items.map((row) => {
                  const id = row.id as number
                  const st = String(row.status || '')
                  const did = row.device_id != null ? String(row.device_id) : ''
                  const alias = row.device_alias != null ? String(row.device_alias) : ''
                  const displayDevice = alias || did || '—'
                  return (
                    <tr key={id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{id}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300 max-w-[12rem] truncate" title={did}>
                        {displayDevice}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                        {TASK_TYPE_LABEL[String(row.task_type || '')] || String(row.task_type || '')}
                      </td>
                      <td className="px-3 py-2 align-top max-w-[22rem] min-w-[10rem] overflow-visible">
                        <TaskParamsCell params={row.params} />
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            'inline-flex px-1.5 py-0.5 rounded text-xs font-medium',
                            row.status === 'success' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
                            row.status === 'failed' && 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
                            row.status === 'running' && 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
                            row.status === 'pending' && 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                          )}
                        >
                          {st}
                        </span>
                      </td>
                      <td
                        className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 max-w-[8rem] truncate"
                        title={row.environment != null ? String(row.environment) : ''}
                      >
                        {row.environment != null && row.environment !== '' ? String(row.environment) : '—'}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {row.finished_at != null && row.finished_at !== '' ? String(row.finished_at) : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <button type="button" className={btnSm} onClick={() => openDetail(id)}>
                            详情
                          </button>
                          <button type="button" className={btnSm} onClick={() => openSnapshot(id)}>
                            任务快照
                          </button>
                          <button
                            type="button"
                            className={cn(btnSm, 'text-red-700 dark:text-red-400 border-red-200 dark:border-red-900')}
                            disabled={busyId === id}
                            onClick={() => onDelete(id)}
                          >
                            删除
                          </button>
                          <button type="button" className={btnSm} disabled={busyId === id} onClick={() => onRedo(id)}>
                            再做一次
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

      {snapshotOpen && snapshotTaskId != null && (
        <TaskSnapshotViewer
          taskId={snapshotTaskId}
          loading={snapshotLoading}
          items={snapshotItems}
          index={snapshotIndex}
          onClose={closeSnapshot}
          onSetIndex={setSnapshotIndex}
        />
      )}

      {detailOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" role="presentation" onClick={closeDetail}>
          <div
            className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center gap-2">
              <h2 className="font-semibold text-slate-900 dark:text-white truncate">任务详情 #{detail?.task.id ?? ''}</h2>
              <div className="flex items-center gap-2 shrink-0">
                {detail?.task.id != null && (
                  <button
                    type="button"
                    onClick={() => openSnapshot(detail.task.id)}
                    className="px-2 py-1 rounded text-xs bg-violet-600 text-white hover:bg-violet-700"
                  >
                    任务快照
                  </button>
                )}
                <button type="button" onClick={closeDetail} className="text-slate-500 hover:text-slate-800 dark:hover:text-white text-xl leading-none p-1" aria-label="关闭">
                  ×
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
              {detailLoading && <p className="text-slate-500">加载中…</p>}
              {detail && !detailLoading && (
                <>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">任务数据（JSON）</div>
                    <pre className="whitespace-pre-wrap break-words rounded-md bg-slate-950 text-emerald-100 dark:bg-black/40 dark:text-emerald-200 p-3 max-h-80 overflow-auto text-xs font-mono border border-slate-700">
                      {taskJsonText}
                    </pre>
                  </div>
                  {detailFailed && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">失败摘要</div>
                      <pre className="whitespace-pre-wrap break-words rounded-md bg-slate-50 dark:bg-slate-800 p-3 text-slate-800 dark:text-slate-200 text-xs">
                        {detail.task.failure_detail || '—'}
                      </pre>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-slate-500 mb-1">执行日志</div>
                    <div className="rounded-md bg-slate-50 dark:bg-slate-800 p-3 max-h-48 overflow-y-auto font-mono text-xs text-slate-700 dark:text-slate-300 space-y-1">
                      {detail.logs.length === 0 ? (
                        <span className="text-slate-400">无</span>
                      ) : (
                        detail.logs.map((l) => (
                          <div key={l.id}>
                            <span className="text-slate-400">{l.created_at || ''}</span> {l.body}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">截图</div>
                    <div className="flex flex-wrap gap-2">
                      {detail.screenshots.length === 0 ? (
                        <span className="text-slate-400">无</span>
                      ) : (
                        detail.screenshots.map((s, i) =>
                          blobUrls[i] ? (
                            <a
                              key={s.id}
                              href={blobUrls[i]}
                              target="_blank"
                              rel="noreferrer"
                              className="block w-[8.5rem] shrink-0"
                              title={s.description || undefined}
                            >
                              <img
                                src={blobUrls[i]}
                                alt={s.description || `截图 ${s.id}`}
                                className="max-h-40 w-full object-contain rounded border border-slate-200 dark:border-slate-600"
                              />
                              <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 break-words">
                                {s.description?.trim() ? s.description : `ID ${s.id}`}
                              </div>
                            </a>
                          ) : (
                            <span key={s.id} className="text-slate-400 text-xs">
                              无法加载
                            </span>
                          )
                        )
                      )}
                    </div>
                  </div>
                  <div className="pt-2 flex flex-wrap gap-2 border-t border-slate-100 dark:border-slate-700">
                    {detailFailed && (
                      <button
                        type="button"
                        disabled={busyId === detail.task.id}
                        onClick={() => onRetry(detail.task.id)}
                        className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        重试（清空日志后回待执行）
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === detail.task.id}
                      onClick={() => onRedo(detail.task.id)}
                      className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm disabled:opacity-50"
                    >
                      再做一次
                    </button>
                    <button
                      type="button"
                      disabled={busyId === detail.task.id}
                      onClick={() => onDelete(detail.task.id)}
                      className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50"
                    >
                      删除任务
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
