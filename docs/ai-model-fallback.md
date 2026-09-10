# Groq 모델 폴백 대응 매뉴얼

`GROQ_MODEL_FALLBACKS`에 등록된 모델 3개가 전부 Groq에서 폐지(decommission)되었을 때 어떻게 알아채고, 어떻게 새 모델로 교체하는지 정리한 문서입니다.

## 1. 현재 시스템 동작 요약

관련 코드는 `server/src/groqClient.ts`와 `server/src/tarotReading.ts`에 있습니다.

- **서버 시작 시** (`server/src/index.ts` → `initializeGroqModel()`, `server/src/groqClient.ts:62`)
  Groq의 `GET https://api.groq.com/openai/v1/models`를 호출해 실제로 서비스 중인 모델 목록을 가져오고, `GROQ_MODEL_FALLBACKS` 우선순위 목록 중 가장 먼저 매칭되는 모델을 `currentModel`로 확정합니다. 조회 자체가 실패(네트워크 오류 등)해도 서버 기동은 막지 않고 1순위 모델로 진행합니다.
- **런타임 중 요청 실패 시** (`requestReading()`, `server/src/tarotReading.ts:105`)
  Groq 응답이 404(모델 없음/폐지, `isModelNotFoundError()`가 `NotFoundError` 인스턴스인지로 판별)이면 `getNextFallbackModel()`로 우선순위 목록의 다음 모델로 즉시 재시도합니다. 성공하면 `setCurrentModel()`로 그 모델을 이후 요청의 기본값으로 갱신합니다.
- 우선순위 목록의 **모든 모델이 실패**하면 `getNextFallbackModel()`이 `undefined`를 반환하고, `requestReading()`은 마지막으로 받은 원본 에러를 그대로 던집니다 (`server/src/tarotReading.ts:129-132`).
- 그 에러는 라우트 핸들러(`server/src/routes/reading.ts:48-51`)에서 잡혀 `console.error('Groq API error:', err)`로 로깅되고, `mapGroqError()`(`server/src/groqErrors.ts`)를 통해 사용자에게는 한글 에러 메시지 + HTTP 상태 코드로 변환되어 응답됩니다.

## 2. 폴백 모델 3개가 정의된 위치

기본값은 `openai/gpt-oss-120b,qwen/qwen3.6-27b,openai/gpt-oss-20b` (콤마 구분, 우선순위 순)이며, 아래 4곳에 나타납니다.

| 파일 | 변수/키 | 역할 |
|---|---|---|
| `server/src/groqClient.ts:26` | `const DEFAULT_MODEL_FALLBACKS = 'openai/gpt-oss-120b,qwen/qwen3.6-27b,openai/gpt-oss-20b'` | 환경변수가 없을 때 쓰이는 코드상 기본값 |
| `server/src/groqClient.ts:28` | `export const GROQ_MODEL_FALLBACKS: string[] = (process.env.GROQ_MODEL_FALLBACKS ?? DEFAULT_MODEL_FALLBACKS).split(',')...` | 실제로 서버가 사용하는 우선순위 배열 (환경변수 우선) |
| `server/.env` / `server/.env.example` | `GROQ_MODEL_FALLBACKS=openai/gpt-oss-120b,qwen/qwen3.6-27b,openai/gpt-oss-20b` | 로컬 개발 환경변수 |
| `render.yaml:11-12` | `- key: GROQ_MODEL_FALLBACKS` / `value: openai/gpt-oss-120b,qwen/qwen3.6-27b,openai/gpt-oss-20b` | Render 배포 환경변수 |

## 3. "3개 모델이 전부 폐지됐다"는 걸 어떻게 알아채는가

**주의: 서버 시작 시점만 봐서는 알아채기 어렵습니다.** `initializeGroqModel()`은 3개 후보 중 하나라도 살아있으면 조용히 그 모델로 넘어가고, 3개가 *전부* 없어져도 `selected`가 결국 `primary`(1순위)로 다시 떨어지기 때문에 다음 조건(`server/src/groqClient.ts:77`)이 거짓이 되어 경고가 출력되지 않습니다.

```ts
if (selected !== primary) {
  console.warn(`⚠️ 모델 ${primary}가 사용 불가능하여 ${selected}로 자동 전환되었습니다.`)
}
```

즉, 3개 모두 폐지된 상태에서도 서버는 경고 없이 1순위 모델 이름을 `currentModel`로 세팅한 채 정상 기동합니다. **실제로 문제가 드러나는 시점은 사용자가 리딩을 요청했을 때**입니다.

- 정상적인 폴백 전환 시 로그 (모델 1개만 죽었을 때):
  ```
  ⚠️ 모델 openai/gpt-oss-120b가 사용 불가능하여 qwen/qwen3.6-27b로 자동 전환되었습니다.
  ```
  (`server/src/tarotReading.ts:134`, 모델을 갈아탈 때마다 매번 출력)
- **3개 모두 실패한 최종 상태**에서는 위 경고가 (있다면) 두 번 찍힌 뒤, 마지막 모델도 실패하면 더 이상 경고 없이 바로 아래 에러 로그로 이어집니다:
  ```
  Groq API error: NotFoundError: 404 ...
  ```
  (`server/src/routes/reading.ts:49`)
