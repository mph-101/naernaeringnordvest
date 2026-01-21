-- Add RLS policies for tips table to allow authorized journalists and admins to access tips
-- and prevent unauthorized modification

-- Allow admins and journalists to view tips
CREATE POLICY "Authorized staff can view tips" 
ON public.tips 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'journalist'::app_role));

-- Allow admins to update tips (e.g., mark as reviewed)
CREATE POLICY "Admins can update tips" 
ON public.tips 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete tips
CREATE POLICY "Admins can delete tips" 
ON public.tips 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));