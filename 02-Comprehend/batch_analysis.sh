#!/bin/bash

echo "Review,Sentiment,Positive_Score,Negative_Score,Key_Phrases" > analysis_results.csv

while IFS= read -r line; do
    if [ -n "$line" ]; then
        SENTIMENT=$(aws comprehend detect-sentiment --text "$line" --language-code ko --query 'Sentiment' --output text)
        POS_SCORE=$(aws comprehend detect-sentiment --text "$line" --language-code ko --query 'SentimentScore.Positive' --output text)
        NEG_SCORE=$(aws comprehend detect-sentiment --text "$line" --language-code ko --query 'SentimentScore.Negative' --output text)
        KEY_PHRASES=$(aws comprehend detect-key-phrases --text "$line" --language-code ko --query 'KeyPhrases[*].Text' --output text | tr '\n' ';')

        echo "\"$line\",\"$SENTIMENT\",\"$POS_SCORE\",\"$NEG_SCORE\",\"$KEY_PHRASES\"" >> analysis_results.csv
    fi
done < customer_reviews.txt

echo "분석 완료! analysis_results.csv 파일을 확인하세요."
