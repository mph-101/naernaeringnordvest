
-- Create security definer function to check group membership
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id AND role = 'admin'
  )
$$;

-- Drop and recreate problematic policies on group_members
DROP POLICY "Members can view group members" ON public.group_members;
CREATE POLICY "Members can view group members" ON public.group_members
  FOR SELECT USING (public.is_group_member(auth.uid(), group_id));

DROP POLICY "Group admins can add members" ON public.group_members;
CREATE POLICY "Group admins can add members" ON public.group_members
  FOR INSERT TO authenticated WITH CHECK (public.is_group_admin(auth.uid(), group_id));

DROP POLICY "Group admins can remove members" ON public.group_members;
CREATE POLICY "Group admins can remove members" ON public.group_members
  FOR DELETE USING (public.is_group_admin(auth.uid(), group_id));

-- Fix group_invitations policies
DROP POLICY "Group admins can view invitations" ON public.group_invitations;
CREATE POLICY "Group admins can view invitations" ON public.group_invitations
  FOR SELECT USING (public.is_group_admin(auth.uid(), group_id));

DROP POLICY "Group admins can create invitations" ON public.group_invitations;
CREATE POLICY "Group admins can create invitations" ON public.group_invitations
  FOR INSERT TO authenticated WITH CHECK (public.is_group_admin(auth.uid(), group_id));

DROP POLICY "Group admins can update invitations" ON public.group_invitations;
CREATE POLICY "Group admins can update invitations" ON public.group_invitations
  FOR UPDATE USING (public.is_group_admin(auth.uid(), group_id));

-- Fix group_messages policies
DROP POLICY "Members can view group messages" ON public.group_messages;
CREATE POLICY "Members can view group messages" ON public.group_messages
  FOR SELECT USING (public.is_group_member(auth.uid(), group_id));

DROP POLICY "Members can post messages" ON public.group_messages;
CREATE POLICY "Members can post messages" ON public.group_messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND public.is_group_member(auth.uid(), group_id)
  );

-- Fix groups invite-only policy
DROP POLICY "Members can view invite-only groups" ON public.groups;
CREATE POLICY "Members can view invite-only groups" ON public.groups
  FOR SELECT USING (public.is_group_member(auth.uid(), id));
