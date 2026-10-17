import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import BottomNav from './components/BottomNav';
import { useAuth } from './context/AuthContext';

const BeneficiariesPage = lazy(() => import('./pages/BeneficiariesPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ScanPage = lazy(() => import('./pages/ScanPage'));
const AttendancePage = lazy(() => import('./pages/AttendancePage'));
const AdminStudentsPage = lazy(() => import('./pages/AdminStudentsPage'));

const LoadingFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
    <div className="spinner spinner-lg" style={{ borderTopColor: '#3b82f6', borderColor: 'rgba(59,130,246,0.3)' }} />
  </div>
);

const AppRoutes: React.FC = () => {
  const { staff } = useAuth();

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route
          path="/login"
          element={staff ? <Navigate to="/scan" replace /> : <LoginPage />}
        />
        <Route
          path="/scan"
          element={
            <ProtectedRoute>
              <div className="app-container">
                <ScanPage />
                <BottomNav />
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <AdminStudentsPage />
                <BottomNav />
              </div>
            </ProtectedRoute>
          }
        />
        <Route path="/beneficiaries-3b" element={<ProtectedRoute><div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}><BeneficiariesPage /><BottomNav /></div></ProtectedRoute>} />
        <Route path="/students" element={<Navigate to="/admin" replace />} />
        <Route
          path="/attendance"
          element={
            <ProtectedRoute>
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <AttendancePage />
                <BottomNav />
              </div>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/scan" replace />} />
        <Route path="*" element={<Navigate to="/scan" replace />} />
      </Routes>
    </Suspense>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
