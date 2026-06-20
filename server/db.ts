import fs from "fs";
import path from "path";
import bcryptjs from "bcryptjs";

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Hashed password
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

interface DatabaseSchema {
  users: User[];
  tasks: Task[];
  comments: Comment[];
  activityLogs: ActivityLog[];
}

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "db.json");

function ensureDbDirectory() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

function loadDatabase(): DatabaseSchema {
  ensureDbDirectory();
  try {
    if (fs.existsSync(DB_PATH)) {
      const crude = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(crude);
    }
  } catch (error) {
    console.error("Failed to load local DB file, initializing clean database", error);
  }
  return { users: [], tasks: [], comments: [], activityLogs: [] };
}

function saveDatabase(db: DatabaseSchema) {
  ensureDbDirectory();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

// Instantiate/load DB
let _db = loadDatabase();

// Seed Database
function seedIfEmpty() {
  let modified = false;

  if (_db.users.length === 0) {
    console.log("Database contains no users. Seeding default Admin and Workers...");
    
    const defaultUsers = [
      {
        id: "usr-admin",
        name: "Durgamani Admin",
        email: "durgamani@welldropp.com",
        passwordRaw: "durgamani123",
        role: "admin" as const,
        isActive: true,
      },
      {
        id: "usr-varun",
        name: "Varun",
        email: "varun@welldropp.com",
        passwordRaw: "varun123",
        role: "worker" as const,
        isActive: true,
      },
      {
        id: "usr-muneeswaran",
        name: "Muneeswaran",
        email: "muneeswaran@welldropp.com",
        passwordRaw: "munees123",
        role: "worker" as const,
        isActive: true,
      },
      {
        id: "usr-siddharthan",
        name: "Siddharthan",
        email: "siddharthan@welldropp.com",
        passwordRaw: "siddharthan123",
        role: "worker" as const,
        isActive: true,
      },
    ];

    for (const u of defaultUsers) {
      const salt = bcryptjs.genSaltSync(10);
      const hashedPassword = bcryptjs.hashSync(u.passwordRaw, salt);
      _db.users.push({
        id: u.id,
        name: u.name,
        email: u.email,
        password: hashedPassword,
        role: u.role,
        isActive: u.isActive,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    modified = true;
  }

  if (modified) {
    saveDatabase(_db);
    console.log("Database seeded successfully.");
  }
}

seedIfEmpty();

// User Operations
export const usersColl = {
  find: (filter?: Partial<User>) => {
    if (!filter) return _db.users;
    return _db.users.filter((u) => {
      for (const [key, val] of Object.entries(filter)) {
        if ((u as any)[key] !== val) return false;
      }
      return true;
    });
  },

  findOne: (filter: Partial<User>) => {
    return _db.users.find((u) => {
      for (const [key, val] of Object.entries(filter)) {
        if ((u as any)[key] !== val) return false;
      }
      return true;
    });
  },

  create: (userData: Omit<User, "id" | "createdAt" | "updatedAt"> & { passwordRaw: string }) => {
    const salt = bcryptjs.genSaltSync(10);
    const hashedPassword = bcryptjs.hashSync(userData.passwordRaw, salt);
    
    const newUser: User = {
      id: "usr-" + Math.random().toString(36).substr(2, 9),
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      role: userData.role,
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    _db.users.push(newUser);
    saveDatabase(_db);
    return newUser;
  },

  update: (id: string, updates: Partial<User> & { passwordRaw?: string }) => {
    const uIndex = _db.users.findIndex((u) => u.id === id);
    if (uIndex === -1) return null;

    const current = _db.users[uIndex];
    const updatedUser = { ...current, ...updates };

    if (updates.passwordRaw) {
      const salt = bcryptjs.genSaltSync(10);
      updatedUser.password = bcryptjs.hashSync(updates.passwordRaw, salt);
    }
    
    // Remove temporary raw fields if any
    delete (updatedUser as any).passwordRaw;

    updatedUser.updatedAt = new Date().toISOString();
    _db.users[uIndex] = updatedUser;
    saveDatabase(_db);
    return updatedUser;
  },

  delete: (id: string, soft: boolean = true) => {
    const uIndex = _db.users.findIndex((u) => u.id === id);
    if (uIndex === -1) return false;

    if (soft) {
      // Soft delete: flag them inactive or we can actually remove them. The prompt says: "Soft delete preferred" for workers.
      // Let's set isActive to false and flag as soft-deleted to keep their assigned tasks intact in dashboard reports.
      _db.users[uIndex].isActive = false;
      _db.users[uIndex].updatedAt = new Date().toISOString();
    } else {
      _db.users.splice(uIndex, 1);
    }
    saveDatabase(_db);
    return true;
  },
};

// Task Operations
export const tasksColl = {
  find: (filter?: Partial<Task>) => {
    if (!filter) return _db.tasks;
    return _db.tasks.filter((t) => {
      for (const [key, val] of Object.entries(filter)) {
        if ((t as any)[key] !== val) return false;
      }
      return true;
    });
  },

  findOne: (filter: Partial<Task>) => {
    return _db.tasks.find((t) => {
      for (const [key, val] of Object.entries(filter)) {
        if ((t as any)[key] !== val) return false;
      }
      return true;
    });
  },

  create: (taskData: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
    const newTask: Task = {
      id: "tsk-" + Math.random().toString(36).substr(2, 9),
      ...taskData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    _db.tasks.push(newTask);
    saveDatabase(_db);
    return newTask;
  },

  update: (id: string, updates: Partial<Task>) => {
    const tIndex = _db.tasks.findIndex((t) => t.id === id);
    if (tIndex === -1) return null;

    const current = _db.tasks[tIndex];
    const updatedTask = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    _db.tasks[tIndex] = updatedTask;
    saveDatabase(_db);
    return updatedTask;
  },

  delete: (id: string) => {
    const tIndex = _db.tasks.findIndex((t) => t.id === id);
    if (tIndex === -1) return false;

    _db.tasks.splice(tIndex, 1);
    saveDatabase(_db);
    return true;
  },
};

// Comment Operations
export const commentsColl = {
  find: (filter?: Partial<Comment>) => {
    if (!filter) return _db.comments;
    return _db.comments.filter((c) => {
      for (const [key, val] of Object.entries(filter)) {
        if ((c as any)[key] !== val) return false;
      }
      return true;
    });
  },

  create: (commentData: Omit<Comment, "id" | "createdAt">) => {
    const newComment: Comment = {
      id: "cmt-" + Math.random().toString(36).substr(2, 9),
      ...commentData,
      createdAt: new Date().toISOString(),
    };
    _db.comments.push(newComment);
    saveDatabase(_db);
    return newComment;
  },
};

// Activity Log Operations
export const logsColl = {
  find: (filter?: Partial<ActivityLog>) => {
    if (!filter) return _db.activityLogs;
    return _db.activityLogs.filter((l) => {
      for (const [key, val] of Object.entries(filter)) {
        if ((l as any)[key] !== val) return false;
      }
      return true;
    });
  },

  create: (logData: Omit<ActivityLog, "id" | "createdAt">) => {
    const newLog: ActivityLog = {
      id: "log-" + Math.random().toString(36).substr(2, 9),
      ...logData,
      createdAt: new Date().toISOString(),
    };
    _db.activityLogs.push(newLog);
    saveDatabase(_db);
    return newLog;
  },
};
