import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync } from "child_process";

console.log("=== 문서 요약 서비스 ===");

const inputFile = "market-report.txt";
if (!existsSync(inputFile)) {
  console.error(`${inputFile} 파일을 찾을 수 없습니다.`);
  process.exit(1);
}

const documentContent = readFileSync(inputFile, "utf-8");
console.log(`원본 문서 길이: ${Buffer.byteLength(documentContent, "utf-8")} 문자`);
console.log("요약 중...");

const summaryTypes = [
  ["executive", "임원용 요약 (핵심 수치와 결론 중심, 3-4 문장)"],
  ["detailed", "상세 요약 (주요 섹션별 핵심 내용, 200-300자)"],
  ["bullet", "불릿 포인트 요약 (주요 내용을 5-7개 항목으로)"],
];

for (const [type, description] of summaryTypes) {
  console.log(`\n=== ${description} ===`);
  
  // 요청 바디 구성
  const prompt = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `다음 시장 조사 보고서를 요약해주세요:\n\n${documentContent}\n\n요약 형식: ${description}\n\n요구사항:\n- 핵심 정보 누락 없이 간결하게\n- 숫자 데이터는 정확히 포함\n- 한국어로 자연스럽게 작성`,
      },
    ],
  };

  const bodyFile = `body-${type}.json`;
  const outputFile = `tmp-${type}.json`;
  
  writeFileSync(bodyFile, JSON.stringify(prompt), "utf-8");

  try {
    // 수정된 부분: --outfile을 제거하고 마지막에 outputFile을 위치 매개변수로 추가
    execSync(
      `aws bedrock-runtime invoke-model \
        --model-id anthropic.claude-3-sonnet-20240229-v1:0 \
        --content-type application/json \
        --accept application/json \
        --cli-binary-format raw-in-base64-out \
        --body file://${bodyFile} \
        ${outputFile}`,
      { stdio: "inherit" }
    );

    // 결과 파싱
    const responseJson = readFileSync(outputFile, "utf-8");
    console.log("Raw response:", responseJson); // 디버깅용
    
    const response = JSON.parse(responseJson);
    console.log("Parsed response:", response); // 디버깅용
    
    // 응답 구조 확인 후 적절히 파싱
    let summary = "";
    
    if (response.body) {
      // Base64 인코딩된 경우
      const decoded = Buffer.from(response.body, "base64").toString("utf-8");
      const parsed = JSON.parse(decoded);
      summary = parsed.content?.[0]?.text ?? "";
    } else if (response.content) {
      // 직접 content가 있는 경우
      summary = Array.isArray(response.content) ? response.content[0]?.text : response.content;
    } else if (typeof response === 'string') {
      // 문자열로 직접 반환되는 경우
      summary = response;
    } else {
      // 기타 경우 - 전체 응답을 출력해서 구조 파악
      console.error("예상치 못한 응답 구조:", JSON.stringify(response, null, 2));
      continue;
    }
    
    if (!summary || !summary.trim()) {
      console.error("⚠️ 요약 결과가 비어 있습니다. 응답을 확인하세요.");
      console.error("Response:", JSON.stringify(response, null, 2));
      continue;
    }

    console.log(summary);
    writeFileSync(`summary-${type}.txt`, summary, "utf-8");
    console.log(`(결과가 summary-${type}.txt 파일로 저장되었습니다)`);
    
  } catch (err) {
    console.error("❌ 요약 중 오류 발생:", err.message);
  }
  
  console.log("\n---");
}

console.log("\n요약 완료!");