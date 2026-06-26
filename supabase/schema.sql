-- ============================================
-- JYS마케팅 챗봇 Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에서 실행
-- ============================================

-- 1. pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. 문서 청크 + 임베딩 테이블
CREATE TABLE IF NOT EXISTS documents (
  id          BIGSERIAL PRIMARY KEY,
  source      TEXT      NOT NULL,
  chunk_index INT       NOT NULL,
  content     TEXT      NOT NULL,
  embedding   vector(1536),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documents_embedding_idx
  ON documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 3. 유사도 검색 함수
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_count     integer DEFAULT 5
)
RETURNS TABLE (
  id         bigint,
  content    text,
  source     text,
  similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.source,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 4. 리드(상담 신청) 테이블
CREATE TABLE IF NOT EXISTS leads (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT,
  phone      TEXT,
  industry   TEXT,
  region     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 대화 로그 테이블
CREATE TABLE IF NOT EXISTS chat_logs (
  id             BIGSERIAL PRIMARY KEY,
  question       TEXT NOT NULL,
  answer         TEXT NOT NULL,
  context_source TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Row Level Security (권고)
-- service_role 키는 RLS를 우회하므로 서버에서만 사용
-- ============================================
ALTER TABLE documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs  ENABLE ROW LEVEL SECURITY;
