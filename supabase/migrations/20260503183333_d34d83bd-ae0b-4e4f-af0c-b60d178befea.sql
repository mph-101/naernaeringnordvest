
-- Enable RLS on realtime.messages and add a restrictive default-deny + a
-- group-membership policy for `group-{uuid}` topics.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

-- Read access: authenticated members of the group only (topics shaped `group-<uuid>`).
DROP POLICY IF EXISTS "Group members can read realtime messages" ON realtime.messages;
CREATE POLICY "Group members can read realtime messages"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    realtime.topic() LIKE 'group-%'
    AND public.is_group_member(
      auth.uid(),
      NULLIF(substring(realtime.topic() FROM 7), '')::uuid
    )
  );

DROP POLICY IF EXISTS "Group members can send realtime messages" ON realtime.messages;
CREATE POLICY "Group members can send realtime messages"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    realtime.topic() LIKE 'group-%'
    AND public.is_group_member(
      auth.uid(),
      NULLIF(substring(realtime.topic() FROM 7), '')::uuid
    )
  );
