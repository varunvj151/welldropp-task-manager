import express from "express";
import cors from "cors";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import { usersColl, tasksColl, commentsColl, logsColl, initializeDbFromSupabase } from "../server/db.js";
import { authenticateJWT, authorizeAdmin, AuthenticatedRequest } from "../server/authMiddleware.js";


// Map snake_case DB fields → camelCase for frontend compatibility
function toUser(u: any) {
  if (!u) return u;
  const { is_active, created_at, updated_at, password, ...rest } = u;
  return { ...rest, isActive: is_active, createdAt: created_at, updatedAt: updated_at };
}
function toTask(t: any) {
  if (!t) return t;
  const { assigned_to, assigned_by, due_date, created_at, updated_at, ...rest } = t;
  return { ...rest, assignedTo: assigned_to, assignedBy: assigned_by, dueDate: due_date, createdAt: created_at, updatedAt: updated_at };
}
function toComment(c: any) {
  if (!c) return c;
  const { task_id, user_id, user_name, created_at, ...rest } = c;
  return { ...rest, taskId: task_id, userId: user_id, userName: user_name, createdAt: created_at };
}
function toLog(l: any) {
  if (!l) return l;
  const { task_id, user_id, user_name, created_at, ...rest } = l;
  return { ...rest, taskId: task_id, userId: user_id, userName: user_name, createdAt: created_at };
}

const JWT_SECRET = process.env.JWT_SECRET || "welldropp_task_manager_secret_key_123";
const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false, frameguard: false, crossOriginResourcePolicy: { policy: "cross-origin" }, crossOriginEmbedderPolicy: false }));

// Init DB on first request
let dbReady = false;
app.use(async (_req, _res, next) => {
  if (!dbReady) { await initializeDbFromSupabase(); dbReady = true; }
  next();
});

// ── AUTH ────────────────────────────────────────────────────────────────────

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
    const user = await usersColl.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });
    if (!user.is_active) return res.status(403).json({ error: "Your account has been disabled." });
    const match = bcryptjs.compareSync(password, user.password || "");
    if (!match) return res.status(401).json({ error: "Invalid email or password" });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    return res.json({ token, user: toUser(user) });
  } catch (err: any) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error during login" });
  }
});

app.get("/api/profile", authenticateJWT, (req: AuthenticatedRequest, res) => {
  res.json(toUser(req.user));
});

