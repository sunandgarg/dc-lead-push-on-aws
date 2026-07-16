-- Add duplicate_count column to upload_batches
ALTER TABLE public.upload_batches ADD COLUMN IF NOT EXISTS duplicate_count integer NOT NULL DEFAULT 0;

-- Create increment_batch_duplicate RPC
CREATE OR REPLACE FUNCTION public.increment_batch_duplicate(batch_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  UPDATE upload_batches
  SET duplicate_count = duplicate_count + 1
  WHERE id = batch_uuid;
END;
$$;