import express from "express";
import cors from "cors";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";

import {
  usersColl,
  tasksColl,
  commentsColl,
  logsColl,
  initializeDbFromFirebase,
} from "../server/db";
import {
  authenticateJWT,
  authorizeAdmin,
  AuthenticatedRequest,
} from "../server/authMiddleware";

const JWT_SECRET = process.env.JWT_SECRET || "welldropp_task_manager_secret_key_123";

const app = express();

app.use(express.json());
app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: false,
    frameguard: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);

// Initialize DB once per cold start — Vercel reuses module state on warm invocations
let dbInitialized = false;
async function ensureDb() {
  if (!dbInitialized) {
    await initializeDbFromFirebase();
    dbInitialized = true;
  }
}

app.use(async (req, res, next) => {
  try {
    await ensureDb();
    next();
  } catch (err) {
    console.error("DB init error:", err);
    next();
  }
});

// Auth: Login
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required" });

  const user = usersColl.findOne({ email: email.toLowerCase().trim() });
  if (!user) return res.status(401).json({ error: "Invalid email or password" });
  if (!user.isActive)
    return res.status(403).json({ error: "Your account has been disabled." });

  const passwordMatch = bcryptjs.compareSync(password, user.password || "");
  if (!passwordMatch)
    return res.status(401).json({ error: "Invalid email or password" });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  const sanitizedUser = { ...user };
  delete (sanitizedUser as any).password;
  return res.json({ token, user: sanitizedUser });
});

// Auth: Get Profile
app.get("/api/profile", authenticateJWT, (req: AuthenticatedRequest, res) => {
  const sanitizedUser = { ...req.user };
  delete (sanitizedUser as any).password;
  res.json(sanitizedUser);
});

// Auth: Change password
app.post("/api/change-password", authenticateJWT, (req: AuthenticatedRequest, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  if (!currentPassword || !newPassword || !confirmPassword)
    return res.status(400).json({ error: "All password fields are required" });
  if (newPassword.length < 8)
    return res.status(400).json({ error: "New password must be at least 8 characters long" });
  if (newPassword !== confirmPassword)
    return res.status(400).json({ error: "Passwords do not match" });

  const user = req.user!;
  const isCurrentValid = bcryptjs.compareSync(currentPassword, user.password || "");
  if (!isCurrentValid)
    return res.status(400).json({ error: "Current password is incorrect" });

  usersColl.update(user.id, { passwordRaw: newPassword });
  logsColl.create({ taskId: "", userId: user.id, userName: user.name, action: "Changed their account password" });
  return res.json({ message: "Password updated successfully!" });
});

// Workers
app.get("/api/workers", authenticateJWT, authorizeAdmin, (req, res) => {
  const search = ((req.query.search as string) || "").trim().toLowerCase();
  let workers = usersColl.find({ role: "worker" });
  if (search)
    workers = workers.filter(
      (w) => w.name.toLowerCase().includes(search) || w.email.toLowerCase().includes(search)
    );
  workers.sort((a, b) => a.name.localeCompare(b.name));
  res.json(workers);
});

app.post("/api/workers", authenticateJWT, authorizeAdmin, (req: AuthenticatedRequest, res) => {
  const { name, email, password, confirmPassword } = req.body;
  if (!name || !email || !password || !confirmPassword)
    return res.status(400).json({ error: "All fields are required" });
  if (password.length < 8)
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  if (password !== confirmPassword)
    return res.status(400).json({ error: "Passwords do not match" });

  const emailNormalized = email.toLowerCase().trim();
  if (usersColl.findOne({ email: emailNormalized }))
    return res.status(400).json({ error: "Email already in use" });

  const newWorker = usersColl.create({ name: name.trim(), email: emailNormalized, role: "worker", isActive: true, passwordRaw: password });
  const sanitized = { ...newWorker };
  delete (sanitized as any).password;
  logsColl.create({ taskId: "", userId: req.user!.id, userName: req.user!.name, action: `Created worker account for ${sanitized.name}` });
  res.status(201).json(sanitized);
});

app.put("/api/workers/:id", authenticateJWT, authorizeAdmin, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { name, email, isActive, password } = req.body;
  const worker = usersColl.findOne({ id, role: "worker" });
  if (!worker) return res.status(404).json({ error: "Worker not found" });

  const updates: any = {};
  if (name !== undefined) updates.name = name.trim();
  if (email !== undefined) {
    const emailNormalized = email.toLowerCase().trim();
    if (emailNormalized !== worker.email) {
      if (usersColl.findOne({ email: emailNormalized }))
        return res.status(400).json({ error: "Email already in use" });
      updates.email = emailNormalized;
    }
  }
  if (isActive !== undefined) updates.isActive = isActive;
  if (password) {
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
    updates.passwordRaw = password;
  }

  const updated = usersColl.update(id, updates);
  const sanitized = { ...updated };
  delete (sanitized as any).password;
  logsColl.create({ taskId: "", userId: req.user!.id, userName: req.user!.name, action: `Updated details of worker ${sanitized.name}` });
  res.json(sanitized);
});

