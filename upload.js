const fs = require('fs');
const path = require('path');

const TOKEN = 'YOUR_GITHUB_TOKEN'; // GitHub Token Removed for Push Protection
const OWNER = 'myhappydays';
const REPO = '2026_HS_Hackathon';

const filesToUpload = [
  'index.html',
  'report.html',
  'detail.html',
  'src/main.js',
  'src/detail.js',
  'src/storage.js'
];

async function uploadFile(filePath) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`;
  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  try {
    // 1. Get current file SHA
    let sha = null;
    const getRes = await fetch(url, { headers });
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
    }

    // 2. Read local file and encode to base64
    const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
    const encodedContent = Buffer.from(content, 'utf8').toString('base64');

    // 3. Put new file
    const body = {
      message: `Update ${filePath} with AI assistant`,
      content: encodedContent
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    });

    if (putRes.ok) {
      console.log(`✅ Successfully uploaded ${filePath}`);
    } else {
      const errorData = await putRes.text();
      console.error(`❌ Failed to upload ${filePath}: ${putRes.status} ${errorData}`);
    }
  } catch (error) {
    console.error(`❌ Error uploading ${filePath}:`, error.message);
  }
}

async function main() {
  console.log('Starting upload...');
  for (const file of filesToUpload) {
    await uploadFile(file);
  }
  console.log('Done!');
}

main();
