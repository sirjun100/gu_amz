import { useEffect, useMemo, useState } from 'react'
import {
  createAppIdentifyPool,
  deleteAppIdentifyPool,
  fetchAppIdentifyPools,
  fetchDeviceOptions,
  postBatchClickApp,
  updateAppIdentifyPool,
  type AppIdentifyPoolRow,
} from '@/api/amzApi'
import type { DeviceOption } from '@/types/amz'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/utils/cn'

const inp =
  'w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm'

type AppClickTaskPageProps = {
  taskType?: string
  title?: string
}

export function AppClickTaskPage({
  taskType = 'search_click_app',
  title = '搜索产品点击APP版本',
}: AppClickTaskPageProps) {
  const { addToast } = useUIStore()
  const [devices, setDevices] = useState<DeviceOption[]>([])
  const [pools, setPools] = useState<AppIdentifyPoolRow[]>([])
  const [poolId, setPoolId] = useState('')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [mode, setMode] = useState<'manual' | 'smart'>('manual')
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [totalCount, setTotalCount] = useState('100')
  const [saveDataRecord, setSaveDataRecord] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [newIdentifyWord, setNewIdentifyWord] = useState('')
  const [newKeywords, setNewKeywords] = useState('')
  const [newPrices, setNewPrices] = useState('')
  const [editingPoolId, setEditingPoolId] = useState<number | null>(null)

  const load = async () => {
    const [d, p] = await Promise.all([fetchDeviceOptions(), fetchAppIdentifyPools()])
    setDevices(d.items || [])
    setPools(p.items || [])
  }
  useEffect(() => {
    void load()
  }, [])

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected])
  const toggle = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }))

  const parseFormKeywords = () =>
    newKeywords
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean)
  const parseFormPrices = () =>
    newPrices
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)

  const resetForm = () => {
    setNewIdentifyWord('')
    setNewKeywords('')
    setNewPrices('')
    setEditingPoolId(null)
  }

  const onCreatePool = async () => {
    const kws = parseFormKeywords()
    const prs = parseFormPrices()
    if (!newIdentifyWord.trim() || kws.length === 0) {
      addToast({ message: '识别词和搜索词不能为空', type: 'error' })
      return
    }
    try {
      if (editingPoolId != null) {
        await updateAppIdentifyPool(editingPoolId, {
          identify_word: newIdentifyWord.trim(),
          keywords: kws,
          prices: prs,
        })
      } else {
        await createAppIdentifyPool({ identify_word: newIdentifyWord.trim(), keywords: kws, prices: prs })
      }
      resetForm()
      await load()
      addToast({ message: editingPoolId != null ? '识别词配置已更新' : '识别词配置已创建', type: 'success' })
    } catch (e: any) {
      addToast({ message: e?.response?.data?.detail || '创建失败', type: 'error' })
    }
  }

  const submit = async () => {
    const pid = parseInt(poolId, 10) || 0
    if (pid <= 0) {
      addToast({ message: '请选择识别词配置', type: 'error' })
      return
    }
    if (selectedIds.length === 0) {
      addToast({ message: '请至少选择一台设备', type: 'error' })
      return
    }
    const per_device_counts: Record<string, number> = {}
    if (mode === 'manual') {
      for (const id of selectedIds) {
        const n = parseInt(counts[id] || '0', 10) || 0
        if (n > 0) per_device_counts[id] = n
      }
      if (Object.keys(per_device_counts).length === 0) {
        addToast({ message: '手动模式请填写任务数量', type: 'error' })
        return
      }
    }
    const total = parseInt(totalCount, 10) || 0
    if (mode === 'smart' && total <= 0) {
      addToast({ message: '智能模式请填写总任务数', type: 'error' })
      return
    }
    setSubmitting(true)
    try {
      const r = await postBatchClickApp({
        task_type: taskType,
        identify_pool_id: pid,
        mode,
        device_ids: selectedIds,
        per_device_counts: mode === 'manual' ? per_device_counts : {},
        total_count: mode === 'smart' ? total : 0,
        save_data_record: saveDataRecord,
      })
      addToast({ message: `已创建 ${r.created} 条任务`, type: 'success' })
    } catch (e: any) {
      addToast({ message: e?.response?.data?.detail || '创建失败', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30">
          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-400">选择识别词配置</span>
            <select className={cn(inp, 'mt-1')} value={poolId} onChange={(e) => setPoolId(e.target.value)}>
              <option value="">请选择</option>
              {pools.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.identify_word}（搜索词{p.keywords?.length || 0}，价格{p.prices?.length || 0}）
                </option>
              ))}
            </select>
          </label>
          <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-100 dark:border-slate-700 rounded-md p-2">
            {devices.map((d) => (
              <label key={d.device_id} className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
                <input type="checkbox" checked={!!selected[d.device_id]} onChange={() => toggle(d.device_id)} />
                <span className="font-mono text-xs">{d.alias || d.device_id}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="mode" checked={mode === 'manual'} onChange={() => setMode('manual')} />
              手动分配
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="mode" checked={mode === 'smart'} onChange={() => setMode('smart')} />
              智能均分
            </label>
          </div>
          {mode === 'manual' &&
            selectedIds.map((id) => (
              <div key={id} className="flex items-center gap-2 text-sm">
                <span className="font-mono text-xs w-40 truncate">{id}</span>
                <input className={cn(inp, 'w-24')} type="number" min={0} value={counts[id] ?? ''} onChange={(e) => setCounts((c) => ({ ...c, [id]: e.target.value }))} />
              </div>
            ))}
          {mode === 'smart' && (
            <input className={cn(inp, 'max-w-xs')} type="number" min={1} value={totalCount} onChange={(e) => setTotalCount(e.target.value)} />
          )}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={saveDataRecord} onChange={(e) => setSaveDataRecord(e.target.checked)} />
            <span>保存数据记录</span>
          </label>
          <button type="button" disabled={submitting} onClick={submit} className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
            {submitting ? '提交中…' : '创建任务'}
          </button>
          <p className="text-xs text-slate-500">系统会在该识别词配置里随机抽取 3 个搜索词，价格全量带上。</p>
        </div>

        <div className="space-y-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30">
          <h2 className="text-sm font-semibold">识别词管理</h2>
          {editingPoolId != null && <p className="text-xs text-amber-600">正在编辑 ID {editingPoolId}</p>}
          <input className={inp} placeholder="识别词（品牌）" value={newIdentifyWord} onChange={(e) => setNewIdentifyWord(e.target.value)} />
          <textarea className={inp} rows={6} placeholder="搜索词（每行一个）" value={newKeywords} onChange={(e) => setNewKeywords(e.target.value)} />
          <input className={inp} placeholder="价格（英文逗号分隔）" value={newPrices} onChange={(e) => setNewPrices(e.target.value)} />
          <div className="flex gap-2">
            <button type="button" onClick={onCreatePool} className="px-3 py-1.5 rounded-md bg-slate-900 text-white text-sm">
              {editingPoolId != null ? '保存编辑' : '新增识别词配置'}
            </button>
            {editingPoolId != null && (
              <button type="button" onClick={resetForm} className="px-3 py-1.5 rounded-md border text-sm">
                取消编辑
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {pools.map((p) => (
              <div key={p.id} className="border rounded p-2 text-xs">
                <div className="font-semibold">{p.identify_word}</div>
                <div>搜索词: {(p.keywords || []).join(' / ')}</div>
                <div>价格: {(p.prices || []).join(', ') || '-'}</div>
                <button
                  type="button"
                  className="mt-1 mr-2 px-2 py-0.5 rounded border"
                  onClick={() => {
                    setEditingPoolId(p.id)
                    setNewIdentifyWord(p.identify_word || '')
                    setNewKeywords((p.keywords || []).join('\n'))
                    setNewPrices((p.prices || []).join(','))
                  }}
                >
                  编辑
                </button>
                <button
                  type="button"
                  className="mt-1 px-2 py-0.5 rounded border text-red-600"
                  onClick={async () => {
                    if (!confirm('确认删除该识别词配置？')) return
                    await deleteAppIdentifyPool(p.id)
                    await load()
                  }}
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
