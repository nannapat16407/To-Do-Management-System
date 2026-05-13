"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import api from "@/lib/api";
import type { Task, PaginatedResponse, Project, Category } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import UserAvatar from "@/components/ui/user-avatar";
import TaskCreateForm from "@/components/task-create-form";
import {
  Search,
  Calendar,
  Clock,
  FolderKanban,
  Filter,
  Plus,
} from "lucide-react";
import { format } from "date-fns";

const statusBadge: Record<string, { bg: string; text: string }> = {
  todo: { bg: "bg-slate-100", text: "text-slate-700" },
  in_progress: { bg: "bg-blue-50", text: "text-blue-700" },
  in_review: { bg: "bg-amber-50", text: "text-amber-700" },
  done: { bg: "bg-green-50", text: "text-green-700" },
};

const priorityBadge: Record<string, { bg: string; text: string }> = {
  low: { bg: "bg-slate-100", text: "text-slate-600" },
  medium: { bg: "bg-orange-50", text: "text-orange-700" },
  high: { bg: "bg-red-50", text: "text-red-700" },
};

function isOverdue(task: Task): boolean {
  if (!task.due_date || task.status === "done") return false;
  return new Date(task.due_date) < new Date();
}

function getCardStyle(task: Task): string {
  if (isOverdue(task)) {
    return "rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:shadow-md bg-white border border-red-100";
  }
  if (task.status === "done") {
    return "rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:shadow-md bg-white border border-green-100";
  }
  return "neu-flat p-5 cursor-pointer neu-hover";
}

function getCardBg(task: Task): React.CSSProperties {
  if (isOverdue(task)) {
    return { background: "linear-gradient(to right, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.02) 40%, white 100%)" };
  }
  if (task.status === "done") {
    return { background: "linear-gradient(to right, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.02) 40%, white 100%)" };
  }
  return {};
}

export default function MyTasksPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Filters
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["my-tasks", search, projectId, status, priority, categoryId, overdueOnly, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("assignee_id", String(user?.id));
      if (search) params.set("search", search);
      if (projectId) params.set("project_id", projectId);
      if (status) params.set("status", status);
      if (priority) params.set("priority", priority);
      if (categoryId) params.set("category_id", categoryId);
      if (overdueOnly) {
        params.set("due_date_to", new Date().toISOString().split("T")[0]);
      }
      params.set("page", String(page));
      params.set("limit", "10");
      const res = await api.get<PaginatedResponse<Task>>(`/tasks?${params}`);
      return res.data;
    },
    enabled: !!user,
  });

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await api.get<Project[]>("/projects")).data,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get<Category[]>("/categories")).data,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Tasks</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity shadow-md"
        >
          <Plus size={18} />
          Add Task
        </button>
      </div>

      {/* Shared task creation form */}
      {showCreate && (
        <TaskCreateForm
          onSuccess={() => setShowCreate(false)}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Search & filters */}
      <div className="neu-flat p-4 rounded-2xl">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl neu-pressed bg-transparent outline-none text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl neu-convex text-sm font-medium"
          >
            <Filter size={16} />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
            <select
              value={projectId}
              onChange={(e) => { setProjectId(e.target.value); setPage(1); }}
              className="px-3 py-2.5 rounded-xl neu-pressed bg-transparent outline-none text-sm"
            >
              <option value="">All Projects</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="px-3 py-2.5 rounded-xl neu-pressed bg-transparent outline-none text-sm"
            >
              <option value="">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="done">Done</option>
            </select>
            <select
              value={priority}
              onChange={(e) => { setPriority(e.target.value); setPage(1); }}
              className="px-3 py-2.5 rounded-xl neu-pressed bg-transparent outline-none text-sm"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <select
              value={categoryId}
              onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
              className="px-3 py-2.5 rounded-xl neu-pressed bg-transparent outline-none text-sm"
            >
              <option value="">All Categories</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              onClick={() => { setOverdueOnly(!overdueOnly); setPage(1); }}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                overdueOnly
                  ? "bg-red-500 text-white"
                  : "neu-convex text-muted-foreground"
              }`}
            >
              Overdue Only
            </button>
          </div>
        )}
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="space-y-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="neu-flat p-5 rounded-2xl animate-pulse">
              <div className="h-4 bg-muted rounded w-48 mb-3" />
              <div className="h-3 bg-muted rounded w-32" />
            </div>
          ))}
        </div>
      ) : !data?.data?.length ? (
        <div className="neu-flat p-12 text-center rounded-2xl">
          <p className="text-muted-foreground">No tasks assigned to you.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {data.data.map((task) => (
            <Link key={task.id} href={`/tasks/${task.id}`}>
              <div className={getCardStyle(task)} style={getCardBg(task)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold truncate text-base ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>{task.title}</h3>
                    {task.description && (
                      <p className="text-sm mt-1 line-clamp-1 text-muted-foreground">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${(statusBadge[task.status]?.bg || "") + " " + (statusBadge[task.status]?.text || "")}`}>
                        {task.status.replace("_", " ")}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${(priorityBadge[task.priority]?.bg || "") + " " + (priorityBadge[task.priority]?.text || "")}`}>
                        {task.priority}
                      </span>
                      {task.category && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-primary/10 text-primary">
                          {task.category.name}
                        </span>
                      )}
                      {task.project && (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary/10 text-primary">
                          <FolderKanban size={10} />
                          {task.project.name}
                        </span>
                      )}
                    </div>

                    {task.due_date && (
                      <div className={`flex items-center gap-1.5 mt-2.5 text-xs ${isOverdue(task) ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                        {isOverdue(task) ? <Clock size={12} /> : <Calendar size={12} />}
                        <span>Due: {format(new Date(task.due_date), "MMM d, yyyy")}</span>
                        {isOverdue(task) && <span className="ml-1">(Overdue)</span>}
                      </div>
                    )}

                    {task.assignees?.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border">
                        <span className="text-xs text-muted-foreground">Team:</span>
                        {task.assignees.slice(0, 5).map((a) => (
                          <div key={a.id} className="group relative" title={`${a.name} (${a.email})`}>
                            <UserAvatar
                              name={a.name}
                              avatarUrl={a.avatar_url}
                              size="sm"
                              className="!w-6 !h-6 !text-[10px]"
                            />
                          </div>
                        ))}
                        {task.assignees.length > 5 && (
                          <span className="text-xs text-muted-foreground">
                            +{task.assignees.length - 5}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {task.creator && (
                    <div className="flex flex-col items-center gap-1 shrink-0" title={task.creator.name}>
                      <UserAvatar name={task.creator.name} avatarUrl={task.creator.avatar_url} size="md" />
                      <span className="text-[10px] max-w-[60px] truncate text-muted-foreground">
                        {task.creator.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-5 py-2 rounded-xl neu-convex text-sm font-medium disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {data.page} of {data.total_pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
            disabled={page >= data.total_pages}
            className="px-5 py-2 rounded-xl neu-convex text-sm font-medium disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
