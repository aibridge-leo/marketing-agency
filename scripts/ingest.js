/**
 * Supabase 문서 임베딩 적재 스크립트
 * 실행: node scripts/ingest.js
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const { createClient } = require('@supabase/supabase-js');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- 청크 분리: ## 섹션 기준, 800자 초과 시 단락으로 재분리 ---
function chunkMarkdown(text) {
  const chunks = [];
  const sections = text.split(/\n(?=#{1,3} )/);

  for (const section of sections) {
    const trimmed = section.trim();
    if (trimmed.length < 60) continue;

    if (trimmed.length <= 800) {
      chunks.push(trimmed);
    } else {
      const paras = trimmed.split(/\n\n+/);
      let buf = '';
      for (const para of paras) {
        if (buf.length + para.length + 2 > 800 && buf) {
          chunks.push(buf.trim());
          buf = para;
        } else {
          buf = buf ? buf + '\n\n' + para : para;
        }
      }
      if (buf.trim().length > 60) chunks.push(buf.trim());
    }
  }
  return chunks;
}

async function embedText(text) {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return res.data[0].embedding;
}

async function main() {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.md'));

  if (!files.length) {
    console.error('uploads/ 에 .md 파일이 없습니다.');
    process.exit(1);
  }

  console.log(`\n📄 ${files.length}개 파일 처리 시작\n`);

  for (const file of files) {
    console.log(`▶ ${file}`);
    const content = fs.readFileSync(path.join(uploadsDir, file), 'utf-8');
    const chunks = chunkMarkdown(content);
    console.log(`  청크 수: ${chunks.length}`);

    // 기존 데이터 삭제
    await supabase.from('documents').delete().eq('source', file);

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await embedText(chunks[i]);
      const { error } = await supabase.from('documents').insert({
        source: file,
        chunk_index: i,
        content: chunks[i],
        embedding,
      });
      if (error) {
        console.error(`  ✗ 청크 ${i} 오류:`, error.message);
      } else {
        process.stdout.write(`  ✓ ${i + 1}/${chunks.length}\r`);
      }
    }
    console.log(`  완료 ✓          `);
  }

  console.log('\n🎉 임베딩 적재 완료!\n');
}

main().catch(err => {
  console.error('오류:', err);
  process.exit(1);
});
