import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const UnauthorizedPage: React.FC = () => {
  const { role } = useAuth();

  const getHomeLink = () => {
    if (role === 'admin') return '/admin';
    if (role === 'teacher') return '/docente';
    if (role === 'parent') return '/familia';
    return '/login';
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#E9ECEF] shadow-xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[#1B4332] mb-2">Acceso No Autorizado (403)</h2>
        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-6">
          Su cuenta no posee los privilegios necesarios para acceder a esta sección de la guardería. Por motivos de protección a la infancia y confidencialidad, cada rol cuenta con permisos acotados.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to={getHomeLink()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[#52796F] text-white text-xs font-bold hover:bg-[#405F57] transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Volver a mi Panel</span>
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cambiar Cuenta</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
