"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Project, Category } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import UserAvatar from "@/components/ui/user-avatar";
import { X, Plus, Link as LinkIcon } from "lucide-react";
import Link from "next/link";

interface TaskCreateFormProps {
  defaultProjectId?: string;
  lockProject?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function TaskCreateForm({
  defaultProjectId,
  lockProject = false,
  onSuccess,
  onCancel,
}: TaskCreateFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("todo");
  const [priority, setPriority] = useState("medium");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId || "");
  const [categoryId, setCategoryId] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);
  const [error, setError] = useState("");

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await api.get<Project[]>("/projects")).data,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get<Category[]>("/categories")).data,
  });

  const { data: projectDetail } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => (await api.get<Project>(`/projects/${projectId}`)).data,
    enabled: !!projectId,
  });

  // Default to current user as assignee when project loads or changes
  useEffect(() => {
    if (user && projectId && projectDetail?.members) {
      const isMember = projectDetail.members.some((m) => m.id === user.id);
      if (isMember) {
        setAssigneeIds([user.id]);
      } else {
        setAssigneeIds([]);
      }
    }
  }, [projectId, projectDetail, user]);

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      onSuccess?.();
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to create task";
      setError(message);
    },
  });

  const allMembers = projectDetail?.members || [];

  const toggleAssignee = (id: number) => {
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) { setError("Title is required"); return; }
    if (!description.trim()) { setError("Description is required"); return; }
    if (!projectId) { setError("Please select a project"); return; }
    if (assigneeIds.length === 0) { setError("At least one assignee is required."); return; }

    createMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      start_date: startDate,
      due_date: dueDate || null,
      project_id: parseInt(projectId),
      category_id: categoryId ? parseInt(categoryId) : null,
      assignee_ids: assigneeIds,
    });
  };

  const hasProjects = projects && projects.length > 0;

  return (
    <div className="neu-flat p-6 rounded-2xl space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Add Task</h3>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-secondary">
          <X size={18} />
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      {!hasProjects ? (
        <div className="p-6 text-center rounded-xl bg-secondary">
          <p className="text-muted-foreground mb-3">You need to create a project first before creating tasks.</p>
          <Link
            href="/projects/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90"
          >
            <Plus size={16} />
            Create Project
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Title <span className="text-destructive">*</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl neu-pressed bg-transparent outline-none text-sm"
              placeholder="Task title"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description <span className="text-destructive">*</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl neu-pressed bg-transparent outline-none text-sm min-h-[80px] resize-y"
              placeholder="Describe the task..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-3 rounded-xl neu-pressed bg-transparent outline-none text-sm"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-3 rounded-xl neu-pressed bg-transparent outline-none text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl neu-pressed bg-transparent outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl neu-pressed bg-transparent outline-none text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Project <span className="text-destructive">*</span>
                {lockProject && (
                  <LinkIcon size={12} className="inline ml-1 text-muted-foreground" />
                )}
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={lockProject}
                className="w-full px-4 py-3 rounded-xl neu-pressed bg-transparent outline-none text-sm disabled:opacity-60"
              >
                <option value="">Select project</option>
                {projects?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl neu-pressed bg-transparent outline-none text-sm"
              >
                <option value="">No Category</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {projectId && allMembers.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Assignees <span className="text-destructive">*</span></label>
              <div className="flex flex-wrap gap-2">
                {allMembers.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => toggleAssignee(m.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                      assigneeIds.includes(m.id)
                        ? "bg-primary text-primary-foreground"
                        : "neu-convex text-muted-foreground"
                    }`}
                  >
                    <UserAvatar name={m.name} avatarUrl={m.avatar_url} size="sm" className="!w-4 !h-4 !text-[8px]" />
                    <span>{m.name}{m.id === user?.id ? " (you)" : ""}</span>
                    {m.id !== user?.id && <span className="text-[10px] opacity-70">{m.email}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {projectId && allMembers.length === 0 && (
            <p className="text-sm text-muted-foreground">No members in this project</p>
          )}

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {createMutation.isPending ? "Adding..." : "Add Task"}
          </button>
        </form>
      )}
    </div>
  );
}
