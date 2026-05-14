
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'driver', 'passenger');
CREATE TYPE public.request_status AS ENUM ('pending', 'accepted', 'declined', 'cancelled', 'completed');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  photo_url TEXT,
  bio TEXT,
  work_email TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Routes
CREATE TABLE public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_location TEXT NOT NULL,
  end_location TEXT NOT NULL,
  description TEXT,
  days_of_week TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  departure_time TIME NOT NULL,
  available_seats INT NOT NULL CHECK (available_seats >= 0),
  price_per_seat NUMERIC(10,2) NOT NULL CHECK (price_per_seat >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_routes_active ON public.routes(is_active);
CREATE INDEX idx_routes_driver ON public.routes(driver_id);

-- Ride requests
CREATE TABLE public.ride_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.request_status NOT NULL DEFAULT 'pending',
  pickup_note TEXT,
  seats_requested INT NOT NULL DEFAULT 1 CHECK (seats_requested > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_requests_passenger ON public.ride_requests(passenger_id);
CREATE INDEX idx_requests_driver ON public.ride_requests(driver_id);

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.ride_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_messages_request ON public.messages(request_id);

-- Ratings
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.ride_requests(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ratee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stars INT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_id, rater_id)
);
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_routes_updated BEFORE UPDATE ON public.routes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_requests_updated BEFORE UPDATE ON public.ride_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile + passenger role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'passenger');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS policies
-- profiles: anyone authenticated can view; user updates own; admin updates any
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_roles: user views own; admin manages all
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users self-add driver role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND role = 'driver');

-- routes
CREATE POLICY "Active routes viewable" ON public.routes FOR SELECT TO authenticated USING (is_active = true OR driver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers create routes" ON public.routes FOR INSERT TO authenticated WITH CHECK (driver_id = auth.uid());
CREATE POLICY "Drivers update own routes" ON public.routes FOR UPDATE TO authenticated USING (driver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers delete own routes" ON public.routes FOR DELETE TO authenticated USING (driver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ride_requests
CREATE POLICY "Participants view requests" ON public.ride_requests FOR SELECT TO authenticated USING (passenger_id = auth.uid() OR driver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Passengers create requests" ON public.ride_requests FOR INSERT TO authenticated WITH CHECK (passenger_id = auth.uid());
CREATE POLICY "Participants update requests" ON public.ride_requests FOR UPDATE TO authenticated USING (passenger_id = auth.uid() OR driver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete requests" ON public.ride_requests FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR passenger_id = auth.uid());

-- messages
CREATE POLICY "Participants view messages" ON public.messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ride_requests r WHERE r.id = request_id AND (r.passenger_id = auth.uid() OR r.driver_id = auth.uid()))
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Participants send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.ride_requests r WHERE r.id = request_id AND (r.passenger_id = auth.uid() OR r.driver_id = auth.uid()))
);

-- ratings
CREATE POLICY "Ratings viewable by all auth" ON public.ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own ratings" ON public.ratings FOR INSERT TO authenticated WITH CHECK (rater_id = auth.uid());
CREATE POLICY "Admins delete ratings" ON public.ratings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- reports
CREATE POLICY "Reporter or admin view reports" ON public.reports FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Auth users create reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Admins update reports" ON public.reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_requests;
