# 타로에게 묻다

React + TypeScript + Tailwind CSS 프론트엔드와 Express 백엔드(Node.js)로 구성된 AI 타로 카드 리딩 웹입니다.<br>
질문 유형과 리딩 방식(빠른 조언 3장 / 깊은 리딩 5장)을 고른 뒤 질문을 입력하고 78장의 카드 중 원하는 장수를 직접 골라 뽑으면, Groq API가 카드 전체를 하나의 흐름으로 엮어 결론과 상세 해석을 생성합니다.<br>
https://tarot-qna.onrender.com/ 에서 확인 해 보실 수 있습니다.

## 준비

```bash
npm install
cp server/.env.example server/.env
# server/.env 파일을 열어 GROQ_API_KEY 값을 채워주세요
```

모델은 우선순위 목록(`server/.env`의 `GROQ_MODEL_FALLBACKS`, 콤마 구분)으로 관리됩니다. 서버 시작 시 Groq에서 실제로 서비스 중인 모델을 조회해 목록 중 가장 먼저 매칭되는 모델을 사용하고, 런타임 중 사용 중이던 모델이 폐지(404)되면 다음 순위로 자동 전환합니다 — Groq가 예고 없이 모델을 폐지해도 서버가 죽지 않습니다. 기본 우선순위는 `openai/gpt-oss-120b,qwen/qwen3.6-27b,openai/gpt-oss-20b`이며, 사용 가능한 모델 목록은 [Groq 콘솔](https://console.groq.com)에서 확인할 수 있습니다. 등록된 모델 3개가 전부 폐지됐을 때의 대응 절차는 [docs/ai-model-fallback.md](docs/ai-model-fallback.md) 참고.

## 실행

```bash
npm run dev
```

- 클라이언트: http://localhost:5173
- 서버: http://localhost:3001 (클라이언트의 `/api` 요청은 Vite dev 서버가 프록시합니다)

## 질문 작성 규칙

명백히 답할 수 없는 입력만 걸러내는 최소한의 검사입니다(`client/src/utils/validateQuestion.ts`). 다음 조건을 모두 만족해야 제출할 수 있습니다:

- 공백을 제외하고 10자 이상
- 두 단어 이상으로 구성
- 같은 문자가 3번 이상 연속 반복되지 않을 것 (숫자는 예외 — "26000원"처럼 정상적인 수치 표현은 허용)
- "asdf", "qwer"처럼 의미 없이 나열한 알파벳이 아닐 것

## 카드 이미지 출처

카드 앞면 이미지는 [searge/tarot](https://github.com/searge/tarot) 저장소의 Rider-Waite-Smith 덱 스캔본을 사용했으며, 해당 저장소는 **CC BY-SA 4.0** 라이선스로 배포됩니다.<br>
원본 라이더-웨이트 덱 자체는 퍼블릭 도메인입니다.<br>
카드 뒷면 이미지는 직접 제작한 이미지입니다.

## 구조

```
client/   Vite + React + TypeScript + Tailwind CSS 프론트엔드
server/   Express + TypeScript 백엔드 (Groq API 프록시)
```
