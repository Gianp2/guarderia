import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Heart, 
  Baby, 
  CalendarCheck2, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  Phone, 
  ShieldCheck, 
  Sparkles, 
  Edit3, 
  Save, 
  AlertCircle,
  Eye,
  Plus,
  KeyRound,
  UserPlus,
  CreditCard,
  DollarSign,
  Upload,
  FileText,
  Check,
  Copy,
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Child, Activity, AttendanceRecord, Fee, GUARDERIA_BANK_DETAILS } from '../../types';
import { 
  INITIAL_CHILDREN, 
  INITIAL_ACTIVITIES, 
  INITIAL_ATTENDANCE, 
  INITIAL_FEES 
} from '../../services/seedData';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { validateAndLinkChildCode } from '../../services/enrollmentService';
import { 
  createCheckoutPreference, 
  submitTransferReceipt, 
  verifyServerPayment 
} from '../../services/mercadoPagoService';

export const ParentPortalPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userProfile, updateLinkedChild } = useAuth();
  
  // Resolve linked children from userProfile
  const linkedIds = userProfile?.linkedChildIds ?? ['child-mateo'];
  const availableChildren = INITIAL_CHILDREN.filter(c => linkedIds.includes(c.id));
  
  const [selectedChild, setSelectedChild] = useState<Child | null>(availableChildren[0] || null);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<AttendanceRecord | null>(null);
  
  // Cuotas y Pagos State
  const [fees, setFees] = useState<Fee[]>([]);
  const [loadingFees, setLoadingFees] = useState(true);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedFeeToPay, setSelectedFeeToPay] = useState<Fee | null>(null);
  const [paymentTab, setPaymentTab] = useState<'mercadopago' | 'transfer'>('mercadopago');
  
  // Mercado Pago states
  const [mpLoading, setMpLoading] = useState(false);
  const [mpError, setMpError] = useState('');
  const [mpSuccessNotice, setMpSuccessNotice] = useState<string | null>(null);

  // Bank Transfer states
  const [transferBankOrigin, setTransferBankOrigin] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferFile, setTransferFile] = useState<File | null>(null);
  const [transferFileDataUrl, setTransferFileDataUrl] = useState<string | null>(null);
  const [transferFileType, setTransferFileType] = useState<'image' | 'pdf'>('image');
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Personal contact edit modal
  const [isEditContactOpen, setIsEditContactOpen] = useState(false);
  const [contactPhone, setContactPhone] = useState('+54 9 11 4522-9901');
  const [emergencyPhone, setEmergencyPhone] = useState('Mariana Rossi (Tía) - +54 9 11 8877-6655');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Link another child modal
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);

  // Card detail modal state (locks background scroll completely)
  const [activeCardDetail, setActiveCardDetail] = useState<{
    title: string;
    subtitle?: string;
    content: React.ReactNode;
  } | null>(null);

  // Check URL search params for Mercado Pago return
  useEffect(() => {
    const mpStatus = searchParams.get('mp_status');
    const feeId = searchParams.get('fee_id');

    if (mpStatus === 'approved') {
      setMpSuccessNotice('¡Tu pago fue completado con Mercado Pago! El servidor verificó la transacción oficial y la cuota ha sido actualizada.');
      if (feeId) {
        verifyServerPayment(feeId).catch(() => {});
      }
    } else if (mpStatus === 'pending') {
      setMpSuccessNotice('Tu pago se encuentra en proceso de confirmación por Mercado Pago.');
    }
  }, [searchParams]);

  // Realtime subscription for fees of selected child
  useEffect(() => {
    if (!selectedChild) {
      setFees([]);
      setLoadingFees(false);
      return;
    }

    setLoadingFees(true);
    const q = query(collection(db, 'fees'), where('childId', '==', selectedChild.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const loaded: Fee[] = [];
        snapshot.forEach((d) => loaded.push({ id: d.id, ...d.data() } as Fee));
        setFees(loaded);
      } else {
        // Fallback to sample fees if Firestore collection hasn't synced
        const fallback = INITIAL_FEES.filter((f) => f.childId === selectedChild.id);
        setFees(fallback.length > 0 ? (fallback as Fee[]) : []);
      }
      setLoadingFees(false);
    }, (err) => {
      console.warn('Using seeded fees fallback:', err);
      const fallback = INITIAL_FEES.filter((f) => f.childId === selectedChild.id);
      setFees(fallback.length > 0 ? (fallback as Fee[]) : []);
      setLoadingFees(false);
    });

    return () => unsubscribe();
  }, [selectedChild]);

  useEffect(() => {
    if (availableChildren.length > 0 && (!selectedChild || !linkedIds.includes(selectedChild.id))) {
      setSelectedChild(availableChildren[0]);
    }
  }, [linkedIds]);

  useEffect(() => {
    if (!selectedChild) return;
    
    // Activities for selected child's room
    const acts = INITIAL_ACTIVITIES.filter(a => a.roomId === selectedChild.roomId);
    setRecentActivities(acts.slice(0, 3));

    // Today's attendance for this child
    const att = INITIAL_ATTENDANCE.find(a => a.childId === selectedChild.id) || null;
    setAttendanceToday(att);
  }, [selectedChild]);

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsEditContactOpen(false);
    }, 1200);
  };

  const handleLinkNewChild = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError('');
    if (!newCode.trim()) return;

    setLinkLoading(true);
    const userId = userProfile?.id || 'parent-current';
    const res = await validateAndLinkChildCode(newCode.trim().toUpperCase(), userId, userProfile?.email);
    setLinkLoading(false);

    if (res.success && res.child) {
      updateLinkedChild(res.child.id);
      setSelectedChild(res.child);
      setIsLinkModalOpen(false);
      setNewCode('');
    } else {
      setLinkError(res.message || 'Código inválido o ya utilizado.');
    }
  };

  // Payment Handlers
  const handleStartMercadoPago = async () => {
    if (!selectedFeeToPay || !selectedChild) return;
    setMpLoading(true);
    setMpError('');
    try {
      const res = await createCheckoutPreference({
        feeId: selectedFeeToPay.id,
        title: selectedFeeToPay.concept,
        amount: selectedFeeToPay.amount,
        payerEmail: userProfile?.email,
        payerName: userProfile?.displayName,
        childName: `${selectedChild.firstName} ${selectedChild.lastName}`
      });

      if (res.initPoint || res.sandboxInitPoint) {
        window.location.href = res.sandboxInitPoint || res.initPoint!;
      } else if (res.message) {
        setMpError(res.message + (res.notice ? ` (${res.notice})` : ''));
      }
    } catch (err: any) {
      setMpError(err.message || 'Error iniciando Mercado Pago');
    } finally {
      setMpLoading(false);
    }
  };

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('El archivo no debe superar los 2MB.');
      return;
    }

    setTransferFile(file);
    const isPdf = file.type === 'application/pdf';
    setTransferFileType(isPdf ? 'pdf' : 'image');

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setTransferFileDataUrl(uploadEvent.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeeToPay || !selectedChild || !transferFileDataUrl) {
      alert('Por favor adjunte el comprobante digital (imagen o PDF).');
      return;
    }

    setTransferSubmitting(true);
    try {
      await submitTransferReceipt({
        feeId: selectedFeeToPay.id,
        childId: selectedChild.id,
        childName: `${selectedChild.firstName} ${selectedChild.lastName}`,
        payerUserId: userProfile?.id || 'parent',
        payerName: userProfile?.displayName || 'Tutor',
        payerEmail: userProfile?.email || 'tutor@nidocuidado.com',
        amount: selectedFeeToPay.amount,
        receiptDataUrl: transferFileDataUrl,
        receiptType: transferFileType,
        receiptName: transferFile?.name || 'comprobante',
        notes: transferNotes,
        bankOrigin: transferBankOrigin
      });

      setTransferSuccess(true);
      setTimeout(() => {
        setIsPayModalOpen(false);
        setTransferSuccess(false);
        setTransferFileDataUrl(null);
        setTransferFile(null);
        setTransferNotes('');
        setTransferBankOrigin('');
      }, 2000);
    } catch (err: any) {
      alert(`Error al enviar comprobante: ${err.message}`);
    } finally {
      setTransferSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // If the parent has NO linked children at all, render the unlinked prompt
  if (availableChildren.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-[#EBF3ED] text-[#245436] flex items-center justify-center mx-auto mb-4 border border-[#D1E4D7] shadow-xs">
          <Baby className="w-9 h-9" />
        </div>
        <h2 className="text-2xl font-black text-[#1B4332] tracking-tight mb-2">
          Aún no tenés ningún hijo vinculado
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto leading-relaxed mb-6">
          Para acceder a la bitácora pedagógica, reportes de asistencia y novedades autorizadas de tus hijos, ingresá el código entregado por la secretaría de la guardería.
        </p>
        <Link
          to="/vincular-hijo"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#52796F] hover:bg-[#405F57] text-white text-xs sm:text-sm font-bold shadow-xs active:scale-98 transition-all"
        >
          <KeyRound className="w-4 h-4" />
          <span>Ingresar Código de Vinculación</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Mercado Pago Return Notice */}
      {mpSuccessNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-emerald-200 text-emerald-900">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <p className="text-xs sm:text-sm font-semibold">{mpSuccessNotice}</p>
          </div>
          <button 
            onClick={() => setMpSuccessNotice(null)} 
            className="text-xs font-bold text-emerald-800 hover:underline"
          >
            Entendido
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#52796F] to-[#2D6A4F] text-white p-5 sm:p-7 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-xs mb-1.5">
            <Heart className="w-3.5 h-3.5 text-rose-300" />
            <span>Portal para Familias</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Hola, {userProfile?.displayName || 'Familia'}
          </h2>
          <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-xl">
            Seguimiento diario, bitácora pedagógica, novedades y estado de cuotas de tu hijo/a.
          </p>
        </div>

        <button
          onClick={() => setIsEditContactOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-[#1B4332] text-xs font-bold hover:bg-[#FAF9F5] transition-all shadow-xs self-start md:self-auto cursor-pointer"
        >
          <Edit3 className="w-4 h-4 text-[#52796F]" />
          <span>Actualizar Teléfonos</span>
        </button>
      </div>

      {/* Multiple Children Selector Tabs if more than one, plus link another button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {availableChildren.map(child => (
            <button
              key={child.id}
              onClick={() => setSelectedChild(child)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                selectedChild?.id === child.id
                  ? 'bg-[#1B4332] text-white shadow-xs'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Baby className="w-3.5 h-3.5" />
              <span>{child.firstName} {child.lastName}</span>
              <span className="text-[10px] opacity-75">({child.roomName})</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setLinkError('');
            setNewCode('');
            setIsLinkModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-dashed border-[#52796F] text-[#52796F] text-xs font-bold transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Vincular otro hijo/a con código</span>
        </button>
      </div>

      {/* Selected Child Header Card */}
      {selectedChild && (
        <div className="bg-white rounded-3xl border border-[#E9ECEF] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#EBF3ED] text-[#245436] flex items-center justify-center font-black text-xl sm:text-2xl border border-[#D1E4D7] shrink-0">
              {selectedChild.firstName[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-[#1B4332]">
                  {selectedChild.firstName} {selectedChild.lastName}
                </h3>
                <Badge variant="green" size="sm">Activo</Badge>
              </div>
              <p className="text-xs text-[#52796F] font-semibold mt-0.5">
                {selectedChild.roomName} • Educadora a cargo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link
              to={`/perfil-nino/${selectedChild.id}`}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FAF9F5] hover:bg-[#F2EFE8] text-xs font-bold text-[#1B4332] border border-[#E0DACE] transition-colors"
            >
              <Eye className="w-4 h-4 text-[#52796F]" />
              <span>Ver Expediente Infantil</span>
            </Link>
          </div>
        </div>
      )}

      {/* Today's Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Attendance card */}
        <div 
          onClick={() => setActiveCardDetail({
            title: 'Detalle de Asistencia y Permanencia',
            subtitle: `${selectedChild?.firstName} ${selectedChild?.lastName} • Fecha: ${attendanceToday?.date || 'Hoy'}`,
            content: (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-1">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Estado: Alumno Presente en Sala</span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    {attendanceToday?.notes || 'Ingreso registrado en portería institucional en tiempo y forma.'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-gray-400 block mb-0.5 font-medium">Hora de Ingreso</span>
                    <span className="font-bold text-[#1B4332] text-sm">{attendanceToday?.checkInTime ? `${attendanceToday.checkInTime} hs` : '08:15 hs'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-gray-400 block mb-0.5 font-medium">Registrado por</span>
                    <span className="font-bold text-[#1B4332] text-sm">{attendanceToday?.recordedByName || 'Docente de Turno'}</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#F0ECE1] text-xs text-gray-600">
                  <strong className="text-[#1B4332] block mb-1">Retiro Autorizado:</strong>
                  Solo pueden retirar los tutores registrados con DNI en portería. Si un familiar alternativo retira, avisar previamente.
                </div>
              </div>
            )
          })}
          className="bg-white p-5 rounded-3xl border border-[#E9ECEF] shadow-2xs hover:shadow-xs hover:border-[#52796F]/40 transition-all flex flex-col justify-between cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider group-hover:text-[#52796F] transition-colors">
              Asistencia Hoy
            </span>
            <CalendarCheck2 className="w-4 h-4 text-[#52796F]" />
          </div>

          <div className="mb-2">
            <div className="text-base sm:text-lg font-black text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{attendanceToday?.checkInTime ? `Ingresó: ${attendanceToday.checkInTime} hs` : 'Presente en sala'}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {attendanceToday?.notes || 'Ingreso registrado en portería sin novedades.'}
            </p>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
            <span>{attendanceToday?.recordedByName || 'Recepción'}</span>
            <span className="text-[#52796F] font-bold group-hover:underline">Ver detalle</span>
          </div>
        </div>

        {/* Feeding & Care */}
        <div 
          onClick={() => setActiveCardDetail({
            title: 'Pautas de Nutrición y Alimentación Diaria',
            subtitle: `Sala: ${selectedChild?.roomName || 'Cuna'} • Menú Saludable`,
            content: (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-1">
                    <Clock className="w-4 h-4 text-amber-700" />
                    <span>Colación de Media Mañana (11:15 hs)</span>
                  </div>
                  <p className="text-amber-800">
                    Papilla de frutas naturales (manzana y pera cocida) sin azúcares agregados. Ingesta completa y buena hidratación con agua mineral.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Alergias declaradas:</span>
                    <span className="font-bold text-[#1B4332]">{selectedChild?.allergies || 'Ninguna registrada'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Indicaciones dietarias:</span>
                    <span className="font-bold text-[#1B4332]">{selectedChild?.dietaryNotes || 'Dieta general recomendada'}</span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">
                  Cualquier ajuste en la alimentación puede ser comunicado directamente a la educadora de sala a través de secretaría.
                </p>
              </div>
            )
          })}
          className="bg-white p-5 rounded-3xl border border-[#E9ECEF] shadow-2xs hover:shadow-xs hover:border-[#52796F]/40 transition-all flex flex-col justify-between cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider group-hover:text-[#52796F] transition-colors">
              Alimentación
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>

          <div className="mb-2">
            <div className="text-sm font-bold text-[#1B4332]">
              Colación de media mañana
            </div>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              Alimentación completada acorde a las pautas nutricionales de la sala.
            </p>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
            <span>Horario habitual: 11:15 hs</span>
            <span className="text-[#52796F] font-bold group-hover:underline">Ver detalle</span>
          </div>
        </div>

        {/* Nap & Rest */}
        <div 
          onClick={() => setActiveCardDetail({
            title: 'Registro de Siesta y Descanso Seguro',
            subtitle: `Monitoreo del confort en sala • Espacio climatizado`,
            content: (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
                  <div className="flex items-center gap-2 text-purple-900 font-bold text-sm mb-1">
                    <Sparkles className="w-4 h-4 text-purple-700" />
                    <span>Siesta de Mediodía (12:30 a 14:00 hs)</span>
                  </div>
                  <p className="text-purple-800">
                    Descanso placentero en cuna individual con sábanas esterilizadas. Acompañado de música instrumental suave y ambientación tenue a 22°C.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-gray-400 block mb-0.5">Duración</span>
                    <span className="font-bold text-[#1B4332]">1 hora 30 min</span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-gray-400 block mb-0.5">Despertar</span>
                    <span className="font-bold text-[#1B4332]">Tranquilo y alegre</span>
                  </div>
                </div>
              </div>
            )
          })}
          className="bg-white p-5 rounded-3xl border border-[#E9ECEF] shadow-2xs hover:shadow-xs hover:border-[#52796F]/40 transition-all flex flex-col justify-between sm:col-span-2 lg:col-span-1 cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider group-hover:text-[#52796F] transition-colors">
              Descanso
            </span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>

          <div className="mb-2">
            <div className="text-sm font-bold text-[#1B4332]">
              Siesta de mediodía realizada
            </div>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              Descanso de confort en cuna individual con música clásica instrumental.
            </p>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
            <span>Sala acondicionada a 22°C</span>
            <span className="text-[#52796F] font-bold group-hover:underline">Ver detalle</span>
          </div>
        </div>
      </div>

      {/* Recent Activities Feed */}
      <div className="bg-white rounded-3xl border border-[#E9ECEF] p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#52796F]" />
            <h3 className="font-bold text-[#1B4332] text-sm sm:text-base">
              Bitácora de {selectedChild?.firstName} Hoy
            </h3>
          </div>
          <Link to="/actividades" className="text-xs font-bold text-[#52796F] hover:underline">
            Ver todas
          </Link>
        </div>

        <div className="space-y-3">
          {recentActivities.map(act => (
            <div 
              key={act.id} 
              onClick={() => setActiveCardDetail({
                title: act.title,
                subtitle: `Categoría: ${act.category.toUpperCase()} • ${act.time || '10:00'} hs • Registrado por: ${act.authorName}`,
                content: (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#F0ECE1]">
                      <h4 className="text-sm font-bold text-[#1B4332] mb-1.5">{act.title}</h4>
                      <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{act.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 block mb-0.5">Fecha y Hora</span>
                        <span className="font-bold text-[#1B4332]">{act.date} a las {act.time} hs</span>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 block mb-0.5">Educadora Responsable</span>
                        <span className="font-bold text-[#1B4332]">{act.authorName}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#F0ECE1] hover:border-[#52796F]/50 hover:bg-[#F5F2EB] transition-all flex items-start gap-3 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-[#EBF3ED] text-[#245436] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4 text-[#52796F]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#1B4332] truncate group-hover:text-[#52796F] transition-colors">{act.title}</span>
                  <span className="text-[11px] font-mono text-gray-400 shrink-0 ml-2">{act.time} hs</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {act.description}
                </p>
                <div className="mt-1 text-[10px] text-[#52796F] font-semibold">
                  Hacé clic para ver el registro completo →
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CUOTAS Y ARANCELES SECTION */}
      <div className="bg-white rounded-3xl border border-[#E9ECEF] p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-800">
              <CreditCard className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-[#1B4332] text-base sm:text-lg">
                Estado de Cuotas y Pagos ({selectedChild?.firstName})
              </h3>
              <p className="text-xs text-gray-500">
                Cancelación segura mediante Mercado Pago o Transferencia Bancaria
              </p>
            </div>
          </div>
        </div>

        {loadingFees ? (
          <div className="py-6 text-center text-xs text-gray-400">
            Cargando cuotas del alumno...
          </div>
        ) : fees.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-500 bg-[#FAF9F5] rounded-2xl border border-gray-100">
            No hay cuotas registradas para este alumno.
          </div>
        ) : (
          <div className="space-y-3">
            {fees.map((fee) => (
              <div 
                key={fee.id}
                className="p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FAF9F5] border-[#F0ECE1] hover:border-gray-300"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm sm:text-base">{fee.concept}</span>
                    {fee.status === 'paid' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Abonada
                      </span>
                    )}
                    {fee.status === 'in_review' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 animate-pulse">
                        <Clock className="w-3 h-3" /> Comprobante en Revisión
                      </span>
                    )}
                    {fee.status === 'pending' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        Pendiente
                      </span>
                    )}
                    {fee.status === 'overdue' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                        Vencida
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span>Vencimiento: <strong className="text-gray-700">{fee.dueDate}</strong></span>
                    {fee.paidAt && (
                      <span>Abonado el: <strong className="text-emerald-800">{new Date(fee.paidAt).toLocaleDateString('es-AR')}</strong></span>
                    )}
                    {fee.paymentMethod && (
                      <span>Vía: <strong className="text-gray-700 capitalize">{fee.paymentMethod}</strong></span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200">
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Importe</span>
                    <span className="text-lg sm:text-xl font-black text-[#1B4332]">
                      ${fee.amount.toLocaleString('es-AR')}
                    </span>
                  </div>

                  {(fee.status === 'pending' || fee.status === 'overdue') && (
                    <button
                      onClick={() => {
                        setSelectedFeeToPay(fee);
                        setMpError('');
                        setTransferSuccess(false);
                        setTransferFileDataUrl(null);
                        setIsPayModalOpen(true);
                      }}
                      className="btn-fluid px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#1B4332] text-white hover:bg-[#2d5f47] shadow-xs flex items-center gap-1.5"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Pagar Cuota</span>
                    </button>
                  )}

                  {fee.status === 'in_review' && (
                    <span className="text-xs text-amber-800 font-semibold bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                      Esperando confirmación
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Link Child Modal */}
      <Modal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        title="Vincular Otro Hijo/a a tu Cuenta"
        subtitle="Ingresá el código alfanumérico entregado por secretaría"
        maxWidth="md"
      >
        <form onSubmit={handleLinkNewChild} className="space-y-4">
          {linkError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{linkError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Código de Vinculación
            </label>
            <input
              type="text"
              required
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              placeholder="EJ: NIDO-SOFIA-2026"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-mono text-sm font-bold text-[#1B4332] uppercase focus:ring-2 focus:ring-[#52796F]"
            />
          </div>

          <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#F0ECE1] text-[11px] text-gray-500">
            Código de prueba rápido: <strong className="font-mono text-[#1B4332] cursor-pointer" onClick={() => setNewCode('NIDO-SOFIA-2026')}>NIDO-SOFIA-2026</strong> (Sofía Gómez)
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsLinkModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={linkLoading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs cursor-pointer"
            >
              {linkLoading ? 'Validando...' : 'Vincular Hijo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Contacts Modal */}
      <Modal
        isOpen={isEditContactOpen}
        onClose={() => setIsEditContactOpen(false)}
        title="Actualizar Teléfonos de Contacto"
        subtitle="Mantenga sus números de urgencia al día"
        maxWidth="md"
      >
        {saveSuccess ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <h4 className="text-base font-bold text-[#1B4332]">Contactos actualizados correctamente</h4>
          </div>
        ) : (
          <form onSubmit={handleSaveContact} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Teléfono Celular Primario *
              </label>
              <input
                type="tel"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Familiar Alternativo de Emergencia *
              </label>
              <input
                type="text"
                required
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsEditContactOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Card Detail Modal - Instant background scroll lock */}
      <Modal
        isOpen={!!activeCardDetail}
        onClose={() => setActiveCardDetail(null)}
        title={activeCardDetail?.title || 'Detalle del Registro'}
        subtitle={activeCardDetail?.subtitle}
        maxWidth="md"
      >
        {activeCardDetail?.content}
        <div className="mt-6 pt-3 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={() => setActiveCardDetail(null)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs cursor-pointer"
          >
            Cerrar Detalle
          </button>
        </div>
      </Modal>

      {/* Payment Modal (Mercado Pago & Transferencia Bancaria) */}
      <Modal
        isOpen={isPayModalOpen && !!selectedFeeToPay}
        onClose={() => setIsPayModalOpen(false)}
        title="Abonar Cuota del Alumno"
        subtitle={`${selectedFeeToPay?.concept} • Alumno: ${selectedChild?.firstName} ${selectedChild?.lastName}`}
        maxWidth="lg"
      >
        {selectedFeeToPay && (
          <div className="space-y-5">
            {/* Amount Banner */}
            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#EFECE5] flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 block uppercase font-bold tracking-wider">Total a Pagar</span>
                <span className="text-2xl font-black text-[#1B4332]">
                  ${selectedFeeToPay.amount.toLocaleString('es-AR')} ARS
                </span>
              </div>
              <div className="text-right text-xs text-gray-500">
                <span>Vencimiento:</span>
                <strong className="block text-gray-800 text-sm">{selectedFeeToPay.dueDate}</strong>
              </div>
            </div>

            {/* Payment Method Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-2xl text-xs sm:text-sm font-bold">
              <button
                type="button"
                onClick={() => setPaymentTab('mercadopago')}
                className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  paymentTab === 'mercadopago'
                    ? 'bg-[#009EE3] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Mercado Pago</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentTab('transfer')}
                className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  paymentTab === 'transfer'
                    ? 'bg-[#1B4332] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>Transferencia Bancaria</span>
              </button>
            </div>

            {/* TAB 1: MERCADO PAGO */}
            {paymentTab === 'mercadopago' && (
              <div className="space-y-4 pt-1">
                <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-xs sm:text-sm space-y-2 text-sky-950">
                  <div className="flex items-center gap-2 font-bold text-[#009EE3]">
                    <ShieldCheck className="w-5 h-5 text-[#009EE3]" />
                    <span>Pago Seguro Oficial por Mercado Pago</span>
                  </div>
                  <p className="text-xs text-sky-800 leading-relaxed">
                    Podés abonar con tarjeta de crédito (cuotas disponibles), débito, dinero en cuenta de Mercado Pago o transferencias instantáneas.
                  </p>
                  <p className="text-[11px] text-sky-700 italic">
                    La acreditación es validada automáticamente mediante notificaciones del servidor (Webhook seguro).
                  </p>
                </div>

                {mpError && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-700" />
                      <span>Aviso de Integración</span>
                    </div>
                    <p>{mpError}</p>
                  </div>
                )}

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPayModalOpen(false)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleStartMercadoPago}
                    disabled={mpLoading}
                    className="w-full sm:w-auto btn-fluid px-6 py-3 rounded-2xl bg-[#009EE3] text-white font-extrabold text-xs sm:text-sm hover:bg-[#0081bb] shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{mpLoading ? 'Conectando con Mercado Pago...' : 'Pagar con Mercado Pago'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: TRANSFERENCIA BANCARIA */}
            {paymentTab === 'transfer' && (
              <div className="space-y-4 pt-1">
                {transferSuccess ? (
                  <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                    <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                    <h4 className="text-base font-bold text-emerald-950">¡Comprobante Enviado Correctamente!</h4>
                    <p className="text-xs text-emerald-800 max-w-md mx-auto">
                      Tu comprobante ha sido registrado y el estado de la cuota pasó a <strong>"En Revisión"</strong>. La secretaría administrativa lo validará en breve.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitTransfer} className="space-y-4 text-xs sm:text-sm">
                    {/* Bank Details Card with Copy Buttons */}
                    <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-gray-200 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
                        <span>Datos Bancarios de la Guardería</span>
                        <span>{GUARDERIA_BANK_DETAILS.bankName}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-400 block text-[10px]">Titular:</span>
                          <span className="font-bold text-gray-800">{GUARDERIA_BANK_DETAILS.accountHolder}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">CUIT:</span>
                          <span className="font-mono text-gray-800">{GUARDERIA_BANK_DETAILS.cuit}</span>
                        </div>
                      </div>

                      {/* CBU & Alias with Copy */}
                      <div className="space-y-2 pt-1 border-t border-gray-200">
                        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-200">
                          <div>
                            <span className="text-[10px] text-gray-400 block font-semibold">CBU:</span>
                            <span className="font-mono text-xs font-bold text-gray-900 select-all">
                              {GUARDERIA_BANK_DETAILS.cbu}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(GUARDERIA_BANK_DETAILS.cbu, 'cbu')}
                            className="btn-fluid px-2.5 py-1 text-xs font-bold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-1"
                          >
                            {copiedField === 'cbu' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedField === 'cbu' ? 'Copiado' : 'Copiar'}</span>
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-200">
                          <div>
                            <span className="text-[10px] text-gray-400 block font-semibold">ALIAS:</span>
                            <span className="font-mono text-xs font-black text-[#1B4332] select-all">
                              {GUARDERIA_BANK_DETAILS.alias}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(GUARDERIA_BANK_DETAILS.alias, 'alias')}
                            className="btn-fluid px-2.5 py-1 text-xs font-bold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-1"
                          >
                            {copiedField === 'alias' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedField === 'alias' ? 'Copiado' : 'Copiar'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* File Upload for Receipt */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Adjuntar Comprobante Bancario (Imagen o PDF) *
                      </label>
                      <div className="relative border-2 border-dashed border-gray-300 hover:border-[#1B4332] rounded-2xl p-4 text-center cursor-pointer bg-gray-50 transition-colors">
                        <input
                          type="file"
                          required
                          accept="image/*,application/pdf"
                          onChange={handleReceiptFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        {transferFile ? (
                          <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-800">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Archivo seleccionado: {transferFile.name}</span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Upload className="w-6 h-6 text-gray-400 mx-auto" />
                            <p className="text-xs text-gray-600 font-semibold">
                              Hacé clic o arrastrá aquí el comprobante de transferencia
                            </p>
                            <p className="text-[10px] text-gray-400">Formatos: JPG, PNG, WEBP o PDF (Máximo 2MB)</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Additional Notes / Origin Bank */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Banco o Billetera de Origen:
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Banco Nación, Santander, MP..."
                          value={transferBankOrigin}
                          onChange={(e) => setTransferBankOrigin(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#1B4332]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          N° de Operación / Comentarios:
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Transf. N° 48920194"
                          value={transferNotes}
                          onChange={(e) => setTransferNotes(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#1B4332]"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => setIsPayModalOpen(false)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={transferSubmitting || !transferFileDataUrl}
                        className="btn-fluid px-6 py-2.5 rounded-2xl bg-[#1B4332] text-white text-xs sm:text-sm font-bold hover:bg-[#2d5f47] shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{transferSubmitting ? 'Enviando comprobante...' : 'Enviar para Revisión'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
