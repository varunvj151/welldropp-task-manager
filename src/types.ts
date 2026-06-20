export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "worker";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // User ID
  assignedBy: string; // User ID
  priority: "High" | "Medium" | "Low";
  status: "Pending" | "In Progress" | "Completed";
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  action: string;
  createdAt: string;
}
