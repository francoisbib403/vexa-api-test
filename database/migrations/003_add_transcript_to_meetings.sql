-- Migration: Add complete transcript field to meetings table

ALTER TABLE public.meetings
ADD COLUMN IF NOT EXISTS complete_transcript JSONB;

-- Add comment
COMMENT ON COLUMN public.meetings.complete_transcript IS 'Complete transcript data received at the end of the meeting';