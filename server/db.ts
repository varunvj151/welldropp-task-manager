import bcryptjs from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: "admin" | "worker";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  assigned_by: string;
  priority: "High" | "Medium" | "Low";
  status: "Pending" | "In Progress" | "Completed";
  due_date: string;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  message: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  action: string;
  created_at: string;
}

// Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL || "https://vycdqckxxnvmxkqwxosr.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5Y2RxY2t4eG52bXhrcXd4b3NyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjA1NTk2NywiZXhwIjoyMDk3NjMxOTY3fQ.FHl5XJMOyFdVAjEDW-qy2pHcOlgHCCbxluu598IiUeg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Seed default users if table is empty
async function seedIfEmpty() {
  const { data: existing } = await supabase.from("users").select("id").limit(1);
  if (existing && existing.length > 0) return;

  console.log("Seeding default users...");
  const defaultUsers = [
    { id: "usr-admin", name: "Durgamani Admin", email: "durgamani@welldropp.com", passwordRaw: "durgamani123", role: "admin" as const, is_active: true },
    { id: "usr-varun", name: "Varun", email: "varun@welldropp.com", passwordRaw: "varun123", role: "worker" as const, is_active: true },
    { id: "usr-muneeswaran", name: "Muneeswaran", email: "muneeswaran@welldropp.com", passwordRaw: "munees123", role: "worker" as const, is_active: true },
    { id: "usr-siddharthan", name: "Siddharthan", email: "siddharthan@welldropp.com", passwordRaw: "siddharthan123", role: "worker" as const, is_active: true },
  ];

  for (const u of defaultUsers) {
    const password = bcryptjs.hashSync(u.passwordRaw, 10);
    const now = new Date().toISOString();
    await supabase.from("users").insert({
      id: u.id, name: u.name, email: u.email,
      password, role: u.role, is_active: u.is_active,
      created_at: now, updated_at: now,
    });
  }
  console.log("Seeded default users successfully.");
}

export async function initializeDbFromSupabase() {
  try {
    await seedIfEmpty();
    console.log("Supabase DB ready.");
  } catch (err) {
    console.error("Supabase init error:", err);
  }
}

// ── Users ──────────────────────────────────────────────────────────────────
export const usersColl = {
  find: async (filter?: Partial<User>) => {
    let q = supabase.from("users").select("*");
    if (filter?.role) q = q.eq("role", filter.role);
    if (filter?.is_active !== undefined) q = q.eq("is_active", filter.is_active);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as User[];
  },

  findOne: async (filter: Partial<User>) => {
    let q = supabase.from("users").select("*");
    if (filter.id) q = q.eq("id", filter.id);
    if (filter.email) q = q.eq("email", filter.email);
    if (filter.role) q = q.eq("role", filter.role);
    const { data, error } = await q.limit(1).single();
    if (error) return null;
    return data as User;
  },

  create: async (userData: { name: string; email: string; passwordRaw: string; role: "admin" | "worker"; is_active: boolean }) => {
    const password = bcryptjs.hashSync(userData.passwordRaw, 10);
    const now = new Date().toISOString();
    const id = "usr-" + Math.random().toString(36).substr(2, 9);
    const { data, error } = await supabase.from("users").insert({
      id, name: userData.name, email: userData.email,
      password, role: userData.role, is_active: userData.is_active,
      created_at: now, updated_at: now,
    }).select().single();
    if (error) throw error;
    return data as User;
  },

  update: async (id: string, updates: Partial<User> & { passwordRaw?: string }) => {
    const payload: any = { ...updates, updated_at: new Date().toISOString() };
    if (updates.passwordRaw) {
      payload.password = bcryptjs.hashSync(updates.passwordRaw, 10);
    }
    delete payload.passwordRaw;
    delete payload.id;
    const { data, error } = await supabase.from("users").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return data as User;
  },

  delete: async (id: string, soft: boolean = true) => {
    if (soft) {
      await supabase.from("users").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id);
    } else {
      await supabase.from("users").delete().eq("id", id);
    }
    return true;
  },
};

// ── Tasks ──────────────────────────────────────────────────────────────────
export const tasksColl = {
  find: async (filter?: Partial<Task>) => {
    let q = supabase.from("tasks").select("*");
    if (filter?.assigned_to) q = q.eq("assigned_to", filter.assigned_to);
    if (filter?.status) q = q.eq("status", filter.status);
    if (filter?.priority) q = q.eq("priority", filter.priority);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as Task[];
  },

  findOne: async (filter: Partial<Task>) => {
    let q = supabase.from("tasks").select("*");
    if (filter.id) q = q.eq("id", filter.id);
    const { data, error } = await q.limit(1).single();
    if (error) return null;
    return data as Task;
  },

  create: async (taskData: Omit<Task, "id" | "created_at" | "updated_at">) => {
    const now = new Date().toISOString();
    const id = "tsk-" + Math.random().toString(36).substr(2, 9);
    const { data, error } = await supabase.from("tasks").insert({
      id, ...taskData, created_at: now, updated_at: now,
    }).select().single();
    if (error) throw error;
    return data as Task;
  },

  update: async (id: string, updates: Partial<Task>) => {
    const { data, error } = await supabase.from("tasks")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id).select().single();
    if (error) throw error;
    return data as Task;
  },

  delete: async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    return true;
  },
};

// ── Comments ───────────────────────────────────────────────────────────────
export const commentsColl = {
  find: async (filter?: Partial<Comment>) => {
    let q = supabase.from("comments").select("*").order("created_at", { ascending: false });
    if (filter?.task_id) q = q.eq("task_id", filter.task_id);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as Comment[];
  },

  create: async (commentData: Omit<Comment, "id" | "created_at">) => {
    const id = "cmt-" + Math.random().toString(36).substr(2, 9);
    const { data, error } = await supabase.from("comments").insert({
      id, ...commentData, created_at: new Date().toISOString(),
    }).select().single();
    if (error) throw error;
    return data as Comment;
  },
};

// ── Activity Logs ──────────────────────────────────────────────────────────
export const logsColl = {
  find: async (filter?: Partial<ActivityLog>) => {
    let q = supabase.from("activity_logs").select("*").order("created_at", { ascending: false });
    if (filter?.task_id) q = q.eq("task_id", filter.task_id);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as ActivityLog[];
  },

  create: async (logData: Omit<ActivityLog, "id" | "created_at">) => {
    const id = "log-" + Math.random().toString(36).substr(2, 9);
    const { data, error } = await supabase.from("activity_logs").insert({
      id, ...logData, created_at: new Date().toISOString(),
    }).select().single();
    if (error) throw error;
    return data as ActivityLog;
  },
};
