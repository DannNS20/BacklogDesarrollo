import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import Admins from './pages/Admins';
import Attendance from './pages/Attendance';
import Dashboard from './pages/Dashboard';
import AdminLogin from './pages/Login';
import Notifications from './pages/Notifications';
import StudentDetail from './pages/StudentDetail';
import StudentForm from './pages/StudentForm';
import Students from './pages/Students';
import { RequireSession, SessionProvider, useSession } from './session';

function SuperadminOnly({ children }: { children: ReactNode }) {
  const { user } = useSession();
  return user?.role === 'superadmin' ? children : <Navigate to="/admin" replace />;
}

export default function AdminPortal() {
  return (
    <SessionProvider>
      <Routes>
        <Route path="acceso" element={<AdminLogin />} />
        <Route
          element={
            <RequireSession loginPath="/admin/acceso">
              <AdminLayout />
            </RequireSession>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="prestadores" element={<Students />} />
          <Route path="prestadores/nuevo" element={<StudentForm />} />
          <Route path="prestadores/:id" element={<StudentDetail />} />
          <Route path="prestadores/:id/editar" element={<StudentForm />} />
          <Route path="asistencias" element={<Attendance />} />
          <Route path="notificaciones" element={<Notifications />} />
          <Route
            path="responsables"
            element={
              <SuperadminOnly>
                <Admins />
              </SuperadminOnly>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </SessionProvider>
  );
}
