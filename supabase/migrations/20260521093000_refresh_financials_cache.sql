-- Clear company_financials cache so it gets re-populated with corrected
-- arsresultat values (we previously stored ordinaertResultatFoerSkattekostnad
-- in this column; now we correctly store aarsresultat as primary).
-- The cache will rebuild organically as users query companies again.

TRUNCATE TABLE public.company_financials;
