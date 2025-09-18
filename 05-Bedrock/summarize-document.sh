#!/bin/bash

echo "=== 문서 요약 서비스 ==="

if [ ! -f "market-report.txt" ]; then
  echo "market-report.txt 파일을 찾을 수 없습니다."
  exit 1
fi

# 문서 내용 읽기 (제어문자 제거)
document_content=$(< market-report.txt)
document_content=$(echo "$document_content" | tr -d '\000-\011\013\014\016-\037' | sed 's/\r$//')

echo "원본 문서 길이: $(echo "$document_content" | wc -c) 문자"
echo "요약 중..."

summary_types=(
  "executive:임원용 요약 (핵심 수치와 결론 중심, 3-4 문장)"
  "detailed:상세 요약 (주요 섹션별 핵심 내용, 200-300자)"
  "bullet:불릿 포인트 요약 (주요 내용을 5-7개 항목으로)"
)

for summary_type in "${summary_types[@]}"; do
  IFS=':' read -r type description <<< "$summary_type"

  echo -e "\n=== $description ==="

  # JSON 페이로드 생성
  jq -n --arg doc "$document_content" --arg desc "$description" \
  '{
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: "다음 시장 조사 보고서를 요약해주세요:\n\n\($doc)\n\n요약 형식: \($desc)\n\n요구사항:\n- 핵심 정보 누락 없이 간결하게\n- 숫자 데이터는 정확히 포함\n- 한국어로 자연스럽게 작성"
      }
    ]
  }' > summary-prompt.json

  # API 호출
  aws bedrock-runtime invoke-model \
    --model-id anthropic.claude-3-sonnet-20240229-v1:0 \
    --content-type application/json \
    --accept application/json \
    --body file://summary-prompt.json \
    --cli-binary-format raw-in-base64-out \
    summary-response.json

  # 결과 출력
  summary_result=$(jq -r '.body' summary-response.json | base64 -d | jq -er '.content[0].text' 2>/dev/null || echo "")
  echo "$summary_result"

  echo "$summary_result" > "summary-$type.txt"
  echo "(결과가 summary-$type.txt 파일로 저장되었습니다)"

  rm summary-prompt.json summary-response.json

  echo -e "\n---"
done

echo -e "\n요약 완료!"
