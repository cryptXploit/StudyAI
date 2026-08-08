/**
 * Supabase RPC Functions for Hybrid Search
 * 
 * These functions should be created in your Supabase database.
 * Run these SQL statements in the Supabase SQL Editor.
 */

-- ============================================================================
-- 1. HYBRID SEARCH (Keyword + Vector combined with weighted scoring)
-- ============================================================================

-- PostgreSQL requires dropping the function first when changing the return table signature
DROP FUNCTION IF EXISTS hybrid_search_chunks(uuid, uuid, text, vector, float, float, int);

CREATE OR REPLACE FUNCTION hybrid_search_chunks(
  p_user_id UUID,
  p_file_id UUID,
  p_query TEXT,
  p_query_embedding vector(1536),
  p_vector_weight FLOAT DEFAULT 0.5,
  p_keyword_weight FLOAT DEFAULT 0.5,
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  file_id UUID,
  chunk_index INT,
  page_number INT,
  content TEXT,
  similarity_score FLOAT,
  search_type VARCHAR
) AS $$
WITH vector_results AS (
  -- Vector search using pgvector cosine similarity
  SELECT
    fc.id,
    fc.file_id,
    fc.chunk_index,
    fc.page_number,
    fc.content,
    1 - (fc.embedding <=> p_query_embedding) AS vector_score,
    'vector' AS search_type
  FROM file_chunks fc
  WHERE fc.user_id = p_user_id
    AND fc.file_id = p_file_id
    AND fc.embedding IS NOT NULL
  ORDER BY fc.embedding <=> p_query_embedding
  LIMIT p_limit * 2  -- Fetch more to merge with keyword results
),
keyword_results AS (
  -- Keyword search using Full Text Search (FTS)
  SELECT
    fc.id,
    fc.file_id,
    fc.chunk_index,
    fc.page_number,
    fc.content,
    ts_rank(
      to_tsvector('english', fc.content),
      plainto_tsquery('english', p_query)
    ) AS keyword_score,
    'keyword' AS search_type
  FROM file_chunks fc
  WHERE fc.user_id = p_user_id
    AND fc.file_id = p_file_id
    AND to_tsvector('english', fc.content) @@ plainto_tsquery('english', p_query)
  ORDER BY ts_rank(
    to_tsvector('english', fc.content),
    plainto_tsquery('english', p_query)
  ) DESC
  LIMIT p_limit * 2
),
merged_results AS (
  -- Merge and normalize scores
  SELECT
    COALESCE(v.id, k.id) AS id,
    COALESCE(v.file_id, k.file_id) AS file_id,
    COALESCE(v.chunk_index, k.chunk_index) AS chunk_index,
    COALESCE(v.page_number, k.page_number) AS page_number,
    COALESCE(v.content, k.content) AS content,
    -- Normalize and combine scores
    (
      COALESCE(v.vector_score, 0) * p_vector_weight +
      COALESCE(k.keyword_score, 0) * p_keyword_weight
    ) AS combined_score,
    CASE
      WHEN v.id IS NOT NULL AND k.id IS NOT NULL THEN 'hybrid'
      WHEN v.id IS NOT NULL THEN 'vector'
      ELSE 'keyword'
    END AS search_type
  FROM vector_results v
  FULL OUTER JOIN keyword_results k ON v.id = k.id
)
SELECT
  id,
  file_id,
  chunk_index,
  page_number,
  content,
  combined_score AS similarity_score,
  search_type
FROM merged_results
ORDER BY combined_score DESC
LIMIT p_limit;
$$ LANGUAGE SQL IMMUTABLE;

-- ============================================================================
-- 2. VECTOR-ONLY SEARCH (Pure semantic similarity)
-- ============================================================================

CREATE OR REPLACE FUNCTION vector_search_chunks(
  p_user_id UUID,
  p_file_id UUID,
  p_query_embedding vector(1536),
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  file_id UUID,
  chunk_index INT,
  page_number INT,
  content TEXT,
  similarity_score FLOAT,
  search_type VARCHAR
) AS $$
SELECT
  fc.id,
  fc.file_id,
  fc.chunk_index,
    fc.page_number,
    fc.content,
  1 - (fc.embedding <=> p_query_embedding) AS similarity_score,
  'vector'::VARCHAR AS search_type
FROM file_chunks fc
WHERE fc.user_id = p_user_id
  AND fc.file_id = p_file_id
  AND fc.embedding IS NOT NULL
ORDER BY fc.embedding <=> p_query_embedding
LIMIT p_limit;
$$ LANGUAGE SQL IMMUTABLE;

-- ============================================================================
-- 3. KEYWORD-ONLY SEARCH (Full Text Search only)
-- ============================================================================

CREATE OR REPLACE FUNCTION keyword_search_chunks(
  p_user_id UUID,
  p_file_id UUID,
  p_query TEXT,
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  file_id UUID,
  chunk_index INT,
  page_number INT,
  content TEXT,
  similarity_score FLOAT,
  search_type VARCHAR
) AS $$
SELECT
  fc.id,
  fc.file_id,
  fc.chunk_index,
    fc.page_number,
    fc.content,
  ts_rank(
    to_tsvector('english', fc.content),
    plainto_tsquery('english', p_query)
  ) AS similarity_score,
  'keyword'::VARCHAR AS search_type
FROM file_chunks fc
WHERE fc.user_id = p_user_id
  AND fc.file_id = p_file_id
  AND to_tsvector('english', fc.content) @@ plainto_tsquery('english', p_query)
ORDER BY ts_rank(
  to_tsvector('english', fc.content),
  plainto_tsquery('english', p_query)
) DESC
LIMIT p_limit;
$$ LANGUAGE SQL IMMUTABLE;

-- ============================================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Vector index for similarity search (IVFFlat or HNSW)
CREATE INDEX IF NOT EXISTS idx_file_chunks_embedding 
ON file_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- GiST index for Full Text Search
CREATE INDEX IF NOT EXISTS idx_file_chunks_text_search
ON file_chunks USING GiST (to_tsvector('english', content));

-- User and file scoping indexes
CREATE INDEX IF NOT EXISTS idx_file_chunks_user_file
ON file_chunks (user_id, file_id);

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

-- Grant anon role access to the RPC functions (for authenticated users)
GRANT EXECUTE ON FUNCTION hybrid_search_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION vector_search_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION keyword_search_chunks TO authenticated;

-- Grant service role (backend) full access
GRANT EXECUTE ON FUNCTION hybrid_search_chunks TO service_role;
GRANT EXECUTE ON FUNCTION vector_search_chunks TO service_role;
GRANT EXECUTE ON FUNCTION keyword_search_chunks TO service_role;


