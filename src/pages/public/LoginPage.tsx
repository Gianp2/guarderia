import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Baby, 
  Lock, 
  Shield, 
  Heart, 
  ArrowRight, 
  Mail, 
  KeyRound, 
  CheckCircle, 
  AlertCircle, 
  ShieldCheck, 
  UserPlus,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common/Modal';
import { auth, db } from '../../services/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signInWithGoogle, switchSimulatedRole, unlinkChildrenForTesting } = useAuth();
  const toast = useToast();
  
  // Selection before login: 'parent' | 'teacher'
  const [selectedRoleType, setSelectedRoleType] = useState<'parent' | 'teacher'>('parent');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Hidden admin access modal state
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      await signInWithGoogle();

      // Real Firebase validation: check user role in Firestore
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const userData = snap.data();
          const actualRole = userData.role;

          // If user selected teacher but account is parent
          if (selectedRoleType === 'teacher' && actualRole === 'parent') {
            setErrorMessage('Acceso denegado: Esta cuenta está registrada como Familiar y no cuenta con permisos de Docente. Por favor seleccione "Ingresar como Padre/Madre".');
            return;
          }

          // If user selected parent but account is teacher
          if (selectedRoleType === 'parent' && actualRole === 'teacher') {
            setErrorMessage('Esta cuenta pertenece al equipo docente. Por favor seleccione la opción "Ingresar como Maestra".');
            return;
          }

          // Role matches or is admin
          if (actualRole === 'teacher') {
            navigate('/docente');
            return;
          } else if (actualRole === 'admin') {
            navigate('/admin');
            return;
          } else {
            // Parent: check if children linked
            if (userData.linkedChildIds && userData.linkedChildIds.length > 0) {
              navigate('/familia');
            } else {
              navigate('/vincular-hijo');
            }
            return;
          }
        }
      }

      // Fallback redirect according to selected type
      if (selectedRoleType === 'teacher') {
        navigate('/docente');
      } else {
        navigate('/familia');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('No se pudo completar el inicio de sesión con Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleParentLinkedLogin = () => {
    setErrorMessage('');
    switchSimulatedRole('parent');
    toast.success('Sesión iniciada', 'Bienvenido/a al Portal Familiar (Familia Rossi)');
    navigate('/familia');
  };

  const handleNewParentUnlinkedLogin = () => {
    setErrorMessage('');
    switchSimulatedRole('parent');
    unlinkChildrenForTesting();
    toast.info('Modo sin vincular', 'Podés probar el proceso de vincular un alumno con el código de prueba');
    navigate('/vincular-hijo');
  };

  const handleTeacherQuickLogin = () => {
    setErrorMessage('');
    switchSimulatedRole('teacher');
    toast.success('Sesión iniciada', 'Bienvenida al Panel Docente, Seño Carla');
    navigate('/docente');
  };

  const handleAdminQuickLogin = () => {
    switchSimulatedRole('admin');
    setIsAdminModalOpen(false);
    toast.success('Sesión iniciada', 'Bienvenido al Panel de Administración');
    navigate('/admin');
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email) {
      setErrorMessage('Por favor ingrese su correo electrónico registrado.');
      toast.warning('Dato requerido', 'Por favor ingrese su correo electrónico');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    if (selectedRoleType === 'teacher') {
      // Validate teacher credentials
      if (cleanEmail.includes('rossi') || cleanEmail.includes('padre') || cleanEmail.includes('familia')) {
        const err = 'Acceso denegado: Esta cuenta corresponde a una Familia. Por favor seleccione la pestaña "Ingresar como Padre/Madre".';
        setErrorMessage(err);
        toast.error('Acceso incorrecto', err);
        return;
      }
      handleTeacherQuickLogin();
    } else {
      // Validate parent credentials
      if (cleanEmail.includes('docente') || cleanEmail.includes('maestra') || cleanEmail.includes('carla')) {
        const err = 'Esta cuenta pertenece al plantel de maestras. Por favor seleccione la pestaña "Ingresar como Maestra".';
        setErrorMessage(err);
        toast.error('Acceso incorrecto', err);
        return;
      }
      handleParentLinkedLogin();
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetSuccess(true);
    toast.success('Instrucciones enviadas', `Se envió el enlace de recuperación a ${resetEmail}`);
    setTimeout(() => {
      setIsResetOpen(false);
      setResetSuccess(false);
      setResetEmail('');
    }, 2500);
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-[100dvh] bg-[#FDFBF7] flex flex-col justify-center items-center py-3 sm:py-5 px-3 sm:px-4 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Brand Header */}
      <div className="w-full max-w-sm mx-auto text-center mb-2 shrink-0">
        <Link to="/" className="inline-flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-2xl bg-[#52796F] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            <Baby className="w-5 h-5" />
          </div>
          <div className="text-left">
            <span className="text-base font-black text-[#1B4332] tracking-tight block leading-tight">
              Nido Cuidado
            </span>
            <span className="text-[9px] font-bold text-[#52796F] block tracking-wide uppercase">
              Plataforma Privada
            </span>
          </div>
        </Link>
      </div>

      {/* Main Login Card - Compact & Fitted for Mobile */}
      <div className="w-full max-w-sm mx-auto">
        <div className="bg-white pt-4 pb-5 px-5 sm:px-6 shadow-md border border-[#EBECEF] rounded-3xl animate-fade-in">
          {/* Role Header right next to the form */}
          <div className="text-center mb-3">
            <h2 className="text-lg sm:text-xl font-black text-[#1B4332] tracking-tight leading-tight">
              {selectedRoleType === 'parent' ? 'Ingreso para Familias' : 'Portal del Personal Docente'}
            </h2>
            <p className="text-[11px] sm:text-xs text-gray-500 max-w-xs mx-auto mt-0.5 leading-snug">
              {selectedRoleType === 'parent' 
                ? 'Seguimiento pedagógico, bitácora diaria y cuotas de tus hijos.'
                : 'Gestión diaria de salas, asistencia, bitácora y novedades.'}
            </p>
          </div>

          {/* TWO VISUAL OPTIONS: PADRE/MADRE vs MAESTRA */}
          <div className="mb-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 text-center">
              Seleccione su tipo de acceso institucional
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#FAF9F5] rounded-2xl border border-[#EBE7DF]">
              <button
                type="button"
                onClick={() => {
                  setSelectedRoleType('parent');
                  setErrorMessage('');
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer ${
                  selectedRoleType === 'parent'
                    ? 'bg-[#52796F] text-white shadow-xs scale-102'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <Heart className="w-3.5 h-3.5" />
                <span>Padre / Madre</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRoleType('teacher');
                  setErrorMessage('');
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer ${
                  selectedRoleType === 'teacher'
                    ? 'bg-[#1B4332] text-white shadow-xs scale-102'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Maestra</span>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-tight">{errorMessage}</span>
            </div>
          )}

          {/* Quick Access according to selected role */}
          {selectedRoleType === 'parent' ? (
            <div className="space-y-2 mb-4 animate-fade-in">
              <button
                type="button"
                onClick={handleParentLinkedLogin}
                className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border-2 border-[#D8E4DA] bg-[#FAFDFB] hover:border-[#52796F] hover:bg-[#F2F8F4] transition-all duration-150 active:scale-97 text-left cursor-pointer group shadow-2xs hover:shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#E0F2FE] text-[#0369A1] flex items-center justify-center font-bold shrink-0 transition-transform duration-150 group-hover:scale-105">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-[#1B4332] group-hover:text-[#52796F] leading-tight">
                      Familia (Laura Rossi)
                    </div>
                    <div className="text-[10px] text-gray-500 leading-tight">
                      Hijo Mateo ya vinculado
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#52796F] group-hover:translate-x-1.5 transition-transform duration-150" />
              </button>

              <button
                type="button"
                onClick={handleNewParentUnlinkedLogin}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-dashed border-gray-300 hover:border-[#52796F] hover:bg-[#FAF9F5] transition-all duration-150 active:scale-97 text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#2D6A4F] flex items-center justify-center font-bold shrink-0 transition-transform duration-150 group-hover:scale-105">
                    <UserPlus className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-[11px] font-semibold text-gray-700 group-hover:text-[#1B4332]">
                    Nueva Familia (Código de Vinculación)
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#52796F] group-hover:translate-x-1 transition-transform duration-150" />
              </button>
            </div>
          ) : (
            <div className="space-y-2 mb-4 animate-fade-in">
              <button
                type="button"
                onClick={handleTeacherQuickLogin}
                className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border-2 border-[#BCD7C6] bg-[#F2F8F4] hover:border-[#2D6A4F] transition-all duration-150 active:scale-97 text-left cursor-pointer group shadow-2xs hover:shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#1B4332] text-white flex items-center justify-center font-bold shrink-0 transition-transform duration-150 group-hover:scale-105">
                    <GraduationCap className="w-4 h-4 text-[#A3B18A]" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-[#1B4332] leading-tight">
                      Docente (Profa. Carla Gómez)
                    </div>
                    <div className="text-[10px] text-gray-600 leading-tight">
                      Salas asignadas: Cuna y Deambuladores
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#1B4332] group-hover:translate-x-1.5 transition-transform duration-150" />
              </button>
            </div>
          )}

          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white px-2 text-gray-400 font-bold">
                O credenciales directas
              </span>
            </div>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleManualSubmit} className="space-y-2.5">
            <div>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={selectedRoleType === 'parent' ? 'laura.rossi@ejemplo.com' : 'carla.docente@nidocuidado.edu.ar'}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#52796F]"
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <KeyRound className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#52796F]"
                />
              </div>
              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  onClick={() => setIsResetOpen(true)}
                  className="text-[10px] font-semibold text-[#52796F] hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-[#52796F] hover:bg-[#405F57] text-white text-xs font-bold transition-all shadow-xs active:scale-98 cursor-pointer"
            >
              {selectedRoleType === 'parent' ? 'Ingresar como Familia' : 'Ingresar al Panel Docente'}
            </button>
          </form>

          {/* Google Auth Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full mt-2.5 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-600 transition-all cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continuar con Google</span>
          </button>
        </div>
      </div>

      {/* Footer with Discreet/Hidden Admin Trigger in Rights */}
      <footer className="w-full max-w-sm mx-auto text-center text-[11px] text-gray-400 mt-2.5 py-1 shrink-0">
        <div className="flex items-center justify-center gap-1">
          <span>© {new Date().getFullYear()} Nido Cuidado.</span>
          <span 
            onClick={() => setIsAdminModalOpen(true)}
            className="cursor-pointer hover:text-gray-600 transition-colors select-none"
            title="Acceso de dirección institucional"
          >
            Todos los derechos reservados.
          </span>
          <button
            type="button"
            onClick={() => setIsAdminModalOpen(true)}
            className="p-1 text-gray-300 hover:text-gray-500 rounded-md transition-colors cursor-pointer"
            aria-label="Acceso reservado a dirección"
            title="Acceso administrativo"
          >
            <Lock className="w-2.5 h-2.5 opacity-30 hover:opacity-100 transition-opacity" />
          </button>
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
              <strong>Entorno Seguro:</strong> Esta área permite administrar alumnos, familias, personal docente, cuotas y cobros.
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
          </div>
        </div>
      </Modal>

      {/* Password Reset Modal */}
      <Modal
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        title="Recuperación de Contraseña"
        subtitle="Enviaremos un enlace de restablecimiento a su correo"
        maxWidth="md"
      >
        {resetSuccess ? (
          <div className="text-center py-6">
            <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-[#1B4332]">Enlace enviado</h4>
            <p className="text-xs text-gray-500">Revise su bandeja de entrada.</p>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="su-correo@ejemplo.com"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsResetOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] cursor-pointer"
              >
                Enviar Enlace
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
