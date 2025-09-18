#!/bin/bash

# 제품 정보 배열
products=(
  "스마트워치|심박수 모니터링, GPS, 7일 배터리|헬스케어 관심층"
  "블루투스 스피커|360도 사운드, 방수, 12시간 재생|음악 애호가"
  "무선 충전패드|고속 충전, 멀티 디바이스, LED 표시|스마트폰 사용자"
)

for product in "${products[@]}"; do
  IFS='|' read -r name features target <<< "$product"

  echo "=== $name 마케팅 문구 생성 ==="

# JSON 페이로드 생성
  cat > temp-prompt.json << EOF
{
  "anthropic_version": "bedrock-2023-05-31",
  "max_tokens": 1000,
  "messages": [
    {
      "role": "user",
      "content": "다음 제품에 대한 매력적인 마케팅 문구를 작성해주세요:\n\n제품명: $name\n특징: $features\n타겟: $target\n\n요구사항:\n- 감정적 어필 포함\n- 3-4줄로 간결하게\n- 행동 유도 문구 포함"
    }
  ]
}
EOF

# API 호출
  aws bedrock-runtime invoke-model \
    --model-id anthropic.claude-3-haiku-20240307-v1:0 \
    --content-type application/json \
    --accept application/json \
    --body "$(cat temp-prompt.json | jq -c .)" \
    temp-response.json

# 결과 출력
  cat temp-response.json | jq -r '.body' | base64 -d | jq -r '.content[0].text'
  echo -e "\n---\n"

# 임시 파일 정리
  rm temp-prompt.json temp-response.json

  sleep 1# API 호출 제한 방지
done