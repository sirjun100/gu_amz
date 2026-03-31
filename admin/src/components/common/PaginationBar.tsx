import { useMemo } from 'react'
import { cn } from '@/utils/cn'

const btn =
  'px-2.5 py-1 rounded border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-xs'

const btnActive = 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 dark:hover:bg-blue-700'

function buildPageItems(page: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 1) return []
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const set = new Set<number>()
  set.add(1)
  set.add(totalPages)
  for (let i = page - 2; i <= page + 2; i++) {
    if (i >= 1 && i <= totalPages) set.add(i)
  }
  const sorted = [...set].sort((a, b) => a - b)
  const out: (number | 'gap')[] = []
  let prev = 0
  for (const p of sorted) {
    if (prev > 0 && p - prev > 1) out.push('gap')
    out.push(p)
    prev = p
  }
  return out
}

type Props = {
  page: number
  totalPages: number
  total: number
  perPage: number
  onPageChange: (p: number) => void
}

export function PaginationBar({ page, totalPages, total, perPage, onPageChange }: Props) {
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)
  const items = useMemo(
    () => buildPageItems(page, totalPages),
    [page, totalPages]
  )

  if (total === 0) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-4 text-sm text-slate-600 dark:text-slate-400">
        <p>暂无数据</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 mt-4 text-sm text-slate-600 dark:text-slate-400">
      <p>
        第 <span className="font-medium text-slate-800 dark:text-slate-200">{page}</span> /{' '}
        <span className="font-medium text-slate-800 dark:text-slate-200">{totalPages}</span> 页 · 显示{' '}
        <span className="font-medium text-slate-800 dark:text-slate-200">{from}</span>–
        <span className="font-medium text-slate-800 dark:text-slate-200">{to}</span> 条，共{' '}
        <span className="font-medium text-slate-800 dark:text-slate-200">{total}</span> 条（每页 {perPage} 条）
      </p>
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center gap-1">
          <button type="button" disabled={page <= 1} onClick={() => onPageChange(1)} className={btn}>
            首页
          </button>
          <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={btn}>
            上一页
          </button>
          {items.map((item, idx) =>
            item === 'gap' ? (
              <span key={`g-${idx}`} className="px-1 text-slate-400 select-none">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                className={cn(btn, item === page && btnActive)}
              >
                {item}
              </button>
            )
          )}
          <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className={btn}>
            下一页
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(totalPages)}
            className={btn}
          >
            末页
          </button>
        </div>
      )}
    </div>
  )
}
