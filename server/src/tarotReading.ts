import { getGroqClient, GROQ_MODEL } from './groqClient.js'

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

const MAX_ATTEMPTS = 3

// 영어, 한자/일본어(CJK), 타이, 키릴, 아랍 문자 — 한국어 답변에 섞이면 안 되는 문자들.
const FOREIGN_SCRIPT_RE = /[A-Za-z一-鿿぀-ヿ฀-๿Ѐ-ӿ؀-ۿ]/

function hasForeignScript(text: string): boolean {
  return FOREIGN_SCRIPT_RE.test(text)
}

export type SpreadType = 'quick' | 'deep'

export interface ReadingCardInput {
  name: string
  reversed: boolean
}

export interface ReadingParams {
  question: string
  questionType: string
  spreadType: SpreadType
  cards: ReadingCardInput[]
}

export interface TarotReading {
  conclusion: string
  detail: string
}

const SYSTEM_PROMPT = `당신은 따뜻하지만 담백하고 통찰력 있는 숙련된 타로 리더입니다.
사용자의 질문과, 사용자가 뽑은 카드들의 이름·정방향/역방향 여부, 그리고 사용자가 선택한 질문 유형(예: 연애, 건강, 취업 등)을 바탕으로 해석을 한국어로 작성합니다.
이번 스프레드는 과거·현재·미래 같은 고정된 자리(포지션)가 없습니다. 뽑힌 카드 전체를 하나의 흐름으로 엮어서 질문에 직접 답하는 통합된 해석을 만들어주세요.

응답 형식 (반드시 지킬 것):
- 반드시 아래 형태의 JSON 객체 하나만 반환하세요. JSON 앞뒤에 다른 텍스트, 설명, 코드 블록 표시(\`\`\`)를 절대 붙이지 마세요.
  {"conclusion": "결론 한두 문장", "detail": "자세한 해석"}
- "conclusion"에는 결론을 한두 문장으로 먼저 씁니다.
  - "3개월 안에 만남이 있을까요?"처럼 예/아니오로 답할 수 있는 질문이면, "네, 가능성이 보여요" 또는 "지금 흐름으로는 쉽지 않아 보여요"처럼 방향성을 먼저 분명히 밝히세요.
  - "커리어가 어떻게 될까요?"처럼 개방형 질문이면, 핵심 메시지를 한두 문장으로 요약하세요.
- "detail"에는 결론을 뒷받침하는 자세한 해석을 씁니다.

작성 규칙:
- 반드시 한국어로만 답변합니다. 한자, 영어, 그 외 다른 언어의 문자를 절대 섞지 마세요. (단, JSON의 키 이름 "conclusion"과 "detail" 자체는 그대로 영문으로 둡니다.)
- 카드를 "1번 카드는 ..., 2번 카드는 ..."처럼 순서대로 기계적으로 나열하지 마세요. 카드 전체를 하나의 이야기로 엮어서 질문에 직접 답하는 형태로 작성하세요.
- 필요하다면 특정 카드를 이름으로 언급해도 좋지만, 목적은 카드 하나하나를 설명하는 것이 아니라 "그래서 질문에 대한 답이 무엇인지"에 집중하는 것입니다.
- 카드 조합이 서로 같은 메시지를 강조하는지, 아니면 서로 상충하는지도 살펴서 자연스러운 흐름으로 설명하세요.
- 질문 유형에 맞는 관점(예: 연애 유형이면 감정과 관계, 취업/이직 유형이면 진로와 기회, 건강 유형이면 몸과 마음의 상태 등)에서 카드를 해석하세요.
- 뽑힌 카드 대부분이 역방향이어도 극단적으로 부정적인 톤은 피하세요. 현실적이되 균형 잡힌 조언으로 마무리하세요.
- 어조는 "~할 수도 있어요", "~일 수 있습니다", "~인 것 같아요"처럼 불분명하게 발뺌하는 표현은 최소화하고, "~해요", "~입니다", "~하세요"처럼 단정적이고 자신감 있는 어조로 작성하세요. 이는 사실이 아닌 것을 확정적으로 단언하라는 뜻이 아니라, "이 카드는 이런 의미입니다"라고 말하는 타로 리더 특유의 확신에 찬 화법을 쓰라는 뜻입니다. 미래를 100% 정해진 사실처럼 단언하는 예언조는 피하되, 문장 자체는 우유부단하지 않고 분명하게 쓰세요.
- 과도하게 신비주의적인 표현은 피하고, 사용자가 스스로 생각해볼 수 있도록 안내하는 태도는 유지하되, 위에서 설명한 것처럼 확신에 찬 어조로 전달하세요.
- "detail"의 분량은 카드 수에 비례해서 조절하세요: 카드가 3장이면 2~3문단, 5장이면 3~5문단 정도로 작성하고, 카드 수가 적은데 불필요하게 길게 늘어지지 않도록 하세요. 문단 사이는 빈 줄로 구분합니다.`

