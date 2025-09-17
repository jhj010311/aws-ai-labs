#!/bin/bash

if [ $# -eq 0 ]; then
    echo "사용법: $0 '분석할 텍스트'"
    echo "예시: $0 '이 제품 정말 좋아요!'"
    exit 1
fi

TEXT="$1"
echo "=== 리뷰 분석 결과 ==="
echo "텍스트: $TEXT"
echo

echo "1. 언어 감지:"
aws comprehend detect-dominant-language --text "$TEXT" --query 'Languages[0].[LanguageCode,Score]' --output table

LANG_CODE=$(aws comprehend detect-dominant-language --text "$TEXT" --query 'Languages[0].LanguageCode' --output text)
echo

echo "2. 감정 분석:"
aws comprehend detect-sentiment --text "$TEXT" --language-code "$LANG_CODE" --query '[Sentiment,SentimentScore.Positive,SentimentScore.Negative]' --output table
echo

echo "3. 개체명 인식:"
aws comprehend detect-entities --text "$TEXT" --language-code "$LANG_CODE" --query 'Entities[*].[Type,Text,Score]' --output table
echo

echo "4. 핵심 구문:"
aws comprehend detect-key-phrases --text "$TEXT" --language-code "$LANG_CODE" --query 'KeyPhrases[*].[Text,Score]' --output table
