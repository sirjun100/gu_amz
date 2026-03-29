import { cn } from '@/utils/cn'

const btn =
  'px-2.5 py-1 rounded border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-xs'

const btnActive = 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 dark:hover:bg-blue-700'

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

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 text-sm text-slate-600 dark:text-slate-400">
      <p>
        显示 {from} 到 {to} 条，共 {total} 条
      </p>
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center gap-1">
          <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={btn}>
            上一页
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(btn, p === page && btnActive)}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className={btn}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}
