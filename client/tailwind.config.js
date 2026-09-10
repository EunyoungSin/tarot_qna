/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // 모바일(터치) 브라우저는 탭 이후에도 :hover 의사 클래스가 남아있어(ghost hover),
  // 카드를 선택 해제해도 hover 스타일(테두리/떠오름 효과)이 다음 터치 전까지 남는 문제가 있었다.
  // hover 기능을 실제로 지원하는 입력 장치(마우스 등)에서만 hover: 유틸리티가 적용되도록 제한한다.
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      colors: {
        ink: '#1a1425',
        gold: '#c9a24b',
      },
      fontFamily: {
        display: ['"Noto Serif KR"', 'serif'],
      },
    },
  },
  plugins: [],
}
