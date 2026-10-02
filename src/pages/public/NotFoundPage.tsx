import React from 'react';
import { Link } from 'react-router-dom';
import { Baby, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#E9ECEF] shadow-xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#EBF3ED] text-[#245436] flex items-center justify-center mx-auto mb-4">
          <Baby className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-[#1B4332] mb-1">Página no encontrada (404)</h2>
        <p className="text-xs sm:text-sm text-gray-500 mb-6">
          La dirección a la que intenta ingresar no existe o fue reubicada en la plataforma.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#52796F] text-white text-xs font-bold hover:bg-[#405F57] transition-all shadow-xs"
        >
          <Home className="w-4 h-4" />
          <span>Volver al Inicio</span>
        </Link>
      </div>
    </div>
  );
};
