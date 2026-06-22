const fs = require('fs');
const path = require('path');

// sample.xml 로컬 파일을 읽어옵니다.
const filePath = path.join(__dirname, 'sample.xml');

if (!fs.existsSync(filePath)) {
  console.error('오류: sample.xml 파일이 존재하지 않습니다. 먼저 API를 호출하거나 샘플 파일을 생성해주세요.');
  process.exit(1);
}

const xmlData = fs.readFileSync(filePath, 'utf8');

// XML에서 <row> 태그 내부의 데이터를 정규식으로 추출하여 객체 배열로 변환하는 헬퍼 함수
function parseXmlRows(xml) {
  const rows = [];
  const rowRegex = /<row>([\s\S]*?)<\/row>/g;
  let match;

  while ((match = rowRegex.exec(xml)) !== null) {
    const rowContent = match[1];
    
    const seq = getTagValue(rowContent, 'seq');
    const wrttimeid = getTagValue(rowContent, 'wrttimeid');
    const smry = getTagValue(rowContent, 'smry');
    const covid19_regis = getTagValue(rowContent, 'covid19_regis');
    const safe_regis = getTagValue(rowContent, 'safe_regis');
    const illg_parking = getTagValue(rowContent, 'illg_parking');
    const comu_inconven_regis = getTagValue(rowContent, 'comu_inconven_regis');

    rows.push({
      seq: seq ? parseInt(seq, 10) : 0,
      wrttimeid,
      smry,
      covid19_regis: covid19_regis ? parseInt(covid19_regis, 10) : 0,
      safe_regis: safe_regis ? parseInt(safe_regis, 10) : 0,
      illg_parking: illg_parking ? parseInt(illg_parking, 10) : 0,
      comu_inconven_regis: comu_inconven_regis ? parseInt(comu_inconven_regis, 10) : 0
    });
  }
  return rows;
}

function getTagValue(xml, tagName) {
  const regex = new RegExp(`<${tagName}>([^<]*)<\/${tagName}>`);
  const match = regex.exec(xml);
  return match ? match[1].trim() : '';
}

// 1. 전체 데이터 파싱
const allRows = parseXmlRows(xmlData);
console.log(`총 ${allRows.length}개의 행(row) 데이터를 로드했습니다.`);

// 2. 지역별 필터링 함수 (smry에 포함된 지역 텍스트 기준)
function filterByRegion(rows, regionKeyword) {
  return rows.filter(row => row.smry.includes(regionKeyword));
}

// 예시: '서울특별시' 데이터만 조회
const seoulData = filterByRegion(allRows, '서울특별시');
console.log('\n=== 서울특별시 관련 안전신고 데이터 ===');
console.table(seoulData);

// 예시: '경기도 수원시' 데이터만 조회
const suwonData = filterByRegion(allRows, '경기도 수원시');
console.log('\n=== 경기도 수원시 관련 안전신고 데이터 ===');
console.table(suwonData);
