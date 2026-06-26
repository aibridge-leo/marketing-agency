const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

function loadKnowledgeBase() {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  try {
    const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.md'));
    if (files.length === 0) return '(등록된 지식 베이스 없음)';
    return files.map(file => {
      const content = fs.readFileSync(path.join(uploadsDir, file), 'utf-8');
      return `=== ${file} ===\n${content}`;
    }).join('\n\n');
  } catch (e) {
    console.error('Knowledge base load error:', e);
    return '(지식 베이스 로드 실패)';
  }
}

const knowledgeBase = loadKnowledgeBase();

const SYSTEM_PROMPT = `당신은 JYS마케팅의 AI 상담 챗봇 "JYS봇"입니다.

[JYS마케팅 지식 베이스]
${knowledgeBase}

[답변 규칙 — 반드시 준수]
1. 자기소개·대화형 질문 ("이름이 뭐야", "누구야", "뭐 할 수 있어" 등):
   - 챗봇 이름(JYS봇)과 역할(JYS마케팅 AI 상담사)을 자연스럽게 소개
2. 서비스·정책·회사 관련 질문:
   - 위 지식 베이스 내용만 사용하여 답변
   - 관련 내용이 없으면 "더 자세한 내용은 무료 상담을 통해 안내해 드릴게요! (전화: 02-1234-5678)" 로 안내
3. 무관한 질문 (날씨, 뉴스, 요리 등):
   - "저는 JYS마케팅 서비스 관련 질문만 답할 수 있어요 😊 마케팅에 대해 궁금한 점이 있으시면 편하게 물어보세요!"
4. 지식 베이스에 없는 정보는 절대 창작하거나 추측하지 않는다
5. 답변 스타일: 친근하고 따뜻한 한국어 존댓말, 3~5문장 이내로 간결하게`;

async function parseBody(req) {
  if (req.body !== undefined) {
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }));
    return;
  }

  try {
    const body = await parseBody(req);
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'messages array required' }));
      return;
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
      model: 'gpt-5.4-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.slice(-10)
      ],
      max_completion_tokens: 500,
      temperature: 0.7
    });

    const reply = completion.choices[0].message.content;

    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({ message: reply }));
  } catch (err) {
    console.error('Chat handler error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
};
