import type { DrawnCard } from '../types/tarot'

interface DrawnCardsPanelProps {
  cards: DrawnCard[]
}

// card.meaning.upright/reversed는 정적 데이터(cards.json)에 "키워드 3개\n한 문장" 형태로
// 이미 들어있으므로, 매번 Groq API를 부르지 않고 그 자리에서 파싱해서 보여준다.
function CardMeaningBlock({ card, orientation, align }: DrawnCard & { align: 'center' | 'left' }) {
  const raw = orientation === 'reversed' ? card.meaning.reversed : card.meaning.upright
  const [keywordLine, sentence] = raw.split('\n')
  const keywords = keywordLine.split(', ')
  const isCenter = align === 'center'

  return (
    <>
      <div className={`flex flex-wrap gap-1.5 ${isCenter ? 'justify-center' : ''}`}>
        {keywords.map((keyword) => (
          <span
            key={keyword}
            className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-xs text-gold"
          >
            {keyword}
          </span>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-purple-200">{sentence}</p>
    </>
  )
}

function CardThumbnail({ card, orientation, className }: DrawnCard & { className: string }) {
  return (
    <div className={`overflow-hidden rounded-md border-2 border-gold/60 shadow-md ${className}`}>
      <img
        src={card.image}
        alt={card.name}
        className={`aspect-[2/3] h-full w-full object-cover ${orientation === 'reversed' ? 'rotate-180' : ''}`}
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
    </div>
  )
}

function CardNameLabel({ card, orientation }: DrawnCard) {
  return (
    <span className="text-sm font-medium text-purple-50">
      {card.name} {orientation === 'reversed' ? '(역방향)' : '(정방향)'}
    </span>
  )
}

export default function DrawnCardsPanel({ cards }: DrawnCardsPanelProps) {
  // 5장 리딩은 문장 설명이 들어가기엔 5열 그리드가 너무 좁아서, 세로로 한 장씩 나열한다.
  if (cards.length >= 5) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        {cards.map((d, i) => (
          <div key={`${d.card.id}-${i}`} className="flex gap-4 rounded-md border border-gold/30 bg-ink/40 p-3">
            <CardThumbnail card={d.card} orientation={d.orientation} className="w-20 shrink-0 sm:w-24" />
            <div className="flex flex-col justify-center gap-2 text-left">
              <CardNameLabel card={d.card} orientation={d.orientation} />
              <CardMeaningBlock card={d.card} orientation={d.orientation} align="left" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl grid-cols-3 gap-4">
      {cards.map((d, i) => (
        <div key={`${d.card.id}-${i}`} className="flex flex-col items-center gap-2 text-center">
          <CardThumbnail card={d.card} orientation={d.orientation} className="w-full" />
          <CardNameLabel card={d.card} orientation={d.orientation} />
          <CardMeaningBlock card={d.card} orientation={d.orientation} align="center" />
        </div>
      ))}
    </div>
  )
}
