import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import OneSignal from 'react-onesignal';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import AuditLog from './pages/AuditLog';
import Settings from './pages/Settings';
import ScanPage from './pages/Scan';

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
    // Initialize OneSignal
    try {
      OneSignal.init({
        appId: "YOUR-ONESIGNAL-APP-ID-HERE", // الاستبدال بـ App ID الخاص بك
        allowLocalhostAsSecureOrigin: true, // للسماح بالتجربة على الجهاز المحلي
        notifyButton: {
          enable: true,
        },
      }).then(() => {
        console.log("OneSignal Initialized");
        // OneSignal.Slidedown.promptPush(); // طلب الإذن فوراً إذا أردت
      });
    } catch (error) {
      console.error("OneSignal Init Error:", error);
    }
  }, []);

  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}
