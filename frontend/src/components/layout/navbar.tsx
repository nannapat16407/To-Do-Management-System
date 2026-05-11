"use client";

import { useAuth } from "@/contexts/auth-context";
import { Bell } from "lucide-react";

export default function Navbar() {
  const { user } = useAuth();

  return (
    <header className="h-16 flex items-center justify-between px-6 lg:px-8">
      <div className="lg:hidden w-10" />
      <div className="hidden lg:block">
        <h2 className="text-lg font-semibold">
          Welcome back, {user?.name?.split(" ")[0] || "User"}
        </h2>
      </div>
      <div className="flex items-center gap-3">
        <button className="neu-flat p-2.5 rounded-xl hover:shadow-md transition-shadow">
          <Bell size={18} className="text-muted-foreground" />
        </button>
        <div className="neu-flat rounded-full px-3 py-1.5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <span className="text-sm font-medium hidden sm:block">{user?.name}</span>
        </div>
      </div>
    </header>
  );
}
