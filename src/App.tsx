import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { MainLayout } from './components/layouts/MainLayout';
import { ProtectedRoute } from './components/routes/ProtectedRoute';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/public/LoginPage';
import { UnauthorizedPage } from './pages/public/UnauthorizedPage';
import { NotFoundPage } from './pages/public/NotFoundPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ChildrenManagement } from './pages/admin/ChildrenManagement';
import { FamiliesManagement } from './pages/admin/FamiliesManagement';
import { RoomsManagement } from './pages/admin/RoomsManagement';
import { UsersManagement } from './pages/admin/UsersManagement';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { FeesManagement } from './pages/admin/FeesManagement';

// Shared / Role-specific Pages
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { ParentPortalPage } from './pages/parent/ParentPortalPage';
import { LinkChildPage } from './pages/parent/LinkChildPage';
import { AttendancePage } from './pages/attendance/AttendancePage';
import { ActivitiesPage } from './pages/activities/ActivitiesPage';
import { ChildProfilePage } from './pages/children/ChildProfilePage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/no-autorizado" element={<UnauthorizedPage />} />
          <Route path="/vincular-hijo" element={<LinkChildPage />} />

          {/* Authenticated Protected Routes inside MainLayout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              {/* Admin Specific Routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/familias" element={<FamiliesManagement />} />
                <Route path="/admin/salas" element={<RoomsManagement />} />
                <Route path="/admin/usuarios" element={<UsersManagement />} />
                <Route path="/admin/cuotas" element={<FeesManagement />} />
                <Route path="/admin/auditoria" element={<AuditLogsPage />} />
              </Route>

              {/* Children Management (Accessible to Admin and Teacher) */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'teacher']} />}>
                <Route path="/admin/ninos" element={<ChildrenManagement />} />
              </Route>

              {/* Teacher Dashboard */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'teacher']} />}>
                <Route path="/docente" element={<TeacherDashboard />} />
              </Route>

              {/* Family Portal */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'parent']} />}>
                <Route path="/familia" element={<ParentPortalPage />} />
              </Route>

              {/* Common Modules with internal role restrictions */}
              <Route path="/asistencia" element={<AttendancePage />} />
              <Route path="/actividades" element={<ActivitiesPage />} />
              <Route path="/perfil-nino/:id" element={<ChildProfilePage />} />
            </Route>
          </Route>

          {/* 404 Catch All */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
