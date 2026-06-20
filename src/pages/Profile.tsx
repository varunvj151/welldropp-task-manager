import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { useTheme } from "../context/ThemeContext";
import api, { extractErrorMessage } from "../services/api";
import { motion } from "motion/react";
import {
  User,
  Mail,
  ShieldAlert,
  CalendarDays,
  KeyRound,
  Eye,
  CheckCircle,
  AlertCircle,
  Sun,
  Moon
} from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { theme, setTheme } = useTheme();
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error("Please enter all required password fields.");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New password and confirmation fields do not match.");
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/change-password", passwordForm);
      toast.success("Security password changed successfully!");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-8 max-w-4xl mx-auto text-slate-800 dark:text-slate-100">
      {/* Header element */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white md:text-2xl">My Account Settings</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage your personal credentials, custom themes, and security profiles.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left column: Overview parameters & Appearance Settings */}
        <div className="space-y-6">
          {/* Overview Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-sm p-6 space-y-6">
            <div className="text-center space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-700 text-xl flex items-center justify-center uppercase mx-auto">
                {user.name ? user.name[0] : "?"}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</h3>
                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 dark:bg-slate-800 text-indigo-400 dark:text-indigo-300 capitalize mt-1 border border-slate-800 dark:border-slate-700">
                  {user.role} Account
                </span>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Email */}
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-slate-400 dark:text-slate-550 uppercase text-[9px] tracking-wider">Email Address</p>
                  <p className="text-slate-800 dark:text-slate-200 font-semibold truncate font-mono mt-0.5">{user.email}</p>
                </div>
              </div>

              {/* Role details */}
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                <div>
                  <p className="font-bold text-slate-400 dark:text-slate-550 uppercase text-[9px] tracking-wider">Scope Access Level</p>
                  <p className="text-slate-800 dark:text-slate-200 font-semibold capitalize mt-0.5">{user.role}</p>
                </div>
              </div>

              {/* Created on */}
              <div className="flex items-center gap-3">
                <CalendarDays className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                <div>
                  <p className="font-bold text-slate-400 dark:text-slate-550 uppercase text-[9px] tracking-wider">Account Registered Date</p>
                  <p className="text-slate-800 dark:text-slate-200 font-semibold font-mono mt-0.5">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Predefined"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Appearance Settings Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-sm p-6 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-orange-500 dark:text-amber-500" />
                Appearance Settings
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Customize your interface workspace appearance preference.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950/40 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
              <button
                onClick={() => setTheme("light")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  theme === "light"
                    ? "bg-white dark:bg-slate-850 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-700/50"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Sun className="w-4 h-4" />
                Light
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  theme === "dark"
                    ? "bg-white dark:bg-slate-850 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-700/50"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                Dark
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Password update forms */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-850 shadow-sm p-6">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 pl-1 flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-slate-400 dark:text-slate-550" />
            Security Credential Updates
          </h3>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            
            {/* Current Password */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-widest mb-1.5">
                Current Password Check
              </label>
              <input
                type="password"
                required
                placeholder="Verify your existing credentials"
                className="block w-full px-4.5 py-2.5 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* New Password */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-widest mb-1.5">
                  New Secure Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  className="block w-full px-4.5 py-2.5 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                />
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-widest mb-1.5">
                  Confirm Password Entry
                </label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter password entries"
                  className="block w-full px-4.5 py-2.5 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2.5 bg-slate-900 dark:bg-indigo-600 dark:hover:bg-indigo-505 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
              >
                {submitting ? "Updating..." : "Save Password Changes"}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