app.delete("/api/workers/:id", authenticateJWT, authorizeAdmin, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const worker = usersColl.findOne({ id, role: "worker" });
  if (!worker) return res.status(404).json({ error: "Worker not found" });
  usersColl.delete(id, true);
  logsColl.create({ taskId: "", userId: req.user!.id, userName: req.user!.name, action: `Deleted worker ${worker.name}` });
  res.json({ message: "Worker deleted successfully" });
});

// Tasks
app.get("/api/tasks", authenticateJWT, (req: AuthenticatedRequest, res) => {
  const currentUser = req.user!;
  let tasksList = tasksColl.find();
  if (currentUser.role === "worker")
    tasksList = tasksList.filter((t) => t.assignedTo === currentUser.id);

  const search = ((req.query.search as string) || "").trim().toLowerCase();
  const priority = req.query.priority as string;
  const status = req.query.status as string;
  const assignedTo = req.query.assignedTo as string;
  const timeFilter = req.query.timeFilter as string;

  if (search)
    tasksList = tasksList.filter((t) => {
      const assignedUser = usersColl.findOne({ id: t.assignedTo });
      return (
        t.title.toLowerCase().includes(search) ||
        t.description?.toLowerCase().includes(search) ||
        (assignedUser && (assignedUser.name.toLowerCase().includes(search) || assignedUser.email.toLowerCase().includes(search)))
      );
    });
  if (priority) tasksList = tasksList.filter((t) => t.priority === priority);
  if (status) tasksList = tasksList.filter((t) => t.status === status);
  if (assignedTo && currentUser.role === "admin")
    tasksList = tasksList.filter((t) => t.assignedTo === assignedTo);

  const todayStr = new Date().toISOString().split("T")[0];
  if (timeFilter === "today")
    tasksList = tasksList.filter((t) => t.dueDate?.startsWith(todayStr));
  else if (timeFilter === "overdue")
    tasksList = tasksList.filter((t) => t.status !== "Completed" && t.dueDate && t.dueDate < todayStr);

  const sortBy = (req.query.sortBy as string) || "dueDate";
  tasksList.sort((a, b) => {
    if (sortBy === "priority") {
      const s: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
      return s[b.priority] - s[a.priority];
    } else if (sortBy === "createdAt") {
      return b.createdAt.localeCompare(a.createdAt);
    }
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  const populated = tasksList.map((t) => {
    const assignedUser = usersColl.findOne({ id: t.assignedTo });
    const creator = usersColl.findOne({ id: t.assignedBy });
    return {
      ...t,
      assignedToUser: assignedUser ? { id: assignedUser.id, name: assignedUser.name, email: assignedUser.email } : null,
      createdByUser: creator ? { id: creator.id, name: creator.name } : null,
    };
  });
  res.json(populated);
});

app.get("/api/tasks/:id", authenticateJWT, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const currentUser = req.user!;
  const task = tasksColl.findOne({ id });
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (currentUser.role === "worker" && task.assignedTo !== currentUser.id)
    return res.status(403).json({ error: "Unauthorized" });

  const assignedUser = usersColl.findOne({ id: task.assignedTo });
  const creator = usersColl.findOne({ id: task.assignedBy });
  const taskComments = commentsColl.find({ taskId: id }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const taskLogs = logsColl.find({ taskId: id }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  res.json({
    ...task,
    assignedToUser: assignedUser ? { id: assignedUser.id, name: assignedUser.name, email: assignedUser.email } : null,
    createdByUser: creator ? { id: creator.id, name: creator.name } : null,
    comments: taskComments,
    historyLogs: taskLogs,
  });
});

app.post("/api/tasks", authenticateJWT, authorizeAdmin, (req: AuthenticatedRequest, res) => {
  const { title, description, assignedTo, priority, dueDate } = req.body;
  if (!title || !assignedTo || !priority || !dueDate)
    return res.status(400).json({ error: "Title, Assigned Worker, Priority and Due Date are required" });

  const worker = usersColl.findOne({ id: assignedTo, role: "worker" });
  if (!worker) return res.status(400).json({ error: "Invalid worker" });

  const newTask = tasksColl.create({ title: title.trim(), description: (description || "").trim(), assignedTo, assignedBy: req.user!.id, priority, status: "Pending", dueDate });
  logsColl.create({ taskId: newTask.id, userId: req.user!.id, userName: req.user!.name, action: "Admin created task" });
  logsColl.create({ taskId: newTask.id, userId: req.user!.id, userName: req.user!.name, action: `Admin assigned task to ${worker.name}` });
  res.status(201).json(newTask);
});

app.put("/api/tasks/:id", authenticateJWT, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const currentUser = req.user!;
  const task = tasksColl.findOne({ id });
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (currentUser.role === "worker" && task.assignedTo !== currentUser.id)
    return res.status(403).json({ error: "Access denied" });

  const logActions: string[] = [];
  const updates: any = {};

  if (currentUser.role === "admin") {
    const { title, description, assignedTo, priority, status, dueDate } = req.body;
    if (title !== undefined && title.trim() !== task.title) { updates.title = title.trim(); logActions.push(`Admin updated title`); }
    if (description !== undefined && description.trim() !== task.description) { updates.description = description.trim(); logActions.push("Admin updated description"); }
    if (assignedTo !== undefined && assignedTo !== task.assignedTo) {
      const worker = usersColl.findOne({ id: assignedTo, role: "worker" });
      if (!worker) return res.status(400).json({ error: "Invalid worker" });
      updates.assignedTo = assignedTo; logActions.push(`Admin reassigned to ${worker.name}`);
    }
    if (priority !== undefined && priority !== task.priority) { updates.priority = priority; logActions.push(`Admin updated priority to ${priority}`); }
    if (status !== undefined && status !== task.status) { updates.status = status; logActions.push(`Admin changed status to ${status}`); }
    if (dueDate !== undefined && dueDate !== task.dueDate) { updates.dueDate = dueDate; logActions.push(`Admin edited due date`); }
  } else {
    const { status } = req.body;
    if (status !== undefined && status !== task.status) {
      updates.status = status;
      logActions.push(`${currentUser.name} changed status to ${status}`);
    }
  }

  if (Object.keys(updates).length > 0) {
    const updatedTask = tasksColl.update(id, updates);
    for (const action of logActions)
      logsColl.create({ taskId: id, userId: currentUser.id, userName: currentUser.name, action });
    return res.json(updatedTask);
  }
  return res.json(task);
});

app.delete("/api/tasks/:id", authenticateJWT, authorizeAdmin, (req, res) => {
  const { id } = req.params;
  const task = tasksColl.findOne({ id });
  if (!task) return res.status(404).json({ error: "Task not found" });
  tasksColl.delete(id);
  res.json({ message: "Task deleted successfully" });
});

// Comments
app.post("/api/comments", authenticateJWT, (req: AuthenticatedRequest, res) => {
  const { taskId, message } = req.body;
  if (!taskId || !message?.trim()) return res.status(400).json({ error: "Task ID and message are required" });
  const task = tasksColl.findOne({ id: taskId });
  if (!task) return res.status(404).json({ error: "Task not found" });
  const currentUser = req.user!;
  if (currentUser.role === "worker" && task.assignedTo !== currentUser.id)
    return res.status(403).json({ error: "Access denied" });

  const newComment = commentsColl.create({ taskId, userId: currentUser.id, userName: currentUser.name, message: message.trim() });
  logsColl.create({ taskId, userId: currentUser.id, userName: currentUser.name, action: `${currentUser.name} added a comment` });
  res.status(201).json(newComment);
});

app.get("/api/comments/:taskId", authenticateJWT, (req: AuthenticatedRequest, res) => {
  const { taskId } = req.params;
  const task = tasksColl.findOne({ id: taskId });
  if (!task) return res.status(404).json({ error: "Task not found" });
  const currentUser = req.user!;
  if (currentUser.role === "worker" && task.assignedTo !== currentUser.id)
    return res.status(403).json({ error: "Access denied" });
  const taskComments = commentsColl.find({ taskId }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(taskComments);
});

// Reports
app.get("/api/reports", authenticateJWT, authorizeAdmin, (req, res) => {
  const workers = usersColl.find({ role: "worker" });
  const allTasks = tasksColl.find();

  const tasksPerWorker = workers.map((w) => {
    const wt = allTasks.filter((t) => t.assignedTo === w.id);
    const completed = wt.filter((t) => t.status === "Completed").length;
    const total = wt.length;
    return {
      id: w.id, name: w.name, email: w.email, isActive: w.isActive,
      totalTasks: total, completed,
      pending: wt.filter((t) => t.status === "Pending").length,
      inProgress: wt.filter((t) => t.status === "In Progress").length,
      completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });

  const totalCompleted = allTasks.filter((t) => t.status === "Completed").length;
  const totalTasksCount = allTasks.length;
  let mostProductiveWorker = "None";
  let maxCompleted = 0;
  tasksPerWorker.forEach((w) => { if (w.completed > maxCompleted) { maxCompleted = w.completed; mostProductiveWorker = w.name; } });

  res.json({
    totalTasksCount,
    totalCompletedCount: totalCompleted,
    completionPercentage: totalTasksCount > 0 ? Math.round((totalCompleted / totalTasksCount) * 100) : 0,
    mostProductiveWorker,
    highPriorityPendingCount: allTasks.filter((t) => t.priority === "High" && t.status !== "Completed").length,
    tasksPerWorker,
  });
});

export default app;
