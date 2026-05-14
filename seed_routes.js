import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://yweigjymophjzhkaeyrf.supabase.co";
const SUPABASE_KEY = "sb_publishable_x8u4_sjfx8wRIZ3EMayhmg_K_0kC1HL";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const drivers = [
  {
    email: "kofi.driver@example.com",
    password: "password123",
    fullName: "Kofi Mensah",
    workEmail: "kofi.m@university.edu.gh",
    carMake: "Toyota",
    carModel: "Corolla",
    plateNumber: "GW-4521-22",
    route: {
      startLocation: "Tema Community 25",
      endLocation: "Accra Mall",
      departureTime: "06:30",
      availableSeats: 3,
      pricePerSeat: 20,
      daysOfWeek: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      description: "Leaving early to beat traffic. Air-conditioned ride.",
    },
  },
  {
    email: "ama.driver@example.com",
    password: "password123",
    fullName: "Ama Serwaa",
    workEmail: "ama.s@corporate.com",
    carMake: "Hyundai",
    carModel: "Elantra",
    plateNumber: "GR-102-19",
    route: {
      startLocation: "Madina Zongo Junction",
      endLocation: "Osu Oxford Street",
      departureTime: "07:00",
      availableSeats: 2,
      pricePerSeat: 15,
      daysOfWeek: ["Mon", "Wed", "Fri"],
      description: "Direct route through Independence Ave.",
    },
  },
  {
    email: "yaw.driver@example.com",
    password: "password123",
    fullName: "Yaw Osei",
    workEmail: "yaw.o@bank.com.gh",
    carMake: "Honda",
    carModel: "Civic",
    plateNumber: "GE-9988-21",
    route: {
      startLocation: "Kasoa Toll Booth",
      endLocation: "Cantonments",
      departureTime: "05:45",
      availableSeats: 4,
      pricePerSeat: 25,
      daysOfWeek: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      description: "Quiet ride. No eating in the car please.",
    },
  },
];

async function seed() {
  console.log("Starting seed process...");

  for (const driver of drivers) {
    console.log(`\nProcessing driver: ${driver.fullName}`);

    // 1. Sign up
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: driver.email,
      password: driver.password,
    });

    if (authError) {
      // If user already exists, try signing in
      if (authError.message.includes("already registered")) {
        console.log("User already exists, signing in...");
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: driver.email,
            password: driver.password,
          });
        if (signInError) {
          console.error("Failed to sign in:", signInError);
          continue;
        }
        authData.user = signInData.user;
      } else {
        console.error("Signup error:", authError);
        continue;
      }
    }

    const userId = authData.user.id;
    console.log(`User ID: ${userId}`);

    // 2. Update profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: driver.fullName,
        work_email: driver.workEmail,
        verified: true, // Optional: if RLS allows, otherwise ignore
      })
      .eq("id", userId);

    if (profileError)
      console.warn("Profile update error:", profileError.message);

    // 3. Make them a driver
    const { error: roleError } = await supabase
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "driver" },
        { onConflict: "user_id, role" },
      );

    if (roleError) console.warn("Role error:", roleError.message);

    // 4. Add car
    const { error: carError } = await supabase.from("cars").upsert({
      owner_id: userId,
      make: driver.carMake,
      model: driver.carModel,
      plate_number: driver.plateNumber,
    });

    if (carError) console.warn("Car error:", carError.message);

    // 5. Add route
    const { error: routeError } = await supabase.from("routes").insert({
      driver_id: userId,
      start_location: driver.route.startLocation,
      end_location: driver.route.endLocation,
      departure_time: driver.route.departureTime,
      available_seats: driver.route.availableSeats,
      price_per_seat: driver.route.pricePerSeat,
      days_of_week: driver.route.daysOfWeek,
      description: driver.route.description,
      is_active: true,
    });

    if (routeError) {
      console.error("Route error:", routeError);
    } else {
      console.log(`Route created for ${driver.fullName}`);
    }

    // Sign out to clear session for next driver
    await supabase.auth.signOut();
  }

  console.log("\nSeed complete!");
}

seed().catch(console.error);