- 이때 실제 사용자 화면에는 원인이 노출되지 않고 다음 메시지가 뜹니다 (`server/src/groqErrors.ts:61-68`, `APIError` 케이스):
  > 해석 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.
  (HTTP 상태 502)

**정리하면**: `/api/reading` 호출 시 502와 함께 "해석 요청을 처리하지 못했습니다"가 계속 뜨고, 서버 로그에 `Groq API error: NotFoundError ...`가 반복되면 3개 모델이 모두 죽었을 가능성이 높습니다. (참고로 `NotFoundError`가 아닌 다른 원인, 예: `GROQ_API_KEY` 오류나 Groq 서버 다운도 502/500대 응답을 줄 수 있으니 반드시 로그의 에러 타입을 확인해야 합니다.)

또한 `GROQ_API_KEY` 자체가 비어있으면 서버 기동 시 다음 경고가 뜹니다 (`server/src/index.ts:36`, 모델 폐지와는 다른 원인이므로 구분할 것):
```
⚠️  GROQ_API_KEY is not set — /api/reading will fail until it is configured.
```

## 4. 새 모델로 교체하는 절차

### a. Groq 콘솔에서 현재 서비스 중인 모델 확인

[console.groq.com/docs/models](https://console.groq.com/docs/models)에서 현재 서비스 중인 모델 목록과 각 모델의 상태(활성/폐지 예정)를 확인합니다. 폐지 예정 공지가 있는지도 함께 확인하세요.

### b. 환경변수(`GROQ_MODEL_FALLBACKS`) 수정

- **코드 수정 없이 되는 경우** (권장): 로컬은 `server/.env`, Render는 대시보드의 환경변수 설정에서 `GROQ_MODEL_FALLBACKS` 값만 새 모델 ID들로 콤마 구분해 교체합니다. `server/src/groqClient.ts:28`이 `process.env.GROQ_MODEL_FALLBACKS`를 그대로 읽어 우선순위 배열을 만들기 때문에 코드는 건드릴 필요가 없습니다. Render는 환경변수를 저장하면 자동으로 재배포됩니다.
- **코드 수정이 필요한 경우**: `server/src/groqClient.ts:26`의 `DEFAULT_MODEL_FALLBACKS`(환경변수가 아예 없을 때의 기본값)도 새 모델로 바꿔야 하는 상황 — 예를 들어 로컬에 `.env`를 아직 안 만든 새 개발자 환경이나, 향후 `GROQ_MODEL_FALLBACKS`를 설정하지 않는 새 배포 환경에서도 죽은 모델로 시작하지 않게 하려는 경우입니다. 이 경우 다음도 함께 갱신해 일관성을 유지하세요:
  - `server/src/groqClient.ts:26` (`DEFAULT_MODEL_FALLBACKS`)
  - `server/.env.example`
  - `render.yaml:12` (`GROQ_MODEL_FALLBACKS`의 `value`)
  - `README.md`의 "기본 우선순위는 ..." 문구

### c. 빌드/배포

1. (환경변수만 바꾼 경우) Render 대시보드에서 저장 → 자동 재배포. 로컬 확인이 필요하면 `server/.env` 수정 후 `npm run dev`(루트, `package.json:13`)로 재기동.
2. (코드도 바꾼 경우) 루트에서 `npm run build`(`client` + `server` 빌드, `package.json:16`)로 타입 에러 없이 빌드되는지 확인 → `git add` / `git commit` / `git push` → Render가 `render.yaml`의 `buildCommand: npm install && npm run build`, `startCommand: npm run start`로 자동 재배포.

### d. 정상 작동 확인

- 서버 기동 로그에 `⚠️` 경고(모델 목록 조회 실패, 또는 GROQ_API_KEY 미설정)가 없는지 확인.
- `POST /api/reading`에 실제 요청을 보내 200 응답과 함께 `{ conclusion, detail }`이 정상적으로 오는지 확인 (배포된 서비스라면 `https://tarot-qna.onrender.com` 화면에서 리딩을 실제로 한 번 수행해보는 것이 가장 확실합니다). `GET /api/health`는 서버 프로세스 생존 여부만 알려줄 뿐 Groq 연동 자체는 검증하지 않으니, 모델 교체 확인 목적으로는 반드시 `/api/reading`을 호출해야 합니다.

## 5. 문제 발생 시 확인할 로그

- **로컬**: 터미널에 그대로 출력되는 `console.warn`/`console.error` 문구를 확인 (위 3절의 정확한 문구로 검색).
- **Render**: 대시보드 → 해당 서비스 → **Logs** 탭에서 아래 문구들을 검색:
  - `모델 목록 조회에 실패해 기본값` — Groq `/models` 조회 자체가 실패한 경우
  - `가 사용 불가능하여` — 런타임 중 폴백 전환이 일어난 경우 (몇 번째 모델까지 갔는지 확인)
  - `Groq API error:` — 최종적으로 요청이 실패해 사용자에게 에러가 반환된 경우 (뒤에 붙는 에러 타입/메시지로 원인 구분 — `NotFoundError`면 모델 문제, 그 외는 `server/src/groqErrors.ts`의 다른 분기 참고)
  - `GROQ_API_KEY is not set` — API 키 자체가 비어있는 경우
