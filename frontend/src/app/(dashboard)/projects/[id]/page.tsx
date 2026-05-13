"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import api from "@/lib/api";
import type { Project, Task } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import UserAvatar from "@/components/ui/user-avatar";
import TaskCreateForm from "@/components/task-create-form";
import {
  ArrowLeft,
  Plus,
  Users,
  X,
  Calendar,
  Mail,
  Send,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

const KANBAN_COLUMNS: { key: string; label: string; color: string }[] = [
  { key: "todo", label: "To Do", color: "bg-slate-100" },
  { key: "in_progress", label: "In Progress", color: "bg-blue-50" },
  { key: "in_review", label: "In Review", color: "bg-amber-50" },
  { key: "done", label: "Done", color: "bg-green-50" },
];

const priorityColors: Record<string, string> = {
  low: "bg-slate-200 text-slate-600",
  medium: "bg-orange-100 text-orange-700",
  high: "bg-red-100 text-red-700",
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const projectId = params.id as string;

  const [showMembers, setShowMembers] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [draggedTask, setDraggedTask] = useState<number | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => (await api.get<Project>(`/projects/${projectId}`)).data,
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ["project-tasks", projectId],
    queryFn: async () => {
      const res = await api.get<{ data: Task[] }>(`/tasks?project_id=${projectId}&limit=100`);
      return res.data?.data || [];
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: number) => api.delete(`/projects/${projectId}/members/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project", projectId] }),
  });

  const inviteMutation = useMutation({
    mutationFn: (email: string) => api.post(`/projects/${projectId}/invite`, { email }),
    onSuccess: () => {
      setInviteSuccess("Invitation sent!");
      setInviteEmail("");
      setInviteError("");
      setTimeout(() => setInviteSuccess(""), 3000);
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to send invitation";
      setInviteError(message);
      setInviteSuccess("");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.put(`/tasks/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
    },
  });

  const handleDragStart = useCallback((taskId: number) => {
    setDraggedTask(taskId);
  }, []);

  const handleDrop = useCallback(
    (status: string) => {
      if (draggedTask) {
        updateStatusMutation.mutate({ id: draggedTask, status });
        setDraggedTask(null);
      }
    },
    [draggedTask, updateStatusMutation]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleInvite = () => {
    setInviteError("");
    setInviteSuccess("");
    if (!inviteEmail.trim()) {
      setInviteError("Email is required");
      return;
    }
    inviteMutation.mutate(inviteEmail.trim());
  };

  const tasks = tasksData || [];
  const isOwner = project?.owner_id === currentUser?.id;

  if (projectLoading || tasksLoading) {
    return (
      <div className="space-y-6">
        <div className="neu-flat p-6 rounded-2xl animate-pulse">
          <div className="h-6 bg-muted rounded w-48 mb-3" />
          <div className="h-4 bg-muted rounded w-64" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="neu-flat p-12 text-center rounded-2xl">
        <p className="text-muted-foreground">Project not found</p>
        <Link href="/projects" className="text-primary mt-2 inline-block">Back to Projects</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/projects" className="neu-flat p-2 rounded-xl shrink-0">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl neu-convex text-sm font-medium"
          >
            <Users size={16} />
            {project.members?.length || 0}
          </button>
          <button
            onClick={() => setShowNewTask(!showNewTask)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <Plus size={16} />
            Add Task
          </button>
        </div>
      </div>

      {/* Shared task creation form */}
      {showNewTask && (
        <TaskCreateForm
          defaultProjectId={projectId}
          lockProject={true}
          onSuccess={() => setShowNewTask(false)}
          onCancel={() => setShowNewTask(false)}
        />
      )}

      {/* Members panel */}
      {showMembers && (
        <div className="neu-flat p-5 rounded-2xl space-y-4">
          <h3 className="font-semibold">Team Members</h3>
          <div className="space-y-2">
            {project.members?.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2.5">
                  <UserAvatar name={m.name} avatarUrl={m.avatar_url} size="sm" />
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  {m.id === project.owner_id && (
                    <span className="px-2 py-0.5 rounded-lg text-xs bg-primary/10 text-primary">Owner</span>
                  )}
                </div>
                {isOwner && m.id !== project.owner_id && (
                  <button
                    onClick={() => removeMemberMutation.mutate(m.id)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {isOwner && (
            <div className="pt-2 border-t border-border space-y-3">
              <p className="text-sm font-medium">Invite by Email</p>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => { setInviteEmail(e.target.value); setInviteError(""); setInviteSuccess(""); }}
                    placeholder="user@example.com"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl neu-pressed bg-transparent outline-none text-sm"
                    onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
                  />
                </div>
                <button
                  onClick={handleInvite}
                  disabled={inviteMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                >
                  <Send size={14} />
                  {inviteMutation.isPending ? "Sending..." : "Invite"}
                </button>
              </div>
              {inviteError && <p className="text-xs text-destructive">{inviteError}</p>}
              {inviteSuccess && <p className="text-xs text-green-600">{inviteSuccess}</p>}
            </div>
          )}
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KANBAN_COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div
              key={col.key}
              className={`rounded-2xl p-3 ${col.color} min-h-[300px] flex flex-col`}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(col.key)}
            >
              <div className="flex items-center justify-between px-1 mb-3">
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <span className="text-xs text-muted-foreground bg-white/60 px-2 py-0.5 rounded-lg">
                  {colTasks.length}
                </span>
              </div>

              <div className="flex-1 space-y-2.5">
                {colTasks.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground opacity-60">
                    Drop tasks here
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      className="bg-white rounded-xl p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow border border-black/5"
                    >
                      <Link href={`/tasks/${task.id}`}>
                        <h4 className="text-sm font-medium leading-snug">{task.title}</h4>
                      </Link>

                      {task.description && (
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
                      )}

                      <div className="flex items-center gap-1.5 mt-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityColors[task.priority] || ""}`}>
                          {task.priority}
                        </span>
                        {task.due_date && (
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Calendar size={9} />
                            {format(new Date(task.due_date), "MMM d")}
                          </span>
                        )}
                      </div>

                      {task.assignees?.length > 0 && (
                        <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-black/5">
                          {task.assignees.slice(0, 4).map((a) => (
                            <div key={a.id} className="group relative" title={`${a.name} (${a.email})`}>
                              <UserAvatar name={a.name} avatarUrl={a.avatar_url} size="sm" className="!w-5 !h-5 !text-[8px]" />
                            </div>
                          ))}
                          {task.assignees.length > 4 && (
                            <span className="text-[10px] text-muted-foreground ml-0.5">+{task.assignees.length - 4}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
