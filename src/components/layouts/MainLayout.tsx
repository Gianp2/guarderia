import React, { useState } from 'react';
import { Outlet, useLocation, NavLink } from 'react-router-dom';
import { Sidebar } from '../common/Sidebar';
import { Header } from '../common/Header';
import { 
  LayoutDashboard, 
  CalendarCheck2, 
  BookOpen, 
  Baby,
  Heart,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { role, userProfile } = useAuth();

  const getPageTitle = (pathname: string) => {
    if (pathname.includes('/admin/ninos')) return 'Gestión de Niños';
    if (pathname.includes('/admin/familias')) return 'Familias y Tutores';
    if (pathname.includes('/admin/salas')) return 'Salas y Espacios';
    if (pathname.includes('/admin/usuarios')) return 'Control de Usuarios';
    if (pathname.includes('/admin/cuotas')) return 'Cuotas y Cobranzas';
    if (pathname.includes('/admin/auditoria')) return 'Auditoría Administrativa';
    if (pathname.includes('/admin')) return 'Panel de Dirección';
    if (pathname.includes('/docente')) return 'Espacio Docente';
    if (pathname.includes('/asistencia')) return 'Control de Asistencia';
    if (pathname.includes('/actividades')) return 'Bitácora y Novedades';
    if (pathname.includes('/perfil-nino')) return 'Expediente Infantil';
    if (pathname.includes('/familia')) return 'Portal para Familias';
    return 'Plataforma Guardería';
  };

  const title = getPageTitle(location.pathname);

  // Mobile Bottom Nav items depending on role
  const getMobileNavItems = () => {
    if (role === 'admin') {
      return [
        { to: '/admin', label: 'Inicio', icon: LayoutDashboard },
        { to: '/admin/ninos', label: 'Niños', icon: Baby },
        { to: '/admin/cuotas', label: 'Cuotas', icon: CreditCard },
        { to: '/asistencia', label: 'Asistencia', icon: CalendarCheck2 },
        { to: '/actividades', label: 'Bitácora', icon: BookOpen },
      ];
    }
    if (role === 'teacher') {
      return [
        { to: '/docente', label: 'Mi Sala', icon: LayoutDashboard },
        { to: '/admin/ninos', label: 'Alumnos', icon: Baby },
        { to: '/asistencia', label: 'Asistencia', icon: CalendarCheck2 },
        { to: '/actividades', label: 'Bitácora', icon: BookOpen },
      ];
    }
    const primaryChildId = userProfile?.linkedChildIds?.[0] || 'child-mateo';
    return [
      { to: '/familia', label: 'Familia', icon: Heart },
      { to: `/perfil-nino/${primaryChildId}`, label: 'Mi Hijo', icon: Baby },
      { to: '/asistencia', label: 'Asistencia', icon: CalendarCheck2 },
      { to: '/actividades', label: 'Bitácora', icon: BookOpen },
    ];
  };

  const mobileNavItems = getMobileNavItems();

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-[#FBFBFA] flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Sidebar for desktop and mobile drawer */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="lg:pl-68 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
        <Header 
          onToggleSidebar={() => setSidebarOpen(true)} 
          title={title} 
        />

        <main className="flex-1 px-4 sm:px-8 pt-20 sm:pt-24 pb-24 lg:pb-8 max-w-7xl w-full mx-auto overflow-x-hidden">
          <div key={location.pathname} className="animate-page-enter">
            <Outlet />
          </div>
        </main>

        {/* Compact Mobile Bottom Navigation Bar with Glassmorphism */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/85 backdrop-blur-md border-t border-[#E9ECEF] z-30 px-2 py-1.5 flex items-center justify-around shadow-lg transition-all duration-200">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center py-1 px-3 rounded-xl transition-all duration-150 active:scale-95 cursor-pointer ${
                    isActive
                      ? 'text-[#1B4332] font-bold scale-105 bg-[#EBF3ED]/80 shadow-2xs'
                      : 'text-gray-400 hover:text-gray-600 font-medium'
                  }`
                }
              >
                <Icon className="w-5 h-5 mb-0.5 transition-transform duration-150" />
                <span className="text-[10px] tracking-tight">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
