import { useEffect, useMemo, useState } from 'react'
import { fetchDeviceOptions, postBatchGenerateNewEnvironment } from '@/api/amzApi'
import type { DeviceOption } from '@/types/amz'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/utils/cn'

const inp =
  'w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm'

export function GenerateNewEnvironmentPage() {
  const { addToast } = useUIStore()
  const [devices, setDevices] = useState<DeviceOption[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [mode, setMode] = useState<'manual' | 'smart'>('smart')
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [totalCount, setTotalCount] = useState('10')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchDeviceOptions().then((r) => setDevices(r.items || []))
  }, [])

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected])

  const toggle = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }))

  const selectAllDevices = () => {
    const next: Record<string, boolean> = {}
    devices.forEach((d) => {
      next[d.device_id] = true
    })
    setSelected(next)
  }

  const selectNoDevices = () => setSelected({})

  const submit = async () => {
    if (selectedIds.length === 0) {
      addToast({ message: '请至少选择一台设备', type: 'error' })
      return
    }

    const per_device_counts: Record<string, number> = {}
    let nTasks = 0
    if (mode === 'manual') {
      for (const id of selectedIds) {
        const n = parseInt(counts[id] || '0', 10) || 0
        if (n > 0) {
          per_device_counts[id] = n
          nTasks += n
        }
      }
      if (nTasks <= 0) {
        addToast({ message: '手动模式请为选中设备填写大于 0 的任务数', type: 'error' })
        return
      }
    } else {
      nTasks = parseInt(totalCount, 10) || 0
      if (nTasks <= 0) {
        addToast({ message: '智能模式请填写总任务数', type: 'error' })
        return
      }
    }

    setSubmitting(true)
    try {
      const r = await postBatchGenerateNewEnvironment({
        mode,
        device_ids: selectedIds,
        per_device_counts: mode === 'manual' ? per_device_counts : {},
        total_count: mode === 'smart' ? nTasks : 0,
      })
      addToast({ message: `已创建 ${r.created} 条生成新环境任务`, type: 'success' })
    } catch {
      addToast({ message: '创建失败', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">生成新环境</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          选择设备和任务数量后，客户端会领取生成新环境任务并执行对应脚本。
        </p>
      </div>

      <div className="space-y-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">选择设备（多选）</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={selectAllDevices}
                disabled={devices.length === 0}
                className="px-2 py-1 rounded text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40"
              >
                全选
              </button>
              <button
                type="button"
                onClick={selectNoDevices}
                disabled={devices.length === 0}
                className="px-2 py-1 rounded text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40"
              >
                全不选
              </button>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-100 dark:border-slate-700 rounded-md p-2">
            {devices.length === 0 ? (
              <p className="text-sm text-slate-500">暂无设备，请先让客户端上报心跳</p>
            ) : (
              devices.map((d) => (
                <label key={d.device_id} className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
                  <input type="checkbox" checked={!!selected[d.device_id]} onChange={() => toggle(d.device_id)} />
                  <span className="font-mono text-xs">{d.alias || d.device_id}</span>
                  <span className="text-slate-400 text-xs truncate">{d.device_id}</span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="flex gap-4 text-sm flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="generate-env-mode" checked={mode === 'smart'} onChange={() => setMode('smart')} />
            智能均分
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="generate-env-mode" checked={mode === 'manual'} onChange={() => setMode('manual')} />
            手动分配
          </label>
        </div>

        {mode === 'smart' && (
          <label className="block text-sm max-w-xs">
            <span className="text-slate-600 dark:text-slate-400">总任务数（按选中设备均分，余数依次多 1）</span>
            <input
              className={cn(inp, 'mt-1')}
              type="number"
              min={1}
              value={totalCount}
              onChange={(e) => setTotalCount(e.target.value)}
            />
          </label>
        )}

        {mode === 'manual' && (
          <div className="space-y-2">
            <div className="text-xs text-slate-500">为选中设备填写各自任务条数</div>
            {selectedIds.map((id) => (
              <div key={id} className="flex items-center gap-2 text-sm">
                <span className="font-mono text-xs w-40 truncate">{id}</span>
                <input
                  className={cn(inp, 'w-24')}
                  type="number"
                  min={0}
                  placeholder="0"
                  value={counts[id] ?? ''}
                  onChange={(e) => setCounts((c) => ({ ...c, [id]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? '提交中...' : '创建任务'}
        </button>
      </div>
    </div>
  )
}
