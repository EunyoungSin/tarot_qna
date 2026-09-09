import { useLayoutEffect, useMemo, useRef, useState, useEffect, type CSSProperties } from 'react'
import type { DrawnCard, ShuffledCard } from '../types/tarot'
import CardBack from './CardBack'

interface CardSpreadProps {
  deck: ShuffledCard[]
  cardCount: number
  onCardsDrawn: (cards: DrawnCard[]) => void
  onReshuffle: () => void
}

const OVERLAP_RATIO = 0.42 // 카드 너비 대비 겹치는 비율
const CARD_ASPECT = 1.5 // 카드 세로/가로 비율 (2:3)
const ROW_GAP_RATIO = 0.12 // 줄 사이 간격 비율(카드 너비 대비)
const MIN_GAP_PX = 8 // 줄 사이 최소 여백(px)
const MIN_CARD_WIDTH = 26
const MAX_CARD_WIDTH = 92
// 카드 영역 아래에 있는 "선택하기" 버튼 + 하단 출처 표기 등이 차지하는 대략적인 높이(px).
// 세로 스크롤이 생기지 않도록 가용 높이 계산 시 미리 빼둔다.
const RESERVED_BELOW_PX = 220

// 셔플 애니메이션: 1) 모으기(+살짝 흔들기) 2) 잠깐 멈춤 3) 한 장씩 순서대로 다시 펼치기.
const GATHER_MS = 600 // 모이는 동작 + 끝부분의 흔들림까지 포함 (0.4~0.6초 스펙의 상한)
// 카드 한 장의 펼침 동작 자체는 짧고 빠르게, 카드 사이 시차는 충분히 벌려야
// "여러 장이 한꺼번에 움직이는 물결"이 아니라 "한 장씩 순서대로 튀어나오는" 느낌이 난다.
const SPREAD_CARD_DURATION_MS = 90 // 카드 한 장이 펼쳐지는 데 걸리는 시간
const SPREAD_MAX_STAGGER_MS = 910 // 첫 카드와 마지막 카드가 펼쳐지기 시작하는 시간 차
const SPREAD_TOTAL_MS = SPREAD_CARD_DURATION_MS + SPREAD_MAX_STAGGER_MS // 0.8~1.2초 스펙 안에 들어옴

type ShufflePhase = 'idle' | 'gathering' | 'spreading'

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size))
  }
  return rows
}

/**
 * 세로 스크롤 없이 카드 전체가 화면 한 판에 들어오도록, 주어진 가로/세로 공간 안에서
 * "한 줄당 장수"를 바꿔가며 카드를 최대한 크게 보여줄 수 있는 조합을 찾는다.
 */
function computeLayout(availableWidth: number, availableHeight: number, totalCards: number) {
  if (availableWidth <= 0 || availableHeight <= 0 || totalCards <= 0) {
    return { cardsPerRow: totalCards || 1, cardWidth: MIN_CARD_WIDTH, rowGap: MIN_GAP_PX }
  }

  let bestCols = totalCards
  let bestWidth = 0

  for (let cols = 1; cols <= totalCards; cols++) {
    const rows = Math.ceil(totalCards / cols)

    const widthLimited = availableWidth / (1 + (cols - 1) * (1 - OVERLAP_RATIO))
    const heightDenom = rows * CARD_ASPECT + (rows - 1) * ROW_GAP_RATIO
    const heightLimited = (availableHeight - (rows - 1) * MIN_GAP_PX) / heightDenom

    const width = Math.min(widthLimited, heightLimited)
    if (width > bestWidth) {
      bestWidth = width
      bestCols = cols
    }
  }

  // bestWidth가 MIN_CARD_WIDTH보다 작으면(세로 공간이 매우 부족한 경우) 아래에서
  // 카드 너비를 MIN_CARD_WIDTH로 올려치게 되는데, 그 너비 그대로 bestCols장을 한 줄에
  // 두면 가로 폭을 넘쳐서(스크롤도 안 되어) 화면 밖 카드는 클릭조차 할 수 없게 된다.
  // 그래서 이 경우엔 MIN_CARD_WIDTH 기준으로 한 줄에 실제로 들어갈 수 있는 최대 열
  // 개수로 bestCols를 다시 제한한다. 줄 수가 늘어나 세로 스크롤이 필요해질 수 있지만,
  // 가로로 넘쳐 카드를 아예 선택할 수 없게 되는 것보다는 안전하다.
  if (bestWidth < MIN_CARD_WIDTH) {
    const maxColsAtMinWidth = Math.max(
      1,
      Math.floor((availableWidth / MIN_CARD_WIDTH - 1) / (1 - OVERLAP_RATIO) + 1),
    )
    bestCols = Math.min(bestCols, maxColsAtMinWidth)
  }

  const cardWidth = Math.min(MAX_CARD_WIDTH, Math.max(MIN_CARD_WIDTH, bestWidth))
  const rowGap = cardWidth * ROW_GAP_RATIO + MIN_GAP_PX
  return { cardsPerRow: bestCols, cardWidth, rowGap }
}

function useFitToScreenLayout(totalCards: number) {
  const areaRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState(() => computeLayout(1200, 600, totalCards))

  useLayoutEffect(() => {
    function recompute() {
      const el = areaRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const availableWidth = el.clientWidth
      const availableHeight = window.innerHeight - rect.top - RESERVED_BELOW_PX
      setLayout(computeLayout(availableWidth, availableHeight, totalCards))
    }

    // 모바일 브라우저는 스크롤 중 주소창이 접히고 펴지면서 innerWidth는 그대로인 채
    // innerHeight만 바뀌는 resize를 반복 발생시킨다. 이걸 그대로 recompute에 반영하면
    // 카드 크기가 커졌다 작아졌다 흔들리므로, width가 실제로 바뀐 경우(회전/창 크기 변경)만
    // 반응하고 그마저도 debounce로 묶어 과도한 재계산을 막는다.
    let lastWidth = window.innerWidth
    let timeoutId: number | undefined

    function handleResize() {
      const currentWidth = window.innerWidth
      if (currentWidth === lastWidth) return
      lastWidth = currentWidth

      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(recompute, 150)
    }

    recompute()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }, [totalCards])

  return { areaRef, ...layout }
}

