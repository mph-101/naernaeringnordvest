
-- Groups table (no RLS yet)
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'invite_only')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Group members
CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

-- Group invitations
CREATE TABLE public.group_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invite_email text,
  invite_phone text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Group messages
CREATE TABLE public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  article_id uuid REFERENCES public.articles(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Now enable RLS on all
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Groups RLS
CREATE POLICY "Anyone can view public groups" ON public.groups
  FOR SELECT USING (visibility = 'public');

CREATE POLICY "Members can view invite-only groups" ON public.groups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE group_members.group_id = groups.id AND group_members.user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can create groups" ON public.groups
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can update groups" ON public.groups
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Group creators can delete groups" ON public.groups
  FOR DELETE USING (auth.uid() = created_by);

-- Group members RLS
CREATE POLICY "Anyone can view public group members" ON public.group_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.groups WHERE groups.id = group_members.group_id AND groups.visibility = 'public')
  );

CREATE POLICY "Members can view group members" ON public.group_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid())
  );

CREATE POLICY "Users can join public groups" ON public.group_members
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.groups WHERE groups.id = group_id AND groups.visibility = 'public')
  );

CREATE POLICY "Group admins can add members" ON public.group_members
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin')
  );

CREATE POLICY "Users can leave groups" ON public.group_members
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Group admins can remove members" ON public.group_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin')
  );

-- Group invitations RLS
CREATE POLICY "Group admins can view invitations" ON public.group_invitations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_invitations.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin')
  );

CREATE POLICY "Group admins can create invitations" ON public.group_invitations
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_invitations.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin')
  );

CREATE POLICY "Group admins can update invitations" ON public.group_invitations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_invitations.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin')
  );

-- Group messages RLS
CREATE POLICY "Members can view group messages" ON public.group_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_messages.group_id AND gm.user_id = auth.uid())
  );

CREATE POLICY "Members can post messages" ON public.group_messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_messages.group_id AND gm.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own messages" ON public.group_messages
  FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for group messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
