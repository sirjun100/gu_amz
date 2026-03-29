/**
 * 管理 API 根路径，须以 /api/v1 结尾（或仅写站点根地址时自动补全 /api/v1）。
 */
export function getApiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return '/api/v1'
  }
  let t = String(raw).trim()
  while (t.endsWith('/')) {
    t = t.slice(0, -1)
  }
  if (t.endsWith('/api/v1')) {
    return t
  }
  if (/^https?:\/\//i.test(t)) {
    return `${t}/api/v1`
  }
  return t
}
