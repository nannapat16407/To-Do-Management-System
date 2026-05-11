export type Role = "admin" | "user";
export type TaskStatus = "pending" | "in_progress" | "completed";
export type Priority = "low" | "medium" | "high";

export interface User {
  id: number;
  name: string;
  email: string;
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

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
  category_id: number | null;
  category: Category | null;
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
  completed_tasks: number;
  pending_tasks: number;
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
  assignee_id?: number;
  due_date_from?: string;
  due_date_to?: string;
  page?: number;
  limit?: number;
}
