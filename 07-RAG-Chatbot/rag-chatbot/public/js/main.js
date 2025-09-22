document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const documentList = document.getElementById('document-list');
    const refreshDocsButton = document.getElementById('refresh-docs-button');
    const reindexButton = document.getElementById('reindex-button');
    const statusIndicator = document.getElementById('status-indicator');

    // API 엔드포인트 - 개발/프로덕션 환경에 따라 자동 설정
    const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3000/api'  // 백엔드 서버 포트에 맞게 수정
        : '/api';

    // 초기화
    checkStatus();
    loadDocuments();

    // API 응답 검증 헬퍼 함수
    async function validateApiResponse(response) {
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('API 서버가 실행되지 않았거나 잘못된 응답을 반환했습니다. 백엔드 서버를 확인해주세요.');
        }
        
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`API 오류 (${response.status}): ${text}`);
        }
        
        return response.json();
    }

    // 상태 확인
    async function checkStatus() {
        try {
            statusIndicator.textContent = '연결 확인 중...';
            statusIndicator.className = 'status-indicator offline';

            const response = await fetch(`${API_URL}/status`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                // 타임아웃 설정
                signal: AbortSignal.timeout(5000)
            });

            const data = await validateApiResponse(response);

            if (data.status === 'operational') {
                statusIndicator.textContent = data.initialized ? '온라인' : '문서 색인화 필요';
                statusIndicator.className = data.initialized ? 'status-indicator online' : 'status-indicator offline';
            } else {
                statusIndicator.textContent = '서비스 점검 중';
                statusIndicator.className = 'status-indicator offline';
            }
        } catch (error) {
            console.error('상태 확인 오류:', error);
            statusIndicator.textContent = 'API 서버 연결 실패';
            statusIndicator.className = 'status-indicator offline';
            
            // 사용자에게 명확한 안내 메시지 표시
            if (error.name === 'AbortError') {
                statusIndicator.textContent = '연결 시간 초과';
            } else if (error.message.includes('API 서버가 실행되지 않았거나')) {
                statusIndicator.textContent = 'API 서버 미실행';
            }
        }
    }

    // 문서 목록 로드
    async function loadDocuments() {
        try {
            documentList.innerHTML = '<div class="loading">문서 목록을 로딩 중입니다...</div>';

            const response = await fetch(`${API_URL}/documents`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                signal: AbortSignal.timeout(10000)
            });

            const data = await validateApiResponse(response);

            if (data.count === 0) {
                documentList.innerHTML = '<p>문서가 없습니다. S3 버킷에 문서를 업로드해주세요.</p>';
                return;
            }

            let html = '';
            data.documents.forEach(doc => {
                // 파일 크기 단위 변환
                const size = formatFileSize(doc.size);
                // 날짜 포맷팅
                const date = new Date(doc.lastModified).toLocaleString();

                html += `
                    <div class="document-item">
                        <div class="document-name">${doc.name}</div>
                        <div class="document-info">크기: ${size} | 수정일: ${date}</div>
                    </div>
                `;
            });

            documentList.innerHTML = html;
        } catch (error) {
            console.error('문서 로드 오류:', error);
            
            if (error.message.includes('API 서버가 실행되지 않았거나')) {
                documentList.innerHTML = `
                    <div class="error-message">
                        <strong>API 서버에 연결할 수 없습니다.</strong><br>
                        백엔드 서버가 실행 중인지 확인해주세요.<br>
                        <small>예상 주소: ${API_URL}</small>
                    </div>
                `;
            } else {
                documentList.innerHTML = `<div class="error-message">문서를 로드하는 중 오류가 발생했습니다: ${error.message}</div>`;
            }
        }
    }

    // 재색인화
    async function reindexDocuments() {
        try {
            reindexButton.disabled = true;
            reindexButton.textContent = '재색인화 중...';

            const response = await fetch(`${API_URL}/reindex`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                signal: AbortSignal.timeout(30000) // 재색인화는 시간이 오래 걸릴 수 있음
            });

            const data = await validateApiResponse(response);
            alert(data.message);

            // 상태와 문서 목록 새로고침
            checkStatus();
            loadDocuments();
        } catch (error) {
            console.error('재색인화 오류:', error);
            alert(`재색인화 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            reindexButton.disabled = false;
            reindexButton.textContent = '재색인화';
        }
    }

    // 메시지 전송
    async function sendMessage() {
        const query = userInput.value.trim();

        if (!query) return;

        // 사용자 메시지 화면에 표시
        appendMessage('user', query);
        userInput.value = '';

        try {
            // 로딩 메시지
            const loadingId = appendMessage('bot', '답변을 생성 중입니다...');

            // API 요청
            const response = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ query }),
                signal: AbortSignal.timeout(30000)
            });

            // 로딩 메시지 제거
            removeMessage(loadingId);

            const data = await validateApiResponse(response);

            // 봇 답변 화면에 표시
            appendMessage('bot', data.answer, data.sources);
        } catch (error) {
            console.error('메시지 전송 오류:', error);
            
            // 로딩 메시지가 있다면 제거
            const loadingMsg = chatMessages.querySelector('.message.bot:last-child');
            if (loadingMsg && loadingMsg.textContent.includes('답변을 생성 중')) {
                loadingMsg.remove();
            }
            
            if (error.message.includes('API 서버가 실행되지 않았거나')) {
                appendMessage('bot', '죄송합니다. API 서버에 연결할 수 없습니다. 관리자에게 문의해주세요.');
            } else {
                appendMessage('bot', `오류가 발생했습니다: ${error.message}`);
            }
        }
    }

    // 메시지 화면에 추가
    function appendMessage(type, content, sources = []) {
        const messageId = `msg-${Date.now()}`;
        const messageDiv = document.createElement('div');
        messageDiv.id = messageId;
        messageDiv.className = `message ${type}`;

        let html = `<div class="message-content">${content}</div>`;

        // 소스 정보 추가
        if (sources && sources.length > 0) {
            html += '<div class="sources"><strong>참조 문서:</strong>';
            sources.forEach(source => {
                html += `<div class="source-item">- ${source.title}</div>`;
            });
            html += '</div>';
        }

        messageDiv.innerHTML = html;
        chatMessages.appendChild(messageDiv);

        // 스크롤을 맨 아래로
        chatMessages.scrollTop = chatMessages.scrollHeight;

        return messageId;
    }

    // 메시지 제거
    function removeMessage(messageId) {
        const messageDiv = document.getElementById(messageId);
        if (messageDiv) {
            messageDiv.remove();
        }
    }

    // 파일 크기 포맷팅
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 이벤트 리스너
    sendButton.addEventListener('click', sendMessage);

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    refreshDocsButton.addEventListener('click', loadDocuments);

    reindexButton.addEventListener('click', reindexDocuments);

    // 주기적으로 서버 상태 체크 (선택사항)
    setInterval(checkStatus, 30000); // 30초마다 상태 체크
});