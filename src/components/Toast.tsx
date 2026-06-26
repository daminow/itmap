import { useEffect } from 'react'
import { useITmapStore } from '@/store/useITmapStore'

export function Toast() {
  const toast = useITmapStore((s) => s.toast)
  const clearToast = useITmapStore((s) => s.clearToast)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(clearToast, 3500)
    return () => clearTimeout(id)
  }, [toast, clearToast])

  if (!toast) return null
  return (
    <div className="toast" role="status">
      {toast}
    </div>
  )
}
