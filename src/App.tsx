import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, MouseEvent } from 'react'
import {
  ArrowRightOutlined,
  BellOutlined,
  BookOutlined,
  CameraOutlined,
  CheckOutlined,
  CloseOutlined,
  EnvironmentOutlined,
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

function LifeMapCanvas({ rows, today, selectedDate, records, onSelect }: {
  rows: ReturnType<typeof buildLifeMap>
  today: string
  selectedDate: string
  records: Record<string, DailyRecord>
  onSelect: (date: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(900)
  const rowHeight = 6
  const rowGap = 3
  const height = rows.length * (rowHeight + rowGap) + 10

  useEffect(() => {
    if (!frameRef.current) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(260, entry.contentRect.width)))
    observer.observe(frameRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = window.devicePixelRatio || 1
    canvas.width = width * ratio
    canvas.height = height * ratio
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const context = canvas.getContext('2d')
    if (!context) return
    context.scale(ratio, ratio)
    context.clearRect(0, 0, width, height)
    const labelWidth = width < 500 ? 25 : 38
    rows.forEach((row, rowIndex) => {
      const y = rowIndex * (rowHeight + rowGap) + 4
      const cellWidth = Math.max(0.62, (width - labelWidth - 8) / 366)
      context.fillStyle = 'rgba(57, 73, 58, .48)'
      context.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace'
      context.fillText(String(row.year).slice(-2), 0, y + 5)
      row.cells.forEach((date, index) => {
        const record = records[date]
        context.fillStyle = date === today ? '#c96f4f' : record ? '#728b6d' : date < today ? '#b7a77b' : 'rgba(57, 73, 58, .12)'
        context.fillRect(labelWidth + index * cellWidth, y, Math.max(0.55, cellWidth - 0.7), rowHeight)
        if (date === selectedDate) {
          context.strokeStyle = '#253d32'
          context.lineWidth = 1.5
          context.strokeRect(labelWidth + index * cellWidth - 1, y - 1, Math.max(1, cellWidth + 1), rowHeight + 2)
        }
      })
    })
  }, [height, records, rows, selectedDate, today, width])

  function handleClick(event: MouseEvent<HTMLCanvasElement>) {
    const labelWidth = width < 500 ? 25 : 38
    const rowIndex = Math.floor((event.nativeEvent.offsetY - 4) / (rowHeight + rowGap))
    const column = Math.floor((event.nativeEvent.offsetX - labelWidth) / ((width - labelWidth - 8) / 366))
    const row = rows[rowIndex]
    if (!row || column < 0 || column >= row.cells.length) return
    onSelect(row.cells[column])
  }

  return <div className="map-canvas-wrap" ref={frameRef}><canvas ref={canvasRef} onClick={handleClick} role="img" aria-label="人生格点地图，点击任意格点打开当天记录" /></div>
}

function App() {
  const [snapshot, setSnapshot] = useState<LifeSnapshot | null>(null)
  const [selectedDate, setSelectedDate] = useState(todayIso())
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
  const nextImportantDays = useMemo(() => (snapshot?.importantDays ?? []).filter((item) => item.type !== 'elapsed').map((item) => ({ item, date: getNextImportantDate(item) })).sort((a, b) => a.date.getTime() - b.date.getTime()), [snapshot])

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
    document.getElementById('day-point')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  async function saveBirthDate() {
    if (!draftBirthDate || !snapshot) return
    const next = { ...snapshot, birthDate: draftBirthDate }
    await persist(next, '人生地图已展开')
    setSelectedDate(today >= draftBirthDate ? today : draftBirthDate)
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

          <section className="map-section"><div className="section-heading"><div><p className="eyebrow">THE LIFE MAP</p><h2>人生格点 <span>· 100 年</span></h2></div><div className="map-controls"><div className="map-legend"><span className="legend-past" />走过 <span className="legend-record" />有记录 <span className="legend-today" />今天 <span className="legend-future" />尚未抵达</div><button className="outline-button" onClick={() => setShowListView(!showListView)}>{showListView ? '回到地图' : '日期列表'}</button></div></div><div className="map-frame"><div className="map-ruler"><span>出生 · {birthDate}</span><span>每一行是一年</span><span>100 岁</span></div>{showListView ? <div className="accessible-list" aria-label="按年份浏览人生格点">{rows.map((row) => <div className="accessible-year" key={row.year}><span>{row.year}</span><div>{row.cells.filter((date) => snapshot.records[date] || date === today).slice(0, 12).map((date) => <button key={date} onClick={() => selectDate(date)}>{date === today ? '今天' : date.slice(5)}</button>)}<button className="year-link" onClick={() => selectDate(row.cells[0])}>打开这一年 · {row.cells.length} 天</button></div></div>)}</div> : <LifeMapCanvas rows={rows} today={today} selectedDate={selectedDate} records={snapshot.records} onSelect={selectDate} />}</div></section>

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
