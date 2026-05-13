"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Project } from "@/lib/types";
import { ArrowLeft, Mail, Send, X } from "lucide-react";
import Link from "next/link";

export default function CreateProjectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [inviteInput, setInviteInput] = useState("");
  const [inviteError, setInviteError] = useState("");

  const addEmail = () => {
    const email = inviteInput.trim();
    if (!email) return;
    if (!email.includes("@")) {
      setInviteError("Invalid email address");
      return;
    }
    if (inviteEmails.includes(email)) {
      setInviteError("Email already added");
      return;
    }
    setInviteEmails([...inviteEmails, email]);
    setInviteInput("");
    setInviteError("");
  };

  const removeEmail = (email: string) => {
    setInviteEmails(inviteEmails.filter((e) => e !== email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post<Project>("/projects", {
        name,
        description,
        member_ids: [],
      });

      const projectId = res.data.id;
      for (const email of inviteEmails) {
        try {
          await api.post(`/projects/${projectId}/invite`, { email });
        } catch {
          // Continue even if some invitations fail
        }
      }

      queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.push(`/projects/${projectId}`);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to create project";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/projects" className="neu-flat p-2 rounded-xl">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-bold">Create Project</h1>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="neu-flat p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">Project Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl neu-pressed bg-transparent outline-none text-sm"
            placeholder="My Project"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 rounded-xl neu-pressed bg-transparent outline-none text-sm min-h-[80px] resize-y"
            placeholder="What is this project about?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Invite Members by Email <span className="text-muted-foreground font-normal">(optional)</span></label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={inviteInput}
                onChange={(e) => { setInviteInput(e.target.value); setInviteError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } }}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl neu-pressed bg-transparent outline-none text-sm"
                placeholder="user@example.com"
              />
            </div>
            <button
              type="button"
              onClick={addEmail}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl neu-convex text-sm font-medium"
            >
              <Send size={14} />
              Add
            </button>
          </div>
          {inviteError && <p className="text-xs text-destructive mt-1">{inviteError}</p>}
          {inviteEmails.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {inviteEmails.map((email) => (
                <span key={email} className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 text-primary text-sm">
                  {email}
                  <button type="button" onClick={() => removeEmail(email)} className="hover:text-destructive">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Project"}
        </button>
      </form>
    </div>
  );
}
