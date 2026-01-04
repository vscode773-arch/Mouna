import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import OneSignal from 'react-onesignal';
import Layout from './components/Layout';

// Lazy loading components for performance optimization
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const Settings = lazy(() => import('./pages/Settings'));
const ScanPage = lazy(() => import('./pages/Scan'));

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return children;
};

export default function App() {
  useEffect(() => {
    // 1. Initialize Dark Mode
    const savedMode = localStorage.getItem('darkMode');
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedMode === 'true' || (savedMode === null && isSystemDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // 2. Initialize OneSignal with explicit scope and path
    try {
      OneSignal.init({
        appId: "b652d9f4-6251-4741-af3d-f1cea47e50d8",
        allowLocalhostAsSecureOrigin: true,
        // CRITICAL: Point to the merged service worker we created
        serviceWorkerPath: "sw.js",
        serviceWorkerParam: { scope: "/" },
        notifyButton: {
          enable: true,
        },
      }).then(() => {
        console.log("OneSignal Initialized Successfully");
        OneSignal.Slidedown.promptPush();
      });
    } catch (error) {
      console.error("OneSignal Init Error:", error);
    }
  }, []);

  return (
    <AuthProvider>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="scan" element={<ScanPage />} />
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
