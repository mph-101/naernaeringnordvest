-- Add content length constraint to tips table
ALTER TABLE public.tips ADD CONSTRAINT tips_content_length 
  CHECK (length(content) <= 10000);

-- Add email format validation constraint
ALTER TABLE public.tips ADD CONSTRAINT tips_email_format 
  CHECK (follow_up_email IS NULL OR follow_up_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Add journalist_id length constraint to prevent abuse
ALTER TABLE public.tips ADD CONSTRAINT tips_journalist_id_length
  CHECK (length(journalist_id) <= 100);

-- Add journalist_name length constraint
ALTER TABLE public.tips ADD CONSTRAINT tips_journalist_name_length
  CHECK (length(journalist_name) <= 200);

-- Create rate limiting table for tip submissions
CREATE TABLE public.tip_rate_limits (
  ip_hash TEXT PRIMARY KEY,
  submission_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on rate limits table (only edge functions with service role can access)
ALTER TABLE public.tip_rate_limits ENABLE ROW LEVEL SECURITY;

-- No RLS policies = only service role can access (used by edge function)