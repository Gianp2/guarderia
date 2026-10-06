import React from 'react';
import { Outlet, useLocation, NavLink } from 'react-router-dom';
import { Sidebar } from '../common/Sidebar';
import { Header } from '../common/Header';
import { 
  LayoutDashboard, 
  CalendarCheck2, 
  DoorClosed, 
  Baby,
  Heart,
  CreditCard,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const MainLayout: React.FC = () => {
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
        { to: '/admin/salas', label: 'Salas', icon: DoorClosed },
        { to: '/admin/cuotas', label: 'Cuotas', icon: CreditCard },
        { to: '/asistencia', label: 'Asistencia', icon: CalendarCheck2 },
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

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, [location.pathname]);

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-[#FBFBFA] flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Desktop Persistent Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="lg:pl-68 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
        <Header title={title} />

        <main className="flex-1 px-3.5 sm:px-6 lg:px-8 pt-24 sm:pt-28 lg:pt-30 pb-20 lg:pb-12 max-w-7xl w-full mx-auto overflow-x-hidden">
          <div key={location.pathname} className="animate-page-enter pt-2 sm:pt-3">
            <Outlet />
          </div>
        </main>

        {/* Compact Mobile Bottom Navigation Bar with Glassmorphism */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-[#E9ECEF] z-30 px-2 py-1.5 flex items-center justify-around shadow-lg transition-all duration-200">
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
