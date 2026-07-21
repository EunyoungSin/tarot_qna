export type Arcana = 'major' | 'minor'
export type Suit = 'wands' | 'cups' | 'swords' | 'pentacles' | null
export type Orientation = 'upright' | 'reversed'

export interface CardMeaning {
  upright: string
  reversed: string
  keywords: string[]
}

export interface Card {
  id: string
  name: string
  nameEn: string
  arcana: Arcana
  suit: Suit
  number: number
  image: string
  meaning: CardMeaning
}

export interface ShuffledCard {
  card: Card
  orientation: Orientation
}

export interface DrawnCard {
  card: Card
  orientation: Orientation
}

export const QUESTION_TYPES: string[] = [
  '연애 (솔로)',
  '연애 (커플)',
  '재회',
  '결혼/궁합',
  '건강',
  '취업',
  '이직',
  '합격 (시험/자격증)',
  '사업/재물',
  '인간관계',
  '기타',
]

export type SpreadType = 'quick' | 'deep'

export interface SpreadOption {
  value: SpreadType
  label: string
  cardCount: number
}

export const SPREAD_OPTIONS: SpreadOption[] = [
  { value: 'quick', label: '빠른 조언 (3장)', cardCount: 3 },
  { value: 'deep', label: '깊은 리딩 (5장)', cardCount: 5 },
]

export interface ReadingRequest {
  question: string
  questionType: string
  spreadType: SpreadType
  cards: {
    name: string
    reversed: boolean
  }[]
}

export interface ReadingResponse {
  conclusion: string
  detail: string
}
