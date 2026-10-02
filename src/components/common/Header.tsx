import React from 'react';
import { 
  LogOut, 
  Menu
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onToggleSidebar?: () => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, title }) => {
  const { 
    currentUser, 
    userProfile, 
    role, 
    signOutUser 
  } = useAuth();

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-68 z-30 bg-white/70 backdrop-blur-md border-b border-[#E9ECEF]/70 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] px-4 sm:px-8 py-3.5 flex items-center justify-between transition-all duration-300 ease-in-out">
      {/* Left: Mobile Menu Toggle & Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-white border border-[#E9ECEF] transition-colors shrink-0"
          aria-label="Menú lateral"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="truncate">
          <h1 className="text-base sm:text-xl font-bold text-[#1B4332] tracking-tight truncate">
            {title || 'Plataforma de Gestión'}
          </h1>
          <p className="text-xs text-[#52796F] hidden sm:block truncate">
            Nido Cuidado • Guardería Infantil
          </p>
        </div>
      </div>

      {/* Right: Clean User Profile Pill & Logout */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* User Profile Pill - Clean & Minimal */}
        <div className="flex items-center gap-2 bg-white/90 px-2 sm:px-3 py-1.5 rounded-2xl border border-[#E9ECEF] shadow-2xs">
          <div className="w-7 h-7 rounded-full bg-[#EBF3ED] text-[#245436] flex items-center justify-center font-bold text-xs shrink-0">
            {userProfile?.displayName?.charAt(0) || 'U'}
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold text-[#1B4332] truncate max-w-[120px] sm:max-w-[160px]">
              {userProfile?.displayName || 'Mi Cuenta'}
            </div>
            {role === 'admin' ? (
              <div className="text-[10px] text-purple-700 font-semibold truncate">
                Dirección
              </div>
            ) : role === 'teacher' ? (
              <div className="text-[10px] text-emerald-700 font-semibold truncate">
                Docente
              </div>
            ) : (
              <div className="text-[10px] text-[#52796F] font-semibold truncate">
                Familia
              </div>
            )}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => signOutUser()}
          className="p-2 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 border border-[#E9ECEF] active:scale-95 transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4 transition-transform duration-150 group-hover:scale-110" />
        </button>
      </div>
    </header>
  );
};
