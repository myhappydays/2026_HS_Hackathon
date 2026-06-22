const fs = require('fs');
const path = require('path');
const https = require('https');

// API 설정 정보
const url = 'https://apis.data.go.kr/1741000/SectoralSafetyReport/getSectoralSafetyReport';
const serviceKey = '41889133dcebb4343db225cc64506dcc9a0cd5485471797a2b7386c289524001';
const pageNo = '1';
const numOfRows = '10';

// 쿼리 매개변수 구성
const requestUrl = `${url}?ServiceKey=${serviceKey}&pageNo=${pageNo}&numOfRows=${numOfRows}`;

console.log('API 요청을 시작합니다...');
console.log('요청 URL:', requestUrl);

https.get(requestUrl, (res) => {
  let data = '';

  // 응답 데이터 조각들을 수집
  res.on('data', (chunk) => {
    data += chunk;
  });

  // 수집 완료 후 처리
  res.on('end', () => {
    console.log(`응답 상태 코드: ${res.statusCode}`);
    
    // 결과 저장 폴더 설정
    const dirPath = path.join(__dirname);
    const filePath = path.join(dirPath, 'sample.xml');
    
    // 파일 쓰기
    fs.writeFileSync(filePath, data, 'utf8');
    console.log(`성공적으로 데이터를 가져와 저장했습니다!`);
    console.log(`저장 경로: ${filePath}`);
    
    // 응답 내용 일부 출력 (앞부분 500자)
    console.log('\n--- 응답 데이터 일부 (최대 500자) ---');
    console.log(data.substring(0, 500) + (data.length > 500 ? '...' : ''));
    console.log('------------------------------------\n');
  });

}).on('error', (err) => {
  console.error('API 호출 중 오류 발생:', err.message);
});
