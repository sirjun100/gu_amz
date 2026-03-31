import { useCallback, useState } from 'react'
import { postTaskReportParsePreview, type TaskReportParsePreviewParsed } from '@/api/amzApi'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/utils/cn'
import { FileJson2 } from 'lucide-react'

const EXAMPLE_OK = [
  '2026-03-31 08:14:00 打开 App',
  '2026-03-31 08:14:05 搜索关键词完成',
  'AMZ_REPORT {"status":"success","environment":"win-proxy-01","finished_at":"2026-03-31T08:15:00Z"}',
].join('\n')

const EXAMPLE_FAIL = [
  '2026-03-31 08:14:00 点击超时',
  'AMZ_REPORT {"status":"failed","environment":"mac-official","error":"click timeout","finished_at":"2026-03-31T08:16:12.500Z"}',
].join('\n')

const taCls =
  'w-full min-h-[220px] rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm px-3 py-2 font-mono text-slate-800 dark:text-slate-200'

const btnSm =
  'px-3 py-1.5 rounded-md text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-45'

export function TaskReportParsePage() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const [text, setText] = useState(EXAMPLE_OK)
  const [loading, setLoading] = useState(false)
  const [parsed, setParsed] = useState<TaskReportParsePreviewParsed | null>(null)

  const run = useCallback(async () => {
    const lines = text
      .split(/\r?\n/)
      .map((s) => s.trimEnd())
      .filter((s) => s.length > 0)
    if (lines.length === 0) {
      addToast({ message: '请至少输入一行日志', type: 'error' })
      return
    }
    setLoading(true)
    setParsed(null)
    try {
      const res = await postTaskReportParsePreview(lines)
      setParsed(res.parsed)
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : '解析请求失败'
      addToast({ message: msg, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [text, addToast])

  if (!user?.is_admin) {
    return (
      <div className="p-6 max-w-3xl">
        <p className="text-sm text-slate-600 dark:text-slate-400">仅管理员可使用「上报日志解析预览」。</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-violet-500 flex items-center justify-center flex-shrink-0">
          <FileJson2 className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">上报日志解析预览</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            模拟客户端 <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded">log_lines</code>，调用与服务端结案相同的{' '}
            <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded">parse_task_report_footer</code>（见《客户端上报日志约定》）。
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnSm} onClick={() => setText(EXAMPLE_OK)}>
          填入成功示例
        </button>
        <button type="button" className={btnSm} onClick={() => setText(EXAMPLE_FAIL)}>
          填入失败示例
        </button>
        <button type="button" className={cn(btnSm, 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700')} disabled={loading} onClick={() => run()}>
          {loading ? '解析中…' : '解析'}
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">每行一条字符串（与实际上报的 log_lines 数组一致）</label>
        <textarea className={taCls} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
      </div>

      {parsed && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-600 p-4 bg-slate-50 dark:bg-slate-800/50">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">解析结果</p>
          <pre className="text-xs font-mono text-slate-800 dark:text-slate-200 overflow-x-auto whitespace-pre-wrap break-all">
            {JSON.stringify(parsed, null, 2)}
          </pre>
          <ul className="mt-3 text-sm text-slate-700 dark:text-slate-300 space-y-1">
            <li>
              <span className="text-slate-500">结案成功：</span>
              <span className={parsed.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                {parsed.success ? '是' : '否'}
              </span>
            </li>
            <li>
              <span className="text-slate-500">使用 AMZ_REPORT：</span>
              {parsed.used_amz_report ? '是' : '否（走旧版末行 success 规则）'}
            </li>
            {parsed.environment != null && (
              <li>
                <span className="text-slate-500">环境：</span>
                {parsed.environment}
              </li>
            )}
            {parsed.finished_at != null && (
              <li>
                <span className="text-slate-500">finished_at：</span>
                {parsed.finished_at}
              </li>
            )}
            {parsed.failure_detail != null && parsed.failure_detail.length > 0 && (
              <li>
                <span className="text-slate-500">失败原因：</span>
                {parsed.failure_detail}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
