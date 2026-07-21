import { Router, type Request, type Response } from 'express'
import { getTarotReading, type ReadingCardInput, type SpreadType } from '../tarotReading.js'
import { mapGroqError } from '../groqErrors.js'

const CARD_COUNT_BY_SPREAD: Record<SpreadType, number> = {
  quick: 3,
  deep: 5,
}

interface ReadingRequestBody {
  question?: string
  questionType?: string
  spreadType?: string
  cards?: ReadingCardInput[]
}

const router = Router()

router.post('/reading', async (req: Request<unknown, unknown, ReadingRequestBody>, res: Response) => {
  const { question, questionType, spreadType, cards } = req.body

  if (!question || typeof question !== 'string' || !question.trim()) {
    res.status(400).json({ error: '질문을 입력해주세요.' })
    return
  }
  if (!questionType || typeof questionType !== 'string' || !questionType.trim()) {
    res.status(400).json({ error: '질문 유형을 선택해주세요.' })
    return
  }
  if (spreadType !== 'quick' && spreadType !== 'deep') {
    res.status(400).json({ error: '리딩 방식을 선택해주세요.' })
    return
  }

  const expectedCardCount = CARD_COUNT_BY_SPREAD[spreadType]
  if (
    !Array.isArray(cards) ||
    cards.length !== expectedCardCount ||
    cards.some((c) => !c || typeof c.name !== 'string' || typeof c.reversed !== 'boolean')
  ) {
    res.status(400).json({ error: `카드 ${expectedCardCount}장이 필요합니다.` })
    return
  }

  try {
    const { conclusion, detail } = await getTarotReading({ question, questionType, spreadType, cards })
    res.json({ conclusion, detail })
  } catch (err) {
    console.error('Groq API error:', err)
    const { status, message } = mapGroqError(err)
    res.status(status).json({ error: message })
  }
})

export default router
