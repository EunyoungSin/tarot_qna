import cardsData from '../data/cards.json'
import type { Card, ShuffledCard } from '../types/tarot'
import { shuffleTarotDeck } from '../utils/shuffle'

const ALL_CARDS = cardsData as Card[]

export function shuffleDeck(): ShuffledCard[] {
  return shuffleTarotDeck(ALL_CARDS)
}
