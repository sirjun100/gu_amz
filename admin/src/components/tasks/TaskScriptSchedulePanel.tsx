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
  start_hour: string
  start_minute: string
  end_hour: string
  end_minute: string
  description: string
}

function scheduleToForm(s: TaskScriptSchedule): FormState {
  const enabled = s.schedule_enabled
  return {
    start_hour: enabled && s.start_hour != null ? String(s.start_hour) : '',
    start_minute: enabled && s.start_minute != null ? String(s.start_minute) : '',
    end_hour: enabled && s.end_hour != null ? String(s.end_hour) : '',
    end_minute: enabled && s.end_minute != null ? String(s.end_minute) : '',
    description: s.description || '',
  }
}

function parseIntField(
  v: string,
  label: string,
  min: number,
  max: number,
  emptyDefault?: number
): number {
  const raw = String(v ?? '').trim()
  if (raw === '' && emptyDefault !== undefined) {
    return emptyDefault
  }
  const n = parseInt(raw, 10)
  if (Number.isNaN(n) || n < min || n > max) {
    throw new Error(`${label} 须在 ${min}-${max} 之间`)
  }
  return n
}

function formatApiError(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message && e.message !== 'Network Error') {
    return e.message
  }
  const ax = e as { response?: { status?: number; data?: { detail?: unknown } }; message?: string }
  const status = ax.response?.status
  const detail = ax.response?.data?.detail
  if (status === 401) return '登录已过期，请重新登录后再保存'
  if (status === 403) return '需要管理员权限'
  if (typeof detail === 'string' && detail.trim()) {
    return detail
  }
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && 'msg' in item) {
          return String((item as { msg?: string }).msg || '')
        }
        return ''
      })
      .filter(Boolean)
    if (msgs.length) return msgs.join('；')
  }
  if (ax.message === 'Network Error') return '网络错误，请确认服务已启动'
  if (status) return `${fallback}（HTTP ${status}）`
  return fallback
}

