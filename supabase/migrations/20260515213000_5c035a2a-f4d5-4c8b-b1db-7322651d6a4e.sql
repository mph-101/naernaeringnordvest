-- Add visibility column to group_messages so authors can control who sees a shared note
ALTER TABLE public.group_messages
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'members';

-- Constrain to known values via trigger (avoid CHECK on mutable rules later)
ALTER TABLE public.group_messages
  DROP CONSTRAINT IF EXISTS group_messages_visibility_check;
ALTER TABLE public.group_messages
  ADD CONSTRAINT group_messages_visibility_check
  CHECK (visibility IN ('members', 'admins', 'author'));

-- Replace SELECT policy to honor visibility
DROP POLICY IF EXISTS "Members can view group messages" ON public.group_messages;

CREATE POLICY "Members can view group messages by visibility"
ON public.group_messages
FOR SELECT
USING (
  -- author always sees own
  auth.uid() = user_id
  OR (
    visibility = 'members' AND public.is_group_member(auth.uid(), group_id)
  )
  OR (
    visibility = 'admins' AND public.is_group_admin(auth.uid(), group_id)
  )
);

-- Update INSERT policy to validate visibility column
DROP POLICY IF EXISTS "Members can post messages" ON public.group_messages;

CREATE POLICY "Members can post messages"
ON public.group_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.is_group_member(auth.uid(), group_id)
  AND visibility IN ('members', 'admins', 'author')
);