#!/bin/bash

echo "=== 제품 상담 챗봇 ==="
echo "제품에 대해 궁금한 것을 물어보세요. (종료: 'quit')"
echo "----------------------------------------"

# 제품 정보 컨텍스트
PRODUCT_CONTEXT="당신은 전자제품 전문 상담원입니다. 다음 제품들에 대해 정확하고 친근하게 답변해주세요:

제품 목록:
1. 스마트 무선 이어폰 - 노이즈 캔슬링, 24시간 배터리, 방수 기능, 가격: 150,000원
2. 스마트워치 - 심박수 모니터링, GPS, 7일 배터리, 가격: 300,000원
3. 블루투스 스피커 - 360도 사운드, 방수, 12시간 재생, 가격: 80,000원
4. 무선 충전패드 - 고속 충전, 멀티 디바이스, LED 표시, 가격: 50,000원

답변 시 주의사항:
- 친근하고 전문적인 톤 유지
- 구체적인 정보 제공
- 추가 질문 유도
- 없는 정보는 정직하게 모른다고 답변"

conversation_history=""

while true; do
  echo -n "고객: "
  read user_input

  if [ "$user_input" = "quit" ]; then
    echo "상담을 종료합니다. 감사합니다!"
    break
  fi

# 대화 히스토리에 사용자 입력 추가
  if [ -n "$conversation_history" ]; then
    conversation_history="$conversation_history\n\n고객: $user_input"
  else
    conversation_history="고객: $user_input"
  fi

# JSON 페이로드 생성
  cat > chat-prompt.json << EOF
{
  "anthropic_version": "bedrock-2023-05-31",
  "max_tokens": 1000,
  "messages": [
    {
      "role": "user",
      "content": "$PRODUCT_CONTEXT\n\n이전 대화:\n$conversation_history\n\n위 고객의 질문에 상담원으로서 답변해주세요."
    }
  ]
}
EOF

# API 호출
  aws bedrock-runtime invoke-model \
    --model-id anthropic.claude-3-sonnet-20240229-v1:0 \
    --content-type application/json \
    --accept application/json \
    --body file://chat-prompt.json \
    --cli-binary-format raw-in-base64-out \
    chat-response.json

# 응답 추출 및 출력
  bot_response=$(cat chat-response.json | jq -r '.body' | base64 -d | jq -r '.content[0].text')
  echo "상담원: $bot_response"
  echo ""

# 대화 히스토리에 봇 응답 추가
  conversation_history="$conversation_history\n상담원: $bot_response"

# 임시 파일 정리
  rm chat-prompt.json chat-response.json
done