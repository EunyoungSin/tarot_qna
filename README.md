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

## 실행

```bash
npm run dev
```

- 클라이언트: http://localhost:5173
- 서버: http://localhost:3001 (클라이언트의 `/api` 요청은 Vite dev 서버가 프록시합니다)

## 카드 이미지 출처

카드 앞면 이미지는 [searge/tarot](https://github.com/searge/tarot) 저장소의 Rider-Waite-Smith 덱 스캔본을 사용했으며, 해당 저장소는 **CC BY-SA 4.0** 라이선스로 배포됩니다.<br>
원본 라이더-웨이트 덱 자체는 퍼블릭 도메인입니다.<br>
카드 뒷면 이미지는 직접 제작한 이미지입니다.

## 구조

```
client/   Vite + React + TypeScript + Tailwind CSS 프론트엔드
server/   Express + TypeScript 백엔드 (Groq API 프록시)
```
