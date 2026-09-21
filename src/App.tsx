import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, CSSProperties } from 'react'
import {
  ArrowRightOutlined,
  BellOutlined,
  BookOutlined,
  CameraOutlined,
  CheckOutlined,
  CloseOutlined,
  EnvironmentOutlined,
  LeftOutlined,
  RightOutlined,
  SettingOutlined,
  TagsOutlined,
} from '@ant-design/icons'
import {
  addYears,
  buildLifeMap,
  compressImage,
  formatChineseDate,
  formatLifeDay,
  getNextImportantDate,
  isoDate,
  loadSnapshot,
  parseDate,
  saveSnapshot,
  type Chapter,
  type DailyRecord,
  type ImportantDay,
  type ImportantDayType,
  type LifeSnapshot,
  type Mood,
} from './storage'

const moods: Mood[] = ['平静', '明亮', '充实', '疲惫', '低落']
const chapterColors: Chapter['color'][] = ['terracotta', 'moss', 'ochre', 'plum']

const blankRecord = (date: string): DailyRecord => ({
  id: crypto.randomUUID(), date, note: '', mood: '', tags: [], people: [], location: '', important: false, photos: [], updatedAt: Date.now(), version: 1,
})

const blankImportantDay: Omit<ImportantDay, 'id'> = {
  title: '', date: '', type: 'once', time: '09:00', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, reminderOffsets: [0],
}

function todayIso() {
  return isoDate(new Date())
}

function LifeYearView({ rows, year, today, selectedDate, records, importantDates, onSelect }: {
  rows: ReturnType<typeof buildLifeMap>
  year: number
  today: string
  selectedDate: string
  records: Record<string, DailyRecord>
  importantDates: Set<string>
  onSelect: (date: string) => void
}) {
  const row = rows.find((item) => item.year === year)
  const months = Array.from({ length: 12 }, (_, month) => {
    const dates = row?.cells.filter((date) => parseDate(date).getMonth() === month) ?? []
    const first = dates[0] ? parseDate(dates[0]) : null
    return { month, dates, leading: first ? (first.getDay() + 6) % 7 : 0 }
  })
  const recordedCount = row?.cells.filter((date) => records[date]).length ?? 0

  return <div className="year-view" key={year} aria-label={`${year} 年的人生格点`}>
    <div className="year-view-intro"><div><span className="year-view-kicker">LIFE YEAR {String((rows.findIndex((item) => item.year === year) + 1)).padStart(2, '0')}</span><h3>{year} <small>· {recordedCount} 个记录</small></h3></div><span className="year-view-range">{row?.cells[0]} — {row?.cells[row.cells.length - 1]}</span></div>
    <div className="year-months">
      {months.map(({ month, dates, leading }) => <section className={`year-month ${dates.length === 0 ? 'empty' : ''}`} key={month} style={{ '--month-index': month } as CSSProperties} aria-label={`${month + 1} 月`}>
        <div className="month-heading"><b>{month + 1}月</b><span>{dates.length ? `${dates.length} 日` : '未抵达'}</span></div>
        <div className="weekday-row" aria-hidden="true">{['一', '二', '三', '四', '五', '六', '日'].map((weekday) => <span key={weekday}>{weekday}</span>)}</div>
        <div className="month-grid">
          {Array.from({ length: leading }).map((_, index) => <span className="month-placeholder" key={`empty-${index}`} />)}
          {dates.map((date) => {
            const record = records[date]
            const isToday = date === today
            const isSelected = date === selectedDate
            const isImportant = importantDates.has(date) || Boolean(record?.important)
            return <button key={date} className={`year-day ${date < today ? 'past' : 'future'} ${record ? 'has-record' : ''} ${isImportant ? 'is-important' : ''} ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`} onClick={() => onSelect(date)} aria-label={`${formatChineseDate(date)}${record ? '，已有记录' : ''}${isToday ? '，今天' : ''}${isImportant ? '，重要日子' : ''}`} title={formatChineseDate(date)}><span>{Number(date.slice(8))}</span></button>
          })}
        </div>
      </section>)}
    </div>
  </div>
}