function formatTimeDisplay(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function buildPreviewFromTimes(
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number
) {
  const startM = startHour * 60 + startMinute
  const endM = endHour * 60 + endMinute
  const crossDay = startM > endM
  let durationM = endM - startM
  if (durationM <= 0) durationM += 24 * 60
  const hours = Math.floor(durationM / 60)
  const minutes = durationM % 60
  const durationParts: string[] = []
  if (hours) durationParts.push(`${hours}小时`)
  if (minutes || !durationParts.length) durationParts.push(`${minutes}分钟`)
  return {
    startDisplay: `每天 ${formatTimeDisplay(startHour, startMinute)}（北京时间）`,
    endDisplay: `每天 ${formatTimeDisplay(endHour, endMinute)}（北京时间）${crossDay ? '，次日' : ''}`,
    durationDisplay: `每段 ${durationParts.join('')}`,
    crossDay,
  }
}

function TimeFields({
  label,
  hourKey,
  minuteKey,
  form,
  onChange,
}: {
  label: string
  hourKey: 'start_hour' | 'end_hour'
  minuteKey: 'start_minute' | 'end_minute'
  form: FormState
  onChange: (key: keyof FormState, value: string) => void
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</div>
      <div className="flex items-center gap-1.5">
        <input
          className={cn(inp, 'w-16 text-center')}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="时"
          value={form[hourKey]}
          onChange={(e) => onChange(hourKey, e.target.value.replace(/[^\d]/g, ''))}
        />
        <span className="text-slate-500">:</span>
        <input
          className={cn(inp, 'w-16 text-center')}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="分"
          value={form[minuteKey]}
          onChange={(e) => onChange(minuteKey, e.target.value.replace(/[^\d]/g, ''))}
        />
        <span className="text-xs text-slate-400">24 小时制</span>
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
    if (!form) return null

    const hasStart = form.start_hour.trim() !== ''
    const hasEnd = form.end_hour.trim() !== ''
    if (!hasStart && !hasEnd) {
      return {
        configured: false as const,
        inWindow: schedule?.in_window ?? true,
        runModeDisplay: schedule?.run_mode_display ?? '未设置（全天可执行）',
        hint: '请在上方填写每日开始/结束的时、分后保存。结束时刻早于开始时刻即为跨天（如 22:00 → 次日 09:00）。',
      }
    }
    try {
      const startHour = parseIntField(form.start_hour, '开始时', 0, 23)
      const startMinute = parseIntField(form.start_minute, '开始分', 0, 59, 0)
      const endHour = parseIntField(form.end_hour, '结束时', 0, 23)
      const endMinute = parseIntField(form.end_minute, '结束分', 0, 59, 0)
      const times = buildPreviewFromTimes(startHour, startMinute, endHour, endMinute)
      const savedMatchesForm =
        schedule?.schedule_enabled &&
        schedule.start_hour === startHour &&
        schedule.start_minute === startMinute &&
        schedule.end_hour === endHour &&
        schedule.end_minute === endMinute
      return {
        configured: true as const,
        inWindow: savedMatchesForm ? (schedule?.in_window ?? false) : (schedule?.in_window ?? false),
        runModeDisplay: savedMatchesForm
          ? (schedule?.run_mode_display ?? '自定义每日时段')
          : '自定义每日时段（保存后生效）',
        ...times,
        fromSaved: savedMatchesForm,
      }
    } catch {
      return {
        configured: false as const,
        inWindow: schedule?.in_window ?? true,
        runModeDisplay: schedule?.run_mode_display ?? '未设置（全天可执行）',
        hint: '请完整填写有效的时、分后再保存。',
      }
    }
  }, [form, schedule])

  const save = async () => {
    if (!form) return
    if (!form.start_hour.trim() || !form.end_hour.trim()) {
      addToast({ message: '请填写开始与结束的「时」后再保存', type: 'error' })
      return
    }
    setSaving(true)
    try {
      const body = {
        start_hour: parseIntField(form.start_hour, '开始时', 0, 23),
        start_minute: parseIntField(form.start_minute, '开始分', 0, 59, 0),
        end_hour: parseIntField(form.end_hour, '结束时', 0, 23),
        end_minute: parseIntField(form.end_minute, '结束分', 0, 59, 0),
        description: form.description.trim(),
      }
      const s = await updateTaskScriptSchedule(taskType, body)
      setSchedule(s)
      setForm({
        start_hour: String(body.start_hour),
        start_minute: String(body.start_minute),
        end_hour: String(body.end_hour),
        end_minute: String(body.end_minute),
        description: s.description || body.description,
      })
      const sh = String(body.start_hour).padStart(2, '0')
      const sm = String(body.start_minute).padStart(2, '0')
      const eh = String(body.end_hour).padStart(2, '0')
      const em = String(body.end_minute).padStart(2, '0')
      addToast({
        message: `已保存运行时段 ${sh}:${sm} → ${eh}:${em}（北京时间）`,
        type: 'success',
      })
    } catch (e: unknown) {
      addToast({ message: formatApiError(e, '保存失败'), type: 'error' })
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
          {/* 时段设置：面板上方 */}
          <div className="space-y-3 rounded-md border border-slate-100 dark:border-slate-700 p-3 bg-slate-50/80 dark:bg-slate-900/20">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              自定义运行时段（北京时间，24 小时制）
            </p>
            <p className="text-xs text-slate-500">
              支持跨天，例如 22:00 → 09:00（次日）。时段内可领取并执行；时段外不会领取，也不会标为 running。
            </p>
            <TimeFields label="每天开始" hourKey="start_hour" minuteKey="start_minute" form={form} onChange={onField} />
            <TimeFields label="每天结束" hourKey="end_hour" minuteKey="end_minute" form={form} onChange={onField} />
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? '保存中…' : '保存时段与说明'}
            </button>
          </div>

          {/* 运行时间展示 */}
          {preview && (
            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
              <div>
                运行模式：<span className="font-medium">{preview.runModeDisplay}</span>
              </div>
              <div>
                当前状态：
                <span className={cn('font-medium', preview.inWindow ? 'text-green-600' : 'text-amber-600')}>
                  {preview.inWindow ? '在可执行时段内' : '不在可执行时段内'}
                </span>
              </div>
              {preview.configured ? (
                <div className="rounded border border-slate-100 dark:border-slate-700 p-2 space-y-0.5">
                  <div className="font-medium">{preview.fromSaved ? '已保存的运行时段' : '运行时段预览'}</div>
                  <div>开始：{preview.startDisplay}</div>
                  <div>结束：{preview.endDisplay}</div>
                  <div>时长：{preview.durationDisplay}</div>
                  {preview.crossDay && <div className="text-amber-600">跨天时段</div>}
                </div>
              ) : (
                <div className="rounded border border-slate-100 dark:border-slate-700 p-2 text-slate-500">
                  {preview.hint}
                </div>
              )}
              <p className="text-slate-500 pt-1">
                规则：在自定义时段内（含跨天）可领取并执行；不在时段内则获取不到任务，且状态不会被标为 running。
              </p>
            </div>
          )}

          {/* 脚本说明：面板下方 */}
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
