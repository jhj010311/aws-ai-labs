const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// 환경 변수 로드
dotenv.config();

// RAG 서비스 가져오기
const ragService = require('./services/ragService');

// Express 앱 생성
const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 임시 디렉터리 생성
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// 벡터 DB 디렉터리 생성
const vectorDbDir = process.env.VECTOR_DB_PATH;
if (!fs.existsSync(vectorDbDir)) {
  fs.mkdirSync(vectorDbDir, { recursive: true });
}

// 라우트 설정
const chatRoutes = require('./routes/chatRoutes');
app.use('/api', chatRoutes);

// 기본 루트 라우트
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 서버 시작
app.listen(PORT, async () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);

  try {
// 서버 시작 시 벡터 저장소 초기화
    console.log('벡터 저장소 초기화 중...');
    await ragService.initializeVectorStore();
    console.log('벡터 저장소 초기화 완료');
  } catch (error) {
    console.error('벡터 저장소 초기화 오류:', error);
    console.log('서버는 계속 실행되지만, 벡터 저장소가 초기화되지 않았습니다.');
  }
});