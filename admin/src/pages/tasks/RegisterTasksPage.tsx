import { useEffect, useState, useMemo, useCallback } from 'react'
import { fetchDeviceOptions, fetchRegisterCodePoolsStats, postBatchRegister } from '@/api/amzApi'
import type { DeviceOption } from '@/types/amz'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/utils/cn'

const inp =
  'w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm'

export function RegisterTasksPage() {
  const { addToast } = useUIStore()
  const [devices, setDevices] = useState<DeviceOption[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [mode, setMode] = useState<'manual' | 'smart'>('smart')
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [totalCount, setTotalCount] = useState('10')
  const [bindEmail, setBindEmail] = useState(false)
  const [saveDataRecord, setSaveDataRecord] = useState(true)
  const [loading, setLoading] = useState(false)
  const [poolStats, setPoolStats] = useState<{
    phone_available: number
    email_available: number
  } | null>(null)

  const loadStats = useCallback(() => {
    fetchRegisterCodePoolsStats()
      .then((s) => setPoolStats({ phone_available: s.phone_available, email_available: s.email_available }))
      .catch(() => setPoolStats(null))
  }, [])

  useEffect(() => {
    fetchDeviceOptions().then((r) => setDevices(r.items || []))
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

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
      let sum = 0
      for (const id of selectedIds) {
        const n = parseInt(counts[id] || '0', 10) || 0
        if (n > 0) {
          per_device_counts[id] = n
          sum += n
        }
      }
      if (sum <= 0) {
        addToast({ message: '手动模式请为选中设备填写大于 0 的任务数', type: 'error' })
        return
      }
      nTasks = sum
    } else {
      const total = parseInt(totalCount, 10) || 0
      if (total <= 0) {
        addToast({ message: '智能模式请填写总任务数', type: 'error' })
        return
      }
      nTasks = total
    }

    if (poolStats && nTasks > poolStats.phone_available) {
      addToast({
        message: `手机接码库可用仅 ${poolStats.phone_available} 条，不足以创建 ${nTasks} 个任务（请先导入接码库）`,
        type: 'error',
      })
      return
    }
    if (bindEmail && poolStats && nTasks > poolStats.email_available) {
      addToast({
        message: `邮箱接码库可用仅 ${poolStats.email_available} 条，不足以绑定 ${nTasks} 个任务`,
        type: 'error',
      })
      return
    }

    setLoading(true)
    try {
      const r = await postBatchRegister({
        mode,
        device_ids: selectedIds,
        per_device_counts: mode === 'manual' ? per_device_counts : {},
        total_count: mode === 'smart' ? nTasks : 0,
        bind_email: bindEmail,
        save_data_record: saveDataRecord,
      })
      addToast({
        message: `已创建 ${r.created} 条注册任务（手机号与接码链接来自接码库；亚马逊登录密码已按规则生成）`,
        type: 'success',
      })
      loadStats()
    } catch {
      addToast({ message: '创建失败（请确认地址库、接码库条数与设备分配）', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">创建亚马逊注册任务</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          手机号与<strong>手机接码链接</strong>从「资源管理 → 手机接码管理」按顺序各取一条（一次性）；用户名从地址库随机地址的姓名；亚马逊账号密码由系统生成（含数字、大小写，特殊字符仅{' '}
          <span className="font-mono">.</span> 与 <span className="font-mono">@</span>）。可选绑定邮箱接码库一条（与任务一一对应）。
        </p>
        {poolStats && (
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
            接码库余量：手机 <strong>{poolStats.phone_available}</strong> 条
            {bindEmail && (
              <>
                {' '}
                · 邮箱 <strong>{poolStats.email_available}</strong> 条
              </>
            )}
          </p>
        )}
      </div>

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

      <div className="flex gap-4 text-sm flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="rmode" checked={mode === 'smart'} onChange={() => setMode('smart')} />
          智能均分（填写总任务数，按设备均分；每条任务消耗手机接码库 1 条）
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="rmode" checked={mode === 'manual'} onChange={() => setMode('manual')} />
          手动分配
        </label>
      </div>

      {mode === 'smart' && (
        <label className="block text-sm max-w-xs">
          <span className="text-slate-600 dark:text-slate-400">总任务数</span>
          <input
            className={cn(inp, 'mt-1')}
            type="number"
            min={1}
            value={totalCount}
            onChange={(e) => setTotalCount(e.target.value)}
          />
        </label>
      )}

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={bindEmail} onChange={(e) => setBindEmail(e.target.checked)} />
        <span>
          绑定邮箱接码库（每个任务额外消耗邮箱库 1 条：邮箱、邮箱登录密码、邮箱接码链接写入任务参数）
        </span>
      </label>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={saveDataRecord} onChange={(e) => setSaveDataRecord(e.target.checked)} />
        <span>保存数据记录（默认勾选：账号/密码/地址等写入「任务数据归档」，结案后追加成功或失败状态）</span>
      </label>

      {mode === 'manual' && (
        <div className="space-y-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <div className="text-xs text-slate-500">为选中设备填写任务条数；总和即创建任务数（须不超过手机接码库可用条数）</div>
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
      <p className="text-xs text-slate-500">
        请先在侧边栏「资源管理 → 手机接码管理」导入手机号与链接（邮箱则在「邮箱接码管理」）。任务详情与 <span className="font-mono">task_id</span> 可在「任务中心」查看；接码库列表会显示{' '}
        <span className="font-mono">register_task_id</span> 关联。
      </p>
    </div>
  )
}
