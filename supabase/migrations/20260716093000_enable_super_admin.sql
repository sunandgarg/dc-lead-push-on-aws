-- Add a highest-privilege role while preserving existing admin checks.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'admin';
