import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import api, { extractErrorMessage } from "../services/api";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Calendar,
  MessageSquare,
  History,
  Send,
  User,
  Shield,
  Clock,
  AlertTriangle,
  Play,
  CheckCircle2,
  FolderOpen
} from "lucide-react";

export default function TaskDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<any>(null);
  const [commentInput, setCommentInput] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  const loadTaskDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/tasks/${id}`);
      setTask(res.data);
    } catch (err: any) {
      toast.error(extractErrorMessage(err));
      // redirect back if task not found/forbidden
      navigate(user?.role === "admin" ? "/admin/tasks" : "/worker/tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadTaskDetails();
    }
  }, [id]);

  // Submit new comment
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    try {
      setSendingComment(true);
      await api.post("/comments", {
        taskId: id,
        message: commentInput.trim(),
      });
      setCommentInput("");
      
      // Reload task details to see the new comment & activity log
      await loadTaskDetails();
      toast.success("Comment registered successfully!");
    } catch (err: any) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSendingComment(false);
    }
  };

  // Quick Change Status State
  const handleQuickStatusChange = async (newStatus: "Pending" | "In Progress" | "Completed") => {
    try {
      await api.put(`/tasks/${id}`, { status: newStatus });
      toast.success(`Task marked as ${newStatus}`);
      await loadTaskDetails();
    } catch (err: any) {
      toast.error(extractErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          </div>
          <div className="space-y-6">
            <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!task) return null;

  const commentsList = task.comments || [];
  const logsList = task.historyLogs || [];
  const todayStr = new Date().toISOString().split("T")[0];
  const isOverdue = task.dueDate && task.dueDate < todayStr && task.status !== "Completed";

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-150">
      {/* Back button */}
      <div>
        <Link
          to={user?.role === "admin" ? "/admin/tasks" : "/worker/tasks"}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Tasks List
        </Link>
      </div>

      {/* Task Heading */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
              task.priority === "High"
                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                : task.priority === "Medium"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
            }`}>
              {task.priority} Priority
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
              task.status === "Completed"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                : task.status === "In Progress"
                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-205"
            }`}>
              {task.status}
            </span>
          </div>
          <h2 className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-7 break-words">
            {task.title}
          </h2>
        </div>

        {/* Status management block */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block sm:text-right mr-1">
            Task State:
          </span>
          {task.status !== "In Progress" && task.status !== "Completed" && (
            <button
              onClick={() => handleQuickStatusChange("In Progress")}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl border border-blue-200 dark:border-blue-900/50 transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" /> Start Work
            </button>
          )}
          {task.status !== "Completed" && (
            <button
              onClick={() => handleQuickStatusChange("Completed")}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-xl border border-emerald-200 dark:border-emerald-900/50 transition cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Complete task
            </button>
          )}
          {task.status === "Completed" && (
            <button
              onClick={() => handleQuickStatusChange("In Progress")}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 transition cursor-pointer"
            >
              Reopen Task
            </button>
          )}
        </div>
      </div>

      {/* Primary two column grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: DESCRIPTION AND COMMENTS */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              Task Scope & Description
            </h3>
            <div className="text-slate-705 dark:text-slate-300 text-xs leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-950/40 p-4.5 rounded-xl border border-slate-150 dark:border-slate-850">
              {task.description || "No description or implementation details provided for this task."}
            </div>
          </div>

          {/* Comments Discussion Section */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              Task Discussion Comments ({commentsList.length})
            </h3>

            {/* Comment adding box */}
            <form onSubmit={handleCommentSubmit} className="mb-6">
              <div className="flex gap-3">
                <div className="flex-1">
                  <textarea
                    rows={2}
                    required
                    placeholder="Enter any work logs, blockages, questions, or completion details..."
                    className="block w-full px-4.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors resize-none"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={sendingComment || !commentInput.trim()}
                  className="px-4 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-550 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Comments roll */}
            {commentsList.length === 0 ? (
              <div className="py-10 text-center text-slate-400 dark:text-slate-550">
                <p className="text-xs font-semibold">No comments posted yet.</p>
                <p className="text-[10px] text-slate-405 dark:text-slate-500 mt-1">Submit the first update above to initialize the task discussion thread.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {commentsList.map((c: any) => {
                  const commDate = new Date(c.createdAt);
                  return (
                    <div key={c.id} className="p-4 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-slate-100 dark:border-slate-850/60 flex gap-3 text-xs leading-normal">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold flex items-center justify-center flex-shrink-0 uppercase">
                        {c.userName ? c.userName[0] : "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-bold text-slate-950 dark:text-white">{c.userName}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                            {commDate.toLocaleDateString()} {commDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{c.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: METADATA & AUDIT HISTORY TRAIL */}
        <div className="space-y-6">
          {/* Metadata details card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">
              Task Specifications
            </h3>

            {/* Expired warning */}
            {isOverdue && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl flex gap-2 text-rose-800 dark:text-rose-300 items-start">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500 dark:text-rose-400 animate-bounce" />
                <div className="text-[10px] leading-relaxed font-bold">
                  Task overdue! This assignment has expired its expected due date checkpoints. Urgent updates needed.
                </div>
              </div>
            )}

            <div className="space-y-3.5">
              {/* Due Date */}
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-500 dark:text-slate-400">Expected Due Date:</span>
                <span className={`font-mono font-bold ${isOverdue ? "text-rose-600 dark:text-rose-400" : "text-slate-950 dark:text-white"}`}>
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "None"}
                </span>
              </div>

              {/* Assigned Worker */}
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-500 dark:text-slate-400">Assigned Worker:</span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span className="font-bold text-slate-950 dark:text-white truncate max-w-[120px]">
                    {task.assignedToUser?.name || "Unassigned"}
                  </span>
                </div>
              </div>

              {/* Created By Admin */}
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-500 dark:text-slate-400">Assigned By:</span>
                <span className="font-bold text-slate-950 dark:text-white">
                  {task.createdByUser?.name || "System Admin"}
                </span>
              </div>

              {/* Created Date */}
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-500 dark:text-slate-400">Initiated Date:</span>
                <span className="font-bold text-slate-950 dark:text-white font-mono">
                  {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : ""}
                </span>
              </div>

              {/* Task ID */}
              <div className="flex items-center justify-between text-xs py-1.5 font-mono">
                <span className="font-bold text-slate-500 dark:text-slate-400">Task Code:</span>
                <span className="font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {task.id}
                </span>
              </div>
            </div>
          </div>

          {/* Chronological Audit Logs */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              Operational Audit History
            </h3>

            {logsList.length === 0 ? (
              <p className="text-[10px] text-slate-400 dark:text-slate-500">No events logged yet for this task.</p>
            ) : (
              <div className="relative border-l border-slate-150 dark:border-slate-800 ml-2 pl-4 space-y-4 py-1">
                {logsList.map((log: any) => {
                  const logDate = new Date(log.createdAt);
                  return (
                    <div key={log.id} className="relative text-xs leading-normal">
                      {/* Node circle */}
                      <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-slate-900" />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 dark:text-slate-200">{log.action}</p>
                        <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                          {log.userName} • {logDate.toLocaleDateString()} {logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
