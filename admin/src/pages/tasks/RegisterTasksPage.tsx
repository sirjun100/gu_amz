import { useEffect, useState, useMemo } from 'react'
import { fetchDeviceOptions, postBatchRegister } from '@/api/amzApi'
import type { DeviceOption } from '@/types/amz'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/utils/cn'

const ta =
  'w-full min-h-[200px] rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono'

const inp =
  'w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm'

export function RegisterTasksPage() {
  const { addToast } = useUIStore()
  const [devices, setDevices] = useState<DeviceOption[]>([])
  const [raw, setRaw] = useState('')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [mode, setMode] = useState<'manual' | 'smart'>('smart')
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [saveDataRecord, setSaveDataRecord] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchDeviceOptions().then((r) => setDevices(r.items || []))
  }, [])

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected])
  const phoneLines = useMemo(() => {
    let n = 0
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim()
      if (!t) continue
      const first = t.split('\t')[0].split(',')[0].trim()
      if (first) n++
    }
    return n
  }, [raw])

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
    if (!raw.trim()) {
      addToast({ message: '请填写手机号，一行一个', type: 'error' })
      return
    }
    if (selectedIds.length === 0) {
      addToast({ message: '请至少选择一台设备', type: 'error' })
      return
    }
    const per_device_counts: Record<string, number> = {}
    if (mode === 'manual') {
      let sum = 0
      for (const id of selectedIds) {
        const n = parseInt(counts[id] || '0', 10) || 0
        if (n > 0) {
          per_device_counts[id] = n
          sum += n
        }
      }
      if (sum !== phoneLines) {
        addToast({
          message: `手动分配：各设备任务数之和须为 ${phoneLines}（当前 ${sum}，与手机号行数一致）`,
          type: 'error',
        })
        return
      }
    }
    setLoading(true)
    try {
      const r = await postBatchRegister({
        mode,
        device_ids: selectedIds,
        per_device_counts: mode === 'manual' ? per_device_counts : {},
        raw_text: raw,
        save_data_record: saveDataRecord,
      })
      addToast({ message: `已创建 ${r.created} 条注册任务（用户名取自随机地址的姓名，密码已自动生成）`, type: 'success' })
      setRaw('')
    } catch {
      addToast({ message: '创建失败（请确认地址库已导入、设备数与分配正确）', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">自动注册任务</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          每行一个<strong>手机号</strong>。用户名从<strong>地址管理</strong>中随机抽取一条地址的<strong>姓名</strong>；密码由系统生成（10
          位：含大写、小写、1 个特殊字符、多位数字）。选择设备后<strong>智能均分</strong>或<strong>手动</strong>指定每机任务数（须与手机号行数一致）。
        </p>
      </div>

      <label className="block text-sm">
        <span className="text-slate-600 dark:text-slate-400">手机号列表（当前 {phoneLines} 行）</span>
        <textarea
          className={cn(ta, 'mt-1')}
          placeholder={'13800138000\n13900139000'}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
      </label>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-sm text-slate-600 dark:text-slate-400">执行设备（多选）</span>
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

      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="rmode" checked={mode === 'smart'} onChange={() => setMode('smart')} />
          智能均分（按 N 条手机号均分到所选设备）
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="rmode" checked={mode === 'manual'} onChange={() => setMode('manual')} />
          手动分配
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={saveDataRecord} onChange={(e) => setSaveDataRecord(e.target.checked)} />
        <span>保存数据记录（默认勾选：账号/密码/地址等写入「任务数据归档」，结案后追加成功或失败状态）</span>
      </label>

      {mode === 'manual' && (
        <div className="space-y-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <div className="text-xs text-slate-500">选中设备上各填任务条数，总和须等于 {phoneLines} 行手机号</div>
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
        disabled={loading}
        onClick={submit}
        className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? '提交中…' : '批量创建'}
      </button>
      <p className="text-xs text-slate-500">任务详情与密码可在「任务中心」查看（领取前为待执行状态）。</p>
    </div>
  )
}
