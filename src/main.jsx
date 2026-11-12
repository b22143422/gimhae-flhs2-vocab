import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import data from './data/words.json'
import { isCorrect, makeQuiz, normalize, scopeWords, shuffle } from './quiz.js'
import './style.css'

const courses = data.map(course => ({
  ...course,
  words: scopeWords(course.groups),
  groups: course.groups.map(group => ({
    ...group,
    words: scopeWords([group]),
    parts: group.parts.map(part => ({ ...part, words: scopeWords([{ parts: [part] }]) })),
  })),
}))

const directions = [
  ['en-ko', '영어 → 한국어'],
  ['ko-en', '한국어 → 영어'],
  ['mixed', '혼합'],
]
const types = [['choice', '4지선다'], ['input', '직접 입력']]

function Options({ legend, name, value, options, onChange }) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      <div className="segments">
        {options.map(([id, label]) => (
          <label key={id}>
            <input type="radio" name={name} checked={value === id} onChange={() => onChange(id)} />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function Wordbook({ words }) {
  const [search, setSearch] = useState('')
  const [hidden, setHidden] = useState('none')
  const [revealed, setRevealed] = useState(new Set())
  const query = search.trim()
  const filtered = words.filter(({ en, ko }) =>
    !query || normalize(en, 'en').includes(normalize(query, 'en')) ||
    normalize(ko, 'ko').includes(normalize(query, 'ko')),
  )
  function changeVisibility(value) {
    setHidden(value)
    setRevealed(new Set())
  }
  function reveal(key) {
    setRevealed(previous => {
      const next = new Set(previous)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  return (
    <section className="panel wordbook" aria-labelledby="wordbook-title">
      <div className="section-heading">
        <h2 id="wordbook-title">단어 암기장</h2>
        <span className="count">{filtered.length}개</span>
      </div>
      <div className="word-tools">
        <label>단어 검색<input type="search" placeholder="영단어 또는 한국어 뜻" value={search} onChange={e => setSearch(e.target.value)} /></label>
        <label>표시 방식
          <select value={hidden} onChange={e => changeVisibility(e.target.value)}>
            <option value="none">영어와 뜻 보기</option>
            <option value="ko">한국어 뜻 가리기</option>
            <option value="en">영어 가리기</option>
          </select>
        </label>
      </div>
      {filtered.length === 0 && <p className="empty">검색 결과가 없습니다.</p>}
      <div className="word-list">
        {filtered.map((word, index) => (
          <article className="word-row" key={word.key}>
            <span className="row-number">{index + 1}</span>
            {['en', 'ko'].map(language => {
              const visible = hidden !== language || revealed.has(word.key)
              return (
                <div className={`word-${language}`} key={language}>
                  {hidden === language
                    ? <button className="reveal" aria-expanded={visible} onClick={() => reveal(word.key)}>
                        {visible ? word[language] : language === 'en' ? '영어 보기' : '뜻 보기'}
                      </button>
                    : word[language]}
                </div>
              )
            })}
            <small>{word.sources.join(' / ')}</small>
          </article>
        ))}
      </div>
    </section>
  )
}

function Quiz({ session, onSubmit, onExit }) {
  const { questions, answers, type } = session
  const index = answers.length
  const question = questions[index]
  const [answer, setAnswer] = useState('')
  const composing = useRef(false)
  const heading = useRef(null)
  const input = useRef(null)
  useEffect(() => {
    if (type === 'input' && window.matchMedia('(pointer: fine)').matches) input.current?.focus()
    else heading.current?.focus()
  }, [type])
  function submit(event) {
    event.preventDefault()
    if (!composing.current && answer.trim()) onSubmit(answer)
  }
  return (
    <section className="panel quiz" aria-labelledby="question-title">
      <div className="quiz-meta">
        <span>{session.scope}</span>
        <button className="text-button" onClick={onExit}>시험 나가기</button>
      </div>
      <div className="progress-heading"><strong>{index + 1} / {questions.length}</strong><span>{question.direction === 'en-ko' ? '영어 → 한국어' : '한국어 → 영어'}</span></div>
      <progress aria-label="응답한 문항" max={questions.length} value={index} />
      <div className="prompt">
        <span className="prompt-label">{question.word.source}</span>
        <h2 tabIndex="-1" ref={heading} id="question-title">{question.prompt}</h2>
      </div>
      <form onSubmit={submit}>
        {type === 'choice' ? (
          <fieldset className="choices">
            <legend className="sr-only">정답 선택</legend>
            {question.options.map((choice, choiceIndex) => (
              <label key={choice}>
                <input type="radio" name="choice" checked={answer === choice} onChange={() => setAnswer(choice)} />
                <span><b>{choiceIndex + 1}</b>{choice}</span>
              </label>
            ))}
          </fieldset>
        ) : (
          <label className="answer-label">
            {question.answerLanguage === 'ko' ? '한국어 뜻 입력' : '영어 단어 또는 표현 입력'}
            <input ref={input} value={answer} onChange={e => setAnswer(e.target.value)}
              onCompositionStart={() => { composing.current = true }}
              onCompositionEnd={() => { composing.current = false }}
              onKeyDown={e => { if (e.key === 'Enter' && (e.nativeEvent.isComposing || composing.current)) e.preventDefault() }}
              autoComplete="off" autoCapitalize="none" spellCheck={false} />
          </label>
        )}
        <div className="quiz-actions">
          <button type="button" className="secondary" onClick={() => onSubmit('')}>모르겠어요</button>
          <button className="primary" disabled={!answer.trim()}>{index + 1 === questions.length ? '채점하기' : '다음 문항'}</button>
        </div>
      </form>
    </section>
  )
}

function Results({ session, onRetry, onExit }) {
  const { questions, answers } = session
  const missed = questions.filter((question, index) => !isCorrect(question, answers[index]))
  const score = questions.length - missed.length
  const heading = useRef(null)
  useEffect(() => { heading.current?.focus() }, [])
  return (
    <section className="panel results">
      <span className="prompt-label">{session.scope}</span>
      <h2 ref={heading} tabIndex="-1">시험 결과</h2>
      <p className="score"><strong>{score}</strong> / {questions.length}<span>{Math.round(score / questions.length * 100)}점</span></p>
      <div className="quiz-actions">
        <button className="secondary" onClick={onExit}>범위 선택으로</button>
        {missed.length > 0 && <button className="primary" onClick={() => onRetry(missed)}>오답 {missed.length}개 재시험</button>}
      </div>
      {missed.length === 0 && <p className="empty">모든 문항을 맞혔습니다.</p>}
      {missed.length > 0 && <div className="review">
        <h3>오답 확인</h3>
        {questions.map((question, index) => !isCorrect(question, answers[index]) && (
          <article key={index}>
            <strong>{question.prompt}</strong><small>{question.word.source}</small>
            <dl><dt>내 답</dt><dd>{answers[index] || '미응답'}</dd><dt>정답</dt><dd>{question.correct}</dd></dl>
          </article>
        ))}
      </div>}
    </section>
  )
}

function App() {
  const [courseIndex, setCourse] = useState(0)
  const [groupIndex, setGroup] = useState(-1)
  const [partIndex, setPart] = useState(-1)
  const [view, setView] = useState('study')
  const [direction, setDirection] = useState('mixed')
  const [type, setType] = useState('choice')
  const [count, setCount] = useState('20')
  const [session, setSession] = useState(null)

  const course = courses[courseIndex]
  const group = course.groups[groupIndex]
  const part = group?.parts[partIndex]
  const words = part?.words ?? group?.words ?? course.words
  const scope = part?.label ?? (group ? group.label + ' 전체' : course.label + ' 전체')
  const countOptions = useMemo(() => ['10', '20', '50'].filter(value => Number(value) < words.length), [words.length])

  const activeCount = countOptions.includes(count) ? count : 'all'
  const trialCount = activeCount === 'all' ? words.length : Number(activeCount)

  function openCourse(index) {
    setCourse(index)
    setGroup(-1)
    setPart(-1)
    setSession(null)
  }
  function openGroup(index) {
    setGroup(index)
    setPart(-1)
    setSession(null)
  }
  function begin() {
    const questions = makeQuiz(words, course.words, { direction, count: trialCount })
    if (questions.length) setSession({ questions, answers: [], scope, type })
  }
  function submit(answer) {
    setSession(previous => ({ ...previous, answers: [...previous.answers, answer] }))
  }
  function retry(questions) {
    setSession(previous => ({
      ...previous,
      questions: questions.map(question => ({ ...question, options: shuffle(question.options) })),
      answers: [],
    }))
  }
  const exit = () => setSession(null)

  return (
    <>
      <header className="masthead">
        <div className="shell mast-inner">
          <div className="brand"><span className="brand-mark" aria-hidden="true">O</span> 옵티멈 영어학원</div>
          <div className="hero">
            <div>
              <p>김해외국어고등학교 2학년</p>
              <h1>영어 단어 암기장</h1>
            </div>
            <div className="course-total"><strong>{course.words.length}</strong><span>과목 전체 단어·표현</span></div>
          </div>
          <nav className="course-tabs" aria-label="과목">
            {courses.map((item, index) => <button key={item.label} aria-pressed={courseIndex === index} onClick={() => openCourse(index)}>{item.label}</button>)}
          </nav>
        </div>
      </header>
      <main className="shell workspace">
        {!session && <>
          <section className="panel range" aria-labelledby="range-title">
            <div className="section-heading"><h2 id="range-title">학습 범위</h2><span className="count">{words.length}개</span></div>
            <nav className="category-tabs" aria-label="자료 유형">
              <button aria-pressed={groupIndex === -1} onClick={() => openGroup(-1)}>과목 전체</button>
              {course.groups.map((item, index) => <button key={item.label} aria-pressed={groupIndex === index} onClick={() => openGroup(index)}>{item.label}</button>)}
            </nav>
            {group && <label className="part-select">세부 범위
              <select value={partIndex} onChange={e => setPart(Number(e.target.value))}>
                <option value={-1}>{group.label} 전체</option>
                {group.parts.map((item, index) => <option key={item.label} value={index}>{item.label} · {item.words.length}개</option>)}
              </select>
            </label>}
          </section>
          <nav className="mode-tabs" aria-label="학습 방식">
            <button aria-pressed={view === 'study'} onClick={() => setView('study')}>단어 암기장</button>
            <button aria-pressed={view === 'test'} onClick={() => setView('test')}>단어 시험</button>
          </nav>
          {view === 'study'
            ? <Wordbook key={`${courseIndex}/${groupIndex}/${partIndex}`} words={words} />
            : <section className="panel setup">
                <div className="section-heading"><h2>시험 설정</h2><span className="count">{scope}</span></div>
                <Options legend="출제 방향" name="direction" value={direction} options={directions} onChange={setDirection} />
                <Options legend="문항 유형" name="type" value={type} options={types} onChange={setType} />
                <label className="part-select">문항 수
                  <select value={activeCount} onChange={e => setCount(e.target.value)}>
                    {countOptions.map(value => <option value={value} key={value}>{value}문항</option>)}
                    <option value="all">전체 {words.length}문항</option>
                  </select>
                </label>
                <button className="primary start" onClick={begin}>시험 시작 · {trialCount}문항</button>
              </section>}
        </>}
        {session && (session.answers.length === session.questions.length
          ? <Results session={session} onRetry={retry} onExit={exit} />
          : <Quiz key={session.answers.length} session={session} onSubmit={submit} onExit={exit} />)}
      </main>
    </>
  )
}

createRoot(document.getElementById('root')).render(<App />)
