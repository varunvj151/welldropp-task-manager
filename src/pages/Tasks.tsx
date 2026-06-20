import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import api, { extractErrorMessage } from "../services/api";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Filter,
  Plus,
  Trash2,
  CalendarDays,
  Flame,
  CheckSquare,
  Clock,
  User,
  X,
  Eye,
  AlertTriangle,
  FileCheck2,
  ListFilter,
  ArrowUpDown
} from "lucide-react";

export default function Tasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tasks, setTasks] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // States from query router
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [workerFilter, setWorkerFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState(""); // 'today' | 'overdue' | ''
  const [sortBy, setSortBy] = useState("dueDate");

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Form states
  const [addForm, setAddForm] = useState({
    title: "",
    description: "",
    assignedTo: "",
    priority: "Medium" as "High" | "Medium" | "Low",
    dueDate: "",
  });

  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    assignedTo: "",
    priority: "Medium" as "High" | "Medium" | "Low",
    status: "Pending" as "Pending" | "In Progress" | "Completed",
    dueDate: "",
  });

  const [submitting, setSubmitting] = useState(false);

  // Sync state from query parameters on mount
  useEffect(() => {
    const qStatus = searchParams.get("status");
    const qPriority = searchParams.get("priority");
    const qTime = searchParams.get("timeFilter");
    const qAdd = searchParams.get("addTask");

    if (qStatus) setStatusFilter(qStatus);
    if (qPriority) setPriorityFilter(qPriority);
    if (qTime) setTimeFilter(qTime);
    if (qAdd === "true" && user?.role === "admin") {
      setAddModalOpen(true);
      // clear the search query
      searchParams.delete("addTask");
      setSearchParams(searchParams);
    }
  }, [searchParams]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load tasks
      const params: any = {
        search: searchTerm,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        assignedTo: workerFilter || undefined,
        timeFilter: timeFilter || undefined,
        sortBy,
      };

      const tasksRes = await api.get("/tasks", { params });
      setTasks(tasksRes.data);

      if (user?.role === "admin") {
        const workersRes = await api.get("/workers");
        // Only keep active workers for assignments
        setWorkers(workersRes.data.filter((w: any) => w.isActive));
      }
    } catch (err: any) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchTerm, statusFilter, priorityFilter, workerFilter, timeFilter, sortBy]);

  // Create Task Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.title || !addForm.assignedTo || !addForm.priority || !addForm.dueDate) {
      toast.error("Please enter a Title, Assigned worker, Priority and Due Date");
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/tasks", addForm);
      toast.success("Task created and worker assigned!");
      setAddModalOpen(false);
      setAddForm({ title: "", description: "", assignedTo: "", priority: "Medium", dueDate: "" });
      loadData();
    } catch (err: any) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Click on Edit Task
  const handleEditClick = (task: any) => {
    setSelectedTask(task);
    setEditForm({
      title: task.title,
      description: task.description || "",
      assignedTo: task.assignedTo,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
    });
    setEditModalOpen(true);
  };

  // Submit edits
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.title || !editForm.assignedTo || !editForm.dueDate) {
      toast.error("Required fields cannot be blank");
      return;
    }

    try {
      setSubmitting(true);
      await api.put(`/tasks/${selectedTask.id}`, editForm);
      toast.success("Task updated successfully!");
      setEditModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Worker status quick toggles
  const handleWorkerStatusToggle = async (task: any, newStatus: any) => {
    try {
      await api.put(`/tasks/${task.id}`, { status: newStatus });
      toast.success(`Task status changed to ${newStatus}`);
      loadData();
    } catch (err: any) {
      toast.error(extractErrorMessage(err));
    }
  };

  // Click delete
  const handleDeleteClick = (task: any) => {
    setSelectedTask(task);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setSubmitting(true);
      await api.delete(`/tasks/${selectedTask.id}`);
      toast.success("Task deleted permanently");
      setDeleteConfirmOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const clearFilters = () => {
    setStatusFilter("");
    setPriorityFilter("");
    setWorkerFilter("");
    setTimeFilter("");
    setSearchTerm("");
    setSearchParams({});
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-150">
      {/* Top action block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white md:text-2xl">
            {user?.role === "admin" ? "Operations & Tasks" : "My Assigned Tasks"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {user?.role === "admin"
               ? "Oversee operational schedules, priorities, and worker updates."
               : "Locate assignments, record completion updates, and add progress comments."}
          </p>
        </div>
        {user?.role === "admin" && (
          <button
            onClick={() => {
              setAddForm({ title: "", description: "", assignedTo: "", priority: "Medium", dueDate: "" });
              setAddModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 dark:bg-indigo-600 dark:hover:bg-indigo-500 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-md cursor-pointer transition-colors self-start sm:self-center"
          >
            <Plus className="w-4 h-4 text-indigo-400 dark:text-indigo-200" />
            Create Task
          </button>
        )}
      </div>

      {/* Advanced search, sorting, and filtration panel */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Text search */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-900/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              placeholder={user?.role === "admin" ? "Search tasks by title, worker name, or email..." : "Search my tasks..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Quick Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* Status */}
            <div>
              <select
                className="block w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 text-xs focus:bg-white dark:focus:bg-slate-900/60 focus:outline-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="" className="dark:bg-slate-900">Status: All</option>
                <option value="Pending" className="dark:bg-slate-900">Pending</option>
                <option value="In Progress" className="dark:bg-slate-900">In Progress</option>
                <option value="Completed" className="dark:bg-slate-900">Completed</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <select
                className="block w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 text-xs focus:bg-white dark:focus:bg-slate-900/60 focus:outline-none"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="" className="dark:bg-slate-900">Priority: All</option>
                <option value="High" className="dark:bg-slate-900">High</option>
                <option value="Medium" className="dark:bg-slate-900">Medium</option>
                <option value="Low" className="dark:bg-slate-900">Low</option>
              </select>
            </div>

            {/* Timespan */}
            <div>
              <select
                className="block w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 text-xs focus:bg-white dark:focus:bg-slate-900/60 focus:outline-none"
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
              >
                <option value="" className="dark:bg-slate-900">Timeline: All</option>
                <option value="today" className="dark:bg-slate-900">Due Today</option>
                <option value="overdue" className="dark:bg-slate-900">Overdue Tasks</option>
              </select>
            </div>

            {/* Worker Filter (Admins only) */}
            {user?.role === "admin" && (
              <div>
                <select
                  className="block w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 text-xs focus:bg-white dark:focus:bg-slate-900/60 focus:outline-none"
                  value={workerFilter}
                  onChange={(e) => setWorkerFilter(e.target.value)}
                >
                  <option value="" className="dark:bg-slate-900">Worker: All</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id} className="dark:bg-slate-900">
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort options */}
            <div className={user?.role === "admin" ? "col-span-2 sm:col-span-1" : "col-span-2"}>
              <select
                className="block w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 text-xs focus:bg-white dark:focus:bg-slate-900/60 focus:outline-none"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="dueDate" className="dark:bg-slate-900">Due Date</option>
                <option value="priority" className="dark:bg-slate-900">Priority (High first)</option>
                <option value="createdAt" className="dark:bg-slate-900">Created Date</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filters Clear Button indicator */}
        {(statusFilter || priorityFilter || workerFilter || timeFilter || searchTerm) && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-150 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Active Search Filters Applied</span>
            <button
              onClick={clearFilters}
              className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Task Cards & Boards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  {/* Priority & Status Pills */}
                  <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                  <div className="h-5 w-16 bg-slate-150 dark:bg-slate-850 rounded-full"></div>
                </div>

                {/* Title */}
                <div className="h-4.5 w-5/6 bg-slate-200 dark:bg-slate-800 rounded mt-4"></div>

                {/* Description lines */}
                <div className="space-y-2 mt-4">
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-850 rounded"></div>
                  <div className="h-3 w-11/12 bg-slate-100 dark:bg-slate-850/60 rounded"></div>
                  <div className="h-3.5 w-4/5 bg-slate-100 dark:bg-slate-850 rounded-md"></div>
                </div>
              </div>

              {/* Card Footer Divider */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  {/* Assigned User representation */}
                  <div className="flex items-center gap-1.5 flex-1 max-w-[50%]">
                    <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800"></div>
                    <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
                  </div>

                  {/* Due Date representation */}
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-455">
                    <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-800"></div>
                    <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
                  </div>
                </div>

                {/* Action button mockups */}
                <div className="flex items-center justify-between pt-1">
                  <div className="h-8 w-24 bg-slate-100 dark:bg-slate-850 rounded-xl"></div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-12 bg-slate-100 dark:bg-slate-850 rounded-xl"></div>
                    <div className="h-8 w-8 bg-slate-100 dark:bg-slate-850 rounded-xl"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
          <CheckSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">No matching tasks found.</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria and toggling the filters to locate the desired workspace card or create a new assignment task.
          </p>
          {(statusFilter || priorityFilter || workerFilter || timeFilter || searchTerm) && (
            <button
              onClick={clearFilters}
              className="mt-4 inline-flex items-center gap-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl cursor-pointer transition-colors"
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => {
            const isOverdue = task.dueDate && task.dueDate < todayStr && task.status !== "Completed";
            return (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/80 p-5 shadow-sm hover:shadow-md dark:shadow-none transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {/* Priority badge */}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      task.priority === "High"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                        : task.priority === "Medium"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                        : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                    }`}>
                      {task.priority} Priority
                    </span>
                    {/* Status badge */}
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

                  {/* Title */}
                  <Link
                    to={user?.role === "admin" ? `/admin/tasks/${task.id}` : `/worker/tasks/${task.id}`}
                    className="font-bold text-sm text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-1 mb-2 tracking-tight transition"
                  >
                    {task.title}
                  </Link>

                  {/* Description */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mb-4 leading-relaxed font-normal">
                    {task.description || "No description provided."}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    {/* Assigned user */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <User className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {task.assignedToUser?.name || "Unassigned"}
                      </span>
                    </div>

                    {/* Due Date */}
                    <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-455 flex-shrink-0">
                      <CalendarDays className={`w-3.5 h-3.5 ${isOverdue ? "text-rose-500 dark:text-rose-400" : "text-slate-400 dark:text-slate-500"}`} />
                      <span className={isOverdue ? "text-rose-600 dark:text-rose-400 font-bold" : "text-slate-500 dark:text-slate-400"}>
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No Date"}
                      </span>
                    </div>
                  </div>

                  {/* Overdue Warning */}
                  {isOverdue && (
                    <div className="p-2 bg-rose-50 dark:bg-rose-950/20 rounded-xl flex items-center gap-1.5 text-[9px] font-bold text-rose-800 dark:text-rose-300 border border-rose-100 dark:border-rose-900/40">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>EXPIRED OVERDUE TASK DETECTED</span>
                    </div>
                  )}

                  {/* Bottom Actions Drawer inside card */}
                  <div className="flex items-center justify-between pt-1">
                    <Link
                      to={user?.role === "admin" ? `/admin/tasks/${task.id}` : `/worker/tasks/${task.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/40 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-300 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Details
                    </Link>

                    {user?.role === "admin" ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditClick(task)}
                          className="px-2.5 py-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl border border-transparent hover:border-indigo-200 dark:hover:border-indigo-805/50 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(task)}
                          className="p-1.5 text-rose-600 dark:text-rose-455 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-200 dark:hover:border-rose-900/50 rounded-xl border border-transparent cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      /* Worker Quick status updates */
                      <div className="flex items-center gap-1">
                        {task.status !== "In Progress" && task.status !== "Completed" && (
                          <button
                            onClick={() => handleWorkerStatusToggle(task, "In Progress")}
                            className="px-2.5 py-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-200 dark:hover:border-blue-900/50 border border-transparent rounded-xl cursor-pointer"
                          >
                            Work
                          </button>
                        )}
                        {task.status !== "Completed" && (
                          <button
                            onClick={() => handleWorkerStatusToggle(task, "Completed")}
                            className="px-2.5 py-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-200 dark:hover:border-emerald-900/50 border border-transparent rounded-xl cursor-pointer flex items-center gap-1"
                          >
                            Done
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* --- ADD TASK MODAL (ADMIN ONLY) --- */}
      <AnimatePresence>
        {addModalOpen && user?.role === "admin" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setAddModalOpen(false)}
              className="absolute inset-0 bg-slate-950/75"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg relative z-10 overflow-hidden border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white"
            >
              <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
                <span className="text-sm font-bold text-slate-905 dark:text-white">Create & Assign New Task</span>
                <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                 <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                    Task Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Implement Database Schema Changes"
                    className="block w-full px-4.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-705 rounded-xl text-slate-900 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    value={addForm.title}
                    onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Provide actionable documentation or notes about current task requirements..."
                    className="block w-full px-4.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-705 rounded-xl text-slate-900 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors resize-none"
                    value={addForm.description}
                    onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Worker assignment dropdown */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                      Assign Worker
                    </label>
                    <select
                      required
                      className="block w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-slate-700 dark:text-slate-200 text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                      value={addForm.assignedTo}
                      onChange={(e) => setAddForm({ ...addForm, assignedTo: e.target.value })}
                    >
                      <option value="" className="dark:bg-slate-905">Select Worker</option>
                      {workers.map((w) => (
                        <option key={w.id} value={w.id} className="dark:bg-slate-905">
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Priority dropdown */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                      Priority Level
                    </label>
                    <select
                      required
                      className="block w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-slate-700 dark:text-slate-200 text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                      value={addForm.priority}
                      onChange={(e) => setAddForm({ ...addForm, priority: e.target.value as any })}
                    >
                      <option value="High" className="dark:bg-slate-905">High</option>
                      <option value="Medium" className="dark:bg-slate-905">Medium</option>
                      <option value="Low" className="dark:bg-slate-905">Low</option>
                    </select>
                  </div>

                  {/* Due Date picker */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                      Due Date Checkpoint
                    </label>
                    <input
                      type="date"
                      required
                      className="block w-full px-4.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-slate-900 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                      value={addForm.dueDate}
                      onChange={(e) => setAddForm({ ...addForm, dueDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? "Saving..." : "Create Task"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- EDIT TASK MODAL (ADMIN ONLY) --- */}
      <AnimatePresence>
        {editModalOpen && user?.role === "admin" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditModalOpen(false)}
              className="absolute inset-0 bg-slate-950/75"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg relative z-10 overflow-hidden border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white"
            >
              <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
                <span className="text-sm font-bold text-slate-905 dark:text-white">Edit Task Assignment Details</span>
                <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

               <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                    Task Title
                  </label>
                  <input
                    type="text"
                    required
                    className="block w-full px-4.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-705 rounded-xl text-slate-900 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    className="block w-full px-4.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-705 rounded-xl text-slate-900 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors resize-none"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {/* Assigned worker */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                      Assigned To
                    </label>
                    <select
                      required
                      className="block w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-slate-700 dark:text-slate-200 text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                      value={editForm.assignedTo}
                      onChange={(e) => setEditForm({ ...editForm, assignedTo: e.target.value })}
                    >
                      {workers.map((w) => (
                        <option key={w.id} value={w.id} className="dark:bg-slate-905">
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Priority level */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                      Priority
                    </label>
                    <select
                      required
                      className="block w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-slate-700 dark:text-slate-200 text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                      value={editForm.priority}
                      onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as any })}
                    >
                      <option value="High" className="dark:bg-slate-905">High</option>
                      <option value="Medium" className="dark:bg-slate-905">Medium</option>
                      <option value="Low" className="dark:bg-slate-905">Low</option>
                    </select>
                  </div>

                  {/* Status dropdown */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                      Status State
                    </label>
                    <select
                      required
                      className="block w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-slate-700 dark:text-slate-200 text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                    >
                      <option value="Pending" className="dark:bg-slate-905">Pending</option>
                      <option value="In Progress" className="dark:bg-slate-905">In Progress</option>
                      <option value="Completed" className="dark:bg-slate-905">Completed</option>
                    </select>
                  </div>

                  {/* Due Date picker */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                      Due Date
                    </label>
                    <input
                      type="date"
                      required
                      className="block w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-slate-900 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
                      value={editForm.dueDate}
                      onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? "Updating..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- CONFIRM MANUALLY DELETE TASK --- */}
      <AnimatePresence>
        {deleteConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmOpen(false)}
              className="absolute inset-0 bg-slate-950/75"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm relative z-10 overflow-hidden border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white"
            >
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/20 rounded-full flex items-center justify-center text-rose-505 dark:text-rose-400 mx-auto border border-rose-100 dark:border-rose-909/40">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete Task Permanently?</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Are you sure you want to delete <strong className="text-slate-700 dark:text-slate-200">{selectedTask?.title}</strong>? All associated logs and comment archives will be lost. This cannot be undone.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmOpen(false)}
                    className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteConfirm}
                    disabled={submitting}
                    className="flex-1 py-2 bg-rose-600 text-white font-semibold text-xs rounded-xl hover:bg-rose-700 transition disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? "Deleting..." : "Permanently Delete"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
