import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Baby, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { validateAndLinkChildCode } from '../../services/enrollmentService';
import { INITIAL_CHILDREN } from '../../services/seedData';

export const LinkChildPage: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, updateLinkedChild } = useAuth();
  
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successChild, setSuccessChild] = useState<any | null>(null);

  const linkedIds = userProfile?.linkedChildIds || [];
  const alreadyLinkedChildren = INITIAL_CHILDREN.filter(c => linkedIds.includes(c.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setError('Por favor ingrese el código de vinculación.');
      return;
    }

    setLoading(true);
    const userId = userProfile?.id || 'parent-current';
    const userEmail = userProfile?.email;

    const result = await validateAndLinkChildCode(cleanCode, userId, userEmail);
    setLoading(false);

    if (result.success && result.child) {
      // Check if already in linkedIds
      if (linkedIds.includes(result.child.id)) {
        setError(`El alumno ${result.child.firstName} ${result.child.lastName} ya está vinculado a su cuenta familiar.`);
        return;
      }
      setSuccessChild(result.child);
      if (updateLinkedChild) {
        updateLinkedChild(result.child.id);
      }
      setTimeout(() => {
        navigate('/familia');
      }, 1500);
    } else {
      setError(result.message || 'Código incorrecto. Verifique con la secretaría de la guardería.');
    }
  };

  const handleApplyPreset = (presetCode: string) => {
    setCode(presetCode);
    setError('');
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-[100dvh] bg-[#FDFBF7] flex flex-col justify-center items-center py-6 sm:py-10 px-3 sm:px-4 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="w-full max-w-md mx-auto">
        {/* Nursery Brand Header */}
        <div className="text-center mb-5">
          <Link to="/" className="inline-flex items-center gap-2 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-[#52796F] text-white flex items-center justify-center shadow-xs">
              <Baby className="w-6 h-6" />
            </div>
            <div className="text-left">
              <span className="text-base font-black text-[#1B4332] tracking-tight block leading-tight">
                Nido Cuidado
              </span>
              <span className="text-[10px] font-bold text-[#52796F] block tracking-wide uppercase">
                Guardería Infantil
              </span>
            </div>
          </Link>
          <h2 className="text-xl sm:text-2xl font-black text-[#1B4332] tracking-tight">
            {alreadyLinkedChildren.length > 0 ? 'Vincular Otro Hijo/a' : 'Vincular a tu Hijo/a'}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-gray-500 max-w-xs mx-auto">
            Ingresá el código alfanumérico provisto por la guardería para asociar el expediente a tu cuenta familiar.
          </p>
        </div>

        {/* Already Linked Children Info Box if any */}
        {alreadyLinkedChildren.length > 0 && (
          <div className="mb-4 p-3.5 rounded-2xl bg-[#EBF3ED] border border-[#D1E4D7] flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Users className="w-4 h-4 text-[#245436] shrink-0" />
              <div className="truncate">
                <span className="font-bold text-[#1B4332] block">Hijos ya vinculados ({alreadyLinkedChildren.length}):</span>
                <span className="text-gray-600 truncate block">
                  {alreadyLinkedChildren.map(c => `${c.firstName} (${c.roomName})`).join(', ')}
                </span>
              </div>
            </div>
            <Link
              to="/familia"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#245436] hover:underline shrink-0"
            >
              <span>Ir al Portal</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Card Form */}
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E9ECEF] shadow-lg">
          {successChild ? (
            <div className="text-center py-6 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-3xl bg-[#EBF3ED] text-[#245436] flex items-center justify-center mx-auto mb-3 border-2 border-[#D1E4D7]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-[#1B4332]">
                ¡Vinculación Exitosa!
              </h3>
              <p className="text-xs text-[#52796F] font-semibold mt-1">
                {successChild.firstName} {successChild.lastName} • {successChild.roomName}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Redirigiendo a tu Portal Familiar...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-tight">{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Código de Vinculación Oficial
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="EJ: NIDO-MATEO-2026"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-2 border-gray-200 font-mono text-sm sm:text-base font-bold text-[#1B4332] tracking-wider uppercase focus:outline-none focus:border-[#52796F] focus:ring-0 transition-colors"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  El código fue entregado por la dirección al momento de la matrícula.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-[#52796F] hover:bg-[#405F57] text-white text-xs sm:text-sm font-bold shadow-xs active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Validando con Firebase...</span>
                ) : (
                  <>
                    <span>Validar y Vincular Hijo</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Test Codes Helper Ribbon for Immediate Evaluation */}
          {!successChild && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-[#52796F]" />
                <span>Códigos oficiales disponibles para probar:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-left">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('NIDO-MATEO-2026')}
                  className="p-2 rounded-xl bg-[#FAF9F5] hover:bg-[#EBF3ED] border border-gray-200 text-left transition-colors cursor-pointer group"
                >
                  <span className="font-mono text-xs font-bold text-[#1B4332] block group-hover:text-[#52796F]">
                    NIDO-MATEO-2026
                  </span>
                  <span className="text-[10px] text-gray-500">Mateo Rossi (Sala Cuna)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyPreset('NIDO-SOFIA-2026')}
                  className="p-2 rounded-xl bg-[#FAF9F5] hover:bg-[#EBF3ED] border border-gray-200 text-left transition-colors cursor-pointer group"
                >
                  <span className="font-mono text-xs font-bold text-[#1B4332] block group-hover:text-[#52796F]">
                    NIDO-SOFIA-2026
                  </span>
                  <span className="text-[10px] text-gray-500">Sofía Gómez (1 Año)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyPreset('NIDO-LUCAS-2026')}
                  className="p-2 rounded-xl bg-[#FAF9F5] hover:bg-[#EBF3ED] border border-gray-200 text-left transition-colors cursor-pointer group"
                >
                  <span className="font-mono text-xs font-bold text-[#1B4332] block group-hover:text-[#52796F]">
                    NIDO-LUCAS-2026
                  </span>
                  <span className="text-[10px] text-gray-500">Lucas Benítez (2 Años)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyPreset('CODIGO-INVENTADO-INVALIDO')}
                  className="p-2 rounded-xl bg-red-50/50 hover:bg-red-50 border border-red-200 text-left transition-colors cursor-pointer group"
                >
                  <span className="font-mono text-xs font-bold text-red-700 block">
                    CODIGO-INVALIDO
                  </span>
                  <span className="text-[10px] text-red-500">Probar error de código</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Back button & Security Notice */}
        <div className="mt-4 flex items-center justify-between text-xs text-gray-500 px-1">
          {alreadyLinkedChildren.length > 0 && (
            <Link
              to="/familia"
              className="inline-flex items-center gap-1 font-semibold text-[#52796F] hover:text-[#1B4332]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver al Portal</span>
            </Link>
          )}
          <div className="flex items-center gap-1 text-[11px] text-gray-400 ml-auto">
            <ShieldCheck className="w-3.5 h-3.5 text-[#52796F]" />
            <span>Validación criptográfica en Firestore</span>
          </div>
        </div>
      </div>
    </div>
  );
};
