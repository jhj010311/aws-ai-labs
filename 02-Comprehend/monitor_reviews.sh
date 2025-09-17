#!/bin/bash

echo "실시간 리뷰 모니터링을 시작합니다..."
echo "부정적 리뷰가 감지되면 알림이 표시됩니다."

while true; do
    echo "새 리뷰를 입력하세요 (종료하려면 'quit' 입력):"
    read -r review

    if [ "$review" = "quit" ]; then
        break
    fi

    SENTIMENT=$(aws comprehend detect-sentiment --text "$review" --language-code ko --query 'Sentiment' --output text)
    NEG_SCORE=$(aws comprehend detect-sentiment --text "$review" --language-code ko --query 'SentimentScore.Negative' --output text)

    if [ "$SENTIMENT" = "NEGATIVE" ] && (( $(echo "$NEG_SCORE > 0.7" | bc -l) )); then
        echo "🚨 부정적 리뷰 감지! 즉시 대응이 필요합니다."
        echo "부정 점수: $NEG_SCORE"
    else
        echo "✅ 리뷰 감정: $SENTIMENT"
    fi
    echo "---"
done
