-- Add Stripe subscription persistence for Vercel + Supabase production.
-- This allows the profile page to query Stripe for cancel_at_period_end
-- and show "subscription cancelled / access until <date>" correctly.

ALTER TABLE users
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
