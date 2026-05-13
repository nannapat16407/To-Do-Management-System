"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { DashboardSummary, Project } from "@/lib/types";
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  ListChecks,
  Loader,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function DashboardPage() {
  const [projectId, setProjectId] = useState("");

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await api.get<Project[]>("/projects")).data,
  });

  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard", projectId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId) params.set("project_id", projectId);
      const res = await api.get<DashboardSummary>(`/dashboard/summary?${params}`);
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="neu-flat p-6 animate-pulse rounded-2xl">
              <div className="h-4 bg-muted rounded w-20 mb-3" />
              <div className="h-8 bg-muted rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: "Total Tasks",
      value: summary?.total_tasks || 0,
      icon: ListChecks,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "To Do",
      value: summary?.todo_tasks || 0,
      icon: Clock,
      color: "text-slate-600",
      bg: "bg-slate-50",
    },
    {
      label: "In Progress",
      value: summary?.in_progress_tasks || 0,
      icon: Loader,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Done",
      value: summary?.done_tasks || 0,
      icon: CheckSquare,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Overdue",
      value: summary?.overdue_tasks || 0,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  const categoryData = (summary?.by_category || []).map((c) => ({
    name: c.category,
    value: c.count,
  }));

  const priorityData = (summary?.by_priority || []).map((p) => ({
    name: p.priority.charAt(0).toUpperCase() + p.priority.slice(1),
    count: p.count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="px-3 py-2.5 rounded-xl neu-pressed bg-transparent outline-none text-sm"
        >
          <option value="">All Projects</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {stats.map((stat) => (
          <div key={stat.label} className="neu-flat p-6 rounded-2xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                <stat.icon size={22} className={stat.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Priority chart */}
        <div className="neu-flat p-6 rounded-2xl">
          <h3 className="text-lg font-semibold mb-4">Tasks by Priority</h3>
          {priorityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.005 260)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "4px 4px 10px oklch(0.88 0.005 260), -4px -4px 10px white",
                  }}
                />
                <Bar dataKey="count" fill="oklch(0.55 0.18 260)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground">
              No data yet
            </div>
          )}
        </div>

        {/* Category chart */}
        <div className="neu-flat p-6 rounded-2xl">
          <h3 className="text-lg font-semibold mb-4">Tasks by Category</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground">
              No data yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
