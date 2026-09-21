import { openDB } from 'idb'

export type Mood = '平静' | '明亮' | '充实' | '疲惫' | '低落' | ''

export type DailyRecord = {
  id: string
  date: string
  note: string
  mood: Mood
  tags: string[]
  people: string[]
  location: string
  important: boolean
  photos: string[]
  updatedAt: number
  version: number
}

export type Chapter = {
  id: string
  title: string
  start: string
  end?: string
  color: 'terracotta' | 'moss' | 'ochre' | 'plum'
  description?: string
}

export type ImportantDayType = 'once' | 'annual' | 'elapsed'

export type ImportantDay = {
  id: string
  title: string
  date: string
  type: ImportantDayType
  time: string
  timezone: string
  reminderOffsets: number[]
}

export type LifeSnapshot = {
  birthDate: string
  records: Record<string, DailyRecord>
  chapters: Chapter[]
  importantDays: ImportantDay[]
}

const DB_NAME = 'beyond-the-calendar'
const DB_VERSION = 1
const STORE_NAME = 'app'
const SNAPSHOT_KEY = 'snapshot'
const LEGACY_BIRTH_DATE_KEY = 'btc.birthDate'
const LEGACY_RECORDS_KEY = 'btc.dailyRecords'
const LEGACY_CHAPTERS_KEY = 'btc.chapters'

const emptySnapshot: LifeSnapshot = { birthDate: '', records: {}, chapters: [], importantDays: [] }

function cloneSnapshot(snapshot: LifeSnapshot): LifeSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as LifeSnapshot
}

async function getDatabase() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
    },
  })
}

function migrateLegacyStorage(): LifeSnapshot {
  const snapshot: LifeSnapshot = {
    birthDate: localStorage.getItem(LEGACY_BIRTH_DATE_KEY) ?? '',
    records: {},
    chapters: [],
    importantDays: [],
  }

  try {
    const legacyRecords = JSON.parse(localStorage.getItem(LEGACY_RECORDS_KEY) ?? '{}') as Record<string, Partial<DailyRecord>>
    Object.entries(legacyRecords).forEach(([date, record]) => {
      snapshot.records[date] = {
        id: record.id ?? crypto.randomUUID(),
        date,
        note: record.note ?? '',
        mood: (record.mood as Mood) ?? '',
        tags: record.tags ?? [],
        people: record.people ?? [],
        location: record.location ?? '',
        important: record.important ?? false,
        photos: record.photos ?? [],
        updatedAt: record.updatedAt ?? Date.now(),
        version: record.version ?? 1,
      }
    })
  } catch {
    // Corrupt legacy data should not prevent a fresh local database from opening.
  }

  try {
    snapshot.chapters = JSON.parse(localStorage.getItem(LEGACY_CHAPTERS_KEY) ?? '[]') as Chapter[]
  } catch {
    snapshot.chapters = []
  }

  return snapshot
}

export async function loadSnapshot(): Promise<LifeSnapshot> {
  const db = await getDatabase()
  const saved = await db.get(STORE_NAME, SNAPSHOT_KEY) as LifeSnapshot | undefined
  if (saved) return { ...cloneSnapshot(emptySnapshot), ...saved }

  const migrated = migrateLegacyStorage()
  if (migrated.birthDate || Object.keys(migrated.records).length || migrated.chapters.length) {
    await db.put(STORE_NAME, migrated, SNAPSHOT_KEY)
  }
  return migrated
}

export async function saveSnapshot(snapshot: LifeSnapshot) {
  const db = await getDatabase()
  await db.put(STORE_NAME, cloneSnapshot(snapshot), SNAPSHOT_KEY)
}

export function isoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatChineseDate(value: string, includeYear = true) {
  const date = parseDate(value)
  return new Intl.DateTimeFormat('zh-CN', {
    year: includeYear ? 'numeric' : undefined,
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date)
}

export function dayDifference(from: Date, to: Date) {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime()
  return Math.round((b - a) / 86400000)
}

export function addYears(date: Date, years: number) {
  const next = new Date(date)
  next.setFullYear(next.getFullYear() + years)
  return next
}

export function buildLifeMap(birthDate: string, years = 100) {
  const birth = parseDate(birthDate)
  const end = addYears(birth, years)
  return Array.from({ length: years }, (_, yearOffset) => {
    const year = birth.getFullYear() + yearOffset
    const first = new Date(year, 0, 1)
    const last = new Date(year, 11, 31)
    const start = first < birth ? birth : first
    const finish = last >= end ? new Date(end.getTime() - 86400000) : last
    const cells: string[] = []
    for (let cursor = new Date(start); cursor <= finish; cursor.setDate(cursor.getDate() + 1)) {
      cells.push(isoDate(cursor))
    }
    return { year, cells }
  }).filter((row) => row.cells.length > 0)
}

export function formatLifeDay(birthDate: string, date = new Date()) {
  return Math.max(1, dayDifference(parseDate(birthDate), date) + 1)
}

export function getNextImportantDate(item: ImportantDay, today = new Date()) {
  const original = parseDate(item.date)
  if (item.type === 'once') return original
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const candidate = new Date(today.getFullYear(), original.getMonth(), original.getDate())
  if (candidate < todayStart) candidate.setFullYear(candidate.getFullYear() + 1)
  if (original.getMonth() === 1 && original.getDate() === 29 && candidate.getMonth() === 2) candidate.setDate(28)
  return candidate
}

export async function compressImage(file: File, maxEdge = 2048): Promise<string> {
  const source = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(source.width * scale)
  canvas.height = Math.round(source.height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('无法处理照片')
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  source.close()
  return canvas.toDataURL('image/jpeg', 0.84)
}
