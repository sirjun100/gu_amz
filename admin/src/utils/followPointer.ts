/** Place panel near cursor; flip left/up if needed; stay within viewport. */
export function panelPositionNearPointer(
  clientX: number,
  clientY: number,
  panelW: number,
  panelH: number,
  opts?: { margin?: number; offset?: number }
): { left: number; top: number } {
  const margin = opts?.margin ?? 8
  const offset = opts?.offset ?? 14
  let left = clientX + offset
  let top = clientY + offset
  if (left + panelW > window.innerWidth - margin) {
    left = clientX - panelW - offset
  }
  if (top + panelH > window.innerHeight - margin) {
    top = clientY - panelH - offset
  }
  left = Math.max(margin, Math.min(left, window.innerWidth - panelW - margin))
  top = Math.max(margin, Math.min(top, window.innerHeight - panelH - margin))
  return { left, top }
}
