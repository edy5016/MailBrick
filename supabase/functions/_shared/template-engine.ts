/**
 * 이메일 템플릿 변수 치환 엔진
 * {{variable_name}} 형식의 변수를 실제 데이터로 치환합니다.
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string | number | null | undefined>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key]
    // 값이 없는 경우 원래 플레이스홀더를 그대로 유지
    if (value === undefined || value === null) {
      return match
    }
    return String(value)
  })
}

/**
 * 템플릿 내 모든 변수명 추출
 * 프론트엔드에서 미리보기 또는 유효성 검사에 사용
 */
export function extractVariables(template: string): string[] {
  const matches = template.matchAll(/\{\{(\w+)\}\}/g)
  return [...new Set([...matches].map((m) => m[1]))]
}
