import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  Link
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./components/Toast";
import { ThemeProvider } from "./context/ThemeContext";
import DashboardLayout from "./layouts/DashboardLayout";

// Import Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Workers from "./pages/Workers";
import Tasks from "./pages/Tasks";
import TaskDetails from "./pages/TaskDetails";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";

import { ShieldAlert, FileQuestion } from "lucide-react";

// --- PRIVATE ROUTE SHARDS ---

function PrivateState({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-semibold text-slate-500 tracking-wider uppercase">Validating Session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// Admin only route guard
function AdminState({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user || user.role !== "admin") {
    return <ForbiddenScreen />;
  }

  return <>{children}</>;
}

// Worker only route guard
function WorkerState({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user || user.role !== "worker") {
    return <ForbiddenScreen />;
  }

  return <>{children}</>;
}

// Root router dispatcher to route to correct dashboard on load
function RootDispatcher() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  } else {
    return <Navigate to="/worker/dashboard" replace />;
  }
}

// --- ERROR OUTLET SCREENS ---

function ForbiddenScreen() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center border border-rose-500/20 mb-6 animate-pulse">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">403 Access Forbidden</h2>
      <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
        Your current account specifications do not possess the necessary execution clearances to inspect this panel module.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          to="/"
          className="px-6 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-xs rounded-xl shadow-lg transition cursor-pointer"
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
}

function NotFoundScreen() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="w-16 h-16 bg-slate-800 text-emerald-400 rounded-full flex items-center justify-center border border-slate-700/50 mb-6">
        <FileQuestion className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">404 Page Not Found</h2>
      <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">
        We could not find the visual panel or API location you requested. It might have been relocated.
      </p>
      <div className="mt-8">
        <Link
          to="/"
          className="px-6 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-xs rounded-xl shadow-lg transition cursor-pointer"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

// --- APP COMPONENT MAIN ASSEMBLY ---

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              {/* Public Entry route */}
              <Route path="/login" element={<Login />} />

              {/* Admin Scope Protected Routes */}
              <Route
                path="/admin/*"
                element={
                  <PrivateState>
                    <AdminState>
                      <DashboardLayout>
                        <Routes>
                          <Route path="dashboard" element={<Dashboard />} />
                          <Route path="workers" element={<Workers />} />
                          <Route path="tasks" element={<Tasks />} />
                          <Route path="tasks/:id" element={<TaskDetails />} />
                          <Route path="reports" element={<Reports />} />
                          <Route path="profile" element={<Profile />} />
                          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                        </Routes>
                      </DashboardLayout>
                    </AdminState>
                  </PrivateState>
                }
              />

              {/* Worker Scope Protected Routes */}
              <Route
                path="/worker/*"
                element={
                  <PrivateState>
                    <WorkerState>
                      <DashboardLayout>
                        <Routes>
                          <Route path="dashboard" element={<Dashboard />} />
                          <Route path="tasks" element={<Tasks />} />
                          <Route path="tasks/:id" element={<TaskDetails />} />
                          <Route path="profile" element={<Profile />} />
                          <Route path="*" element={<Navigate to="/worker/dashboard" replace />} />
                        </Routes>
                      </DashboardLayout>
                    </WorkerState>
                  </PrivateState>
                }
              />

              {/* Dispatch root dispatcher */}
              <Route path="/" element={<RootDispatcher />} />

              {/* 404 Route Catchall page */}
              <Route path="*" element={<NotFoundScreen />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}