function buildUserMessage({ question, questionType, cards }: ReadingParams): string {
  const cardLines = cards.map((c) => `- ${c.name} — ${c.reversed ? '역방향' : '정방향'}`).join('\n')
  const paragraphHint = cards.length <= 3 ? '2~3문단' : '3~5문단'

  return `질문 유형: ${questionType}
질문: "${question}"

뽑힌 카드 (총 ${cards.length}장, 고정된 자리 없이 하나의 흐름으로 해석):
${cardLines}

위 카드들을 하나로 엮어서 질문에 직접 답하는 통합된 타로 해석을, {"conclusion": "...", "detail": "..."} 형태의 JSON으로만 작성해주세요. detail 분량은 ${paragraphHint} 정도로 해주세요.`
}

async function requestReading(messages: ChatMessage[]): Promise<string> {
  const completion = await getGroqClient().chat.completions.create({
    model: GROQ_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 1024,
  })

  const reading = completion.choices[0]?.message?.content?.trim()
  if (!reading) {
    throw new Error('Groq API로부터 해석 텍스트를 받지 못했습니다.')
  }
  return reading
}

// 모델이 지시를 어기고 JSON을 코드 블록(```json ... ```)으로 감싸는 경우를 대비한 방어적 처리.
function stripCodeFence(text: string): string {
  const match = text.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return match ? match[1] : text.trim()
}

// 모델이 "detail" 문단 사이 줄바꿈을 JSON 문자열 안에 \n으로 이스케이프하지 않고
// 실제 개행 문자 그대로 넣는 경우가 많다 — 이건 엄격한 JSON 파서 기준으로는 문법 오류라
// JSON.parse가 실패한다. 문자열 리터럴 안에 있을 때만 개행/탭을 이스케이프 시퀀스로
// 바꿔주는 방식으로 복구한다(따옴표 바깥의 서식은 건드리지 않는다).
function repairUnescapedControlChars(text: string): string {
  let result = ''
  let inString = false
  let escaped = false

  for (const ch of text) {
    if (!inString) {
      result += ch
      if (ch === '"') inString = true
      continue
    }

    if (escaped) {
      result += ch
      escaped = false
      continue
    }
    if (ch === '\\') {
      result += ch
      escaped = true
      continue
    }
    if (ch === '"') {
      inString = false
      result += ch
      continue
    }
    if (ch === '\n') {
      result += '\\n'
      continue
    }
    if (ch === '\r') {
      result += '\\r'
      continue
    }
    if (ch === '\t') {
      result += '\\t'
      continue
    }
    result += ch
  }

  return result
}

/** 모델 응답을 {conclusion, detail} JSON으로 파싱한다. 실패하면 전체 텍스트를 detail에, conclusion은 빈 문자열로 둔다. */
export function parseReading(raw: string): TarotReading {
  try {
    const cleaned = repairUnescapedControlChars(stripCodeFence(raw))
    const parsed = JSON.parse(cleaned)
    if (parsed && typeof parsed.conclusion === 'string' && typeof parsed.detail === 'string') {
      return { conclusion: parsed.conclusion.trim(), detail: parsed.detail.trim() }
    }
  } catch {
    // JSON이 아니거나 형식이 어긋남 — 아래 fallback으로 처리
  }
  return { conclusion: '', detail: raw.trim() }
}

/**
 * 질문·질문 유형·뽑힌 카드(3장 또는 5장, 고정 포지션 없음)를 받아 Groq API(OpenAI SDK 호환)로
 * 하나로 엮인 타로 해석을 {conclusion, detail} 형태로 생성한다.
 * API 키는 서버 환경변수(GROQ_API_KEY)에서만 읽으며 프론트엔드로 노출되지 않는다.
 *
 * Groq 모델이 가끔 한국어 답변에 다른 언어 문자를 한두 글자 섞는 경우가 있어,
 * 그런 응답이 감지되면 모델 스스로 무엇을 고쳐야 하는지 알 수 있도록 직전 답변과
 * 교정 요청을 대화에 추가해 최대 MAX_ATTEMPTS번까지 다시 생성을 시도한다.
 * 언어 혼입 검사는 파싱된 conclusion/detail 값에 대해서만 하는데, JSON 키 이름
 * 자체(conclusion, detail)는 항상 영문이라 원문 그대로 검사하면 매번 오탐이 나기 때문이다.
 */
export async function getTarotReading(params: ReadingParams): Promise<TarotReading> {
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserMessage(params) },
  ]

  let raw = await requestReading(messages)
  let result = parseReading(raw)

  for (
    let attempt = 1;
    attempt < MAX_ATTEMPTS && hasForeignScript(`${result.conclusion}\n${result.detail}`);
    attempt++
  ) {
    console.warn(`Groq 응답에 언어 혼입이 감지되어 재시도합니다 (시도 ${attempt + 1}/${MAX_ATTEMPTS}).`)
    messages.push({ role: 'assistant', content: raw })
    messages.push({
      role: 'user',
      content:
        '방금 답변에 한국어가 아닌 문자(영어, 한자, 일본어, 태국어, 러시아어, 아랍어 등)가 섞여 있었습니다. 같은 내용을 처음부터 다시, 반드시 한국어로만, 그리고 반드시 {"conclusion": "...", "detail": "..."} 형태의 JSON으로만 작성해주세요.',
    })
    raw = await requestReading(messages)
    result = parseReading(raw)
  }

  if (hasForeignScript(`${result.conclusion}\n${result.detail}`)) {
    console.warn('언어 혼입이 계속 감지되지만 최대 재시도 횟수에 도달하여 마지막 응답을 그대로 반환합니다.')
  }

  return result
}
