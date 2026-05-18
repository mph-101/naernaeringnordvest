-- Add encrypted email column
ALTER TABLE public.tips ADD COLUMN follow_up_email_encrypted BYTEA;

-- Clear existing plaintext emails (decision: no re-encryption)
UPDATE public.tips SET follow_up_email = NULL WHERE follow_up_email IS NOT NULL;

-- Drop the email format constraint (encrypted data is not an email string)
ALTER TABLE public.tips DROP CONSTRAINT IF EXISTS tips_email_format;
