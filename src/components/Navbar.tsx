import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Car, LogOut, Menu, Shield } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    nav({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Car className="h-5 w-5" />
          </span>
          <span>RideShare</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            to="/routes"
            className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Find a Route
          </Link>
          {user && (
            <>
              <Link
                to="/dashboard"
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                Dashboard
              </Link>
              <Link
                to="/routes/new"
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                Offer a Ride
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-muted"
                >
                  <Shield className="h-4 w-4" /> Admin
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/auth">Get started</Link>
              </Button>
            </>
          )}
        </div>

        <button
          className="md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>
      {open && (
        <div className="border-t bg-background md:hidden">
          <div className="flex flex-col gap-1 px-4 py-3">
            <Link
              to="/routes"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 hover:bg-muted"
            >
              Find a Route
            </Link>
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 hover:bg-muted"
                >
                  Dashboard
                </Link>
                <Link
                  to="/routes/new"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 hover:bg-muted"
                >
                  Offer a Ride
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2 text-primary hover:bg-muted"
                  >
                    Admin
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="rounded-md px-3 py-2 text-left hover:bg-muted"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 hover:bg-muted"
                >
                  Sign in
                </Link>
                <Link
                  to="/auth"
                  onClick={() => setOpen(false)}
                  className="rounded-md bg-primary px-3 py-2 text-center text-primary-foreground"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
