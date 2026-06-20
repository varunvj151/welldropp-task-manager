import React, { useEffect, useState } from "react";
import api, { extractErrorMessage } from "../services/api";
import { useToast } from "../components/Toast";
import { motion } from "motion/react";
import {
  LineChart,
  Trophy,
  CheckCircle,
  FileText,
  AlertTriangle,
  Users,
  Percent,
  TrendingUp,
  BarChart4
} from "lucide-react";

interface WorkerStat {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  totalTasks: number;
  completed: number;
  pending: number;
  inProgress: number;
  completionPercentage: number;
}

interface ReportData {
  totalTasksCount: number;
  totalCompletedCount: number;
  completionPercentage: number;
  mostProductiveWorker: string;
  highPriorityPendingCount: number;
  tasksPerWorker: WorkerStat[];
}

export default function Reports() {
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportData | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.get("/reports");
      setData(res.data);
    } catch (err: any) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-slate-200 animate-pulse rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 animate-pulse rounded-2xl"></div>
          ))}
        </div>
        <div className="h-96 bg-slate-200 animate-pulse rounded-2xl"></div>
      </div>
    );
  }

  if (!data) return null;

  // Find worker with highest total completion
  const sortedWorkers = [...data.tasksPerWorker].sort((a, b) => b.completed - a.completed);
  const highestCompletedWorker = sortedWorkers[0];

  return (
    <div className="space-y-8 text-slate-800 dark:text-slate-150">
      {/* Visual Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white md:text-2xl">Operations & Productivity Report</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Explore active workloads, complete delivery lists, and team analytics.</p>
      </div>

      {/* Analytics widgets board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Completion percentage card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-450 tracking-widest uppercase">General Completion</p>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{data.completionPercentage}%</h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block">
              {data.totalCompletedCount} of {data.totalTasksCount} tasks completed
            </span>
          </div>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl text-emerald-500 flex items-center justify-center">
            <Percent className="w-6 h-6" />
          </div>
        </div>

        {/* Most productive worker card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1 text-xs">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase mb-1">Most Productive Employee</p>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate max-w-[150px]">
              {data.mostProductiveWorker}
            </h3>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" />
              {highestCompletedWorker && highestCompletedWorker.completed > 0 
                ? `${highestCompletedWorker.completed} tasks marked completed`
                : "No completions recorded yet"}
            </span>
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl text-amber-500 flex items-center justify-center">
            <Trophy className="w-6 h-6" />
          </div>
        </div>

        {/* Total Tasks Count */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-450 tracking-widest uppercase">System Wide Tasks</p>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{data.totalTasksCount}</h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block">
              Created assignments active in system
            </span>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl text-blue-500 flex items-center justify-center font-bold">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* High priority backlog tasks */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-450 tracking-widest uppercase">Urgent Backlogs</p>
            <h3 className="text-3xl font-extrabold text-red-600 dark:text-red-400">{data.highPriorityPendingCount}</h3>
            <span className="text-[10px] text-red-500 dark:text-red-400 font-bold block">
              High priority pending or active tasks
            </span>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-xl text-red-500 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Analytics Visual Chart and Efficiency Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Workers efficiency breakdown list */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Team Workload & Completion Ratios</h4>
              <p className="text-xs text-slate-500 dark:text-slate-450 mt-0.5">Summary stat analysis per assigned worker.</p>
            </div>
            <Users className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          </div>

          <div className="p-6 overflow-x-auto flex-1 flex flex-col justify-between">
            {data.tasksPerWorker.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-550">
                <p className="text-xs font-semibold">No active workers recorded.</p>
              </div>
            ) : (
              <table className="w-full text-left font-normal border-collapse mt-1">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider pb-3">
                    <th className="pb-3 pr-4">Worker Profile</th>
                    <th className="pb-3 text-center">Assigned</th>
                    <th className="pb-3 text-center text-emerald-600 dark:text-emerald-450">Done</th>
                    <th className="pb-3 text-center text-blue-600 dark:text-blue-450">Pending</th>
                    <th className="pb-3 text-right">Completion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 italic-text-none text-xs leading-normal">
                  {data.tasksPerWorker.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-950/20 transition">
                      <td className="py-3.5 pr-4">
                        <div className="min-w-0 flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-[11px] uppercase flex-shrink-0">
                            {w.name[0]}
                          </div>
                          <div className="truncate">
                            <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">{w.name}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate font-mono">{w.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 text-center font-bold text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {w.totalTasks}
                      </td>
                      <td className="py-3.5 text-center font-bold text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                        {w.completed}
                      </td>
                      <td className="py-3.5 text-center font-bold text-xs text-blue-500 dark:text-blue-400 font-mono">
                        {w.pending + w.inProgress}
                      </td>
                      <td className="py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-3">
                          <div className="w-24 bg-slate-100 dark:bg-slate-950 rounded-full h-1.5 hidden sm:block overflow-hidden border border-slate-150 dark:border-slate-800">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all"
                              style={{ width: `${w.completionPercentage}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">{w.completionPercentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Visual interactive chart panel */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Operational Breakdown Chart</h4>
            <BarChart4 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          </div>

          <div className="p-6 flex-1 flex flex-col justify-center text-xs">
            {/* Custom SVG Bar Chart */}
            {data.totalTasksCount === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-550 text-xs">
                No active tasks recorded to display.
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-705 dark:text-slate-350 mb-1.5">
                    <span>Completed Tasks Ratio</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">{data.totalCompletedCount} Tasks ({data.completionPercentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-955 h-3.5 rounded-full overflow-hidden border border-slate-150 dark:border-slate-850 p-0.5">
                    <div
                      className="bg-emerald-400 h-full rounded-full transition-all duration-500 shadow-sm"
                      style={{ width: `${data.completionPercentage}%` }}
                    />
                  </div>
                </div>

                <div>
                  {/* High priority pending chart */}
                  <div className="flex justify-between text-xs font-bold text-slate-705 dark:text-slate-350 mb-1.5">
                    <span>Pending Workloads</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold font-mono">{data.totalTasksCount - data.totalCompletedCount} Tasks</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-955 h-3.5 rounded-full overflow-hidden border border-slate-150 dark:border-slate-850 p-0.5">
                    <div
                      className="bg-blue-400 h-full rounded-full transition-all duration-500 shadow-sm"
                      style={{ width: `${100 - data.completionPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Legend list */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-400 flex-shrink-0" />
                    <span>Completed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-blue-400 flex-shrink-0" />
                    <span>Pending Work</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
