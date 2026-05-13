"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import api from "@/lib/api";
import type { Project } from "@/lib/types";
import UserAvatar from "@/components/ui/user-avatar";
import { Plus, Users, Archive } from "lucide-react";
import { format } from "date-fns";

export default function ProjectsPage() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.get<Project[]>("/projects");
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Link
          href="/projects/create"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity shadow-md"
        >
          <Plus size={18} />
          Create Project
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="neu-flat p-6 rounded-2xl animate-pulse">
              <div className="h-5 bg-muted rounded w-32 mb-3" />
              <div className="h-3 bg-muted rounded w-48 mb-4" />
              <div className="h-6 bg-muted rounded w-20" />
            </div>
          ))}
        </div>
      ) : !projects?.length ? (
        <div className="neu-flat p-12 text-center rounded-2xl">
          <p className="text-muted-foreground">No projects yet. Create your first project!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <div className="neu-flat p-6 rounded-2xl neu-hover cursor-pointer h-full flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-base truncate">{project.name}</h3>
                  {project.status === "archived" && (
                    <span className="shrink-0 px-2 py-0.5 rounded-lg text-xs bg-secondary text-muted-foreground flex items-center gap-1">
                      <Archive size={10} /> Archived
                    </span>
                  )}
                </div>

                {project.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{project.description}</p>
                )}

                <div className="flex items-center gap-2 mt-4">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary/10 text-primary">
                    <Users size={12} />
                    {project.members?.length || 1} member{(project.members?.length || 1) !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="mt-auto pt-4 flex items-center justify-between border-t border-border">
                  <div className="flex items-center gap-1.5">
                    <UserAvatar name={project.owner?.name || ""} avatarUrl={project.owner?.avatar_url} size="sm" className="!w-5 !h-5 !text-[9px]" />
                    <span className="text-xs text-muted-foreground">{project.owner?.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(project.created_at), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
