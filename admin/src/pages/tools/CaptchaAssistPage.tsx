import { useCallback, useEffect, useState } from 'react'
import { fetchCaptchaAssistPending, postCaptchaAssistSubmit } from '@/api/amzApi'
import type { CaptchaAssistPendingItem } from '@/types/amz'
import { getApiBase } from '@/utils/apiBase'
import { cn } from '@/utils/cn'

export function CaptchaAssistPage() {
  const [items, setItems] = useState<CaptchaAssistPendingItem[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [points, setPoints] = useState<{ x: number; y: number }[]>([])
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await fetchCaptchaAssistPending()
      setItems(r.items ?? [])
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const t = window.setInterval(load, 2000)
    return () => window.clearInterval(t)
  }, [load])

  useEffect(() => {
    if (selectedId == null) {
      setBlobUrl(null)
      return
    }
    setPoints([])
    let revoke: string | null = null
    ;(async () => {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(`${getApiBase()}/admin/captcha-assist/sessions/${selectedId}/image`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        setBlobUrl(null)
        return
      }
      const b = await res.blob()
      const url = URL.createObjectURL(b)
      revoke = url
      setBlobUrl(url)
    })()
    return () => {
      if (revoke) URL.revokeObjectURL(revoke)
    }
  }, [selectedId])

  const onImgClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const rect = img.getBoundingClientRect()
    const nw = img.naturalWidth
    const nh = img.naturalHeight
    if (!nw || !nh) return
    const rx = (e.clientX - rect.left) / rect.width
    const ry = (e.clientY - rect.top) / rect.height
    setPoints((p) => [...p, { x: Math.round(rx * nw), y: Math.round(ry * nh) }])
  }

  const submit = async () => {
    if (selectedId == null || points.length === 0) return
    setSubmitting(true)
    try {
      await postCaptchaAssistSubmit(selectedId, points)
      setSelectedId(null)
      setPoints([])
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  const selected = items.find((x) => x.id === selectedId)

  return (
    <div className="space-y-4 max-w-6xl">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">人工验证码协助</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          客户端上传全屏截图后，在此点击图片依次标注位置（与设备像素一致），提交后设备按顺序点击。本页每 2 秒刷新待处理队列；客户端若 1
          分钟内未收到坐标会自行失败。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 p-3 max-h-[70vh] overflow-y-auto">
          <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">待处理</div>
          {items.length === 0 ? (
            <p className="text-sm text-slate-500">暂无</p>
          ) : (
            <ul className="space-y-1">
              {items.map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(it.id)}
                    className={cn(
                      'w-full text-left px-2 py-2 rounded-md text-sm transition-colors',
                      selectedId === it.id
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                    )}
                  >
                    <span className="font-mono">#{it.id}</span> 任务 {it.task_id}{' '}
                    <span className="opacity-80 truncate block text-xs">{it.device_id ?? ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 p-3 space-y-3">
          {!selectedId || !blobUrl ? (
            <p className="text-sm text-slate-500">左侧选择一条会话，在图上依次点击目标位置。</p>
          ) : (
            <>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                任务 <span className="font-mono">{selected?.task_id}</span> · 图幅 {selected?.img_width}×{selected?.img_height}{' '}
                · 已点 {points.length} 处
              </div>
              <div className="relative inline-block max-w-full border border-slate-200 dark:border-slate-600 rounded overflow-hidden">
                {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
                <img
                  src={blobUrl}
                  alt="验证码截图"
                  className="max-w-full max-h-[min(70vh,560px)] w-auto h-auto cursor-crosshair block"
                  onClick={onImgClick}
                  draggable={false}
                />
              </div>
              {points.length > 0 && (
                <ol className="text-xs font-mono text-slate-600 dark:text-slate-400 list-decimal pl-5">
                  {points.map((p, i) => (
                    <li key={`${p.x},${p.y},${i}`}>
                      ({p.x}, {p.y})
                    </li>
                  ))}
                </ol>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPoints([])}
                  className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm"
                >
                  清空坐标
                </button>
                <button
                  type="button"
                  disabled={points.length === 0 || submitting}
                  onClick={() => void submit()}
                  className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50"
                >
                  {submitting ? '提交中…' : '提交坐标'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
