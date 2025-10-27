-- Create center_requests table for tracking doctor requests to add centers
CREATE TABLE IF NOT EXISTS public.center_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  doctor_id uuid NOT NULL,
  center_name text NOT NULL,
  center_type text NOT NULL CHECK (center_type = ANY (ARRAY['generic'::text, 'personal'::text])),
  address text,
  phone text,
  email text,
  operating_hours jsonb DEFAULT '{}'::jsonb,
  services text[] DEFAULT ARRAY[]::text[],
  offers_labs boolean DEFAULT false,
  offers_imaging boolean DEFAULT false,
  request_reason text,
  additional_notes text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT center_requests_pkey PRIMARY KEY (id),
  CONSTRAINT fk_center_requests_doctor FOREIGN KEY (doctor_id) REFERENCES public.users(id),
  CONSTRAINT fk_center_requests_admin FOREIGN KEY (reviewed_by) REFERENCES public.users(id)
);

-- Create index for faster queries by doctor_id and status
CREATE INDEX IF NOT EXISTS idx_center_requests_doctor_id ON public.center_requests(doctor_id);
CREATE INDEX IF NOT EXISTS idx_center_requests_status ON public.center_requests(status);
CREATE INDEX IF NOT EXISTS idx_center_requests_created_at ON public.center_requests(created_at);