function App() {
  const [snapshot, setSnapshot] = useState<LifeSnapshot | null>(null)
  const [selectedDate, setSelectedDate] = useState(todayIso())
  const [mapYear, setMapYear] = useState(Number(todayIso().slice(0, 4)))
  const [draftRecord, setDraftRecord] = useState<DailyRecord | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showChapters, setShowChapters] = useState(false)
  const [showImportantDays, setShowImportantDays] = useState(false)
  const [showListView, setShowListView] = useState(false)
  const [draftBirthDate, setDraftBirthDate] = useState('')
  const [chapterDraft, setChapterDraft] = useState({ title: '', start: '', end: '', description: '' })
  const [importantDraft, setImportantDraft] = useState(blankImportantDay)
  const [notice, setNotice] = useState('')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    loadSnapshot().then((loaded) => {
      setSnapshot(loaded)
      setDraftBirthDate(loaded.birthDate)
      setHydrated(true)
    })
  }, [])

  const birthDate = snapshot?.birthDate ?? ''
  const today = todayIso()
  const rows = useMemo(() => birthDate ? buildLifeMap(birthDate) : [], [birthDate])
  const todayLifeDay = birthDate ? formatLifeDay(birthDate) : 0
  const selectedRecord = snapshot?.records[selectedDate]
  const selectedIsInMap = Boolean(birthDate && selectedDate >= birthDate && selectedDate < isoDate(addYears(parseDate(birthDate), 100)))
  const importantDates = useMemo(() => {
    const dates = new Set<string>()
    ;(snapshot?.importantDays ?? []).forEach((item) => {
      if (item.type === 'annual') {
        rows.forEach((row) => {
          const annualDate = `${row.year}${item.date.slice(4)}`
          if (row.cells.includes(annualDate)) dates.add(annualDate)
        })
      } else if (item.date) {
        dates.add(item.date)
      }
    })
    return dates
  }, [rows, snapshot?.importantDays])
  const nextImportantDays = useMemo(() => (snapshot?.importantDays ?? []).filter((item) => item.type !== 'elapsed').map((item) => ({ item, date: getNextImportantDate(item) })).sort((a, b) => a.date.getTime() - b.date.getTime()), [snapshot])

  useEffect(() => {
    const selectedYear = Number(selectedDate.slice(0, 4))
    if (rows.some((row) => row.year === selectedYear)) setMapYear(selectedYear)
    else if (rows[0]) setMapYear(rows[0].year)
  }, [rows, selectedDate])

  useEffect(() => {
    setDraftRecord(selectedRecord ?? blankRecord(selectedDate))
  }, [selectedDate, selectedRecord])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 2600)
    return () => window.clearTimeout(timeout)
  }, [notice])

  async function persist(next: LifeSnapshot, message?: string) {
    setSnapshot(next)
    await saveSnapshot(next)
    if (message) setNotice(message)
  }

  function selectDate(date: string) {
    setSelectedDate(date)
    setMapYear(Number(date.slice(0, 4)))
    document.getElementById('day-point')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  async function saveBirthDate() {
    if (!draftBirthDate || !snapshot) return
    const next = { ...snapshot, birthDate: draftBirthDate }
    await persist(next, '人生地图已展开')
    const firstDate = today >= draftBirthDate ? today : draftBirthDate
    setSelectedDate(firstDate)
    setMapYear(Number(firstDate.slice(0, 4)))
    setShowSettings(false)
  }

  async function saveRecord() {
    if (!snapshot || !draftRecord) return
    const meaningful = draftRecord.note.trim() || draftRecord.mood || draftRecord.tags.length || draftRecord.people.length || draftRecord.location || draftRecord.photos.length || draftRecord.important
    const records = { ...snapshot.records }
    if (!meaningful) delete records[selectedDate]
    else records[selectedDate] = { ...draftRecord, note: draftRecord.note.trim(), updatedAt: Date.now(), version: (records[selectedDate]?.version ?? 0) + 1 }
    await persist({ ...snapshot, records }, '这一天已经留下')
  }

  function addTag() {
    const value = tagInput.trim()
    if (!draftRecord || !value || draftRecord.tags.includes(value)) return
    setDraftRecord({ ...draftRecord, tags: [...draftRecord.tags, value] })
    setTagInput('')
  }

  async function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    if (!draftRecord) return
    const files = Array.from(event.target.files ?? []).slice(0, 9 - draftRecord.photos.length)
    const photos = await Promise.all(files.map((file) => compressImage(file)))
    setDraftRecord({ ...draftRecord, photos: [...draftRecord.photos, ...photos] })
    event.target.value = ''
  }

  async function createChapter() {
    if (!snapshot || !chapterDraft.title || !chapterDraft.start) return
    const chapter: Chapter = { id: crypto.randomUUID(), title: chapterDraft.title.trim(), start: chapterDraft.start, end: chapterDraft.end || undefined, color: chapterColors[snapshot.chapters.length % chapterColors.length], description: chapterDraft.description.trim() }
    await persist({ ...snapshot, chapters: [...snapshot.chapters, chapter] }, '人生章节已保存')
    setChapterDraft({ title: '', start: '', end: '', description: '' })
    setShowChapters(false)
  }

  async function createImportantDay() {
    if (!snapshot || !importantDraft.title || !importantDraft.date) return
    const importantDay: ImportantDay = { ...importantDraft, id: crypto.randomUUID() }
    await persist({ ...snapshot, importantDays: [...snapshot.importantDays, importantDay] }, '重要日子已记下')
    setImportantDraft(blankImportantDay)
    setShowImportantDays(false)
  }

  async function removeImportantDay(id: string) {
    if (!snapshot) return
    await persist({ ...snapshot, importantDays: snapshot.importantDays.filter((item) => item.id !== id) }, '重要日子已移除')
  }

  if (!hydrated || !snapshot) return <main className="loading-shell"><span className="loading-mark" /><p>正在展开你的时间地图…</p></main>

  return (
      <main className="app-shell">
      <div className="grain" aria-hidden="true" />
      <header className="topbar">
        <div className="brand-lockup"><span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span><div><p className="eyebrow">BEYOND THE CALENDAR</p><h1>日历之外</h1></div></div>
        <div className="topbar-actions"><span className="local-badge"><span /> 本地保存</span><button className="icon-button" aria-label="打开设置" onClick={() => setShowSettings(true)}><SettingOutlined /></button></div>
      </header>

      {!birthDate ? (
        <section className="welcome-panel"><div className="welcome-copy"><p className="eyebrow accent">A MAP OF YOUR LIFE</p><h2>把每一天，<br /><em>保存成一个可以回望的格点。</em></h2><p className="welcome-text">从出生日期开始，日历之外会为你铺开一张属于自己的百年地图。过去、此刻，以及尚未抵达的日子，都在这里安静地等待。</p></div><div className="welcome-card"><span className="card-number">01 / STARTING POINT</span><h3>从哪一天开始？</h3><p>输入你的出生日期，开始生成这张地图。</p><input aria-label="出生日期" type="date" value={draftBirthDate} onChange={(event) => setDraftBirthDate(event.target.value)} /><button className="primary-button" onClick={saveBirthDate}>展开我的人生地图 <ArrowRightOutlined /></button><small>记录首先只保存在这台设备</small></div></section>
      ) : (
        <>
          <section className="hero-grid"><div className="hero-copy"><p className="eyebrow accent">YOUR LIFE, IN DAYS</p><h2>你已经走过<br /><strong>{todayLifeDay.toLocaleString()}</strong> 天</h2><p className="hero-date">今天是你人生的第 <b>{todayLifeDay.toLocaleString()}</b> 天</p><p className="hero-caption">每一个小格，都是曾经真实发生过的二十四小时。</p></div><div className="today-note"><div className="note-topline"><span>今天 · {todayLifeDay.toLocaleString()}</span><span className="note-dot" /></div><h3>{formatChineseDate(today)}</h3><p>{snapshot.records[today]?.note || '给今天留一点位置。'}</p><button className="text-button" onClick={() => selectDate(today)}>写下今天发生的事 <ArrowRightOutlined /></button></div></section>

          <section className="map-section"><div className="section-heading"><div><p className="eyebrow">THE LIFE MAP</p><h2>人生格点 <span>· 按年浏览</span></h2></div><div className="map-controls"><div className="map-legend"><span className="legend-past" />走过 <span className="legend-record" />有记录 <span className="legend-today" />今天 <span className="legend-important" />重要日子</div><button className="outline-button" onClick={() => setShowListView(!showListView)}>{showListView ? '回到地图' : '日期列表'}</button></div></div><div className="map-frame"><div className="year-navigation"><button className="year-arrow" aria-label="上一年" disabled={mapYear === rows[0]?.year} onClick={() => setMapYear((current) => Math.max(rows[0]?.year ?? current, current - 1))}><LeftOutlined /></button><div className="year-strip" aria-label="选择人生年份">{rows.map((row) => <button key={row.year} className={row.year === mapYear ? 'active' : ''} onClick={() => setMapYear(row.year)}>{row.year}</button>)}</div><button className="year-arrow" aria-label="下一年" disabled={mapYear === rows[rows.length - 1]?.year} onClick={() => setMapYear((current) => Math.min(rows[rows.length - 1]?.year ?? current, current + 1))}><RightOutlined /></button><button className="year-today" onClick={() => setMapYear(Number(today.slice(0, 4)))} disabled={!rows.some((row) => row.year === Number(today.slice(0, 4)))}>回到今天</button></div>{showListView ? <div className="accessible-list" aria-label="按年份浏览人生格点">{rows.map((row) => <div className={`accessible-year ${row.year === mapYear ? 'active' : ''}`} key={row.year}><span>{row.year}</span><div>{row.cells.filter((date) => snapshot.records[date] || date === today).slice(0, 12).map((date) => <button key={date} onClick={() => selectDate(date)}>{date === today ? '今天' : date.slice(5)}</button>)}<button className="year-link" onClick={() => { setMapYear(row.year); selectDate(row.cells[0]) }}>打开这一年 · {row.cells.length} 天</button></div></div>)}</div> : <LifeYearView rows={rows} year={mapYear} today={today} selectedDate={selectedDate} records={snapshot.records} importantDates={importantDates} onSelect={selectDate} />}</div></section>

          <section className="lower-grid"><div className="record-panel panel-paper" id="day-point"><div className="panel-heading"><div><p className="eyebrow">DAY POINT</p><h2>{formatChineseDate(selectedDate)}</h2></div><span className="record-state">{selectedRecord ? '已留下记录' : '还没有记录'}</span></div>{!selectedIsInMap && <p className="out-of-range">这个日期还不在你的人生地图里。</p>}<textarea value={draftRecord?.note ?? ''} onChange={(event) => draftRecord && setDraftRecord({ ...draftRecord, note: event.target.value })} placeholder="今天发生了什么？写给未来的自己……" /><div className="record-meta"><div className="mood-row"><span>今天的心情</span>{moods.map((mood) => <button key={mood} className={draftRecord?.mood === mood ? 'active' : ''} onClick={() => draftRecord && setDraftRecord({ ...draftRecord, mood })}>{mood}</button>)}</div><div className="record-field"><label htmlFor="location"><EnvironmentOutlined /> 地点</label><input id="location" value={draftRecord?.location ?? ''} onChange={(event) => draftRecord && setDraftRecord({ ...draftRecord, location: event.target.value })} placeholder="今天在哪里？" /></div><div className="record-field"><label htmlFor="people"><BookOutlined /> 人物</label><input id="people" value={draftRecord?.people.join('、') ?? ''} onChange={(event) => draftRecord && setDraftRecord({ ...draftRecord, people: event.target.value.split('、').map((item) => item.trim()).filter(Boolean) })} placeholder="和谁一起？用顿号分隔" /></div><div className="tag-row"><span><TagsOutlined /> 标签</span><div className="tag-list">{draftRecord?.tags.map((tag) => <button key={tag} className="tag" onClick={() => draftRecord && setDraftRecord({ ...draftRecord, tags: draftRecord.tags.filter((item) => item !== tag) })}>#{tag} <CloseOutlined /></button>)}<input value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addTag()} onBlur={addTag} placeholder="添加标签" /></div></div><div className="photo-row"><div className="photo-row-label"><CameraOutlined /> 照片</div><div className="photo-grid">{draftRecord?.photos.map((photo, index) => <div className="photo-thumb" key={`${photo.slice(0, 16)}-${index}`}><img src={photo} alt="日点照片" /><button aria-label="移除照片" onClick={() => draftRecord && setDraftRecord({ ...draftRecord, photos: draftRecord.photos.filter((_, photoIndex) => photoIndex !== index) })}><CloseOutlined /></button></div>)}{(draftRecord?.photos.length ?? 0) < 9 && <label className="photo-add"><CameraOutlined /><span>添加照片</span><input type="file" accept="image/*" multiple onChange={addPhotos} /></label>}</div></div><label className="important-toggle"><input type="checkbox" checked={draftRecord?.important ?? false} onChange={(event) => draftRecord && setDraftRecord({ ...draftRecord, important: event.target.checked })} /><span><CheckOutlined /></span>把这一天标为重要日子</label></div><div className="record-actions"><span>保存在此设备 · {draftRecord?.photos.length ?? 0}/9 张照片</span><button className="primary-button small" onClick={saveRecord}>保存这一天</button></div></div>
            <aside className="side-column"><button className="feature-card chapter-card" onClick={() => setShowChapters(true)}><span className="feature-index">02</span><div><p className="eyebrow">LIFE CHAPTERS</p><h3>人生章节</h3><p>为连续的日子，取一个名字。</p></div><ArrowRightOutlined className="feature-arrow" /></button><button className="feature-card milestone-card" onClick={() => setShowImportantDays(true)}><span className="feature-index">03</span><div><p className="eyebrow">IMPORTANT DAYS</p><h3>重要日子</h3><p>{snapshot.importantDays.length ? `已经记下 ${snapshot.importantDays.length} 个值得回望的日子。` : '记住那些改变了你的日子。'}</p></div><ArrowRightOutlined className="feature-arrow" /></button><div className="chapter-list">{snapshot.chapters.length ? snapshot.chapters.map((chapter) => <div className="chapter-line" key={chapter.id}><span className={`chapter-swatch ${chapter.color}`} /><div><b>{chapter.title}</b><small>{chapter.start} — {chapter.end || '至今'}</small></div></div>) : <p className="empty-note">你的第一章还没有命名。</p>}</div>{nextImportantDays.length > 0 && <div className="upcoming-note"><BellOutlined /><div><span>下一个重要日子</span><b>{nextImportantDays[0].item.title}</b><small>{Math.max(0, Math.ceil((nextImportantDays[0].date.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000))} 天后 · {formatChineseDate(isoDate(nextImportantDays[0].date))}</small></div></div>}</aside></section>
        </>
      )}

      <footer className="footer"><span>日历之外 · Beyond the Calendar</span><span>记录你走过的每一天，也看见尚未抵达的日子。</span></footer>

      {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" aria-label="关闭" onClick={() => setShowSettings(false)}><CloseOutlined /></button><p className="eyebrow accent">YOUR STARTING POINT</p><h2 id="settings-title">你的出生日期</h2><p>它只用于生成你自己的生命格点。当前记录保存在这台设备的 IndexedDB 中。</p><input aria-label="出生日期" type="date" value={draftBirthDate} onChange={(event) => setDraftBirthDate(event.target.value)} /><div className="modal-actions"><button className="ghost-button" onClick={() => setShowSettings(false)}>取消</button><button className="primary-button" onClick={saveBirthDate}>保存日期</button></div></section></div>}

      {showChapters && <div className="modal-backdrop" onClick={() => setShowChapters(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="chapter-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" aria-label="关闭" onClick={() => setShowChapters(false)}><CloseOutlined /></button><p className="eyebrow accent">LIFE CHAPTERS</p><h2 id="chapter-title">新增人生章节</h2><p>给一段连续的日子取一个名字。章节可以和其他章节重叠。</p><input placeholder="章节名称，例如：大学" value={chapterDraft.title} onChange={(event) => setChapterDraft({ ...chapterDraft, title: event.target.value })} /><div className="date-pair"><input aria-label="开始日期" type="date" value={chapterDraft.start} onChange={(event) => setChapterDraft({ ...chapterDraft, start: event.target.value })} /><span>至</span><input aria-label="结束日期，可留空" type="date" value={chapterDraft.end} onChange={(event) => setChapterDraft({ ...chapterDraft, end: event.target.value })} /></div><input placeholder="一句话描述（可选）" value={chapterDraft.description} onChange={(event) => setChapterDraft({ ...chapterDraft, description: event.target.value })} /><div className="modal-actions"><button className="ghost-button" onClick={() => setShowChapters(false)}>取消</button><button className="primary-button" onClick={createChapter}>保存章节</button></div></section></div>}

      {showImportantDays && <div className="modal-backdrop" onClick={() => setShowImportantDays(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="important-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" aria-label="关闭" onClick={() => setShowImportantDays(false)}><CloseOutlined /></button><p className="eyebrow accent">IMPORTANT DAYS</p><h2 id="important-title">记下一件重要的事</h2><p>它可以是第一次见面、搬家、毕业，或者某个人来到你生命中的那天。</p><input placeholder="事件名称，例如：第一次独自旅行" value={importantDraft.title} onChange={(event) => setImportantDraft({ ...importantDraft, title: event.target.value })} /><input aria-label="事件日期" type="date" value={importantDraft.date} onChange={(event) => setImportantDraft({ ...importantDraft, date: event.target.value })} /><div className="type-picker">{([['once', '只发生一次'], ['annual', '每年记得'], ['elapsed', '计算经过']] as [ImportantDayType, string][]).map(([type, label]) => <button key={type} className={importantDraft.type === type ? 'active' : ''} onClick={() => setImportantDraft({ ...importantDraft, type })}>{label}</button>)}</div><div className="reminder-picker"><span>提醒</span>{[30, 7, 3, 1, 0].map((offset) => <label key={offset}><input type="checkbox" checked={importantDraft.reminderOffsets.includes(offset)} onChange={(event) => setImportantDraft({ ...importantDraft, reminderOffsets: event.target.checked ? [...importantDraft.reminderOffsets, offset].sort((a, b) => b - a) : importantDraft.reminderOffsets.filter((value) => value !== offset) })} />{offset === 0 ? '当天' : `${offset}天前`}</label>)}</div><div className="modal-actions"><button className="ghost-button" onClick={() => setShowImportantDays(false)}>取消</button><button className="primary-button" onClick={createImportantDay}>保存日子</button></div>{snapshot.importantDays.length > 0 && <div className="important-list">{snapshot.importantDays.map((item) => <div key={item.id}><span>{item.title}<small>{item.date}</small></span><button aria-label={`删除 ${item.title}`} onClick={() => removeImportantDay(item.id)}><CloseOutlined /></button></div>)}</div>}</section></div>}

      {notice && <div className="toast" role="status"><CheckOutlined /> {notice}</div>}
    </main>
  )
}

export default App
