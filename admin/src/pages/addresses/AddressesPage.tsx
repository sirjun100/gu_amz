import { useCallback, useEffect, useState, useRef } from 'react'
import {
  fetchAddressesPage,
  createAddress,
  updateAddress,
  deleteAddress,
  importAddressesXlsx,
} from '@/api/amzApi'
import type { AddressRow } from '@/types/amz'
import { PaginationBar } from '@/components/common/PaginationBar'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/utils/cn'

const inp =
  'w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm'

const emptyForm: Partial<AddressRow> = {
  recipient_name: '',
  state: '',
  city: '',
  address_line1: '',
  address_line2: '',
  zip_code: '',
  phone: '',
  full_line: '',
}

export function AddressesPage() {
  const { addToast } = useUIStore()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 30
  const [data, setData] = useState({ items: [] as AddressRow[], total: 0, total_pages: 1 })
  const [loading, setLoading] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<Partial<AddressRow>>(emptyForm)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetchAddressesPage(page, perPage, q.trim() || undefined)
      setData({ items: r.items, total: r.total, total_pages: r.total_pages })
    } finally {
      setLoading(false)
    }
  }, [page, q])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setForm(emptyForm)
    setEditingId(null)
    setModal('create')
  }

  const openEdit = (row: AddressRow) => {
    setEditingId(row.id)
    setForm({ ...row })
    setModal('edit')
  }

  const save = async () => {
    try {
      if (modal === 'create') {
        await createAddress(form)
        addToast({ message: '已添加', type: 'success' })
      } else if (modal === 'edit' && editingId != null) {
        await updateAddress(editingId, form)
        addToast({ message: '已保存', type: 'success' })
      }
      setModal(null)
      load()
    } catch {
      addToast({ message: '保存失败', type: 'error' })
    }
  }

  const onDel = async (id: number) => {
    if (!confirm('删除该地址？')) return
    try {
      await deleteAddress(id)
      addToast({ message: '已删除', type: 'success' })
      load()
    } catch {
      addToast({ message: '删除失败', type: 'error' })
    }
  }

  const onXlsx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const r = await importAddressesXlsx(f)
      addToast({ message: `已导入 ${r.imported} 条`, type: 'success' })
      load()
    } catch {
      addToast({ message: '导入失败（需 xlsx，列顺序与模板一致）', type: 'error' })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">地址管理（美国）</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          支持 Excel 导入（与仓库内「美国地址.xlsx」相同列顺序：姓名、州、城市、街道1、街道2、邮编、电话、整行）
        </p>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={onXlsx} />
        <button type="button" onClick={() => fileRef.current?.click()} className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm">
          导入 XLSX
        </button>
        <button type="button" onClick={openCreate} className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm">
          新增地址
        </button>
        <input className={cn(inp, 'max-w-xs')} placeholder="搜索" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" onClick={() => setPage(1)} className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm">
          筛选
        </button>
        <button type="button" onClick={() => load()} className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-sm">
          刷新
        </button>
      </div>
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800/30">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80">
              <tr>
                <th className="px-2 py-2 text-left">ID</th>
                <th className="px-2 py-2 text-left">姓名</th>
                <th className="px-2 py-2 text-left">手机号</th>
                <th className="px-2 py-2 text-left">城市/州</th>
                <th className="px-2 py-2 text-left">街道</th>
                <th className="px-2 py-2 text-left">邮编</th>
                <th className="px-2 py-2 text-left w-32">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                    加载中…
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                    暂无地址
                  </td>
                </tr>
              ) : (
                data.items.map((row) => (
                  <tr key={row.id}>
                    <td className="px-2 py-2">{row.id}</td>
                    <td className="px-2 py-2 max-w-[8rem] truncate">{row.recipient_name || '—'}</td>
                    <td className="px-2 py-2 text-xs font-mono whitespace-nowrap">{row.phone || '—'}</td>
                    <td className="px-2 py-2 text-xs">
                      {row.city || '—'} / {row.state || '—'}
                    </td>
                    <td className="px-2 py-2 text-xs max-w-[12rem] truncate">{row.address_line1 || row.full_line || '—'}</td>
                    <td className="px-2 py-2 text-xs">{row.zip_code || '—'}</td>
                    <td className="px-2 py-2 space-x-2 whitespace-nowrap">
                      <button type="button" className="text-blue-600 text-xs" onClick={() => openEdit(row)}>
                        编辑
                      </button>
                      <button type="button" className="text-red-600 text-xs" onClick={() => onDel(row.id)}>
                        删除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-slate-100 dark:border-slate-700">
          <PaginationBar page={page} totalPages={data.total_pages} total={data.total} perPage={perPage} onPageChange={setPage} />
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50" onClick={() => setModal(null)} role="presentation">
          <div
            className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-lg w-full p-4 border border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <h2 className="font-semibold mb-3 text-slate-900 dark:text-white">{modal === 'create' ? '新增地址' : '编辑地址'}</h2>
            <div className="grid gap-2 text-sm">
              {(
                [
                  ['recipient_name', '姓名'],
                  ['state', '州'],
                  ['city', '城市'],
                  ['address_line1', '街道1'],
                  ['address_line2', '街道2'],
                  ['zip_code', '邮编'],
                  ['phone', '手机号'],
                  ['full_line', '完整一行'],
                ] as const
              ).map(([k, lab]) => (
                <label key={k} className="block">
                  <span className="text-xs text-slate-500">{lab}</span>
                  <input
                    className={inp}
                    value={(form[k] as string) ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={save} className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm">
                保存
              </button>
              <button type="button" onClick={() => setModal(null)} className="px-3 py-1.5 rounded bg-slate-100 dark:bg-slate-700 text-sm">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
