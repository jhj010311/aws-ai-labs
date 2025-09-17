#!/bin/bash
# translate_inquiries.sh

echo "=== 고객 문의 번역 시스템 ==="
echo ""

# 영어 문의 번역
echo "1. 영어 고객 문의:"
english_text="I received the wrong item. I ordered a blue shirt but got a red one."
echo "원문: $english_text"
aws translate translate-text \
    --source-language-code en \
    --target-language-code ko \
    --text "$english_text" \
    --query 'TranslatedText' \
    --output text
echo ""

# 일본어 문의 번역
echo "2. 일본어 고객 문의:"
japanese_text="配送が遅れています。いつ届く予定ですか？"
echo "원문: $japanese_text"
aws translate translate-text \
    --source-language-code ja \
    --target-language-code ko \
    --text "$japanese_text" \
    --query 'TranslatedText' \
    --output text
echo ""

# 중국어 문의 번역
echo "3. 중국어 고객 문의:"
chinese_text="我想取消我的订单，还没有发货。"
echo "원문: $chinese_text"
aws translate translate-text \
    --source-language-code zh \
    --target-language-code ko \
    --text "$chinese_text" \
    --query 'TranslatedText' \
    --output text
echo ""