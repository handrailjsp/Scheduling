import { useEffect, useCallback } from 'react'

interface UseScheduleRefreshOptions {
  enabled?: boolean
  interval?: number // milliseconds
  onRefresh?: () => Promise<void>
}

/**
 * Custom hook to automatically refresh schedule data at intervals
 * Enables real-time updates when admin generates new schedules
 */
export function useScheduleRefresh({
  enabled = true,
  interval = 10000, // 10 seconds by default
  onRefresh,
}: UseScheduleRefreshOptions = {}) {
  const refreshSchedule = useCallback(async () => {
    if (onRefresh) {
      try {
        await onRefresh()
      } catch (error) {
        console.error('[v0] Error refreshing schedule:', error)
      }
    }
  }, [onRefresh])

  useEffect(() => {
    if (!enabled || !onRefresh) return

    // Set up polling interval
    const pollInterval = setInterval(() => {
      refreshSchedule()
    }, interval)

    // Cleanup
    return () => clearInterval(pollInterval)
  }, [enabled, interval, refreshSchedule, onRefresh])

  return { refreshSchedule }
}
