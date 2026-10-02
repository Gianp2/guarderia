import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Baby, 
  Users, 
  DoorClosed, 
  UserCheck, 
  CalendarCheck2, 
  BookOpen, 
  ShieldAlert, 
  Heart,
  GraduationCap,
  Sparkles,
  CreditCard,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { role, userProfile } = useAuth();

  // Prevent background scroll when mobile sidebar menu is open
  useBodyScrollLock(isOpen);

  const getNavLinks = (): NavItem[] => {
    if (role === 'admin') {
      return [
        { to: '/admin', label: 'Panel Principal', icon: LayoutDashboard },
        { to: '/admin/ninos', label: 'Gestión de Niños', icon: Baby },
        { to: '/admin/familias', label: 'Familias y Tutores', icon: Users },
        { to: '/admin/salas', label: 'Salas y Espacios', icon: DoorClosed },
        { to: '/admin/cuotas', label: 'Cuotas y Cobranzas', icon: CreditCard },
        { to: '/admin/usuarios', label: 'Control de Usuarios', icon: UserCheck },
        { to: '/asistencia', label: 'Control Asistencia', icon: CalendarCheck2 },
        { to: '/actividades', label: 'Bitácora y Novedades', icon: BookOpen },
        { to: '/admin/auditoria', label: 'Registro de Auditoría', icon: ShieldAlert },
      ];
    }

    if (role === 'teacher') {
      return [
        { to: '/docente', label: 'Mi Espacio Docente', icon: GraduationCap },
        { to: '/asistencia', label: 'Tomar Asistencia', icon: CalendarCheck2 },
        { to: '/actividades', label: 'Bitácora y Novedades', icon: BookOpen },
        { to: '/admin/ninos', label: 'Niños de mi Sala', icon: Baby },
      ];
    }

    // Default / Parent Role
    const primaryChildId = userProfile?.linkedChildIds?.[0] || 'child-mateo';
    return [
      { to: '/familia', label: 'Portal Familiar', icon: Heart },
      { to: `/perfil-nino/${primaryChildId}`, label: 'Perfil de mi Hijo', icon: Baby },
      { to: '/asistencia', label: 'Historial Asistencia', icon: CalendarCheck2 },
      { to: '/actividades', label: 'Bitácora y Novedades', icon: BookOpen },
    ];
  };

  const links = getNavLinks();

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-[#1A2621]/40 backdrop-blur-xs z-50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-68 bg-[#FAF9F5] border-r border-[#E9ECEF] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Nursery Brand Header */}
        <div className="p-6 border-b border-[#E9ECEF] flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-[#52796F] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Baby className="w-6 h-6" />
            </div>
            <div>
              <span className="text-base font-extrabold text-[#1B4332] tracking-tight block">
                Nido Cuidado
              </span>
              <span className="text-[11px] font-medium text-[#52796F] block tracking-wide uppercase">
                Guardería Infantil
              </span>
            </div>
          </NavLink>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Módulos del Sistema
          </div>

          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-medium transition-all duration-150 active:scale-97 cursor-pointer ${
                    isActive
                      ? 'bg-[#EBF3ED] text-[#1B4332] font-bold shadow-2xs border border-[#D1E4D7] translate-x-1'
                      : 'text-gray-600 hover:bg-[#F3EFEA] hover:text-gray-900 hover:translate-x-0.5'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-[#52796F] transition-transform duration-150 group-hover:scale-110" />
                  <span>{link.label}</span>
                </div>
                {link.badge && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD] transition-transform duration-150">
                    {link.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Footer Info Box */}
        <div className="p-4 border-t border-[#E9ECEF] bg-white/70">
          <div className="p-3 rounded-2xl bg-[#F7F5F0] border border-[#EBE7DF]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1B4332] mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#52796F]" />
              <span>Privacidad Garantizada</span>
            </div>
            <p className="text-[11px] text-gray-500 leading-snug">
              Protección de datos y privacidad de menores conforme a normativas vigentes.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
