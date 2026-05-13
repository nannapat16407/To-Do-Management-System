"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import NotificationDropdown from "./notification-dropdown";
import UserAvatar from "@/components/ui/user-avatar";
import { User, LogOut, ChevronDown } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="h-16 flex items-center justify-between px-6 lg:px-8">
      <div className="lg:hidden w-10" />
      <div className="hidden lg:block">
        <h2 className="text-lg font-semibold">
          Welcome back, {user?.name?.split(" ")[0] || "User"}
        </h2>
      </div>
      <div className="flex items-center gap-3">
        <NotificationDropdown />
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(!open)}
            className="neu-flat rounded-full px-3 py-1.5 flex items-center gap-2 hover:shadow-md transition-shadow"
          >
            <UserAvatar name={user?.name || ""} avatarUrl={user?.avatar_url} size="sm" />
            <span className="text-sm font-medium hidden sm:block max-w-[120px] truncate">
              {user?.name}
            </span>
            <ChevronDown size={14} className="text-muted-foreground hidden sm:block" />
          </button>

          {open && (
            <div className="absolute right-0 top-12 w-48 neu-flat z-50 py-1">
              <button
                onClick={() => { setOpen(false); router.push("/profile"); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary transition-colors text-left"
              >
                <User size={16} className="text-muted-foreground" />
                Profile
              </button>
              <div className="mx-3 my-1 border-t border-border" />
              <button
                onClick={() => { setOpen(false); logout(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-destructive/10 text-destructive transition-colors text-left"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
