import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchTaskScriptSchedule, updateTaskScriptSchedule, type TaskScriptSchedule } from '@/api/amzApi'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/utils/cn'

const inp =
  'w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm'

type Props = {
  taskType: string
  title: string
}

type FormState = {
  start_year: string
  start_month: string
  start_day: string
  start_hour: string
  start_minute: string
  end_year: string
  end_month: string
  end_day: string
  end_hour: string
  end_minute: string
  description: string
}

function scheduleToForm(s: TaskScriptSchedule): FormState {
  return {
    start_year: String(s.start_year),
    start_month: String(s.start_month),
    start_day: String(s.start_day),
    start_hour: String(s.start_hour).padStart(2, '0'),
    start_minute: String(s.start_minute).padStart(2, '0'),
    end_year: String(s.end_year),
    end_month: String(s.end_month),
    end_day: String(s.end_day),
    end_hour: String(s.end_hour).padStart(2, '0'),
    end_minute: String(s.end_minute).padStart(2, '0'),
    description: s.description || '',
  }
}

function parseIntField(v: string, label: string): number {
  const n = parseInt(v, 10)
  if (Number.isNaN(n)) {
    throw new Error(`${label} 须为数字`)
  }
  return n
}

function DateTimeFields({
  label,
  prefix,
  form,
  onChange,
}: {
  label: string
  prefix: 'start' | 'end'
  form: FormState
  onChange: (key: keyof FormState, value: string) => void
}) {
  const fields: { key: keyof FormState; placeholder: string; max: number; width: string }[] = [
    { key: `${prefix}_year` as keyof FormState, placeholder: '年', max: 2100, width: 'w-20' },
    { key: `${prefix}_month` as keyof FormState, placeholder: '月', max: 12, width: 'w-14' },
    { key: `${prefix}_day` as keyof FormState, placeholder: '日', max: 31, width: 'w-14' },
    { key: `${prefix}_hour` as keyof FormState, placeholder: '时', max: 23, width: 'w-14' },
    { key: `${prefix}_minute` as keyof FormState, placeholder: '分', max: 59, width: 'w-14' },
  ]
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}（北京时间 24 小时制）</div>
      <div className="flex flex-wrap items-center gap-1.5">
        {fields.map((f, idx) => (
          <span key={f.key} className="flex items-center gap-1">
            <input
              className={cn(inp, f.width, 'text-center')}
              type="number"
              min={0}
              max={f.max}
              placeholder={f.placeholder}
              value={form[f.key]}
              onChange={(e) => onChange(f.key, e.target.value)}
            />
            {idx < fields.length - 1 && <span className="text-xs text-slate-400">/</span>}
          </span>
        ))}
      </div>
    </div>
  )
}

export function TaskScriptSchedulePanel({ taskType, title }: Props) {
  const { addToast } = useUIStore()
  const [schedule, setSchedule] = useState<TaskScriptSchedule | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const s = await fetchTaskScriptSchedule(taskType)
      setSchedule(s)
      setForm(scheduleToForm(s))
    } catch {
      addToast({ message: '加载运行时段配置失败', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [addToast, taskType])

  useEffect(() => {
    void load()
  }, [load])

  const onField = (key: keyof FormState, value: string) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const preview = useMemo(() => {
    if (!schedule) return null
    return {
      inWindow: schedule.in_window,
      startDisplay: schedule.start_display,
      endDisplay: schedule.end_display,
      durationDisplay: schedule.duration_display,
    }
  }, [schedule])

  const save = async () => {
    if (!form) return
    setSaving(true)
    try {
      const body = {
        start_year: parseIntField(form.start_year, '开始年'),
        start_month: parseIntField(form.start_month, '开始月'),
        start_day: parseIntField(form.start_day, '开始日'),
        start_hour: parseIntField(form.start_hour, '开始时'),
        start_minute: parseIntField(form.start_minute, '开始分'),
        end_year: parseIntField(form.end_year, '结束年'),
        end_month: parseIntField(form.end_month, '结束月'),
        end_day: parseIntField(form.end_day, '结束日'),
        end_hour: parseIntField(form.end_hour, '结束时'),
        end_minute: parseIntField(form.end_minute, '结束分'),
        description: form.description.trim(),
      }
      const s = await updateTaskScriptSchedule(taskType, body)
      setSchedule(s)
      setForm(scheduleToForm(s))
      addToast({ message: '运行时段与脚本说明已保存', type: 'success' })
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || '保存失败'
      addToast({ message: String(msg), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30">
      <h2 className="text-sm font-semibold">运行时段与脚本说明</h2>
      <p className="text-xs text-slate-500">{title}</p>

      {loading || !form ? (
        <p className="text-sm text-slate-500">加载中…</p>
      ) : (
        <>
          <div className="space-y-3 rounded-md border border-slate-100 dark:border-slate-700 p-3 bg-slate-50/80 dark:bg-slate-900/20">
            <DateTimeFields label="开始时间" prefix="start" form={form} onChange={onField} />
            <DateTimeFields label="结束时间" prefix="end" form={form} onChange={onField} />
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? '保存中…' : '保存时段与说明'}
            </button>
            <p className="text-xs text-slate-500">支持跨天时段。仅在此时间段内客户端才能领取并执行该类型任务。</p>
          </div>

          {preview && (
            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
              <div>
                当前状态：
                <span className={cn('font-medium', preview.inWindow ? 'text-green-600' : 'text-amber-600')}>
                  {preview.inWindow ? '在可执行时段内' : '不在可执行时段内'}
                </span>
              </div>
              <div>运行开始：{preview.startDisplay}</div>
              <div>运行结束：{preview.endDisplay}</div>
              <div>时段长度：{preview.durationDisplay}</div>
            </div>
          )}

          <label className="block text-sm space-y-1">
            <span className="text-slate-600 dark:text-slate-400">脚本功能说明（可编辑）</span>
            <textarea
              className={cn(inp, 'min-h-[180px]')}
              value={form.description}
              onChange={(e) => onField('description', e.target.value)}
              placeholder="描述该脚本做什么、主要步骤与大致耗时，方便运营人员了解"
            />
          </label>
        </>
      )}
    </div>
  )
}
