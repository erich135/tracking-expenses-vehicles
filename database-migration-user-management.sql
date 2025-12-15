-- =====================================================
-- Database Migration: Enhanced User Management
-- For: TrueCost360 (tracking-expenses-vehicles)
-- Created: December 2024
-- =====================================================
-- This migration adds new columns to the approved_users table
-- to support the comprehensive user invitation system.
-- =====================================================

-- Step 1: Add new columns to approved_users table
-- Run this in your Supabase SQL Editor

-- Add first_name column
ALTER TABLE approved_users 
ADD COLUMN IF NOT EXISTS first_name TEXT;

-- Add last_name column  
ALTER TABLE approved_users 
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Add is_active column (default true)
ALTER TABLE approved_users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add password_set column (tracks if user has set their password)
ALTER TABLE approved_users 
ADD COLUMN IF NOT EXISTS password_set BOOLEAN DEFAULT FALSE;

-- Add invitation_sent_at timestamp
ALTER TABLE approved_users 
ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ;

-- Add updated_at timestamp with auto-update
ALTER TABLE approved_users 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- Step 2: Create trigger for updated_at auto-update
-- =====================================================

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_approved_users_updated_at ON approved_users;

-- Create the trigger
CREATE TRIGGER update_approved_users_updated_at
    BEFORE UPDATE ON approved_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Step 3: Update existing users
-- =====================================================

-- Mark existing users as having their password set (they registered before this update)
UPDATE approved_users 
SET password_set = TRUE 
WHERE password_set IS NULL OR password_set = FALSE;

-- Set existing users as active
UPDATE approved_users 
SET is_active = TRUE 
WHERE is_active IS NULL;

-- =====================================================
-- Step 4: Create index for better query performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_approved_users_email ON approved_users(email);
CREATE INDEX IF NOT EXISTS idx_approved_users_is_active ON approved_users(is_active);

-- =====================================================
-- Full Table Schema Reference (after migration)
-- =====================================================
-- 
-- CREATE TABLE approved_users (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     email TEXT UNIQUE NOT NULL,
--     first_name TEXT,
--     last_name TEXT,
--     is_admin BOOLEAN DEFAULT FALSE,
--     is_active BOOLEAN DEFAULT TRUE,
--     password_set BOOLEAN DEFAULT FALSE,
--     permissions TEXT[] DEFAULT '{}',
--     invitation_sent_at TIMESTAMPTZ,
--     created_at TIMESTAMPTZ DEFAULT NOW(),
--     updated_at TIMESTAMPTZ DEFAULT NOW()
-- );
--
-- =====================================================

-- =====================================================
-- Verification Query (run after migration)
-- =====================================================

-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'approved_users'
-- ORDER BY ordinal_position;
