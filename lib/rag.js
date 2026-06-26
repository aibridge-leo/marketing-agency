const fs = require('fs');
const path = require('path');
const { getSupabaseClient } = require('./supabase');

function loadFallback() {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  try {
    const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.md'));
    if (!files.length) return '(등록된 지식 베이스 없음)';
    return files.map(f => `=== ${f} ===\n${fs.readFileSync(path.join(uploadsDir, f), 'utf-8')}`).join('\n\n');
  } catch (e) {
    console.error('fallback load error:', e);
    return '(지식 베이스 로드 실패)';
  }
}

// 모듈 로드 시 한 번만 읽어둠
const FALLBACK_KB = loadFallback();

async function getContext(openai, query) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { context: FALLBACK_KB, source: 'fallback:no-supabase' };
  }

  try {
    const embRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    const embedding = embRes.data[0].embedding;

    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_count: 5,
    });

    if (error) throw error;

    if (!data || data.length === 0) {
      return { context: FALLBACK_KB, source: 'fallback:no-results' };
    }

    const context = data
      .map(d => `[출처: ${d.source} | 유사도: ${(d.similarity * 100).toFixed(1)}%]\n${d.content}`)
      .join('\n\n---\n\n');

    return { context, source: 'rag' };
  } catch (err) {
    console.error('RAG error:', err);
    return { context: FALLBACK_KB, source: 'fallback:error' };
  }
}

module.exports = { getContext, FALLBACK_KB };
