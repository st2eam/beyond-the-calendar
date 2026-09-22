type LunarDate = {
  month: number
  day: number
}

const lunarFormatter = new Intl.DateTimeFormat('en-u-ca-chinese', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'UTC',
})

function lunarDate(value: string): LunarDate | null {
  const parts = lunarFormatter.formatToParts(new Date(`${value}T00:00:00Z`))
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const day = Number(parts.find((part) => part.type === 'day')?.value)
  return Number.isFinite(month) && Number.isFinite(day) ? { month, day } : null
}

function nextIsoDate(value: string) {
  const next = new Date(`${value}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString().slice(0, 10)
}

function qingmingDay(year: number) {
  if (year >= 2000 && year <= 2099) return Math.floor((year - 2000) * 0.2422 + 4.81) - Math.floor((year - 2000) / 4)
  if (year >= 1900 && year <= 1999) return Math.floor((year - 1900) * 0.2422 + 5.59) - Math.floor((year - 1900) / 4)
  return 4
}

export function isWeekendDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`)
  const day = date.getUTCDay()
  return day === 0 || day === 6
}

/**
 * Returns the statutory public holiday name for a Gregorian date in mainland China.
 * The lunar calendar is provided by the browser's Intl implementation so dates remain
 * correct across the full life-map range without shipping a century of date tables.
 */
export function getChinaHolidayName(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return ''
  if (month === 1 && day === 1) return '元旦'
  if (month === 5 && day <= 2) return '劳动节'
  if (month === 10 && day >= 1 && day <= 3) return '国庆节'
  if (month === 4 && day === qingmingDay(year)) return '清明节'

  const lunar = lunarDate(value)
  if (!lunar) return ''
  const nextLunar = lunarDate(nextIsoDate(value))
  const isNewYearEve = lunar.month === 12 && nextLunar?.month === 1 && nextLunar.day === 1
  if (isNewYearEve || (lunar.month === 1 && lunar.day >= 1 && lunar.day <= 3)) return '春节'
  if (lunar.month === 5 && lunar.day === 5) return '端午节'
  if (lunar.month === 8 && lunar.day === 15) return '中秋节'
  return ''
}
