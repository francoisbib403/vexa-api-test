-- Migration: Create users table for manual user management
-- This table is separate from Supabase's auth.users table

CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255), -- Optional: for compatibility
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- Create index on role for admin queries
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data, admins can see all
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (
        auth.uid()::text = id::text OR
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id::text = auth.uid()::text AND u.role = 'admin'
        )
    );

CREATE POLICY "Only admins can insert users" ON public.users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id::text = auth.uid()::text AND u.role = 'admin'
        )
    );

CREATE POLICY "Only admins can update users" ON public.users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id::text = auth.uid()::text AND u.role = 'admin'
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample admin user
-- Password: admin123 (stocké en clair pour simplicité - à hasher en production)
INSERT INTO public.users (username, password_hash, email, role)
VALUES (
    'admin',
    'admin123',
    'admin@local.app',
    'admin'
) ON CONFLICT (username) DO NOTHING;

-- Insert sample regular user
-- Password: user123 (stocké en clair pour simplicité - à hasher en production)
INSERT INTO public.users (username, password_hash, email, role)
VALUES (
    'user',
    'user123',
    'user@local.app',
    'user'
) ON CONFLICT (username) DO NOTHING;