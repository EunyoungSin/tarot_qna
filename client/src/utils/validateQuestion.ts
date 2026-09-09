// 같은 문자(자음/모음 포함)가 3번 이상 연속되면 걸러낸다 (예: "ㅇㅇㅇ", "ㅋㅋㅋㅋ", "aaaa").
// 숫자는 제외한다 — 안 그러면 "26000원"처럼 반복되는 0이 들어간 정상적인 가격/수치
// 표현까지 스팸으로 오탐하게 된다.
const REPEATED_CHAR_RE = /([^\d])\1{2,}/su

// 흔한 키보드 옆줄 나열 문자열 (예: "asdf", "qwer", "zxcv").
const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u'])

function isSequentialAlpha(word: string): boolean {
  const lower = word.toLowerCase()
  let ascending = true
  let descending = true
  for (let i = 1; i < lower.length; i++) {
    const diff = lower.charCodeAt(i) - lower.charCodeAt(i - 1)
    if (diff !== 1) ascending = false
    if (diff !== -1) descending = false
  }
  return ascending || descending
}

function isKeyboardRowMash(word: string): boolean {
  const lower = word.toLowerCase()
  return KEYBOARD_ROWS.some((row) => row.includes(lower))
}

function hasNoVowels(word: string): boolean {
  return ![...word.toLowerCase()].some((ch) => VOWELS.has(ch))
}

/** "abcde", "asdf" 처럼 실제 단어로 보이지 않는 무작위 알파벳 나열인지 판단한다. */
function looksLikeRandomAsciiWord(word: string): boolean {
  if (!/^[a-zA-Z]+$/.test(word)) return false
  if (word.length >= 4 && (isSequentialAlpha(word) || isKeyboardRowMash(word))) return true
  if (word.length >= 5 && hasNoVowels(word)) return true
  return false
}

/**
 * 타로 질문 입력값이 "답변 가능한 질문"으로 보이는 최소한의 형태를 갖췄는지 검사한다.
 * 실제 의미를 이해하는 건 아니고, 아래 값싼 신호들로 명백히 답할 수 없는 입력만 걸러낸다:
 * 너무 짧음, 같은 문자 반복, 무작위 알파벳 나열, 단어가 하나뿐인 입력.
 */
export function isValidQuestion(question: string): boolean {
  const trimmed = question.trim()
  if (!trimmed) return false

  const nonWhitespaceLength = trimmed.replace(/\s/g, '').length
  if (nonWhitespaceLength < 10) return false

  if (REPEATED_CHAR_RE.test(trimmed)) return false

  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length < 2) return false

  if (words.some(looksLikeRandomAsciiWord)) return false

  return true
}

export const QUESTION_VALIDATION_MESSAGE = '질문을 조금 더 구체적으로 적어주세요.'
