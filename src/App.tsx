import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Landing from './portals/Landing';
import { FullPageLoader } from './ui/Display';
import { ToastProvider } from './ui/ToastProvider';

// Cada portal se descarga por separado: el estudiante nunca recibe el código del panel administrativo
const StudentPortal = lazy(() => import('./portals/student/StudentPortal'));
const AdminPortal = lazy(() => import('./portals/admin/AdminPortal'));

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Suspense fallback={<FullPageLoader />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/estudiante/*" element={<StudentPortal />} />
            <Route path="/admin/*" element={<AdminPortal />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ToastProvider>
    </BrowserRouter>
  );
}
