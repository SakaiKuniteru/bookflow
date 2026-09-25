CREATE EXTENSION IF NOT EXISTS vector;

CREATE OR REPLACE FUNCTION public.cap_nhat_ngay_cap_nhat()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.ngay_cap_nhat = now();
    RETURN NEW;
END;
$$;