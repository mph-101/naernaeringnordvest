-- Status enum for tips
CREATE TYPE tip_status AS ENUM ('new', 'reviewing', 'followed_up', 'dismissed');

-- Add status tracking columns
ALTER TABLE public.tips
  ADD COLUMN status tip_status NOT NULL DEFAULT 'new',
  ADD COLUMN reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN reviewed_at TIMESTAMPTZ;
