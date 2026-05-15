
-- 1. Update Profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS school_name TEXT,
ADD COLUMN IF NOT EXISTS trust_score INT NOT NULL DEFAULT 100,
ADD COLUMN IF NOT EXISTS badges JSONB NOT NULL DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS emergency_contacts JSONB NOT NULL DEFAULT '[]'::JSONB;

-- 2. Update Cars
ALTER TABLE public.cars 
ADD COLUMN IF NOT EXISTS color TEXT;

-- 3. Update Ride Requests
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE public.payment_status AS ENUM ('pending_escrow', 'paid', 'released', 'refunded');
    END IF;
END $$;

ALTER TABLE public.ride_requests
ADD COLUMN IF NOT EXISTS verification_code TEXT,
ADD COLUMN IF NOT EXISTS payment_status public.payment_status NOT NULL DEFAULT 'pending_escrow',
ADD COLUMN IF NOT EXISTS payment_ref TEXT,
ADD COLUMN IF NOT EXISTS commission_fee NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_price NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS start_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS start_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS end_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS end_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS driver_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS driver_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS passenger_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS passenger_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS pickup_otp TEXT,
ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS passenger_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS driver_confirmed_at TIMESTAMPTZ;

-- 4. Update Ratings
ALTER TABLE public.ratings
ADD COLUMN IF NOT EXISTS punctuality INT CHECK (punctuality BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS driving_behavior INT CHECK (driving_behavior BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS cleanliness INT CHECK (cleanliness BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS communication INT CHECK (communication BETWEEN 1 AND 5);

-- 5. Trip Logs Table
CREATE TABLE IF NOT EXISTS public.trip_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.ride_requests(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, 
    event_details JSONB,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trip_logs ENABLE ROW LEVEL SECURITY;

-- 6. Emergency Events Table
CREATE TABLE IF NOT EXISTS public.emergency_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.ride_requests(id) ON DELETE CASCADE,
    triggered_by UUID NOT NULL REFERENCES auth.users(id),
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.emergency_events ENABLE ROW LEVEL SECURITY;

-- 7. Favorite Users Table
CREATE TABLE IF NOT EXISTS public.favorite_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    favorite_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, favorite_id)
);
ALTER TABLE public.favorite_users ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS Policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Participants view trip logs" ON public.trip_logs;
    CREATE POLICY "Participants view trip logs" ON public.trip_logs FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.ride_requests r WHERE r.id = request_id AND (r.passenger_id = auth.uid() OR r.driver_id = auth.uid()))
        OR public.has_role(auth.uid(), 'admin')
    );

    DROP POLICY IF EXISTS "Admins view all emergency events" ON public.emergency_events;
    CREATE POLICY "Admins view all emergency events" ON public.emergency_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

    DROP POLICY IF EXISTS "Participants view own emergency events" ON public.emergency_events;
    CREATE POLICY "Participants view own emergency events" ON public.emergency_events FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.ride_requests r WHERE r.id = request_id AND (r.passenger_id = auth.uid() OR r.driver_id = auth.uid()))
    );

    DROP POLICY IF EXISTS "Participants create emergency events" ON public.emergency_events;
    CREATE POLICY "Participants create emergency events" ON public.emergency_events FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM public.ride_requests r WHERE r.id = request_id AND (r.passenger_id = auth.uid() OR r.driver_id = auth.uid()))
    );

    DROP POLICY IF EXISTS "Users manage own favorites" ON public.favorite_users;
    CREATE POLICY "Users manage own favorites" ON public.favorite_users FOR ALL TO authenticated USING (user_id = auth.uid());
END $$;

-- Realtime (Idempotent check for publication members)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'trip_logs') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_logs;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'emergency_events') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_events;
    END IF;
END $$;

-- 8. Strict Ownership Controls
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_not_self_booking') THEN
        ALTER TABLE public.ride_requests ADD CONSTRAINT check_not_self_booking CHECK (passenger_id <> driver_id);
    END IF;
END $$;

-- 9. Security Logging & Monitoring
CREATE TABLE IF NOT EXISTS public.security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id),
    event_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users view own security logs" ON public.security_logs;
    CREATE POLICY "Users view own security logs" ON public.security_logs FOR SELECT TO authenticated USING (user_id = auth.uid());

    DROP POLICY IF EXISTS "Admins view all security logs" ON public.security_logs;
    CREATE POLICY "Admins view all security logs" ON public.security_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
END $$;

-- Trigger to log self-booking attempts (Safe to run multiple times)
CREATE OR REPLACE FUNCTION public.log_violation_attempt()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.passenger_id = NEW.driver_id THEN
        INSERT INTO public.security_logs (user_id, event_type, metadata)
        VALUES (NEW.passenger_id, 'self_booking_violation', jsonb_build_object('route_id', NEW.route_id, 'client_ip', current_setting('request.headers', true)::jsonb->>'x-real-ip'));
        RAISE EXCEPTION 'Ownership Restricted: Drivers cannot book their own routes.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_security_violation_check ON public.ride_requests;
CREATE TRIGGER trigger_security_violation_check
BEFORE INSERT ON public.ride_requests
FOR EACH ROW EXECUTE FUNCTION public.log_violation_attempt();

-- 10. Smart Trip Start Logic
CREATE OR REPLACE FUNCTION public.generate_ride_otp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        NEW.pickup_otp := lpad(floor(random() * 1000000)::text, 6, '0');
        NEW.otp_expires_at := now() + interval '20 minutes';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_otp
BEFORE UPDATE ON public.ride_requests
FOR EACH ROW EXECUTE FUNCTION public.generate_ride_otp();

