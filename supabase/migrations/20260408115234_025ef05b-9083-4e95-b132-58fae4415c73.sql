
CREATE TABLE public.company_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.company_list_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES public.company_lists(id) ON DELETE CASCADE,
  orgnr TEXT NOT NULL,
  company_name TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(list_id, orgnr)
);

ALTER TABLE public.company_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lists" ON public.company_lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create lists" ON public.company_lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lists" ON public.company_lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own lists" ON public.company_lists FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own list items" ON public.company_list_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.company_lists WHERE id = list_id AND user_id = auth.uid())
);
CREATE POLICY "Users can add to own lists" ON public.company_list_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.company_lists WHERE id = list_id AND user_id = auth.uid())
);
CREATE POLICY "Users can remove from own lists" ON public.company_list_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.company_lists WHERE id = list_id AND user_id = auth.uid())
);

CREATE TRIGGER update_company_lists_updated_at BEFORE UPDATE ON public.company_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
