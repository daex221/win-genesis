-- Split prizes table to separate public metadata from sensitive delivery content

-- Step 1: Create new prize_metadata table for public data
CREATE TABLE public.prize_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emoji text NOT NULL,
  type text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  weight_basic integer NOT NULL DEFAULT 0,
  weight_gold integer NOT NULL DEFAULT 0,
  weight_vip integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Step 2: Create prize_delivery table for sensitive content
CREATE TABLE public.prize_delivery (
  prize_id uuid PRIMARY KEY REFERENCES public.prize_metadata(id) ON DELETE CASCADE,
  delivery_content text NOT NULL
);

-- Step 3: Migrate existing data from prizes to new tables
INSERT INTO public.prize_metadata (id, name, emoji, type, active, weight_basic, weight_gold, weight_vip, created_at)
SELECT id, name, emoji, type, active, weight_basic, weight_gold, weight_vip, created_at
FROM public.prizes;

INSERT INTO public.prize_delivery (prize_id, delivery_content)
SELECT id, delivery_content
FROM public.prizes;

-- Step 4: Enable RLS on both tables
ALTER TABLE public.prize_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prize_delivery ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policy for prize_metadata (public read access)
CREATE POLICY "Anyone can view active prize metadata"
ON public.prize_metadata
FOR SELECT
USING (active = true);

-- Step 6: Create admin-only policies for prize_metadata management
CREATE POLICY "Admins can insert prize metadata"
ON public.prize_metadata
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update prize metadata"
ON public.prize_metadata
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete prize metadata"
ON public.prize_metadata
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Step 7: Create admin-only policies for prize_delivery (NO public SELECT policy)
CREATE POLICY "Admins can view prize delivery content"
ON public.prize_delivery
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert prize delivery content"
ON public.prize_delivery
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update prize delivery content"
ON public.prize_delivery
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete prize delivery content"
ON public.prize_delivery
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Step 8: Update foreign key in spins table to reference prize_metadata
ALTER TABLE public.spins DROP CONSTRAINT IF EXISTS spins_prize_id_fkey;
ALTER TABLE public.spins ADD CONSTRAINT spins_prize_id_fkey 
  FOREIGN KEY (prize_id) REFERENCES public.prize_metadata(id);

-- Step 9: Drop the old prizes table
DROP TABLE public.prizes CASCADE;