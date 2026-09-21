import { Navigate, Route, Routes } from 'react-router-dom';
import PersonHistory from './pages/History';
import PersonHome from './pages/Home';
import PersonLogin from './pages/Login';
import PersonProfile from './pages/Profile';
import PersonLayout from './PersonLayout';
import { RequireSession, SessionProvider } from './session';

export default function PersonPortal() {
  return (
    <SessionProvider>
      <Routes>
        <Route path="entrar" element={<PersonLogin />} />
        <Route
          element={
            <RequireSession loginPath="/acceso/entrar">
              <PersonLayout />
            </RequireSession>
          }
        >
          <Route index element={<PersonHome />} />
          <Route path="historial" element={<PersonHistory />} />
          <Route path="perfil" element={<PersonProfile />} />
        </Route>
        <Route path="*" element={<Navigate to="/acceso" replace />} />
      </Routes>
    </SessionProvider>
  );
}
