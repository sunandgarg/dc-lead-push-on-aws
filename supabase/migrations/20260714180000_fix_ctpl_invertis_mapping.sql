-- Repair CTPL Invertis payload fields created without source keys. The stored
-- __field_* values are JSON strings inside the column_mapping JSONB object.
WITH corrected_mapping AS (
  SELECT
    u.id,
    jsonb_object_agg(
      entry.key,
      CASE
        WHEN entry.key LIKE '__field_%'
          AND ((entry.value #>> '{}')::jsonb ->> 'sourceType') = 'lead_data'
          AND ((entry.value #>> '{}')::jsonb ->> 'fieldName') IN (
            'email', 'mobile', 'name', 'program', 'state', 'district', 'course', 'campaign_name'
          )
        THEN to_jsonb(
          (
            (entry.value #>> '{}')::jsonb
            || jsonb_build_object('sourceKey', (entry.value #>> '{}')::jsonb ->> 'fieldName')
          )::text
        )
        ELSE entry.value
      END
    ) AS column_mapping
  FROM public.universities AS u
  CROSS JOIN LATERAL jsonb_each(COALESCE(u.column_mapping, '{}'::jsonb)) AS entry
  WHERE u.id = '5cef89f4-1a51-4ab4-98cd-ad4ad22204dd'
  GROUP BY u.id
)
UPDATE public.universities AS u
SET
  column_mapping = corrected_mapping.column_mapping,
  sample_csv_content = replace(COALESCE(u.sample_csv_content, ''), 'campaign_nanme', 'campaign_name'),
  updated_at = now()
FROM corrected_mapping
WHERE u.id = corrected_mapping.id;

-- These batches were frontend-driven runs whose browser workers are no longer
-- alive. Leaving them as processing makes the queue look blocked forever.
UPDATE public.upload_batches
SET
  status = 'cancelled',
  is_cancelled = true,
  is_paused = false,
  completed_at = COALESCE(completed_at, now()),
  error_message = COALESCE(error_message, 'Cancelled during CTPL Invertis configuration repair')
WHERE university_id = '5cef89f4-1a51-4ab4-98cd-ad4ad22204dd'
  AND status IN ('processing', 'paused');