app.post("/api/change-password", authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) return res.status(400).json({ error: "All password fields are required" });
    if (newPassword.length < 8) return res.status(400).json({ error: "New password must be at least 8 characters" });
    if (newPassword !== confirmPassword) return res.status(400).json({ error: "Passwords do not match" });
    const user = req.user!;
    if (!bcryptjs.compareSync(currentPassword, user.password || "")) return res.status(400).json({ error: "Current password is incorrect" });
    await usersColl.update(user.id, { passwordRaw: newPassword } as any);
    await logsColl.create({ task_id: "", user_id: user.id, user_name: user.name, action: "Changed their account password" });
    return res.json({ message: "Password updated successfully!" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── WORKERS ─────────────────────────────────────────────────────────────────

app.get("/api/workers", authenticateJWT, authorizeAdmin, async (req, res) => {
  try {
    const search = ((req.query.search as string) || "").trim().toLowerCase();
    let workers = await usersColl.find({ role: "worker" });
    if (search) workers = workers.filter(w => w.name.toLowerCase().includes(search) || w.email.toLowerCase().includes(search));
    workers.sort((a, b) => a.name.localeCompare(b.name));
    res.json(workers.map(toUser));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post("/api/workers", authenticateJWT, authorizeAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    if (!name || !email || !password || !confirmPassword) return res.status(400).json({ error: "All fields are required" });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
    if (password !== confirmPassword) return res.status(400).json({ error: "Passwords do not match" });
    const emailNorm = email.toLowerCase().trim();
    const existing = await usersColl.findOne({ email: emailNorm });
    if (existing) return res.status(400).json({ error: "Email already in use" });
    const newWorker = await usersColl.create({ name: name.trim(), email: emailNorm, passwordRaw: password, role: "worker", is_active: true });
    await logsColl.create({ task_id: "", user_id: req.user!.id, user_name: req.user!.name, action: `Created worker account for ${newWorker.name}` });
    res.status(201).json(toUser(newWorker));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.put("/api/workers/:id", authenticateJWT, authorizeAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { name, email, isActive, is_active, password } = req.body;
    const activeVal = isActive !== undefined ? isActive : is_active;
    const worker = await usersColl.findOne({ id });
    if (!worker || worker.role !== "worker") return res.status(404).json({ error: "Worker not found" });
    const updates: any = {};
    if (name !== undefined) updates.name = name.trim();
    if (email !== undefined) {
      const emailNorm = email.toLowerCase().trim();
      if (emailNorm !== worker.email) {
        const existing = await usersColl.findOne({ email: emailNorm });
        if (existing) return res.status(400).json({ error: "Email already in use" });
        updates.email = emailNorm;
      }
    }
    if (activeVal !== undefined) updates.is_active = activeVal;
    if (password) {
      if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
      updates.passwordRaw = password;
    }
    const updated = await usersColl.update(id, updates);
    await logsColl.create({ task_id: "", user_id: req.user!.id, user_name: req.user!.name, action: `Updated worker ${updated.name}` });
    res.json(toUser(updated));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/workers/:id", authenticateJWT, authorizeAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const worker = await usersColl.findOne({ id });
    if (!worker || worker.role !== "worker") return res.status(404).json({ error: "Worker not found" });
    await usersColl.delete(id, true);
    await logsColl.create({ task_id: "", user_id: req.user!.id, user_name: req.user!.name, action: `Deactivated worker ${worker.name}` });
    res.json({ message: "Worker deleted successfully" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── TASKS ────────────────────────────────────────────────────────────────────

app.get("/api/tasks", authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const currentUser = req.user!;
    let tasks = await tasksColl.find();
    if (currentUser.role === "worker") tasks = tasks.filter(t => t.assigned_to === currentUser.id);

    const search = ((req.query.search as string) || "").trim().toLowerCase();
    const priority = req.query.priority as string;
    const status = req.query.status as string;
    const assignedTo = req.query.assignedTo as string;
    const timeFilter = req.query.timeFilter as string;
    const todayStr = new Date().toISOString().split("T")[0];

    if (search) {
      const allUsers = await usersColl.find();
      tasks = tasks.filter(t => {
        const u = allUsers.find(u => u.id === t.assigned_to);
        return t.title.toLowerCase().includes(search) || t.description?.toLowerCase().includes(search) ||
          (u && (u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search)));
      });
    }
    if (priority) tasks = tasks.filter(t => t.priority === priority);
    if (status) tasks = tasks.filter(t => t.status === status);
    if (assignedTo && currentUser.role === "admin") tasks = tasks.filter(t => t.assigned_to === assignedTo);
    if (timeFilter === "today") tasks = tasks.filter(t => t.due_date?.startsWith(todayStr));
    if (timeFilter === "overdue") tasks = tasks.filter(t => t.status !== "Completed" && t.due_date && t.due_date < todayStr);

    const sortBy = (req.query.sortBy as string) || "due_date";
    tasks.sort((a, b) => {
      if (sortBy === "priority") { const s: any = { High: 3, Medium: 2, Low: 1 }; return s[b.priority] - s[a.priority]; }
      if (sortBy === "createdAt") return b.created_at.localeCompare(a.created_at);
      if (!a.due_date) return 1; if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    });

    const allUsers = await usersColl.find();
    const populated = tasks.map(t => {
      const assignedUser = allUsers.find(u => u.id === t.assigned_to);
      const creator = allUsers.find(u => u.id === t.assigned_by);
      return { ...toTask(t),
        assignedToUser: assignedUser ? { id: assignedUser.id, name: assignedUser.name, email: assignedUser.email } : null,
        createdByUser: creator ? { id: creator.id, name: creator.name } : null,
      };
    });
    res.json(populated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get("/api/tasks/:id", authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;
    const task = await tasksColl.findOne({ id });
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (currentUser.role === "worker" && task.assigned_to !== currentUser.id) return res.status(403).json({ error: "Unauthorized" });
    const allUsers = await usersColl.find();
    const assignedUser = allUsers.find(u => u.id === task.assigned_to);
    const creator = allUsers.find(u => u.id === task.assigned_by);
    const comments = await commentsColl.find({ task_id: id });
    const historyLogs = await logsColl.find({ task_id: id });
    res.json({ ...toTask(task),
      assignedToUser: assignedUser ? { id: assignedUser.id, name: assignedUser.name, email: assignedUser.email } : null,
      createdByUser: creator ? { id: creator.id, name: creator.name } : null,
      comments: comments.map(toComment), historyLogs: historyLogs.map(toLog),
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post("/api/tasks", authenticateJWT, authorizeAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { title, description, assignedTo, priority, dueDate } = req.body;
    if (!title || !assignedTo || !priority || !dueDate) return res.status(400).json({ error: "Title, Assigned Worker, Priority and Due Date are required" });
    const worker = await usersColl.findOne({ id: assignedTo });
    if (!worker || worker.role !== "worker") return res.status(400).json({ error: "Invalid worker" });
    const newTask = await tasksColl.create({ title: title.trim(), description: (description || "").trim(), assigned_to: assignedTo, assigned_by: req.user!.id, priority, status: "Pending" as const, due_date: dueDate });
    await logsColl.create({ task_id: newTask.id, user_id: req.user!.id, user_name: req.user!.name, action: "Admin created and assigned task to " + worker.name });
    res.status(201).json(toTask(newTask));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.put("/api/tasks/:id", authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;
    const task = await tasksColl.findOne({ id });
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (currentUser.role === "worker" && task.assigned_to !== currentUser.id) return res.status(403).json({ error: "Access denied" });
    const updates: any = {};
    const logActions: string[] = [];
    if (currentUser.role === "admin") {
      const { title, description, assignedTo, priority, status, dueDate } = req.body;
      if (title !== undefined && title.trim() !== task.title) { updates.title = title.trim(); logActions.push("Admin updated title"); }
      if (description !== undefined && description.trim() !== task.description) { updates.description = description.trim(); logActions.push("Admin updated description"); }
      if (assignedTo !== undefined && assignedTo !== task.assigned_to) {
        const worker = await usersColl.findOne({ id: assignedTo });
        if (!worker) return res.status(400).json({ error: "Invalid worker" });
        updates.assigned_to = assignedTo; logActions.push(`Admin reassigned to ${worker.name}`);
      }
      if (priority !== undefined && priority !== task.priority) { updates.priority = priority; logActions.push(`Admin updated priority to ${priority}`); }
      if (status !== undefined && status !== task.status) { updates.status = status; logActions.push(`Admin changed status to ${status}`); }
      if (dueDate !== undefined && dueDate !== task.due_date) { updates.due_date = dueDate; logActions.push("Admin updated due date"); }
    } else {
      const { status } = req.body;
      if (status !== undefined && status !== task.status) { updates.status = status; logActions.push(`${currentUser.name} changed status to ${status}`); }
    }
    if (Object.keys(updates).length > 0) {
      const updated = await tasksColl.update(id, updates);
      for (const action of logActions) await logsColl.create({ task_id: id, user_id: currentUser.id, user_name: currentUser.name, action });
      return res.json(toTask(updated));
    }
    return res.json(toTask(task));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/tasks/:id", authenticateJWT, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const task = await tasksColl.findOne({ id });
    if (!task) return res.status(404).json({ error: "Task not found" });
    await tasksColl.delete(id);
    res.json({ message: "Task deleted successfully" });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── COMMENTS ─────────────────────────────────────────────────────────────────

app.post("/api/comments", authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const { taskId, message } = req.body;
    if (!taskId || !message?.trim()) return res.status(400).json({ error: "Task ID and message are required" });
    const task = await tasksColl.findOne({ id: taskId });
    if (!task) return res.status(404).json({ error: "Task not found" });
    const currentUser = req.user!;
    if (currentUser.role === "worker" && task.assigned_to !== currentUser.id) return res.status(403).json({ error: "Access denied" });
    const comment = await commentsColl.create({ task_id: taskId, user_id: currentUser.id, user_name: currentUser.name, message: message.trim() });
    await logsColl.create({ task_id: taskId, user_id: currentUser.id, user_name: currentUser.name, action: `${currentUser.name} added a comment` });
    res.status(201).json(toComment(comment));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get("/api/comments/:taskId", authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const { taskId } = req.params;
    const task = await tasksColl.findOne({ id: taskId });
    if (!task) return res.status(404).json({ error: "Task not found" });
    const currentUser = req.user!;
    if (currentUser.role === "worker" && task.assigned_to !== currentUser.id) return res.status(403).json({ error: "Access denied" });
    res.json((await commentsColl.find({ task_id: taskId })).map(toComment));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ── REPORTS ───────────────────────────────────────────────────────────────────

app.get("/api/reports", authenticateJWT, authorizeAdmin, async (_req, res) => {
  try {
    const workers = await usersColl.find({ role: "worker" });
    const allTasks = await tasksColl.find();
    const tasksPerWorker = workers.map(w => {
      const wt = allTasks.filter(t => t.assigned_to === w.id);
      const completed = wt.filter(t => t.status === "Completed").length;
      const total = wt.length;
      return { id: w.id, name: w.name, email: w.email, isActive: w.is_active, totalTasks: total, completed,
        pending: wt.filter(t => t.status === "Pending").length,
        inProgress: wt.filter(t => t.status === "In Progress").length,
        completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
    });
    const totalCompleted = allTasks.filter(t => t.status === "Completed").length;
    let mostProductiveWorker = "None"; let maxCompleted = 0;
    tasksPerWorker.forEach(w => { if (w.completed > maxCompleted) { maxCompleted = w.completed; mostProductiveWorker = w.name; } });
    res.json({ totalTasksCount: allTasks.length, totalCompletedCount: totalCompleted,
      completionPercentage: allTasks.length > 0 ? Math.round((totalCompleted / allTasks.length) * 100) : 0,
      mostProductiveWorker, highPriorityPendingCount: allTasks.filter(t => t.priority === "High" && t.status !== "Completed").length,
      tasksPerWorker });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default app;
