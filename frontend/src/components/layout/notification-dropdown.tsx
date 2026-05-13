"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { Notification } from "@/lib/types";
import type { PaginatedResponse } from "@/lib/types";
import { Bell, Check, CheckCheck, Clock, AlertTriangle, Mail, CheckCircle, XCircle } from "lucide-react";

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: async () => {
      const res = await api.get<{ unread_count: number }>("/notifications/unread-count");
      return res.data;
    },
    refetchInterval: 30000,
  });

  const { data: notifResult } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<Notification>>("/notifications?limit=15");
      return res.data;
    },
    enabled: open,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => api.put(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.put("/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (id: number) => api.put(`/notifications/${id}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: (id: number) => api.put(`/notifications/${id}/decline`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const handleNotifClick = (n: Notification) => {
    if (n.type === "invitation") return;
    if (!n.is_read) markReadMutation.mutate(n.id);
    setOpen(false);
    if (n.task_id) {
      router.push(`/tasks/${n.task_id}`);
    }
  };

  const unread = unreadData?.unread_count ?? 0;
  const notifications = notifResult?.data ?? [];

  const typeIcon = (type: string) => {
    if (type === "overdue") return <AlertTriangle size={14} className="text-red-500" />;
    if (type === "invitation") return <Mail size={14} className="text-blue-500" />;
    return <Clock size={14} className="text-amber-500" />;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="neu-flat p-2.5 rounded-xl hover:shadow-md transition-shadow relative"
      >
        <Bell size={18} className="text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 sm:w-96 neu-flat z-50 max-h-[28rem] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={() => markAllMutation.mutate()}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-border last:border-0 ${
                    n.type === "invitation" ? "" : "hover:bg-secondary/50 cursor-pointer"
                  } transition-colors ${!n.is_read ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">{typeIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!n.is_read ? "font-medium" : "text-muted-foreground"}`}>
                        {n.message}
                      </p>

                      {n.type === "invitation" && n.invitation_status === "pending" && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); acceptMutation.mutate(n.id); }}
                            disabled={acceptMutation.isPending}
                            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-green-500 text-white text-xs font-medium hover:bg-green-600 disabled:opacity-50"
                          >
                            <CheckCircle size={12} /> Accept
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); declineMutation.mutate(n.id); }}
                            disabled={declineMutation.isPending}
                            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 disabled:opacity-50"
                          >
                            <XCircle size={12} /> Decline
                          </button>
                        </div>
                      )}

                      {n.type === "invitation" && n.invitation_status !== "pending" && (
                        <span className={`inline-flex items-center gap-1 text-xs mt-1 ${
                          n.invitation_status === "accepted" ? "text-green-600" : "text-red-500"
                        }`}>
                          {n.invitation_status === "accepted" ? <CheckCircle size={10} /> : <XCircle size={10} />}
                          {n.invitation_status === "accepted" ? "Accepted" : "Declined"}
                        </span>
                      )}

                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(n.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {!n.is_read && n.type !== "invitation" && (
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
