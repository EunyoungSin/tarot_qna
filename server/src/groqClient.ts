import OpenAI from 'openai'

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

// 현재 사용 가능한 최신 70B급 모델명은 https://console.groq.com 콘솔의 "Models" 목록에서
// 반드시 직접 확인할 것 — Groq는 모델을 자주 교체/폐지하므로 이 기본값이 만료되었을 수 있다.
// 환경변수 GROQ_MODEL로 언제든 덮어쓸 수 있다.
export const GROQ_MODEL = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile'
