export function getMonthDays(date: Date): Date[] {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()

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
  const startOfWeek = new Date(date)
  startOfWeek.setDate(date.getDate() - date.getDay())

  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    days.push(new Date(startOfWeek))
    startOfWeek.setDate(startOfWeek.getDate() + 1)
  }

  return days
}

export function getWeekDaysNoSunday(date: Date): Date[] {
  const startOfWeek = new Date(date)
  startOfWeek.setDate(date.getDate() - date.getDay())

  const days: Date[] = []
  // Skip Sunday (i=0), start from Monday (i=1) and go through Saturday (i=6)
  for (let i = 1; i < 7; i++) {
    const dayDate = new Date(startOfWeek)
    dayDate.setDate(startOfWeek.getDate() + i)
    days.push(dayDate)
  }

  return days
}

export function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

export function getDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return dates
}
