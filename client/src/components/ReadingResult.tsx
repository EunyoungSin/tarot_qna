interface ReadingResultProps {
  status: 'idle' | 'loading' | 'error' | 'done'
  conclusion: string
  detail: string
  error: string
  onRetry: () => void
  onReset: () => void
}

export default function ReadingResult({ status, conclusion, detail, error, onRetry, onReset }: ReadingResultProps) {
  if (status === 'loading') {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 py-8 text-purple-200">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        <p>카드의 메시지를 해석하고 있습니다...</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 py-6 text-center">
        <p className="text-red-300">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-gold px-4 py-2 font-semibold text-ink hover:bg-gold/80"
        >
          다시 시도
        </button>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        {conclusion && (
          <div className="whitespace-pre-wrap rounded-md border border-gold bg-gold/10 p-5 text-center text-lg font-semibold leading-relaxed text-gold">
            {conclusion}
          </div>
        )}
        <div className="whitespace-pre-wrap rounded-md border border-gold/30 bg-ink/50 p-5 leading-relaxed text-purple-50">
          {detail}
        </div>
        <div className="text-center">
          <button
            type="button"
            onClick={onReset}
            className="rounded-md border border-gold/60 px-4 py-2 font-semibold text-gold hover:bg-gold/10"
          >
            다시 하기
          </button>
        </div>
      </div>
    )
  }

  return null
}
