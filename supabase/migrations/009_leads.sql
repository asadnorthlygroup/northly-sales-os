DO $$ BEGIN

CREATE TABLE IF NOT EXISTS leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  website text,
  industry_category text,
  market text,
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'cold_outreach', 'referral', 'inbound', 'linkedin', 'close_crm', 'other')),
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'dead')),
  notes text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  converted_deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

END $$;

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'authenticated_read_leads'
  ) THEN
    CREATE POLICY "authenticated_read_leads" ON leads FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'ae_manage_leads'
  ) THEN
    CREATE POLICY "ae_manage_leads" ON leads FOR ALL USING (
      created_by = auth.uid() OR
      assigned_to = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'ae'))
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'leads_updated_at'
  ) THEN
    CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
