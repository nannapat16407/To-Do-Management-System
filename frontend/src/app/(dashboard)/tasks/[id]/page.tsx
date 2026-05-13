"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { useState } from "react";
import api from "@/lib/api";
import type { Task, Category, Project } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import UserAvatar from "@/components/ui/user-avatar";
import { ArrowLeft, Trash2, Save } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const id = params.id as string;

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: task, isLoading } = useQuery({
    queryKey: ["task", id],
    queryFn: async () => {
      const res = await api.get<Task>(`/tasks/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get<Category[]>("/categories")).data,
  });

  const { data: projectDetail } = useQuery({
    queryKey: ["project", String(task?.project_id)],
    queryFn: async () => (await api.get<Project>(`/projects/${task?.project_id}`)).data,
    enabled: !!task?.project_id,
  });

  const startEdit = () => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description);
    setStatus(task.status);
    setPriority(task.priority);
    setDueDate(task.due_date ? task.due_date.split("T")[0] : "");
    setCategoryId(task.category_id ? String(task.category_id) : "");
    setAssigneeIds(task.assignees?.map((a) => a.id) || []);
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    if (assigneeIds.length === 0) {
      setError("At least one assignee is required.");
      setSaving(false);
      return;
    }

    try {
      await api.put(`/tasks/${id}`, {
        title,
        description,
        status,
        priority,
        due_date: dueDate || null,
        category_id: categoryId ? parseInt(categoryId) : null,
        assignee_ids: assigneeIds,
      });
      queryClient.invalidateQueries({ queryKey: ["task", id] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      setEditing(false);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to update task";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await api.delete(`/tasks/${id}`);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      router.push("/my-tasks");
    } catch {
      setError("Failed to delete task");
    }
  };

  const toggleAssignee = (uid: number) => {
    setAssigneeIds((prev) =>
      prev.includes(uid) ? prev.filter((i) => i !== uid) : [...prev, uid]
    );
  };

  const statusColors: Record<string, string> = {
    todo: "bg-slate-100 text-slate-700",
    in_progress: "bg-blue-100 text-blue-700",
    in_review: "bg-amber-100 text-amber-700",
    done: "bg-green-100 text-green-700",
  };

  const priorityColors: Record<string, string> = {
    low: "bg-slate-100 text-slate-600",
    medium: "bg-orange-100 text-orange-700",
    high: "bg-red-100 text-red-700",
  };

  const isCreator = task?.created_by === currentUser?.id;
  const allMembers = projectDetail?.members || [];

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="neu-flat p-6 animate-pulse">
          <div className="h-6 bg-muted rounded w-48 mb-4" />
          <div className="h-4 bg-muted rounded w-32" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="neu-flat p-12 text-center">
          <p className="text-muted-foreground">Task not found</p>
          <Link href="/my-tasks" className="text-primary mt-2 inline-block">Back to Tasks</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/my-tasks" className="neu-flat p-2 rounded-xl">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-bold">Task Details</h1>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <>
              {isCreator && (
                <>
                  <button onClick={startEdit} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                    Edit
                  </button>
                  <button onClick={handleDelete} className="p-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20">
                    <Trash2 size={18} />
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl neu-convex text-sm">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                <Save size={16} /> {saving ? "Saving..." : "Save"}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      <div className="neu-flat p-6 space-y-5">
        {editing ? (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl neu-pressed bg-transparent outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl neu-pressed bg-transparent outline-none text-sm min-h-[100px] resize-y" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl neu-pressed bg-transparent outline-none text-sm">
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl neu-pressed bg-transparent outline-none text-sm">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Due Date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl neu-pressed bg-transparent outline-none text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl neu-pressed bg-transparent outline-none text-sm">
                <option value="">No Category</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {allMembers.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">Assignees <span className="text-destructive">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {allMembers.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleAssignee(m.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                        assigneeIds.includes(m.id)
                          ? "bg-primary text-primary-foreground"
                          : "neu-convex text-muted-foreground"
                      }`}
                    >
                      <UserAvatar name={m.name} avatarUrl={m.avatar_url} size="sm" className="!w-4 !h-4 !text-[8px]" />
                      <span>{m.name}{m.id === currentUser?.id ? " (you)" : ""}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div>
              <h2 className="text-xl font-bold">{task.title}</h2>
              {task.description && (
                <p className="text-muted-foreground mt-2">{task.description}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1.5 rounded-xl text-sm font-medium ${statusColors[task.status] || ""}`}>
                {task.status.replace("_", " ")}
              </span>
              <span className={`px-3 py-1.5 rounded-xl text-sm font-medium ${priorityColors[task.priority] || ""}`}>
                {task.priority}
              </span>
              {task.category && (
                <span className="px-3 py-1.5 rounded-xl text-sm font-medium bg-primary/10 text-primary">
                  {task.category.name}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Created by</span>
                <div className="flex items-center gap-2 mt-1">
                  <UserAvatar name={task.creator?.name || "Unknown"} avatarUrl={task.creator?.avatar_url} size="sm" className="!w-5 !h-5 !text-[8px]" />
                  <span className="font-medium">{task.creator?.name || "Unknown"}</span>
                </div>
              </div>
              {task.due_date && (
                <div>
                  <span className="text-muted-foreground">Due date</span>
                  <p className="font-medium">{format(new Date(task.due_date), "MMM d, yyyy")}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Created</span>
                <p className="font-medium">{format(new Date(task.created_at), "MMM d, yyyy")}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Last updated</span>
                <p className="font-medium">{format(new Date(task.updated_at), "MMM d, yyyy")}</p>
              </div>
            </div>

            {task.assignees?.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Assigned to</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {task.assignees.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl neu-convex" title={`${a.name} (${a.email})`}>
                      <UserAvatar name={a.name} avatarUrl={a.avatar_url} size="sm" className="!w-5 !h-5 !text-[8px]" />
                      <span className="text-sm">{a.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
