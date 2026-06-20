import express, { Response } from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import { createServer as createViteServer } from "vite";

import {
  usersColl,
  tasksColl,
  commentsColl,
  logsColl,
  User,
  Task
} from "./server/db";
import {
  authenticateJWT,
  authorizeAdmin,
  AuthenticatedRequest
} from "./server/authMiddleware";

const JWT_SECRET = process.env.JWT_SECRET || "welldropp_task_manager_secret_key_123";
const PORT = 3000;

async function startServer() {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(cors());
  
  // Custom Helmet configuration to support AI Studio's iframe previews
  app.use(
    helmet({
      contentSecurityPolicy: false,
      frameguard: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(morgan("dev"));

  // --- API ROUTES ---

  // Auth: Login
  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = usersColl.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Your account has been disabled. Please contact an admin." });
    }

    // Verify Password
    const passwordMatch = bcryptjs.compareSync(password, user.password || "");
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Return sanitized user with JWT
    const sanitizedUser = { ...user };
    delete sanitizedUser.password;

    return res.json({
      token,
      user: sanitizedUser,
    });
  });

  // Auth: Get Profile
  app.get("/api/profile", authenticateJWT, (req: AuthenticatedRequest, res) => {
    const sanitizedUser = { ...req.user };
    delete sanitizedUser.password;
    res.json(sanitizedUser);
  });

  // Auth: Change password
  app.post("/api/change-password", authenticateJWT, (req: AuthenticatedRequest, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "All password fields are required" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters long" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "New password and confirmation password do not match" });
    }

    // Verify current password
    const user = req.user!;
    const isCurrentValid = bcryptjs.compareSync(currentPassword, user.password || "");
    if (!isCurrentValid) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    // Update password
    usersColl.update(user.id, { passwordRaw: newPassword });

    // Create activity log optionally
    logsColl.create({
      taskId: "",
      userId: user.id,
      userName: user.name,
      action: "Changed their account password",
    });

    return res.json({ message: "Password updated successfully!" });
  });

  // Workers management (Admin Only)
  app.get("/api/workers", authenticateJWT, authorizeAdmin, (req, res) => {
    const search = (req.query.search as string || "").trim().toLowerCase();
    
    let workers = usersColl.find({ role: "worker" });
    
    // Filter matching search
    if (search) {
      workers = workers.filter(
        (w) =>
          w.name.toLowerCase().includes(search) ||
          w.email.toLowerCase().includes(search)
      );
    }

    // Sort by name ascending
    workers.sort((a, b) => a.name.localeCompare(b.name));

    res.json(workers);
  });

  app.post("/api/workers", authenticateJWT, authorizeAdmin, (req: AuthenticatedRequest, res) => {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    const emailNormalized = email.toLowerCase().trim();
    
    // Check unique email
    const existingUser = usersColl.findOne({ email: emailNormalized });
    if (existingUser) {
      return res.status(400).json({ error: "Email address is already in use" });
    }

    const newWorker = usersColl.create({
      name: name.trim(),
      email: emailNormalized,
      role: "worker",
      isActive: true,
      passwordRaw: password,
    });

    const sanitized = { ...newWorker };
    delete sanitized.password;

    logsColl.create({
      taskId: "",
      userId: req.user!.id,
      userName: req.user!.name,
      action: `Created worker account for ${sanitized.name}`,
    });

    res.status(201).json(sanitized);
  });

  app.put("/api/workers/:id", authenticateJWT, authorizeAdmin, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { name, email, isActive, password } = req.body;

    const worker = usersColl.findOne({ id, role: "worker" });
    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name.trim();
    
    if (email !== undefined) {
      const emailNormalized = email.toLowerCase().trim();
      if (emailNormalized !== worker.email) {
        const emailExists = usersColl.findOne({ email: emailNormalized });
        if (emailExists) {
          return res.status(400).json({ error: "Email address is already in use" });
        }
        updates.email = emailNormalized;
      }
    }

    if (isActive !== undefined) {
      updates.isActive = isActive;
    }

    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters long" });
      }
      updates.passwordRaw = password;
    }

    const updated = usersColl.update(id, updates);
    const sanitized = { ...updated };
    delete sanitized.password;

    logsColl.create({
      taskId: "",
      userId: req.user!.id,
      userName: req.user!.name,
      action: `Updated status/details of worker ${sanitized.name}`,
    });

    res.json(sanitized);
  });

  app.delete("/api/workers/:id", authenticateJWT, authorizeAdmin, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const worker = usersColl.findOne({ id, role: "worker" });

    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }

    // Soft delete is preferred, let's toggle isActive to false
    usersColl.delete(id, true);

    logsColl.create({
      taskId: "",
      userId: req.user!.id,
      userName: req.user!.name,
      action: `Deleted/Deactivated worker ${worker.name}`,
    });

    res.json({ message: "Worker deleted (deactivated) successfully" });
  });

  // Tasks Management
  app.get("/api/tasks", authenticateJWT, (req: AuthenticatedRequest, res) => {
    const currentUser = req.user!;
    let tasksList = tasksColl.find();

    // If Worker, filter only assigned tasks
    if (currentUser.role === "worker") {
      tasksList = tasksList.filter((t) => t.assignedTo === currentUser.id);
    }

    // Apply filters
    const search = (req.query.search as string || "").trim().toLowerCase();
    const priority = req.query.priority as string;
    const status = req.query.status as string;
    const assignedTo = req.query.assignedTo as string;
    const timeFilter = req.query.timeFilter as string; // 'today' | 'overdue'

    if (search) {
      tasksList = tasksList.filter((t) => {
        const matchesTitle = t.title.toLowerCase().includes(search);
        const matchesDesc = t.description?.toLowerCase().includes(search);
        
        let matchesWorkerName = false;
        const assignedUser = usersColl.findOne({ id: t.assignedTo });
        if (assignedUser) {
          matchesWorkerName = assignedUser.name.toLowerCase().includes(search) || 
                              assignedUser.email.toLowerCase().includes(search);
        }
        return matchesTitle || matchesDesc || matchesWorkerName;
      });
    }

    if (priority) {
      tasksList = tasksList.filter((t) => t.priority === priority);
    }

    if (status) {
      tasksList = tasksList.filter((t) => t.status === status);
    }

    if (assignedTo && currentUser.role === "admin") {
      tasksList = tasksList.filter((t) => t.assignedTo === assignedTo);
    }

    const todayStr = new Date().toISOString().split("T")[0];

    if (timeFilter === "today") {
      tasksList = tasksList.filter((t) => t.dueDate?.startsWith(todayStr));
    } else if (timeFilter === "overdue") {
      tasksList = tasksList.filter((t) => {
        return t.status !== "Completed" && t.dueDate && t.dueDate < todayStr;
      });
    }

    // Sort: By default, high priority first, or by dueDate
    const sortBy = req.query.sortBy as string || "dueDate";
    tasksList.sort((a, b) => {
      if (sortBy === "priority") {
        const priorityScore = { High: 3, Medium: 2, Low: 1 };
        return priorityScore[b.priority] - priorityScore[a.priority];
      } else if (sortBy === "createdAt") {
        return b.createdAt.localeCompare(a.createdAt);
      } else {
        // Default: due date ascending (closest first)
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
    });

    // Populate worker names & admin names
    const populatedTasks = tasksList.map((t) => {
      const assignedUser = usersColl.findOne({ id: t.assignedTo });
      const creator = usersColl.findOne({ id: t.assignedBy });
      return {
        ...t,
        assignedToUser: assignedUser ? { id: assignedUser.id, name: assignedUser.name, email: assignedUser.email } : null,
        createdByUser: creator ? { id: creator.id, name: creator.name } : null,
      };
    });

    res.json(populatedTasks);
  });

  app.get("/api/tasks/:id", authenticateJWT, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const currentUser = req.user!;

    const task = tasksColl.findOne({ id });
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Check authorize access
    if (currentUser.role === "worker" && task.assignedTo !== currentUser.id) {
      return res.status(403).json({ error: "Unauthorized access to this task" });
    }

    // Populate user profiles, comments and history logs
    const assignedUser = usersColl.findOne({ id: task.assignedTo });
    const creator = usersColl.findOne({ id: task.assignedBy });
    
    const taskComments = commentsColl.find({ taskId: id });
    // sort comments newest first
    taskComments.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const taskLogs = logsColl.find({ taskId: id });
    // sort logs newest first
    taskLogs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

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

    if (!title || !assignedTo || !priority || !dueDate) {
      return res.status(400).json({ error: "Title, Assigned Worker, Priority and Due Date are required" });
    }

    const worker = usersColl.findOne({ id: assignedTo, role: "worker" });
    if (!worker) {
      return res.status(400).json({ error: "Assigned worker is invalid or inactive" });
    }

    const newTask = tasksColl.create({
      title: title.trim(),
      description: (description || "").trim(),
      assignedTo,
      assignedBy: req.user!.id,
      priority,
      status: "Pending",
      dueDate,
    });

    // Write audit log
    logsColl.create({
      taskId: newTask.id,
      userId: req.user!.id,
      userName: req.user!.name,
      action: "Admin created task",
    });

    logsColl.create({
      taskId: newTask.id,
      userId: req.user!.id,
      userName: req.user!.name,
      action: `Admin assigned task to ${worker.name}`,
    });

    res.status(201).json(newTask);
  });

  // Edit task (Admin edits anything, worker edits only status)
  app.put("/api/tasks/:id", authenticateJWT, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const currentUser = req.user!;
    const task = tasksColl.findOne({ id });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Worker authorization check
    if (currentUser.role === "worker" && task.assignedTo !== currentUser.id) {
      return res.status(403).json({ error: "Access denied to edit this task" });
    }

    const logActions: string[] = [];
    const updates: Partial<Task> = {};

    if (currentUser.role === "admin") {
      const { title, description, assignedTo, priority, status, dueDate } = req.body;

      if (title !== undefined && title.trim() !== task.title) {
        logActions.push(`Admin updated task title to "${title.trim()}"`);
        updates.title = title.trim();
      }

      if (description !== undefined && description.trim() !== task.description) {
        logActions.push("Admin updated task description");
        updates.description = description.trim();
      }

      if (assignedTo !== undefined && assignedTo !== task.assignedTo) {
        const worker = usersColl.findOne({ id: assignedTo, role: "worker" });
        if (!worker) return res.status(400).json({ error: "Invalid worker assigned" });
        logActions.push(`Admin reassigned task to ${worker.name}`);
        updates.assignedTo = assignedTo;
      }

      if (priority !== undefined && priority !== task.priority) {
        logActions.push(`Admin updated priority to ${priority}`);
        updates.priority = priority;
      }

      if (status !== undefined && status !== task.status) {
        logActions.push(`Admin changed status to ${status}`);
        updates.status = status;
      }

      if (dueDate !== undefined && dueDate !== task.dueDate) {
        logActions.push(`Admin edited due date to ${dueDate}`);
        updates.dueDate = dueDate;
      }
    } else {
      // Worker editing only status
      const { status } = req.body;
      if (status !== undefined && status !== task.status) {
        if (status === "In Progress") {
          logActions.push(`${currentUser.name} changed status to In Progress`);
        } else if (status === "Completed") {
          logActions.push(`${currentUser.name} marked Completed`);
        } else {
          logActions.push(`${currentUser.name} moved status to ${status}`);
        }
        updates.status = status;
      }
    }

    if (Object.keys(updates).length > 0) {
      const updatedTask = tasksColl.update(id, updates);
      
      // Save logs
      for (const action of logActions) {
        logsColl.create({
          taskId: id,
          userId: currentUser.id,
          userName: currentUser.name,
          action,
        });
      }

      return res.json(updatedTask);
    }

    return res.json(task);
  });

  app.delete("/api/tasks/:id", authenticateJWT, authorizeAdmin, (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const task = tasksColl.findOne({ id });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    tasksColl.delete(id);

    res.json({ message: "Task deleted successfully" });
  });

  // Comments router
  app.post("/api/comments", authenticateJWT, (req: AuthenticatedRequest, res) => {
    const { taskId, message } = req.body;

    if (!taskId || !message || !message.trim()) {
      return res.status(400).json({ error: "Task ID and message are required" });
    }

    const task = tasksColl.findOne({ id: taskId });
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Role check for access
    const currentUser = req.user!;
    if (currentUser.role === "worker" && task.assignedTo !== currentUser.id) {
      return res.status(403).json({ error: "Access denied to comment on this task" });
    }

    const newComment = commentsColl.create({
      taskId,
      userId: currentUser.id,
      userName: currentUser.name,
      message: message.trim(),
    });

    // Log comment added
    logsColl.create({
      taskId,
      userId: currentUser.id,
      userName: currentUser.name,
      action: `${currentUser.name} added a work comment`,
    });

    res.status(201).json(newComment);
  });

  app.get("/api/comments/:taskId", authenticateJWT, (req: AuthenticatedRequest, res) => {
    const { taskId } = req.params;
    const task = tasksColl.findOne({ id: taskId });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const currentUser = req.user!;
    if (currentUser.role === "worker" && task.assignedTo !== currentUser.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const taskComments = commentsColl.find({ taskId });
    taskComments.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    res.json(taskComments);
  });

  // Admin Reports
  app.get("/api/reports", authenticateJWT, authorizeAdmin, (req, res) => {
    const workers = usersColl.find({ role: "worker" });
    const allTasks = tasksColl.find();

    // Map stats per worker
    const tasksPerWorker = workers.map((w) => {
      const workerTasks = allTasks.filter((t) => t.assignedTo === w.id);
      const completed = workerTasks.filter((t) => t.status === "Completed").length;
      const pending = workerTasks.filter((t) => t.status === "Pending").length;
      const inProgress = workerTasks.filter((t) => t.status === "In Progress").length;
      
      const total = workerTasks.length;
      const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        id: w.id,
        name: w.name,
        email: w.email,
        isActive: w.isActive,
        totalTasks: total,
        completed,
        pending,
        inProgress,
        completionPercentage,
      };
    });

    // Calculate Completion percentage of all items
    const totalCompleted = allTasks.filter((t) => t.status === "Completed").length;
    const totalTasksCount = allTasks.length;
    const totalCompletionRate = totalTasksCount > 0 ? Math.round((totalCompleted / totalTasksCount) * 100) : 0;

    // Highest count of completed tasks among workers
    let mostProductiveWorker = "None";
    let maxCompletedNum = 0;
    
    tasksPerWorker.forEach((wStat) => {
      if (wStat.completed > maxCompletedNum) {
        maxCompletedNum = wStat.completed;
        mostProductiveWorker = wStat.name;
      }
    });

    // High priority pending (or In Progress) tasks
    const highPriorityPendingCount = allTasks.filter(
      (t) => t.priority === "High" && t.status !== "Completed"
    ).length;

    res.json({
      totalTasksCount,
      totalCompletedCount: totalCompleted,
      completionPercentage: totalCompletionRate,
      mostProductiveWorker,
      highPriorityPendingCount,
      tasksPerWorker,
    });
  });


  // --- VITE DEV / PRODUCTION INTEGRATION ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Fallback 404 handler for API routes
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: "API route not found" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running securely on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical: Failed to launch application server", err);
});
