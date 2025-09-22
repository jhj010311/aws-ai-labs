const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// 챗봇 질문 처리 - POST /api/chat
router.post('/chat', chatController.handleQuestion);

// 문서 목록 조회 - GET /api/documents
router.get('/documents', chatController.listDocuments);

// 문서 재색인화 - POST /api/reindex
router.post('/reindex', chatController.reindexDocuments);

// 시스템 상태 확인 - GET /api/status
router.get('/status', chatController.checkStatus);

module.exports = router;