"use client";

import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-20 h-20 text-3xl",
};

export default function UserAvatar({ name, avatarUrl, size = "md", className }: UserAvatarProps) {
  const initial = name?.[0]?.toUpperCase() || "U";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn("rounded-full object-cover", sizeClasses[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0",
        sizeClasses[size],
        className
      )}
    >
      {initial}
    </div>
  );
}
