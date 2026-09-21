import { Navigate, Route, Routes } from 'react-router-dom';
import StudentHistory from './pages/History';
import StudentHome from './pages/Home';
import StudentLogin from './pages/Login';
import StudentProfile from './pages/Profile';
import RecoverPassword from './pages/RecoverPassword';
import { RequireSession, SessionProvider } from './session';
import StudentLayout from './StudentLayout';

export default function StudentPortal() {
  return (
    <SessionProvider>
      <Routes>
        <Route path="acceso" element={<StudentLogin />} />
        <Route path="recuperar" element={<RecoverPassword />} />
        <Route
          element={
            <RequireSession loginPath="/estudiante/acceso">
              <StudentLayout />
            </RequireSession>
          }
        >
          <Route index element={<StudentHome />} />
          <Route path="historial" element={<StudentHistory />} />
          <Route path="perfil" element={<StudentProfile />} />
        </Route>
        <Route path="*" element={<Navigate to="/estudiante" replace />} />
      </Routes>
    </SessionProvider>
  );
}
