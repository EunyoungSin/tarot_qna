import { useState } from 'react'
import { SPREAD_OPTIONS, type DrawnCard, type ShuffledCard, type SpreadType } from './types/tarot'
import { shuffleDeck } from './lib/deck'
import { fetchReading } from './lib/api'
import QuestionForm from './components/QuestionForm'
import CardSpread from './components/CardSpread'
import DrawnCardsPanel from './components/DrawnCardsPanel'
import ReadingResult from './components/ReadingResult'

type Stage = 'question' | 'drawing' | 'reading'
type ReadingStatus = 'idle' | 'loading' | 'error' | 'done'

export default function App() {
  const [stage, setStage] = useState<Stage>('question')
  const [question, setQuestion] = useState('')
  const [questionType, setQuestionType] = useState('')
  const [spreadType, setSpreadType] = useState<SpreadType>('quick')
  const [deck, setDeck] = useState<ShuffledCard[]>([])
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([])
  const [readingStatus, setReadingStatus] = useState<ReadingStatus>('idle')
  const [conclusion, setConclusion] = useState('')
  const [detail, setDetail] = useState('')
  const [error, setError] = useState('')

  const spreadOption = SPREAD_OPTIONS.find((o) => o.value === spreadType) ?? SPREAD_OPTIONS[0]

  function handleQuestionSubmit(q: string, type: string, spread: SpreadType) {
    setQuestion(q)
    setQuestionType(type)
    setSpreadType(spread)
    setDeck(shuffleDeck())
    setStage('drawing')
  }

  async function handleCardsDrawn(cards: DrawnCard[]) {
    setDrawnCards(cards)
    setStage('reading')
    await runReading(cards)
  }

  async function runReading(cards: DrawnCard[]) {
    setReadingStatus('loading')
    setError('')
    try {
      const result = await fetchReading(question, questionType, spreadType, cards)
      setConclusion(result.conclusion)
      setDetail(result.detail)
      setReadingStatus('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.')
      setReadingStatus('error')
    }
  }

  function handleReset() {
    setStage('question')
    setQuestion('')
    setQuestionType('')
    setDeck([])
    setDrawnCards([])
    setReadingStatus('idle')
    setConclusion('')
    setDetail('')
    setError('')
  }

  return (
    <main className="min-h-screen px-4 py-10">
      {stage === 'question' && <QuestionForm onSubmit={handleQuestionSubmit} />}

      {stage === 'drawing' && (
        <CardSpread
          deck={deck}
          cardCount={spreadOption.cardCount}
          onCardsDrawn={handleCardsDrawn}
          onReshuffle={() => setDeck(shuffleDeck())}
        />
      )}

      {stage === 'reading' && (
        <div className="space-y-8">
          <h1 className="text-center font-display text-3xl text-gold">타로에게 묻다</h1>
          <p className="mx-auto -mt-4 max-w-2xl text-center text-sm text-purple-300">
            [{questionType} · {spreadOption.label}] {question}
          </p>
          <DrawnCardsPanel cards={drawnCards} />
          <ReadingResult
            status={readingStatus}
            conclusion={conclusion}
            detail={detail}
            error={error}
            onRetry={() => runReading(drawnCards)}
            onReset={handleReset}
          />
        </div>
      )}

      <footer className="mt-16 text-center text-xs text-purple-400/60">
        타로 카드 이미지 출처:{' '}
        <a
          href="https://github.com/searge/tarot"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          searge/tarot
        </a>{' '}
        (CC BY-SA 4.0)
      </footer>
    </main>
  )
}
