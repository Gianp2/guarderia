import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Baby, 
  ShieldCheck, 
  Heart, 
  Lock, 
  Clock, 
  Sparkles, 
  ArrowRight,
  Shield,
  UserCheck,
  EyeOff,
  CreditCard
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { switchSimulatedRole } = useAuth();
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  const handleAdminQuickLogin = () => {
    switchSimulatedRole('admin');
    setIsAdminModalOpen(false);
    navigate('/admin');
  };
  return (
    <div className="w-full max-w-full overflow-x-clip min-h-screen bg-[#FDFBF7] text-[#2D3748] font-['Plus_Jakarta_Sans',sans-serif] flex flex-col">
      {/* Top Navbar - Sticky & Persistent on Scroll */}
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-[#EBE7DF] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] px-6 sm:px-12 py-3.5 sm:py-4 flex items-center justify-between transition-all duration-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#52796F] text-white flex items-center justify-center shadow-xs shrink-0 transition-transform duration-200 hover:scale-105">
            <Baby className="w-6 h-6" />
          </div>
          <div>
            <span className="text-lg font-extrabold text-[#1B4332] tracking-tight block leading-none">
              Nido Cuidado
            </span>
            <span className="text-[11px] font-semibold text-[#52796F] block tracking-wide uppercase mt-0.5">
              Guardería Infantil Privada
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs sm:text-sm font-semibold shadow-xs active:scale-95 hover:shadow-md transition-all duration-150 cursor-pointer"
          >
            <Lock className="w-4 h-4 text-[#A3B18A]" />
            <span>Portal Privado</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 sm:px-12 pt-10 sm:pt-16 pb-16 sm:pb-24 max-w-5xl mx-auto text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EBF3ED] text-[#245436] text-xs font-semibold mb-6 border border-[#D1E4D7] animate-fade-in">
          <ShieldCheck className="w-4 h-4 text-[#52796F]" />
          <span>Plataforma Segura para Familias y Educadores</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#1B4332] tracking-tight max-w-3xl leading-[1.15] mb-6">
          El primer espacio de crecimiento y cuidado respetuoso para tu hijo
        </h1>

        <p className="text-base sm:text-lg text-gray-600 max-w-2xl leading-relaxed mb-8">
          Acompañamos los primeros años de vida con un enfoque pedagógico personalizado, alimentación supervisada y un sistema digital privado para que las familias sigan de cerca cada hito y momento del día.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link
            to="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-[#52796F] hover:bg-[#405F57] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all duration-150 active:scale-95 cursor-pointer"
          >
            <span>Ingresar a la Plataforma</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <a
            href="#propuesta"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-[#F7F5F0] text-[#1B4332] text-sm font-bold border border-[#E0DACE] shadow-2xs hover:shadow-xs transition-all duration-150 active:scale-95 cursor-pointer"
          >
            <span>Conocer Nuestra Propuesta</span>
          </a>
        </div>

        {/* Child Safety Privacy Notice banner */}
        <div className="mt-12 w-full p-4 rounded-2xl bg-[#F4EFEA] border border-[#E8E1D5] flex items-center justify-center gap-3 text-xs text-gray-600">
          <EyeOff className="w-4 h-4 text-[#52796F] shrink-0" />
          <span>
            <strong>Compromiso con la privacidad:</strong> En cumplimiento de normativas de protección de menores, este portal público no exhibe fotografías identificables ni datos de los niños. El acceso a la información requiere autenticación institucional estricta.
          </span>
        </div>
      </section>

      {/* Core Values Section */}
      <section id="propuesta" className="px-6 sm:px-12 py-16 bg-white border-y border-[#EBE7DF]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1B4332] mb-3">
              Un entorno diseñado para la tranquilidad familiar
            </h2>
            <p className="text-sm text-gray-600">
              Combinamos calidez humana y tecnología de vanguardia para brindar la máxima transparencia y serenidad.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-[#FAF9F5] border border-[#EFECE5] flex flex-col items-start hover:shadow-xs transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-[#EBF3ED] text-[#245436] flex items-center justify-center mb-6">
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#1B4332] mb-2">Pedagogía del Cuidado</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Salas adaptadas a cada etapa evolutiva: Sala Cuna (desde 45 días), Deambuladores (1 año), Exploradores (2 años) y Creativos (3 años).
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#FAF9F5] border border-[#EFECE5] flex flex-col items-start hover:shadow-xs transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] text-[#0369A1] flex items-center justify-center mb-6">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#1B4332] mb-2">Bitácora Diaria en Tiempo Real</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Registro de alimentación, descansos, siestas, higiene y logros pedagógicos compartidos exclusivamente con los tutores de cada niño.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-[#FAF9F5] border border-[#EFECE5] flex flex-col items-start hover:shadow-xs transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] text-[#92400E] flex items-center justify-center mb-6">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#1B4332] mb-2">Cuotas y Pagos Digitales</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Gestión transparente de cuotas mensuales con pago integrado mediante Mercado Pago o transferencia bancaria y comprobantes digitales.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto px-6 sm:px-12 py-8 bg-[#F4EFEA] border-t border-[#E8E1D5] text-xs text-gray-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <Baby className="w-4 h-4 text-[#52796F]" />
            <span className="font-semibold text-[#1B4332]">Nido Cuidado</span>
            <span>• Gestión Privada de Guardería</span>
            <span className="text-gray-400">|</span>
            <span 
              onClick={() => setIsAdminModalOpen(true)}
              className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors select-none flex items-center gap-1"
              title="Acceso de dirección institucional"
            >
              <span>© {new Date().getFullYear()} Todos los derechos reservados.</span>
              <Lock className="w-2.5 h-2.5 opacity-30 hover:opacity-100 transition-opacity" />
            </span>
          </div>
        </div>
      </footer>

      {/* Hidden Admin Access Modal */}
      <Modal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        title="Acceso Reservado de Dirección"
        subtitle="Módulo exclusivo para el personal directivo y administrativo"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-[#F3E8FF] border border-[#E9D5FF] flex items-start gap-3">
            <Shield className="w-5 h-5 text-[#6B21A8] shrink-0 mt-0.5" />
            <div className="text-xs text-[#581C87] leading-relaxed">
              <strong>Entorno Seguro:</strong> Esta área permite administrar salas, nómina de niños, docentes, cuotas y cobros.
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleAdminQuickLogin}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer active:scale-98"
            >
              <ShieldCheck className="w-4 h-4 text-[#A3B18A]" />
              <span>Ingresar como Administrador (Dirección)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                switchSimulatedRole('teacher');
                setIsAdminModalOpen(false);
                navigate('/docente');
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-all cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-gray-500" />
              <span>Acceso de Docentes (Profa. Carla)</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
