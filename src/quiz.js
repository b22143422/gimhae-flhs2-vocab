export function normalize(value, language) {
  const text = value.normalize('NFKC').toLowerCase()
    .replace(/[‘’]/g, "'").replace(/[‐‑–—]/g, '-')
    .replace(/~|\.{2,}/g, '').replace(/\.+$/g, '').trim()
  return language === 'ko' ? text.replace(/\s/g, '') : text.replace(/\s+/g, ' ')
}

export function koreanAnswers(value) {
  const variants = value.split(/[,;](?![^()\[\]]*[)\]])/).map(part => part.trim())
  return [...new Set([value, ...variants.flatMap(part => [
    part,
    part.replace(/\([^)]*\)|\[[^\]]*\]/g, '').trim(),
  ])])].filter(Boolean)
}

const keyOf = ({ en, ko }) => JSON.stringify([normalize(en,'en'), normalize(ko,'ko')])
const sourceOf = ({ part, location }) => [part, location].filter(Boolean).join(' · ')

export function scopeWords(groups) {
  return uniqueWords(groups.flatMap(group => group.parts.flatMap(part =>
    part.words.map(word => ({ ...word, part: part.label, source: [part.label, word.location].filter(Boolean).join(' · ') })),
  )))
}

export function uniqueWords(words) {
  const byKey = new Map()
  for (const word of words) {
    const key = keyOf(word)
    if (!byKey.has(key)) {
      byKey.set(key, { ...word, key, sources: [sourceOf(word)] })
    } else {
      const sources = byKey.get(key).sources
      if (!sources.includes(sourceOf(word))) sources.push(sourceOf(word))
    }
  }
  return [...byKey.values()]
}

export function shuffle(items) {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index--) {
    const next = Math.floor(Math.random() * (index + 1))
    const picked = shuffled[next]
    shuffled[next] = shuffled[index]
    shuffled[index] = picked
  }
  return shuffled
}

function comparableKorean(word) {
  return koreanAnswers(word.ko).map(value => normalize(value, 'ko'))
}

function overlapping(left, right) {
  return left.some(value => right.includes(value))
}

function relatedKorean(left, right) {
  return left.some(a => right.some(b =>
    a === b || (Math.min(a.length, b.length) >= 2 && (a.includes(b) || b.includes(a))),
  ))
}

function relatedEnglish(left, right) {
  return left === right || (Math.min(left.length, right.length) >= 4 && (left.includes(right) || right.includes(left)))
}

// Each distractor is drawn from a different source and shares no answer variants.
function questionFor(word, direction, pool) {
  const answerLanguage = direction === 'en-ko' ? 'ko' : 'en'
  const promptLanguage = answerLanguage === 'ko' ? 'en' : 'ko'
  const korean = comparableKorean(word)
  const english = normalize(word.en, 'en')
  const sameEnglish = pool.filter(entry => entry.englishKey === english)
  const sameKorean = pool.filter(entry => overlapping(korean, entry.koreanKeys))
  const scopedEnglish = sameEnglish.filter(entry => entry.sources.includes(word.source))
  const correct = answerLanguage === 'ko'
    ? scopedEnglish.flatMap(entry => koreanAnswers(entry.ko))
    : sameKorean.map(entry => entry.en)
  const accepted = new Set(correct.map(value => normalize(value, answerLanguage)))
  const displayed = word[answerLanguage]

  const distractors = []
  const seen = new Set([normalize(displayed, answerLanguage)])
  for (const entry of shuffle(pool)) {
    const key = normalize(entry[answerLanguage], answerLanguage)
    if (entry.part === word.part || accepted.has(key) ||
        relatedEnglish(entry.englishKey, english) ||
        relatedKorean(entry.koreanKeys, korean)) continue
    if (seen.has(key)) continue
    seen.add(key)
    distractors.push(entry[answerLanguage])
    if (distractors.length === 3) break
  }

  return {
    word,
    direction,
    answerLanguage,
    prompt: word[promptLanguage],
    correct: displayed,
    accepted,
    options: shuffle([displayed, ...distractors]),
  }
}

export function makeQuiz(words, pool, { direction, count }) {
  const selected = shuffle(words).slice(0, count)
  const entries = pool.map(word => ({ ...word, englishKey: normalize(word.en, 'en'), koreanKeys: comparableKorean(word) }))
  const startWithEnglish = Math.random() < 0.5
  return selected.map((word, index) => questionFor(word, direction === 'mixed'
    ? ((index % 2 === 0) === startWithEnglish ? 'en-ko' : 'ko-en')
    : direction, entries))
}

export function isCorrect(question, answer) {
  return question.accepted.has(normalize(answer, question.answerLanguage))
}
