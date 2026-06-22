const http = require('http');
const https = require('https');

const serviceKey = '41889133dcebb4343db225cc64506dcc9a0cd5485471797a2b7386c289524001';
const pageNo = '1';
const numOfRows = '10';

// 테스트할 케이스 정의
const cases = [
  {
    name: 'HTTPS + Base URL (No Operation) + Raw Key',
    url: `https://apis.data.go.kr/1741000/SectoralSafetyReport?ServiceKey=${serviceKey}&pageNo=${pageNo}&numOfRows=${numOfRows}`
  },
  {
    name: 'HTTPS + Base URL (No Operation) + Encoded Key',
    url: `https://apis.data.go.kr/1741000/SectoralSafetyReport?ServiceKey=${encodeURIComponent(serviceKey)}&pageNo=${pageNo}&numOfRows=${numOfRows}`
  },
  {
    name: 'HTTP + Base URL (No Operation) + Raw Key',
    url: `http://apis.data.go.kr/1741000/SectoralSafetyReport?ServiceKey=${serviceKey}&pageNo=${pageNo}&numOfRows=${numOfRows}`
  },
  {
    name: 'HTTP + Base URL (No Operation) + Encoded Key',
    url: `http://apis.data.go.kr/1741000/SectoralSafetyReport?ServiceKey=${encodeURIComponent(serviceKey)}&pageNo=${pageNo}&numOfRows=${numOfRows}`
  },
  {
    name: 'HTTPS + /getSectoralSafetyReportList + Raw Key',
    url: `https://apis.data.go.kr/1741000/SectoralSafetyReport/getSectoralSafetyReportList?ServiceKey=${serviceKey}&pageNo=${pageNo}&numOfRows=${numOfRows}`
  },
  {
    name: 'HTTPS + /getSectoralSafetyReportList + Encoded Key',
    url: `https://apis.data.go.kr/1741000/SectoralSafetyReport/getSectoralSafetyReportList?ServiceKey=${encodeURIComponent(serviceKey)}&pageNo=${pageNo}&numOfRows=${numOfRows}`
  },
  {
    name: 'HTTPS + /getSectoralSafetyReport + Raw Key',
    url: `https://apis.data.go.kr/1741000/SectoralSafetyReport/getSectoralSafetyReport?ServiceKey=${serviceKey}&pageNo=${pageNo}&numOfRows=${numOfRows}`
  },
  {
    name: 'HTTPS + /getSectoralSafetyReport + Encoded Key',
    url: `https://apis.data.go.kr/1741000/SectoralSafetyReport/getSectoralSafetyReport?ServiceKey=${encodeURIComponent(serviceKey)}&pageNo=${pageNo}&numOfRows=${numOfRows}`
  }
];

function request(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    });
    req.on('error', err => resolve({ statusCode: 0, data: `Error: ${err.message}` }));
  });
}

async function runTests() {
  console.log('=== API 테스트 시작 ===');
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    console.log(`\n[테스트 ${i+1}] ${c.name}`);
    console.log(`URL: ${c.url}`);
    const res = await request(c.url);
    console.log(`결과 코드: ${res.statusCode}`);
    console.log(`응답 요약: ${res.data.substring(0, 300).trim()}`);
  }
  console.log('\n=== API 테스트 종료 ===');
}

runTests();
