import {
  RateLimitError,
  AuthenticationError,
  PermissionDeniedError,
  APIConnectionError,
  APIConnectionTimeoutError,
  InternalServerError,
  APIError,
} from 'openai'

export interface MappedError {
  status: number
  message: string
}

/**
 * Groq(OpenAI SDK 호환) 호출 중 발생한 에러를 사용자에게 보여줄 한글 메시지와
 * 적절한 HTTP 상태 코드로 변환한다. 가장 구체적인 에러 타입부터 먼저 확인해야
 * 한다 — RateLimitError 등은 모두 APIError의 하위 클래스이므로, 순서를 바꾸면
 * 항상 마지막 case(가장 일반적인 처리)로만 빠지게 된다.
 */
export function mapGroqError(err: unknown): MappedError {
  // Groq 무료 티어는 분당/일일 요청 제한이 있다 — 한도 초과 시 429로 응답한다.
  if (err instanceof RateLimitError) {
    const retryAfter = err.headers?.get?.('retry-after')
    const waitHint = retryAfter ? ` (약 ${retryAfter}초 후)` : ''
    return {
      status: 429,
      message: `지금 요청이 몰려 잠시 이용이 제한되었습니다${waitHint}. 잠시 후 다시 시도해주세요.`,
    }
  }

  if (err instanceof AuthenticationError || err instanceof PermissionDeniedError) {
    return {
      status: 500,
      message: '해석 서버의 API 키 설정에 문제가 있습니다. 관리자에게 문의해주세요.',
    }
  }

  if (err instanceof APIConnectionTimeoutError) {
    return {
      status: 504,
      message: 'Groq 서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
    }
  }

  if (err instanceof APIConnectionError) {
    return {
      status: 503,
      message: 'Groq 서버에 연결할 수 없습니다. 네트워크 상태를 확인한 후 다시 시도해주세요.',
    }
  }

  if (err instanceof InternalServerError) {
    return {
      status: 502,
      message: 'Groq 서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
    }
  }

  // 그 외 4xx 계열(잘못된 모델명 등 포함). 사용자에게는 원인을 노출하지 않고,
  // 서버 로그에서 원인을 확인하도록 안내한다.
  if (err instanceof APIError) {
    return {
      status: 502,
      message: '해석 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
    }
  }

  return {
    status: 500,
    message: '해석 서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
  }
}
