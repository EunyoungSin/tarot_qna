import type { Card, ShuffledCard } from '../types/tarot'

/** Fisher-Yates 셔플. 원본 배열은 변경하지 않는다. */
export function shuffleArray<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * 카드 목록을 무작위 순서로 섞고, 카드마다 정방향/역방향을 50% 확률로 결정한다.
 * 반환된 배열이 화면에 보이지 않는 실제 카드 정체(순서·방향)를 담고 있으며,
 * 사용자가 카드를 고르기 전까지는 이 배열의 내용을 노출하지 않아야 한다.
 */
export function shuffleTarotDeck(cards: Card[]): ShuffledCard[] {
  return shuffleArray(cards).map((card) => ({
    card,
    orientation: Math.random() < 0.5 ? 'reversed' : 'upright',
  }))
}
