import fs from "fs";
import path from "path";
import bcryptjs from "bcryptjs";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc } from "firebase/firestore";

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
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write offline backup db file", err);
  }
}

// Instantiate/load in-memory db with a fallback cache
let _db: DatabaseSchema = { users: [], tasks: [], comments: [], activityLogs: [] };

// Firebase Firestore setup
// Prefer individual environment variables (works on Vercel/production)
// Falls back to reading the local config file (works in dev/AI Studio)
let firebaseConfig: any = {};

if (process.env.FIREBASE_PROJECT_ID) {
  firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    appId: process.env.FIREBASE_APP_ID,
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || "(default)",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  };
  console.log("Firebase config loaded from environment variables.");
} else {
  const CONFIG_PATH = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      firebaseConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
      console.log("Firebase config loaded from firebase-applet-config.json.");
    } catch (err) {
      console.error("Failed to parse firebase-applet-config.json:", err);
    }
  } else {
    console.warn("No Firebase config found — DB will use local fallback only.");
  }
}

let app: any;
let firestore: any;

const isFirebaseConfigured = firebaseConfig && firebaseConfig.projectId && firebaseConfig.apiKey;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    const dbId = firebaseConfig.firestoreDatabaseId || "(default)";
    firestore = getFirestore(app, dbId);
    console.log("Firebase initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Firebase app or Firestore:", err);
  }
} else {
  console.warn("Firebase is not configured. Falling back to local/in-memory DB.");
}

// Seed Database helper (direct write to firestore + local update)
async function seedIfEmpty() {
  if (_db.users.length === 0) {
    console.log("Database contains no users. Seeding default Admin and Workers in Firestore...");
    
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
      const newUser: User = {
        id: u.id,
        name: u.name,
        email: u.email,
        password: hashedPassword,
        role: u.role,
        isActive: u.isActive,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      _db.users.push(newUser);
      
      try {
        await setDoc(doc(firestore, "users", newUser.id), newUser);
      } catch (err) {
        console.error(`Failed to write seeded user ${newUser.name} to Firestore:`, err);
      }
    }
    
    saveDatabase(_db);
    console.log("Firestore database seeded successfully.");
  }
}

// Global initialization function called by the Express server on startup
export async function initializeDbFromFirebase() {
  try {
    console.log("Initializing database from Firestore...");
    if (!firestore) {
      throw new Error("Firestore instance is not initialized");
    }
    
    // 1. Fetch Users
    const usersSnapshot = await getDocs(collection(firestore, "users"));
    _db.users = [];
    usersSnapshot.forEach((docSnap) => {
      _db.users.push(docSnap.data() as User);
    });

    // 2. Fetch Tasks
    const tasksSnapshot = await getDocs(collection(firestore, "tasks"));
    _db.tasks = [];
    tasksSnapshot.forEach((docSnap) => {
      _db.tasks.push(docSnap.data() as Task);
    });

    // 3. Fetch Comments
    const commentsSnapshot = await getDocs(collection(firestore, "comments"));
    _db.comments = [];
    commentsSnapshot.forEach((docSnap) => {
      _db.comments.push(docSnap.data() as Comment);
    });

    // 4. Fetch Activity Logs
    const logsSnapshot = await getDocs(collection(firestore, "activityLogs"));
    _db.activityLogs = [];
    logsSnapshot.forEach((docSnap) => {
      _db.activityLogs.push(docSnap.data() as ActivityLog);
    });

    console.log(`Synced from Firestore: ${_db.users.length} users, ${_db.tasks.length} tasks, ${_db.comments.length} comments, ${_db.activityLogs.length} activityLogs.`);

    // If no users in Firestore, trigger database seed
    if (_db.users.length === 0) {
      await seedIfEmpty();
    } else {
      // Save localized backup cache
      saveDatabase(_db);
    }
  } catch (err) {
    console.error("Error connecting or fetching from Firestore, falling back to local DB cache:", err);
    _db = loadDatabase();
    if (_db.users.length === 0) {
      // Simple synchronous fallback seeder
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
      saveDatabase(_db);
    }
  }
}

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

    // Save asynchronously to cloud Firestore
    if (firestore) {
      setDoc(doc(firestore, "users", newUser.id), newUser).catch((err) => {
        console.error(`Failed to write created user ${newUser.id} to Firestore:`, err);
      });
    }

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

    // Save asynchronously to cloud Firestore
    if (firestore) {
      setDoc(doc(firestore, "users", id), updatedUser).catch((err) => {
        console.error(`Failed to write updated user ${id} to Firestore:`, err);
      });
    }

    return updatedUser;
  },

  delete: (id: string, soft: boolean = true) => {
    const uIndex = _db.users.findIndex((u) => u.id === id);
    if (uIndex === -1) return false;

    if (soft) {
      _db.users[uIndex].isActive = false;
      _db.users[uIndex].updatedAt = new Date().toISOString();
      const updatedUser = _db.users[uIndex];
      saveDatabase(_db);

      if (firestore) {
        setDoc(doc(firestore, "users", id), updatedUser).catch((err) => {
          console.error(`Failed to update soft-deleted user ${id} in Firestore:`, err);
        });
      }
    } else {
      _db.users.splice(uIndex, 1);
      saveDatabase(_db);

      if (firestore) {
        deleteDoc(doc(firestore, "users", id)).catch((err) => {
          console.error(`Failed to hard-delete user ${id} in Firestore:`, err);
        });
      }
    }
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

    // Save asynchronously to cloud Firestore
    if (firestore) {
      setDoc(doc(firestore, "tasks", newTask.id), newTask).catch((err) => {
        console.error(`Failed to write created task ${newTask.id} to Firestore:`, err);
      });
    }

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

    // Save asynchronously to cloud Firestore
    if (firestore) {
      setDoc(doc(firestore, "tasks", id), updatedTask).catch((err) => {
        console.error(`Failed to write updated task ${id} to Firestore:`, err);
      });
    }

    return updatedTask;
  },

  delete: (id: string) => {
    const tIndex = _db.tasks.findIndex((t) => t.id === id);
    if (tIndex === -1) return false;

    _db.tasks.splice(tIndex, 1);
    saveDatabase(_db);

    // Delete asynchronously from cloud Firestore
    if (firestore) {
      deleteDoc(doc(firestore, "tasks", id)).catch((err) => {
        console.error(`Failed to delete task ${id} from Firestore:`, err);
      });
    }

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

    // Save asynchronously to cloud Firestore
    if (firestore) {
      setDoc(doc(firestore, "comments", newComment.id), newComment).catch((err) => {
        console.error(`Failed to write comment ${newComment.id} to Firestore:`, err);
      });
    }

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

    // Save asynchronously to cloud Firestore
    if (firestore) {
      setDoc(doc(firestore, "activityLogs", newLog.id), newLog).catch((err) => {
        console.error(`Failed to write activity log ${newLog.id} to Firestore:`, err);
      });
    }

    return newLog;
  },
};
