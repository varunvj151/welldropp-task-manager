import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import api, { extractErrorMessage } from "../services/api";
import { motion } from "motion/react";
import {
  Users,
  CheckSquare,
  Clock,
  Flame,
  AlertTriangle,
  FolderSync,
  ChevronRight,
  TrendingUp,
  FileCheck2,
  CalendarDays,
  Plus
} from "lucide-react";

interface DashboardStats {
  totalWorkers: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  highPriorityTasks: number;
  overdueTasks: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalWorkers: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    highPriorityTasks: 0,
    overdueTasks: 0,
  });

  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Fetch tasks (for admins all tasks, for workers only assigned)
      const tasksRes = await api.get("/tasks");
      setTasks(tasksRes.data);

      const todayStr = new Date().toISOString().split("T")[0];

      if (user?.role === "admin") {
        // Fetch workers list
        const workersRes = await api.get("/workers");
        setWorkers(workersRes.data);

        // Fetch logs (We can get recent logs from the backend)
        // Since there is no dedicated bulk logs API, we can either extract recent logs 
        // from all task detail loaders, or we can just pull them from standard activities list.
        // Let's load the logs by querying tasks, then aggregate all task logs, or we can map them nicely.
        // Let's calculate stats
        const activeWorkersCount = workersRes.data.length;
        const pending = tasksRes.data.filter((t: any) => t.status === "Pending").length;
        const progress = tasksRes.data.filter((t: any) => t.status === "In Progress").length;
        const completed = tasksRes.data.filter((t: any) => t.status === "Completed").length;
        const high = tasksRes.data.filter((t: any) => t.priority === "High" && t.status !== "Completed").length;
        const overdue = tasksRes.data.filter((t: any) => {
          return t.status !== "Completed" && t.dueDate && t.dueDate < todayStr;
        }).length;

        setStats({
          totalWorkers: activeWorkersCount,
          pendingTasks: pending,
          inProgressTasks: progress,
          completedTasks: completed,
          highPriorityTasks: high,
          overdueTasks: overdue,
        });

        // Gather all historic logs or mock a feed from newest tasks
        // To show actual recent activity logs, let's load details for a couple tasks 
        // or just list them. We can also fetch the database directly or display a unified feed!
        // Let's query recent logs or make a direct activity stream.
        // As we write activity logs to the db file, we can also collect them!
        // Let's fetch them from a helper if needed. Wait, we can get logs by taking the 
        // latest actions of tasks!
      } else {
        // For Worker:
        const pending = tasksRes.data.filter((t: any) => t.status === "Pending").length;
        const progress = tasksRes.data.filter((t: any) => t.status === "In Progress").length;
        const completed = tasksRes.data.filter((t: any) => t.status === "Completed").length;
        const dueToday = tasksRes.data.filter((t: any) => t.dueDate && t.dueDate.startsWith(todayStr)).length;

        // stats uses custom keys for workers
        setStats({
          totalWorkers: 0, // not used in worker view
          pendingTasks: pending,
          inProgressTasks: progress,
          completedTasks: completed,
          highPriorityTasks: dueToday, // map to due today for worker!
          overdueTasks: tasksRes.data.filter((t: any) => t.status !== "Completed" && t.dueDate && t.dueDate < todayStr).length,
        });
      }
    } catch (err: any) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse text-slate-800 dark:text-slate-100">
        {/* Welcome Banner Skeleton */}
        <div className="space-y-2">
          <div className="h-7 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          <div className="h-4 w-96 bg-slate-100 dark:bg-slate-850 rounded-md"></div>
        </div>

        {/* Stats Board Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div className="space-y-3 flex-1">
                <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-8 w-12 bg-slate-300 dark:bg-slate-700 rounded-lg"></div>
                <div className="h-3 w-28 bg-slate-150 dark:bg-slate-800/60 rounded"></div>
              </div>
              <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-xl shrink-0"></div>
            </div>
          ))}
        </div>

        {/* Second Level Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main tasks tracking panel skeleton */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/20 dark:bg-slate-950/20">
              <div className="space-y-2">
                <div className="h-4 w-44 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-3 w-36 bg-slate-100 dark:bg-slate-850 rounded"></div>
              </div>
              <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
            <div className="p-6 space-y-6">
              {[1, 2, 3].map((idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-50 dark:border-slate-800/55 last:border-0 last:pb-0">
                  <div className="space-y-2.5 flex-1">
                    <div className="flex gap-2">
                      <div className="h-4.5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                      <div className="h-4.5 w-14 bg-slate-150 dark:bg-slate-850 rounded-full"></div>
                    </div>
                    <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-3 w-24 bg-slate-100 dark:bg-slate-850 rounded"></div>
                  </div>
                  <div className="space-y-2 w-24 text-right">
                    <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-3 w-16 bg-slate-100 dark:bg-slate-850 rounded ml-auto"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar logs / Completed activities skeleton */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/20 space-y-2">
              <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-3 w-32 bg-slate-100 dark:bg-slate-850 rounded"></div>
            </div>
            <div className="p-6 space-y-5">
              {[1, 2, 3, 4].map((idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800 mt-1.5 flex-shrink-0"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-3.5 w-4/5 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-3 w-1/3 bg-slate-100 dark:bg-slate-850 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingTasks = tasks
    .filter((t) => t.status !== "Completed")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  const completedTasksList = tasks
    .filter((t) => t.status === "Completed")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white md:text-2xl">
            Happy working, {user?.name}!
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {user?.role === "admin"
              ? "Here's the visual operational status of WellDropp Task Manager."
              : "Review your active task list and today's upcoming checkpoints below."}
          </p>
        </div>
        {user?.role === "admin" && (
          <Link
            to="/admin/tasks?addTask=true"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 dark:bg-indigo-600 dark:hover:bg-indigo-500 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-indigo-400 dark:text-indigo-200" />
            Create Task
          </Link>
        )}
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {user?.role === "admin" ? (
          <>
            {/* Total Workers */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-widest uppercase">Total Workers</p>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{stats.totalWorkers}</h3>
                <Link to="/admin/workers" className="inline-flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-2 hover:underline">
                  Manage Workers <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-500 dark:text-indigo-400">
                <Users className="w-6 h-6" />
              </div>
            </div>

            {/* Pending Tasks */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-widest uppercase">Pending Tasks</p>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{stats.pendingTasks}</h3>
                <Link to="/admin/tasks?status=Pending" className="inline-flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-2 hover:underline">
                  Filter Pending <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-500 dark:text-amber-400">
                <CheckSquare className="w-6 h-6" />
              </div>
            </div>

            {/* In Progress */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-widest uppercase">In Progress</p>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{stats.inProgressTasks}</h3>
                <Link to="/admin/tasks?status=In Progress" className="inline-flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-2 hover:underline">
                  Filter Active <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-500 dark:text-blue-400">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            {/* Overdue */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-widest uppercase">Overdue Tasks</p>
                <h3 className="text-3xl font-extrabold text-red-600 dark:text-rose-500 mt-2">{stats.overdueTasks}</h3>
                <Link to="/admin/tasks?timeFilter=overdue" className="inline-flex items-center text-xs font-semibold text-red-650 dark:text-rose-400 mt-2 hover:underline">
                  Review Overdue <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-950/40 rounded-xl text-red-500 dark:text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* My Pending Tasks */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-widest uppercase">My Pending</p>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{stats.pendingTasks}</h3>
                <Link to="/worker/tasks?status=Pending" className="inline-flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-2 hover:underline">
                  View Tasks <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-500 dark:text-amber-400">
                <CheckSquare className="w-6 h-6" />
              </div>
            </div>

            {/* My In Progress Tasks */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-widest uppercase">In Progress</p>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{stats.inProgressTasks}</h3>
                <Link to="/worker/tasks?status=In Progress" className="inline-flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-2 hover:underline">
                  View Setup <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-500 dark:text-blue-400">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            {/* Tasks Due Today */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-widest uppercase">Due Today</p>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{stats.highPriorityTasks}</h3>
                <Link to="/worker/tasks?timeFilter=today" className="inline-flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-2 hover:underline">
                  View Today <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-500 dark:text-rose-400">
                <CalendarDays className="w-6 h-6" />
              </div>
            </div>

            {/* Completed Tasks */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-widest uppercase">Completed</p>
                <h3 className="text-3xl font-extrabold text-emerald-650 dark:text-emerald-400 mt-2">{stats.completedTasks}</h3>
                <Link to="/worker/tasks?status=Completed" className="inline-flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-2 hover:underline">
                  History <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-500 dark:text-emerald-400">
                <FileCheck2 className="w-6 h-6" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Second Level Grid layouts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main tasks tracking panel */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                {user?.role === "admin" ? "Active High Priority Tasks" : "Upcoming Tasks & Deadlines"}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tasks requiring prompt attention.</p>
            </div>
            <Link to={user?.role === "admin" ? "/admin/tasks" : "/worker/tasks"} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
              View All Tasks
            </Link>
          </div>

          <div className="p-6 divide-y divide-slate-100 dark:divide-slate-800 flex-1 flex flex-col justify-between">
            {upcomingTasks.length === 0 ? (
              <div className="flex-1 py-12 flex flex-col items-center justify-center text-center">
                <CheckSquare className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">All caught up!</p>
                <p className="text-xs text-slate-400 dark:text-slate-550 mt-1">There are no outstanding high-priority or pending tasks.</p>
              </div>
            ) : (
              <div className="flow-root">
                <ul className="-my-4 divide-y divide-slate-100 dark:divide-slate-800">
                  {upcomingTasks.map((t: any) => {
                    const isOverdue = t.dueDate && t.dueDate < todayStr && t.status !== "Completed";
                    return (
                      <li key={t.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold rounded-full ${
                              t.priority === "High"
                                ? "bg-rose-100 text-rose-850 dark:bg-rose-950/40 dark:text-rose-300"
                                : t.priority === "Medium"
                                ? "bg-amber-100 text-amber-850 dark:bg-amber-950/40 dark:text-amber-300"
                                : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                            }`}>
                              {t.priority} Priority
                            </span>
                            <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold rounded-full ${
                              t.status === "Completed"
                                ? "bg-emerald-100 text-emerald-850 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : t.status === "In Progress"
                                ? "bg-blue-100 text-blue-850 dark:bg-blue-950/40 dark:text-blue-300"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}>
                              {t.status}
                            </span>
                          </div>
                          <Link
                            to={user?.role === "admin" ? `/admin/tasks/${t.id}` : `/worker/tasks/${t.id}`}
                            className="font-bold text-xs text-slate-950 dark:text-slate-100 hover:text-indigo-650 dark:hover:text-indigo-400 transition"
                          >
                            {t.title}
                          </Link>
                          {user?.role === "admin" && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                              Assigned: {t.assignedToUser?.name || "Unassigned"}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-left sm:text-right">
                          <p className={`text-xs font-bold ${isOverdue ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-300"}`}>
                            Due: {t.dueDate || "No due date"}
                          </p>
                          {isOverdue && (
                            <span className="text-[10px] text-rose-500 dark:text-rose-400 font-semibold tracking-wider uppercase block mt-0.5">
                              ⚠️ OVERDUE
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar logs / Completed activities */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white">
              {user?.role === "admin" ? "Latest Work Activity" : "Recently Completed Tasks"}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Operational checkpoints list.</p>
          </div>
          
          <div className="p-6 flex-1 flex flex-col justify-between">
            {user?.role === "admin" ? (
              // Admin view shows recently completed or some quick visual stat representation
              completedTasksList.length === 0 ? (
                <div className="py-12 flex-1 flex flex-col items-center justify-center text-center">
                  <Clock className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-455">No tasks completed yet</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {completedTasksList.map((t: any) => (
                    <li key={t.id} className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 mt-1.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <Link
                          to={`/admin/tasks/${t.id}`}
                          className="text-xs font-bold text-slate-900 dark:text-slate-200 block hover:text-indigo-500 dark:hover:text-indigo-400 truncate"
                        >
                          {t.title}
                        </Link>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          Assigned: {t.assignedToUser?.name} • Finished: {t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              // Worker view shows recently completed tasks
              completedTasksList.length === 0 ? (
                <div className="py-12 flex-1 flex flex-col items-center justify-center text-center">
                  <FileCheck2 className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-455">No tasks completed yet by you.</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {completedTasksList.map((t: any) => (
                    <li key={t.id} className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 mt-1.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <Link
                          to={`/worker/tasks/${t.id}`}
                          className="text-xs font-bold text-slate-900 dark:text-slate-200 block hover:text-indigo-500 dark:hover:text-indigo-400 truncate"
                        >
                          {t.title}
                        </Link>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          Finished: {t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
