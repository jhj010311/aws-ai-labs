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

  const body = JSON.stringify(prompt);
  const outputFile = `tmp-${type}.json`;

  try {
    execSync(
      `aws bedrock-runtime invoke-model \
        --model-id anthropic.claude-3-sonnet-20240229-v1:0 \
        --content-type application/json \
        --accept application/json \
        --cli-binary-format raw-in-base64-out \
        --body '${body.replace(/'/g, "'\\''")}' \
        ${outputFile}`,
      { stdio: "inherit" } // 실행 로그도 같이 보여주기
    );

    const responseJson = readFileSync(outputFile, "utf-8");
    const response = JSON.parse(responseJson);
    const decoded = Buffer.from(response.body, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    const summary = parsed.content?.[0]?.text ?? "";

    if (!summary.trim()) {
      console.error("⚠️ 요약 결과가 비어 있습니다. 응답을 확인하세요.");
      console.error(decoded);
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
