import { useEffect, useState } from 'react'
import { fetchAdminSettings, patchAdminSettings } from '@/api/amzApi'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/utils/cn'

const inp =
  'w-full max-w-xs rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm'

export function SystemSettingsPage() {
  const { addToast } = useUIStore()
  const [days, setDays] = useState('15')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const r = await fetchAdminSettings()
        if (!cancelled) setDays(String(r.task_retention_days))
      } catch {
        if (!cancelled) addToast({ message: '加载设置失败', type: 'error' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [addToast])

  const save = async () => {
    const n = parseInt(days, 10)
    if (!Number.isFinite(n) || n < 1 || n > 3650) {
      addToast({ message: '保留天数须在 1～3650 之间', type: 'error' })
      return
    }
    setSaving(true)
    try {
      const r = await patchAdminSettings({ task_retention_days: n })
      setDays(String(r.task_retention_days))
      addToast({ message: '已保存，并已按新规则清理过期已完成任务', type: 'success' })
    } catch {
      addToast({ message: '保存失败', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">系统设置</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          进行中与未过期的已完成任务：客户端上报的逐行日志保存在服务端，任务中心可查看完整执行记录，并与截图对照分析。
          超过保留天数后，任务行将被删除，依赖外键级联删除 task_logs 与 task_images 表记录，并删除 data/task_images
          下对应文件。勾选「任务数据归档」的长期存档不受影响。
        </p>
      </div>
      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 space-y-3">
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-400">已完成任务保留天数</span>
          <input
            className={cn(inp, 'mt-1')}
            type="number"
            min={1}
            max={3650}
            disabled={loading}
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={loading || saving}
          onClick={save}
          className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  )
}
