import { useState } from 'react'
import { QUESTION_TYPES, SPREAD_OPTIONS, type SpreadType } from '../types/tarot'
import { isValidQuestion, QUESTION_VALIDATION_MESSAGE } from '../utils/validateQuestion'

interface QuestionFormProps {
  onSubmit: (question: string, questionType: string, spreadType: SpreadType) => void
}

export default function QuestionForm({ onSubmit }: QuestionFormProps) {
  const [questionType, setQuestionType] = useState('')
  const [spreadType, setSpreadType] = useState<SpreadType | ''>('')
  const [question, setQuestion] = useState('')

  const questionValid = isValidQuestion(question)
  const showValidationMessage = question.trim().length > 0 && !questionValid
  const canSubmit = Boolean(questionType) && Boolean(spreadType) && questionValid

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = question.trim()
    if (!questionType || !spreadType || !isValidQuestion(trimmed)) return
    onSubmit(trimmed, questionType, spreadType)
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-xl space-y-6">
      <div>
        <h1 className="text-center font-display text-3xl text-gold">타로에게 묻다</h1>
        <p className="mt-2 text-center text-sm text-purple-200">
          마음에 품고 있는 질문을 적어주세요.
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-purple-200">질문 유형을 선택해주세요</p>
        <div className="flex flex-wrap gap-2">
          {QUESTION_TYPES.map((type) => {
            const isSelected = questionType === type
            return (
              <button
                key={type}
                type="button"
                onClick={() => setQuestionType(type)}
                aria-pressed={isSelected}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  isSelected
                    ? 'border-gold bg-gold text-ink font-semibold'
                    : 'border-gold/40 bg-ink/60 text-purple-100 hover:border-gold/70'
                }`}
              >
                {type}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-purple-200">리딩 방식을 선택해주세요</p>
        <div className="flex flex-wrap gap-2">
          {SPREAD_OPTIONS.map((option) => {
            const isSelected = spreadType === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSpreadType(option.value)}
                aria-pressed={isSelected}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  isSelected
                    ? 'border-gold bg-gold text-ink font-semibold'
                    : 'border-gold/40 bg-ink/60 text-purple-100 hover:border-gold/70'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="예: 요즘 하고 있는 고민에 대해 어떤 방향으로 나아가야 할까요?"
          rows={4}
          className="w-full rounded-md border border-gold/40 bg-ink/60 p-3 text-purple-50 placeholder:text-purple-300/50 focus:border-gold focus:outline-none"
        />
        {showValidationMessage && (
          <p className="mt-2 text-sm text-red-300">{QUESTION_VALIDATION_MESSAGE}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-md bg-gold py-3 font-semibold text-ink transition hover:bg-gold/80 disabled:cursor-not-allowed disabled:opacity-40"
      >
        카드 뽑기
      </button>
    </form>
  )
}
