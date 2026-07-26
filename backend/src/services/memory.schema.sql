/**
 * Memory Service - Database Schema & Setup
 * 
 * Run this SQL in Supabase SQL Editor to create the long-term memory table
 */

-- ============================================================================
-- 1. CREATE USER_MEMORY_FACTS TABLE (Long-Term Memory)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_memory_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100) DEFAULT 'general',
  importance INT DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Query facts by user (most common operation)
CREATE INDEX IF NOT EXISTS idx_user_memory_facts_user_id
ON user_memory_facts(user_id);

-- Query recent facts
CREATE INDEX IF NOT EXISTS idx_user_memory_facts_created_at
ON user_memory_facts(user_id, created_at DESC);

-- Query important facts first
CREATE INDEX IF NOT EXISTS idx_user_memory_facts_importance
ON user_memory_facts(user_id, importance DESC, created_at DESC);

-- ============================================================================
-- 3. CREATE INDEXES FOR FULL TEXT SEARCH (optional)
-- ============================================================================

-- Enable full-text search on fact content
CREATE INDEX IF NOT EXISTS idx_user_memory_facts_search
ON user_memory_facts USING GiST (to_tsvector('english', content));

-- ============================================================================
-- 4. ADD COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE user_memory_facts IS 'Long-term memory storage for user facts, preferences, and learning history';
COMMENT ON COLUMN user_memory_facts.user_id IS 'User ID (links to auth.users)';
COMMENT ON COLUMN user_memory_facts.content IS 'Fact or memory text';
COMMENT ON COLUMN user_memory_facts.category IS 'Category: interests, learning_style, goals, preferences, etc.';
COMMENT ON COLUMN user_memory_facts.importance IS 'Importance score (1=low, 10=high) - used for ranking';
COMMENT ON COLUMN user_memory_facts.created_at IS 'When this fact was learned';
COMMENT ON COLUMN user_memory_facts.updated_at IS 'When this fact was last updated';

-- ============================================================================
-- 5. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE user_memory_facts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own facts
CREATE POLICY "Users can view their own memory facts"
  ON user_memory_facts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own facts
CREATE POLICY "Users can insert their own memory facts"
  ON user_memory_facts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own facts
CREATE POLICY "Users can update their own memory facts"
  ON user_memory_facts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own facts
CREATE POLICY "Users can delete their own memory facts"
  ON user_memory_facts
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 6. EXAMPLE QUERIES
-- ============================================================================

-- Get all facts for a user (sorted by importance)
SELECT * FROM user_memory_facts
WHERE user_id = 'user-123'
ORDER BY importance DESC, created_at DESC;

-- Get top 5 important facts
SELECT * FROM user_memory_facts
WHERE user_id = 'user-123'
ORDER BY importance DESC
LIMIT 5;

-- Get facts by category
SELECT * FROM user_memory_facts
WHERE user_id = 'user-123'
  AND category = 'learning_style'
ORDER BY created_at DESC;

-- Full-text search on facts
SELECT * FROM user_memory_facts
WHERE user_id = 'user-123'
  AND to_tsvector('english', content) @@ plainto_tsquery('english', 'photosynthesis')
ORDER BY importance DESC;

-- Get memory statistics
SELECT 
  user_id,
  COUNT(*) as total_facts,
  COUNT(CASE WHEN importance >= 8 THEN 1 END) as important_facts,
  COUNT(DISTINCT category) as categories
FROM user_memory_facts
GROUP BY user_id;

-- ============================================================================
-- 7. MIGRATION: ADD CONVERSATION_HISTORY TABLE (Optional - For persistence)
-- ============================================================================

-- If you want to persist conversation history beyond 24 hours:
CREATE TABLE IF NOT EXISTS conversation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id UUID NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tokens_used INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for conversation history
CREATE INDEX IF NOT EXISTS idx_conversation_history_user_id
ON conversation_history(user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_history_session_id
ON conversation_history(session_id, created_at DESC);

-- Archive old conversations (optional cleanup)
-- DELETE FROM conversation_history
-- WHERE created_at < NOW() - INTERVAL '30 days'
--   AND user_id NOT IN (
--     SELECT DISTINCT user_id FROM user_memory_facts
--     WHERE importance >= 8
--   );
