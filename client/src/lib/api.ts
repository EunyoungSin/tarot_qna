import type { DrawnCard, ReadingRequest, ReadingResponse, SpreadType } from '../types/tarot'

export async function fetchReading(
  question: string,
  questionType: string,
  spreadType: SpreadType,
  drawnCards: DrawnCard[],
): Promise<ReadingResponse> {
  const body: ReadingRequest = {
    question,
    questionType,
    spreadType,
    cards: drawnCards.map((d) => ({
      name: d.card.name,
      reversed: d.orientation === 'reversed',
    })),
  }

  const res = await fetch('/api/reading', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    let message = '해석을 가져오는 중 오류가 발생했습니다.'
    try {
      const data = await res.json()
      if (data?.error) message = data.error
    } catch {
      // ignore parse failure, use default message
    }
    throw new Error(message)
  }

  return (await res.json()) as ReadingResponse
}
