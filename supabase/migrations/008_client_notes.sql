-- Structured per-client notes for AE memory
CREATE TABLE IF NOT EXISTS client_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note_type text NOT NULL DEFAULT 'general'
    CHECK (note_type IN ('general', 'preference', 'objection', 'won_reason', 'lost_reason', 'follow_up')),
  body text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_client_notes_client_id ON client_notes (client_id, created_at DESC);

ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all client notes" ON client_notes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert client notes" ON client_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" ON client_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" ON client_notes
  FOR DELETE USING (auth.uid() = user_id);