export default function CardSpread({ deck, cardCount, onCardsDrawn, onReshuffle }: CardSpreadProps) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])
  const [shufflePhase, setShufflePhase] = useState<ShufflePhase>('idle')
  const isShuffling = shufflePhase !== 'idle'
  const { areaRef, cardsPerRow, cardWidth, rowGap } = useFitToScreenLayout(deck.length)

  // 덱이 새로 섞이면(다시 섞기 포함) 선택 상태를 초기화한다.
  useEffect(() => {
    setSelectedIndices([])
  }, [deck])

  const isComplete = selectedIndices.length === cardCount

  const indexedDeck = useMemo(() => deck.map((entry, index) => ({ entry, index })), [deck])
  const rows = useMemo(() => chunk(indexedDeck, cardsPerRow), [indexedDeck, cardsPerRow])
  const overlapPx = cardWidth * OVERLAP_RATIO

  function handlePick(index: number) {
    if (isShuffling) return
    setSelectedIndices((prev) => {
      if (prev.includes(index)) return prev.filter((i) => i !== index)
      if (prev.length >= cardCount) return prev
      return [...prev, index]
    })
  }

  function handleConfirm() {
    if (!isComplete) return
    const drawn: DrawnCard[] = selectedIndices.map((idx) => ({
      card: deck[idx].card,
      orientation: deck[idx].orientation,
    }))
    onCardsDrawn(drawn)
  }

  function handleReshuffleClick() {
    if (isShuffling) return
    setShufflePhase('gathering')
    // 1) 카드들이 중앙으로 모여 한 더미가 되는 동작이 끝나면,
    window.setTimeout(() => {
      // 2) 바로 그 순간 실제 덱을 새로 섞고("멈춰서 섞이는" 지점),
      onReshuffle()
      // 3) 모인 자리에서 새 위치로 한 장씩 순서대로 펼쳐진다.
      setShufflePhase('spreading')
      window.setTimeout(() => {
        setShufflePhase('idle')
      }, SPREAD_TOTAL_MS)
    }, GATHER_MS)
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <p className="mb-2 text-center text-sm text-purple-200">
        카드 {selectedIndices.length} / {cardCount} 선택됨 — 마음이 이끄는 카드를 순서대로 {cardCount}장
        골라주세요.
      </p>

      <div className="mb-4 flex justify-center">
        <button
          type="button"
          onClick={handleReshuffleClick}
          disabled={isShuffling}
          className="rounded-md border border-gold/50 px-3 py-1.5 text-xs text-purple-100 transition hover:border-gold hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          카드 다시 섞기
        </button>
      </div>

      <div ref={areaRef} className="flex flex-col items-center justify-center" style={{ gap: `${rowGap}px` }}>
        {rows.map((row, rowIdx) => {
          const rowMid = (row.length - 1) / 2
          const rowsMid = (rows.length - 1) / 2
          const rowHeight = cardWidth * CARD_ASPECT

          return (
            <div key={rowIdx} className="flex justify-center">
              {row.map(({ entry, index }, posInRow) => {
                const pickedOrder = selectedIndices.indexOf(index)
                const isPicked = pickedOrder !== -1
                const isLastInRow = posInRow === row.length - 1
                // 모든 카드가 화면 중앙의 한 지점(카드 영역 전체의 가운데)으로 모였다가
                // 다시 제자리로 퍼진다.
                const gatherDx = -(posInRow - rowMid) * (cardWidth - overlapPx)
                const gatherDy = -(rowIdx - rowsMid) * (rowHeight + rowGap)
                // chunk()가 원래 순서를 그대로 유지하므로 index 자체가 "왼쪽 위 -> 오른쪽 아래"
                // 순서다. 펼쳐질 때 이 순서대로 한 장씩 시차를 두고 시작하게 한다.
                const spreadDelayMs =
                  deck.length > 1 ? (index / (deck.length - 1)) * SPREAD_MAX_STAGGER_MS : 0

                const animClass =
                  shufflePhase === 'gathering'
                    ? 'card-gather-anim'
                    : shufflePhase === 'spreading'
                      ? 'card-spread-anim'
                      : ''

                return (
                  <div
                    key={entry.card.id}
                    className={animClass}
                    style={{
                      width: `${cardWidth}px`,
                      flexShrink: 0,
                      marginRight: isLastInRow ? 0 : `-${overlapPx}px`,
                      zIndex: isPicked ? 100 : posInRow,
                      animationDelay: shufflePhase === 'spreading' ? `${spreadDelayMs}ms` : undefined,
                      ...(isShuffling
                        ? ({ '--gather-dx': `${gatherDx}px`, '--gather-dy': `${gatherDy}px` } as CSSProperties)
                        : {}),
                    }}
                  >
                    <CardBack
                      onClick={() => handlePick(index)}
                      disabled={isShuffling || (isComplete && !isPicked)}
                      dimmed={isComplete}
                      selected={isPicked}
                      order={isPicked ? pickedOrder + 1 : undefined}
                    />
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!isComplete}
          className="rounded-md bg-gold px-8 py-3 font-semibold text-ink transition hover:bg-gold/80 disabled:cursor-not-allowed disabled:opacity-40"
        >
          선택하기
        </button>
      </div>
    </div>
  )
}
