export type Role = "admin" | "user";
export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";
export type Priority = "low" | "medium" | "high";
export type NotificationType = "deadline" | "overdue" | "assigned" | "invitation";
export type InvitationStatus = "pending" | "accepted" | "declined";
export type ProjectStatus = "active" | "archived";

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url: string;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  status: ProjectStatus;
  owner_id: number;
  owner: User;
  members: User[];
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  start_date: string | null;
  due_date: string | null;
  category_id: number | null;
  project_id: number | null;
  category: Category | null;
  project: Project | null;
  created_by: number;
  creator: User;
  assignees: User[];
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface DashboardSummary {
  total_tasks: number;
  todo_tasks: number;
  in_progress_tasks: number;
  done_tasks: number;
  overdue_tasks: number;
  by_category: CategoryCount[];
  by_priority: PriorityCount[];
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface PriorityCount {
  priority: string;
  count: number;
}

export interface TaskFilter {
  search?: string;
  status?: string;
  priority?: string;
  category_id?: number;
  project_id?: number;
  assignee_id?: number;
  due_date_from?: string;
  due_date_to?: string;
  page?: number;
  limit?: number;
}

export interface Notification {
  id: number;
  user_id: number;
  task_id: number | null;
  task: Task | null;
  project_id: number | null;
  project: Project | null;
  message: string;
  type: NotificationType;
  invitation_status: InvitationStatus;
  is_read: boolean;
  created_at: string;
}
