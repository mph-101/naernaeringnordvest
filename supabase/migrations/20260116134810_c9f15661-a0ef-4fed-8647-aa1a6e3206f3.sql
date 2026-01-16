-- Create tips table for anonymous submissions
CREATE TABLE public.tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journalist_id TEXT NOT NULL, -- Links to hardcoded journalist ID in frontend
  journalist_name TEXT NOT NULL,
  content TEXT NOT NULL,
  follow_up_email TEXT, -- Optional email for follow-up
  is_anonymous BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (anyone can submit a tip)
CREATE POLICY "Anyone can submit tips"
ON public.tips
FOR INSERT
WITH CHECK (true);

-- No public read access - tips are read via admin panel or edge function
CREATE POLICY "No public read access to tips"
ON public.tips
FOR SELECT
USING (false);

-- Add index for journalist lookups
CREATE INDEX idx_tips_journalist_id ON public.tips(journalist_id);
CREATE INDEX idx_tips_created_at ON public.tips(created_at DESC);