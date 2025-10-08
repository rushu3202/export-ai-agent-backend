-- ExportAgent Phase 1 Database Schema
-- Run this SQL in Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Contacts table (buyers and suppliers)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('buyer', 'supplier')),
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table (invoices, packing lists, proforma, bill of lading)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('invoice', 'packing_list', 'proforma', 'bol')),
  title VARCHAR(255) NOT NULL,
  file_url TEXT,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HS Code searches table
CREATE TABLE IF NOT EXISTS hs_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  hs_code VARCHAR(10),
  confidence FLOAT DEFAULT 0.0,
  country VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shipments table
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'shipped', 'customs', 'delivered')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage counters table (monthly tracking)
CREATE TABLE IF NOT EXISTS usage_counters (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_yyyy VARCHAR(7) NOT NULL,
  docs_created INTEGER DEFAULT 0,
  hs_searches INTEGER DEFAULT 0,
  ai_queries INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, month_yyyy)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_hs_searches_user_id ON hs_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_shipments_user_id ON shipments(user_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_usage_counters_user_id ON usage_counters(user_id);

-- Row Level Security (RLS) policies
-- Enable RLS on all tables
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE hs_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

-- Contacts policies
DROP POLICY IF EXISTS "Users can view their own contacts" ON contacts;
CREATE POLICY "Users can view their own contacts" ON contacts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own contacts" ON contacts;
CREATE POLICY "Users can create their own contacts" ON contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own contacts" ON contacts;
CREATE POLICY "Users can update their own contacts" ON contacts
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own contacts" ON contacts;
CREATE POLICY "Users can delete their own contacts" ON contacts
  FOR DELETE USING (auth.uid() = user_id);

-- Documents policies
DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
CREATE POLICY "Users can view their own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own documents" ON documents;
CREATE POLICY "Users can create their own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- HS searches policies
DROP POLICY IF EXISTS "Users can view their own hs_searches" ON hs_searches;
CREATE POLICY "Users can view their own hs_searches" ON hs_searches
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own hs_searches" ON hs_searches;
CREATE POLICY "Users can create their own hs_searches" ON hs_searches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Shipments policies
DROP POLICY IF EXISTS "Users can view their own shipments" ON shipments;
CREATE POLICY "Users can view their own shipments" ON shipments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own shipments" ON shipments;
CREATE POLICY "Users can create their own shipments" ON shipments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own shipments" ON shipments;
CREATE POLICY "Users can update their own shipments" ON shipments
  FOR UPDATE USING (auth.uid() = user_id);

-- Usage counters policies
DROP POLICY IF EXISTS "Users can view their own usage_counters" ON usage_counters;
CREATE POLICY "Users can view their own usage_counters" ON usage_counters
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own usage_counters" ON usage_counters;
CREATE POLICY "Users can update their own usage_counters" ON usage_counters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert their own usage_counters" ON usage_counters;
CREATE POLICY "Users can upsert their own usage_counters" ON usage_counters
  FOR UPDATE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON contacts TO authenticated;
GRANT ALL ON documents TO authenticated;
GRANT ALL ON hs_searches TO authenticated;
GRANT ALL ON shipments TO authenticated;
GRANT ALL ON usage_counters TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'ExportAgent Phase 1 schema setup completed successfully!';
  RAISE NOTICE 'Tables created: contacts, documents, hs_searches, shipments, usage_counters';
  RAISE NOTICE 'RLS policies applied to all tables';
END $$;
