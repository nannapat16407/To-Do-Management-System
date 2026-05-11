"use client";

import { useAuth } from "@/contexts/auth-context";
import { format } from "date-fns";

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <div className="neu-flat p-8 text-center">
        <div className="w-20 h-20 neu-convex rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl font-bold text-primary">
            {user.name[0].toUpperCase()}
          </span>
        </div>
        <h2 className="text-xl font-bold">{user.name}</h2>
        <p className="text-muted-foreground">{user.email}</p>
        <span className="inline-block mt-2 px-3 py-1 rounded-xl bg-primary/10 text-primary text-sm font-medium capitalize">
          {user.role}
        </span>
      </div>

      <div className="neu-flat p-6 space-y-4">
        <h3 className="font-semibold text-lg">Account Details</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">User ID</span>
            <span className="font-medium">{user.id}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{user.name}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium capitalize">{user.role}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Member since</span>
            <span className="font-medium">
              {user.created_at ? format(new Date(user.created_at), "MMM d, yyyy") : "N/A"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
