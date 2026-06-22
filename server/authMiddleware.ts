import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { usersColl, User } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "welldropp_task_manager_secret_key_123";

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export async function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Access token required" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(411).json({ error: "Malformed authentication token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    const user = await usersColl.findOne({ id: decoded.id });
    if (!user) return res.status(401).json({ error: "Session expired or user deleted" });
    if (!user.is_active) return res.status(403).json({ error: "User account is disabled" });
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

export function authorizeAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Access restricted to administrators only" });
  }
  next();
}

export function authorizeWorker(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "worker") {
    return res.status(403).json({ error: "Access restricted to workers only" });
  }
  next();
}
