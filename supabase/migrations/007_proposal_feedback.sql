-- Proposal feedback and memory system
-- Allows AEs to rate proposals and mark outcomes
-- These ratings are injected into future AI prompts as few-shot examples

CREATE TABLE IF NOT EXISTS proposal_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id uuid REFERENCES proposals(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Outcome tracking
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'won', 'lost', 'stalled')),
  -- Quality rating: 1 = thumbs up (good proposal), -1 = thumbs down (needs work), 0 = neutral
  rating integer NOT NULL DEFAULT 0 CHECK (rating IN (-1, 0, 1)),
  -- AE notes on what worked / what didn't
  notes text,
  -- Snapshot of key proposal metadata for AI injection (denormalized for fast retrieval)
  business_category text,
  markets text[],
  goals text[],
  recommended_option integer,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (proposal_id)
);

-- Index for fast retrieval of winning examples by category
CREATE INDEX IF NOT EXISTS idx_proposal_feedback_category_status
  ON proposal_feedback (business_category, status, rating);

-- RLS
ALTER TABLE proposal_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all feedback" ON proposal_feedback
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own feedback" ON proposal_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback" ON proposal_feedback
  FOR UPDATE USING (auth.uid() = user_id);
