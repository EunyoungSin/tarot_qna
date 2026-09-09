import OpenAI, { NotFoundError } from 'openai'

// Groq는 OpenAI SDK와 호환되는 API를 제공한다 — baseURL만 Groq 엔드포인트로 바꾸면 된다.
// API 키는 이 서버 프로세스 안에서만 사용되며 프론트엔드로 절대 전달되지 않는다.
//
// 클라이언트는 지연 생성한다: OpenAI SDK 생성자는 apiKey가 없으면 즉시 예외를 던지므로,
// 모듈 로드 시점(서버 기동 시)에 만들면 키가 설정되지 않았을 때 서버 전체가 죽어버린다.
// 실제 요청이 들어와 이 함수가 호출될 때만 생성하면, 그 예외를 라우트 핸들러의
// try/catch가 정상적으로 잡아 한글 에러 응답으로 돌려줄 수 있다.
let client: OpenAI | null = null

export function getGroqClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    })
  }
  return client
}

// Groq는 예고 없이 모델을 폐지하기도 한다(예: llama-3.3-70b-versatile, 2026-08-16 폐지).
// 그래서 모델 하나를 고정하는 대신 우선순위 목록을 두고, 서버 시작 시 실제로 서비스 중인
// 첫 번째 모델을 고르고, 런타임 중 404(모델 없음)를 만나면 다음 순위로 즉시 넘어간다.
// 환경변수 GROQ_MODEL_FALLBACKS(콤마 구분)로 언제든 덮어쓸 수 있다.
const DEFAULT_MODEL_FALLBACKS = 'openai/gpt-oss-120b,qwen/qwen3.6-27b,openai/gpt-oss-20b'

export const GROQ_MODEL_FALLBACKS: string[] = (process.env.GROQ_MODEL_FALLBACKS ?? DEFAULT_MODEL_FALLBACKS)
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean)

// 실제로 사용할 모델. 서버 시작 시 initializeGroqModel()이 채우기 전까지는 1순위 모델로
// 시작하고, 런타임 중 폴백이 일어나면 requestReading이 갱신한다.
let currentModel: string = GROQ_MODEL_FALLBACKS[0]

export function getCurrentModel(): string {
  return currentModel
}

export function setCurrentModel(model: string): void {
  currentModel = model
}

/** 우선순위 목록에서 model 다음 순위를 반환한다. model이 목록에 없거나 마지막이면 undefined. */
export function getNextFallbackModel(model: string): string | undefined {
  const idx = GROQ_MODEL_FALLBACKS.indexOf(model)
  if (idx === -1) return undefined
  return GROQ_MODEL_FALLBACKS[idx + 1]
}

/** Groq가 반환하는 404(모델 없음/폐지)인지 판별한다. */
export function isModelNotFoundError(err: unknown): boolean {
  return err instanceof NotFoundError
}

/**
 * 서버 시작 시 Groq에서 현재 서비스 중인 모델 목록을 조회해, 우선순위 목록 중 가장
 * 먼저 매칭되는 모델을 현재 모델로 확정한다. 조회가 실패해도(네트워크 오류, Groq 다운 등)
 * 서버 기동을 막지 않고 1순위 모델을 그대로 사용한다.
 */
export async function initializeGroqModel(): Promise<void> {
  const primary = GROQ_MODEL_FALLBACKS[0]

  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY ?? ''}` },
    })
    if (!res.ok) {
      throw new Error(`모델 목록 조회 실패 (HTTP ${res.status})`)
    }

    const body = (await res.json()) as { data?: Array<{ id: string }> }
    const availableIds = new Set((body.data ?? []).map((m) => m.id))
    const selected = GROQ_MODEL_FALLBACKS.find((m) => availableIds.has(m)) ?? primary

    if (selected !== primary) {
      console.warn(`⚠️ 모델 ${primary}가 사용 불가능하여 ${selected}로 자동 전환되었습니다.`)
    }
    currentModel = selected
  } catch (err) {
    console.warn(
      `⚠️ Groq 모델 목록 조회에 실패해 기본값(${primary})으로 진행합니다:`,
      err instanceof Error ? err.message : err,
    )
    currentModel = primary
  }
}
