"use client";

import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Category } from "@/lib/types";
import { Plus, Pencil, Trash2, X } from "lucide-react";

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get<Category[]>("/categories")).data,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post("/categories", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setNewName("");
    },
    onError: () => setError("Failed to create category"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      api.put(`/categories/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setEditId(null);
    },
    onError: () => setError("Failed to update category"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
    onError: () => setError("Failed to delete category"),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Categories</h1>

      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError("")}><X size={14} /></button>
        </div>
      )}

      {/* Create category */}
      <div className="neu-flat p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newName.trim()) createMutation.mutate(newName.trim());
          }}
          className="flex gap-3"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category name..."
            className="flex-1 px-4 py-2.5 rounded-xl neu-pressed bg-transparent outline-none text-sm"
          />
          <button
            type="submit"
            disabled={!newName.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            <Plus size={16} />
            Add
          </button>
        </form>
      </div>

      {/* Category list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="neu-flat p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-32" />
            </div>
          ))}
        </div>
      ) : !categories?.length ? (
        <div className="neu-flat p-12 text-center">
          <p className="text-muted-foreground">No categories yet. Create one above!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.id} className="neu-flat p-4 flex items-center justify-between">
              {editId === cat.id ? (
                <form
                  className="flex-1 flex gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (editName.trim()) updateMutation.mutate({ id: cat.id, name: editName.trim() });
                  }}
                >
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl neu-pressed bg-transparent outline-none text-sm"
                    autoFocus
                  />
                  <button type="submit" className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm">
                    Save
                  </button>
                  <button type="button" onClick={() => setEditId(null)} className="px-3 py-2 rounded-xl neu-convex text-sm">
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <span className="font-medium">{cat.name}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditId(cat.id); setEditName(cat.name); }}
                      className="p-2 rounded-xl hover:bg-secondary transition-colors"
                    >
                      <Pencil size={16} className="text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete this category?")) deleteMutation.mutate(cat.id);
                      }}
                      className="p-2 rounded-xl hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 size={16} className="text-destructive" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
