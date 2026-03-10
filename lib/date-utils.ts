export function getMonthDays(date: Date): Date[] {
  // Guard against undefined/null
  const safeDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date()
  
  const year = safeDate.getFullYear()
  const month = safeDate.getMonth()
  const firstDay = new Date(year, month, 1)
  
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())

  const days: Date[] = []
  for (let i = 0; i < 42; i++) {
    days.push(new Date(startDate))
    startDate.setDate(startDate.getDate() + 1)
  }
  return days
}

export function getWeekDays(date: Date): Date[] {
  // Guard against undefined/null
  const safeDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date()
  
  const startOfWeek = new Date(safeDate)
  startOfWeek.setDate(safeDate.getDate() - safeDate.getDay())

  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek)
    day.setDate(startOfWeek.getDate() + i)
    days.push(day)
  }
  return days
}

export function getWeekDaysNoSunday(date: Date): Date[] {
  const safeDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date()
  
  const startOfWeek = new Date(safeDate)
  startOfWeek.setDate(safeDate.getDate() - safeDate.getDay())

  const days: Date[] = []
  for (let i = 1; i < 7; i++) {
    const dayDate = new Date(startOfWeek)
    dayDate.setDate(startOfWeek.getDate() + i)
    days.push(dayDate)
  }
  return days
}

export function getDaysInMonth(date: Date): number {
  const safeDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date()
  return new Date(safeDate.getFullYear(), safeDate.getMonth() + 1, 0).getDate()
}

export function getDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = []
  const current = new Date(startDate)

  while (current <= endDate) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return dates
}