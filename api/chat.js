const { OpenAI } = require('openai');
const { getContext } = require('../lib/rag');
const { getSupabaseClient } = require('../lib/supabase');
const { parseBody } = require('../lib/utils');

const SYSTEM_PROMPT_TEMPLATE = `당신은 JYS마케팅의 AI 상담 챗봇 "JYS봇"입니다.

[JYS마케팅 관련 지식]
{CONTEXT}

[답변 규칙 — 반드시 준수]
1. 자기소개·대화형 질문 ("이름이 뭐야", "누구야" 등):
   - 챗봇 이름(JYS봇)과 역할(JYS마케팅 AI 상담사)을 자연스럽게 소개
2. 서비스·정책·회사 관련 질문:
   - 위 지식만 사용. 없으면 "더 자세한 내용은 무료 상담으로 안내해 드릴게요! (전화: 02-1234-5678)"
3. 무관한 질문 (날씨, 뉴스 등):
   - "저는 JYS마케팅 서비스 관련 질문만 답할 수 있어요 😊"
4. 지식에 없는 내용은 절대 창작·추측 금지
5. 친근하고 따뜻한 한국어 존댓말, 3~5문장 이내`;

async function logChat(supabase, question, answer, source) {
  if (!supabase) return;
  try {
    await supabase.from('chat_logs').insert({ question, answer, context_source: source });
  } catch (e) {
    console.error('chat_log insert error:', e);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.statusCode = 200; res.end(); return; }
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

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // 마지막 사용자 메시지로 RAG 검색
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const query = lastUserMsg ? lastUserMsg.content : '';

    const { context, source } = await getContext(openai, query);
    const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace('{CONTEXT}', context);

    const completion = await openai.chat.completions.create({
      model: 'gpt-5.4-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-10),
      ],
      max_completion_tokens: 500,
      temperature: 0.7,
    });

    const reply = completion.choices[0].message.content;

    // 대화 로그 (best-effort)
    logChat(getSupabaseClient(), query, reply, source);

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
