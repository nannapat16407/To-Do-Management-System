"use client";

import { useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { User } from "@/lib/types";
import UserAvatar from "@/components/ui/user-avatar";
import { Camera } from "lucide-react";
import { format } from "date-fns";

export default function ProfilePage() {
  const { user, login } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatarMutation = useMutation({
    mutationFn: async (avatarUrl: string) => {
      const res = await api.put<User>("/users/avatar", { avatar_url: avatarUrl });
      return res.data;
    },
    onSuccess: (updatedUser) => {
      const token = localStorage.getItem("token") || "";
      login(token, updatedUser);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      avatarMutation.mutate(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <div className="neu-flat p-8 text-center">
        <div className="relative inline-block group">
          <UserAvatar
            name={user.name}
            avatarUrl={user.avatar_url}
            size="lg"
            className="mx-auto"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarMutation.isPending}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
          >
            <Camera size={14} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
        {avatarMutation.isPending && (
          <p className="text-xs text-muted-foreground mt-2">Uploading...</p>
        )}
        <h2 className="text-xl font-bold mt-4">{user.name}</h2>
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
