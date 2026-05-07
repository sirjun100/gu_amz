import { useEffect, useMemo, useState } from 'react'
import { fetchDeviceOptions, postBatchClickApp } from '@/api/amzApi'
import type { DeviceOption } from '@/types/amz'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/utils/cn'

const inp =
  'w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm'

export function AppClickTaskPage() {
  const { addToast } = useUIStore()
  const [devices, setDevices] = useState<DeviceOption[]>([])
  const [keyword, setKeyword] = useState('')
  const [identifyWord, setIdentifyWord] = useState('')
  const [identifyPrices, setIdentifyPrices] = useState('')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [mode, setMode] = useState<'manual' | 'smart'>('manual')
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [totalCount, setTotalCount] = useState('100')
  const [saveDataRecord, setSaveDataRecord] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchDeviceOptions().then((r) => setDevices(r.items || []))
  }, [])

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected])
  const toggle = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }))

  const submit = async () => {
    if (!keyword.trim()) {
      addToast({ message: '请填写搜索词', type: 'error' })
      return
    }
    if (!identifyWord.trim()) {
      addToast({ message: '请填写识别词（品牌）', type: 'error' })
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
        keyword: keyword.trim(),
        identify_word: identifyWord.trim(),
        identify_prices: identifyPrices.trim(),
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
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">搜索产品点击APP版本</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          每个任务会随机绑定一个「亚马逊账号管理」中 TOTP 已设置账号。
        </p>
      </div>
      <div className="space-y-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30">
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-400">搜索词</span>
          <input className={cn(inp, 'mt-1')} value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-400">识别词（一般是品牌）</span>
          <input className={cn(inp, 'mt-1')} value={identifyWord} onChange={(e) => setIdentifyWord(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-400">识别价格（多个用英文逗号分隔）</span>
          <input className={cn(inp, 'mt-1')} value={identifyPrices} onChange={(e) => setIdentifyPrices(e.target.value)} placeholder="13.99,16.99" />
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
      </div>
    </div>
  )
}

