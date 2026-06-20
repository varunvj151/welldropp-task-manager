import React, { useEffect, useState } from "react";
import { useToast } from "../components/Toast";
import api, { extractErrorMessage } from "../services/api";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  UserPlus,
  Shield,
  User,
  Power,
  KeyRound,
  Trash2,
  X,
  Lock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from "lucide-react";

export default function Workers() {
  const { toast } = useToast();

  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Selected worker details
  const [selectedWorker, setSelectedWorker] = useState<any>(null);

  // Forms states
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    isActive: true,
  });

  const [resetForm, setResetForm] = useState({
    password: "",
    confirmPassword: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/workers", {
        params: { search: searchTerm },
      });
      setWorkers(res.data);
      // Reset page to 1 on search
      setCurrentPage(1);
    } catch (err: any) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, [searchTerm]);

  // Add Worker Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name || !addForm.email || !addForm.password || !addForm.confirmPassword) {
      toast.error("All fields are required");
      return;
    }
    if (addForm.password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }
    if (addForm.password !== addForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/workers", addForm);
      toast.success("Worker account created successfully!");
      setAddModalOpen(false);
      setAddForm({ name: "", email: "", password: "", confirmPassword: "" });
      fetchWorkers();
    } catch (err: any) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Worker Click
  const handleEditClick = (worker: any) => {
    setSelectedWorker(worker);
    setEditForm({
      name: worker.name,
      email: worker.email,
      isActive: worker.isActive,
    });
    setEditModalOpen(true);
  };

  // Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name || !editForm.email) {
      toast.error("Name and Email are required");
      return;
    }

    try {
      setSubmitting(true);
      await api.put(`/workers/${selectedWorker.id}`, editForm);
      toast.success("Worker details updated!");
      setEditModalOpen(false);
      fetchWorkers();
    } catch (err: any) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Reset password Click
  const handleResetClick = (worker: any) => {
    setSelectedWorker(worker);
    setResetForm({ password: "", confirmPassword: "" });
    setResetModalOpen(true);
  };

  // Reset password submit
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetForm.password || !resetForm.confirmPassword) {
      toast.error("Both password fields are required");
      return;
    }
    if (resetForm.password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }
    if (resetForm.password !== resetForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setSubmitting(true);
      await api.put(`/workers/${selectedWorker.id}`, {
        password: resetForm.password,
      });
      toast.success("Worker password reset successfully!");
      setResetModalOpen(false);
    } catch (err: any) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle worker status directly (Enable / Disable)
  const handleStatusToggle = async (worker: any) => {
    try {
      const updatedStatus = !worker.isActive;
      await api.put(`/workers/${worker.id}`, { isActive: updatedStatus });
      toast.success(`Worker account ${updatedStatus ? "Enabled" : "Disabled"} successfully`);
      fetchWorkers();
    } catch (err: any) {
      toast.error(extractErrorMessage(err));
    }
  };

  // Soft Delete Worker Confirm
  const handleDeleteClick = (worker: any) => {
    setSelectedWorker(worker);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setSubmitting(true);
      await api.delete(`/workers/${selectedWorker.id}`);
      toast.success("Worker deactivated (soft deleted) successfully");
      setDeleteConfirmOpen(false);
      fetchWorkers();
    } catch (err: any) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Pagination calculation
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentWorkers = workers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(workers.length / itemsPerPage);

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-150">
      {/* Header and Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white md:text-2xl">Workers Management</h2>
          <p className="text-xs text-slate-505 dark:text-slate-400 mt-0.5">Define, review, disable, or reset passwords for employees.</p>
        </div>
        <button
          onClick={() => {
            setAddForm({ name: "", email: "", password: "", confirmPassword: "" });
            setAddModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md cursor-pointer transition-colors self-start sm:self-center"
        >
          <UserPlus className="w-4 h-4 text-indigo-400 dark:text-white" />
          Add Worker
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="relative max-w-md w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-950 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            placeholder="Search workers by name or email Address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Workers Table Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : workers.length === 0 ? (
          <div className="py-16 text-center">
            <User className="w-12 h-12 text-slate-300 dark:text-slate-650 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No workers found.</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try broadening your search query or registering a new worker account.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 italic-text-none">
                {currentWorkers.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center uppercase">
                          {w.name[0]}
                        </div>
                        <span className="text-xs font-bold text-slate-950 dark:text-white">{w.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                      {w.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        <Shield className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                        Worker
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        w.isActive
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
                      }`}>
                        {w.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Toggle active / suspend */}
                        <button
                          onClick={() => handleStatusToggle(w)}
                          title={w.isActive ? "Disable Worker" : "Enable Worker"}
                          className={`p-1.5 rounded-lg border transition ${
                            w.isActive
                              ? "border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                              : "border-indigo-200 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                          } cursor-pointer`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        
                        {/* Reset password */}
                        <button
                          onClick={() => handleResetClick(w)}
                          title="Reset Password"
                          className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>

                        {/* Edit details */}
                        <button
                          onClick={() => handleEditClick(w)}
                          className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition"
                        >
                          Edit
                        </button>

                        {/* Soft Delete */}
                        <button
                          onClick={() => handleDeleteClick(w)}
                          title="Deactivate / Delete Worker"
                          className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-200 dark:hover:border-red-900/40 cursor-pointer transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {!loading && workers.length > itemsPerPage && (
          <div className="bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-450 font-semibold uppercase tracking-wider">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 select-none cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 select-none cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- ADD WORKER MODAL --- */}
      <AnimatePresence>
        {addModalOpen && (
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
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white"
            >
              <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
                <span className="text-sm font-bold text-slate-900 dark:text-white">Add New Worker Account</span>
                <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                    Worker Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Varun Kumar"
                    className="block w-full px-4.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="varun@welldropp.com"
                    className="block w-full px-4.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      className="block w-full px-4.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                      value={addForm.password}
                      onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                      Confirm
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      className="block w-full px-4.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                      value={addForm.confirmPassword}
                      onChange={(e) => setAddForm({ ...addForm, confirmPassword: e.target.value })}
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
                    className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {submitting ? "Creating..." : "Save Worker"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- EDIT DETAILS MODAL --- */}
      <AnimatePresence>
        {editModalOpen && (
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
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white"
            >
              <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
                <span className="text-sm font-bold text-slate-900 dark:text-white">Edit Worker Profile</span>
                <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-550 dark:hover:text-slate-300 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    className="block w-full px-4.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    className="block w-full px-4.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-3 py-1">
                  <input
                    type="checkbox"
                    id="edit-is-active"
                    className="w-4 h-4 bg-transparent border-slate-200 dark:border-slate-800 rounded text-indigo-600 focus:ring-indigo-500/20"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  />
                  <label htmlFor="edit-is-active" className="text-xs font-bold text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                    Account Status Active
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-355 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? "Saving..." : "Save Updates"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- RESET PASSWORD INDIVIDUAL MODAL --- */}
      <AnimatePresence>
        {resetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setResetModalOpen(false)}
              className="absolute inset-0 bg-slate-955/75"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm relative z-10 overflow-hidden border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white"
            >
              <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
                <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <Lock className="w-4 h-4" />
                  Reset Password
                </span>
                <button onClick={() => setResetModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-550 dark:hover:text-slate-300 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleResetSubmit} className="p-6 space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Update secure password credentials for worker <strong className="text-slate-700 dark:text-slate-200">{selectedWorker?.name}</strong>.
                </p>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                    New Secure Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Minimum 8 characters"
                    className="block w-full px-4.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    value={resetForm.password}
                    onChange={(e) => setResetForm({ ...resetForm, password: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Verify entry"
                    className="block w-full px-4.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl text-slate-950 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    value={resetForm.confirmPassword}
                    onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setResetModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? "Resetting..." : "Reset Password"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- CONFIRM SOFT-DELETE WORKER --- */}
      <AnimatePresence>
        {deleteConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmOpen(false)}
              className="absolute inset-0 bg-slate-955/75"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm relative z-10 overflow-hidden border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white"
            >
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/20 rounded-full flex items-center justify-center text-rose-500 dark:text-rose-400 mx-auto border border-rose-100 dark:border-rose-900/40">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Suspend Worker Account?</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    This will disable <strong className="text-slate-700 dark:text-slate-200">{selectedWorker?.name}</strong> from logging into their workspace.
                    Their task history, logs, and comments remain preserved.
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
                    {submitting ? "Disabling..." : "Confirm Suspend"}
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
