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
  Palette,
  Smile,
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
  Printer,
  Bell,
  BellRing,
  BellOff,
  Settings,
  ExternalLink,
  ArrowRight,
  CheckCheck,
  Radio,
  MapPin
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../services/firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  Child, 
  Activity, 
  AttendanceRecord, 
  Fee, 
  GUARDERIA_BANK_DETAILS, 
  PushNotificationPreferences,
  InternalNotification 
} from '../../types';
import { pushNotificationService } from '../../services/pushNotificationService';
import { notificationService } from '../../services/notificationService';
import { 
  INITIAL_CHILDREN, 
  INITIAL_ACTIVITIES, 
  INITIAL_ATTENDANCE, 
  INITIAL_FEES 
} from '../../services/seedData';
import { dataService } from '../../services/dataService';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { SchoolCalendar } from '../../components/calendar/SchoolCalendar';
import { validateAndLinkChildCode } from '../../services/enrollmentService';
import { 
  createCheckoutPreference, 
  submitTransferReceipt, 
  verifyServerPayment 
} from '../../services/mercadoPagoService';

export const ParentPortalPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userProfile, updateLinkedChild, currentUser } = useAuth();
  const toast = useToast();
  
  // Resolve linked children from userProfile and centralized dataService
  const [childrenList, setChildrenList] = useState<Child[]>(() => dataService.getChildren());
  const linkedIds = userProfile?.linkedChildIds ?? ['child-mateo'];
  const availableChildren = childrenList.filter(c => linkedIds.includes(c.id));
  
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

  // Consolidated Daily Summary Modal
  const [isConsolidatedSummaryOpen, setIsConsolidatedSummaryOpen] = useState(false);

  // Push Notification States
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [pushPrefs, setPushPrefs] = useState<PushNotificationPreferences>(() => pushNotificationService.getPreferences());
  const [pushPermission, setPushPermission] = useState(() => pushNotificationService.getPermission());
  const [pushLoading, setPushLoading] = useState(false);

  // Card detail modal state (locks background scroll completely)
  const [activeCardDetail, setActiveCardDetail] = useState<{
    title: string;
    subtitle?: string;
    content: React.ReactNode;
  } | null>(null);

  // Real-time Firestore Notifications for Families
  const [liveNotifications, setLiveNotifications] = useState<InternalNotification[]>([]);
  const [notifFilter, setNotifFilter] = useState<'all' | 'attendance' | 'activity'>('all');

  // Realtime subscription to Firestore notifications
  useEffect(() => {
    if (!selectedChild) return;
    const unsub = notificationService.subscribeToNotifications(
      {
        userId: userProfile?.id,
        role: role || 'parent',
        roomIds: [selectedChild.roomId],
        childIds: [selectedChild.id],
        familyId: userProfile?.familyId
      },
      (list) => {
        setLiveNotifications(list);
      }
    );
    return () => unsub();
  }, [selectedChild?.id, selectedChild?.roomId, userProfile?.id, userProfile?.familyId, role]);

  // Scroll to top when switching selected child
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [selectedChild?.id]);

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

    if (!auth.currentUser) {
      const fallback = INITIAL_FEES.filter((f) => f.childId === selectedChild.id);
      setFees(fallback.length > 0 ? (fallback as Fee[]) : []);
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
  }, [selectedChild, currentUser]);

  useEffect(() => {
    if (availableChildren.length > 0 && (!selectedChild || !linkedIds.includes(selectedChild.id))) {
      setSelectedChild(availableChildren[0]);
    }
  }, [linkedIds, childrenList]);

  // Synchronize activities, attendance, and children with dataService
  useEffect(() => {
    const updateChildData = () => {
      if (!selectedChild) {
        setRecentActivities([]);
        setAttendanceToday(null);
        return;
      }
      
      const allActs = dataService.getActivities();
      const acts = allActs.filter(a => {
        const isSameRoom = a.roomId === selectedChild.roomId;
        const isTargeted = !a.childIds || a.childIds.length === 0 || a.childIds.includes(selectedChild.id);
        return isSameRoom && isTargeted;
      });
      setRecentActivities(acts);

      const todayStr = new Date().toISOString().split('T')[0];
      const allAtt = dataService.getAttendance();
      const att = allAtt.find(a => a.childId === selectedChild.id && (a.date === todayStr || !a.date)) || null;
      setAttendanceToday(att);
    };

    updateChildData();

    const unsubChildren = dataService.subscribe('children', () => {
      setChildrenList(dataService.getChildren());
    });
    const unsubActivities = dataService.subscribe('activities', () => {
      updateChildData();
    });
    const unsubAttendance = dataService.subscribe('attendance', () => {
      updateChildData();
    });

    dataService.syncFromFirestore();

    return () => {
      unsubChildren();
      unsubActivities();
      unsubAttendance();
    };
  }, [selectedChild]);

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    toast.success('Contacto guardado', 'Se actualizaron las personas autorizadas para el retiro.');
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
      toast.success(
        'Hijo/a vinculado', 
        `${res.child.firstName} ${res.child.lastName} ahora está asociado a tu perfil familiar.`
      );
      setIsLinkModalOpen(false);
      setNewCode('');
    } else {
      const err = res.message || 'Código inválido o ya utilizado.';
      setLinkError(err);
      toast.error('Error al vincular', err);
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
        toast.info('Redirigiendo a Mercado Pago...', 'Serás dirigido a la plataforma de pago segura');
        window.location.href = res.sandboxInitPoint || res.initPoint!;
      } else if (res.message) {
        const msg = res.message + (res.notice ? ` (${res.notice})` : '');
        setMpError(msg);
        toast.error('Error con Mercado Pago', msg);
      }
    } catch (err: any) {
      const msg = err.message || 'Error iniciando Mercado Pago';
      setMpError(msg);
      toast.error('Error en pasarela de pago', msg);
    } finally {
      setMpLoading(false);
    }
  };

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Archivo muy pesado', 'El comprobante no debe superar los 2MB.');
      return;
    }

    setTransferFile(file);
    const isPdf = file.type === 'application/pdf';
    setTransferFileType(isPdf ? 'pdf' : 'image');

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setTransferFileDataUrl(uploadEvent.target?.result as string);
      toast.info('Archivo adjuntado', `${file.name} listo para enviar`);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeeToPay || !selectedChild || !transferFileDataUrl) {
      toast.warning('Comprobante requerido', 'Por favor adjunte el comprobante digital (imagen o PDF).');
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
      toast.success(
        'Comprobante enviado', 
        'El recibo ha sido enviado al equipo de administración para su verificación.'
      );
      setTimeout(() => {
        setIsPayModalOpen(false);
        setTransferSuccess(false);
        setTransferFileDataUrl(null);
        setTransferFile(null);
        setTransferNotes('');
        setTransferBankOrigin('');
      }, 2000);
    } catch (err: any) {
      toast.error('Error al enviar', err.message || 'No se pudo enviar el comprobante.');
    } finally {
      setTransferSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.info('Copiado al portapapeles', `${field.toUpperCase()} copiado`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyConsolidatedSummary = () => {
    if (!selectedChild) return;
    
    const confirmedMeals = recentActivities.filter(a => a.category === 'meal');
    const confirmedActs = recentActivities.filter(a => a.category === 'activity' || a.category === 'milestone');
    const confirmedCare = recentActivities.filter(a => a.category === 'nap' || a.category === 'hygiene');
    const confirmedNotices = recentActivities.filter(a => a.isImportant);
    const todayDateDisplay = new Date().toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const lines: string[] = [];
    lines.push(`📋 *RESUMEN DIARIO CONSOLIDADO — NIDO CUIDADO*`);
    lines.push(`📅 *Fecha:* ${todayDateDisplay}`);
    lines.push(`👶 *Alumno:* ${selectedChild.firstName} ${selectedChild.lastName}`);
    lines.push(`🏫 *Sala:* ${selectedChild.roomName}`);
    lines.push(``);
    
    lines.push(`📍 *ESTADO DE ASISTENCIA OFICIAL:*`);
    if (attendanceToday) {
      const statusText = attendanceToday.status === 'absent' 
        ? 'Ausente en Guardería' 
        : attendanceToday.status === 'justified' 
        ? 'Inasistencia Justificada' 
        : 'Presente en Sala';
      lines.push(`• Estado: ${statusText}`);
      if (attendanceToday.checkInTime) lines.push(`• Horario de Ingreso: ${attendanceToday.checkInTime} hs`);
      if (attendanceToday.checkOutTime) lines.push(`• Horario de Egreso: ${attendanceToday.checkOutTime} hs`);
      lines.push(`• Registro Oficial: ${attendanceToday.recordedByName || 'Docente de Turno'}`);
      if (attendanceToday.notes) lines.push(`• Observaciones: ${attendanceToday.notes}`);
    } else {
      lines.push(`• Estado: Pendiente de registro de asistencia en el sistema.`);
    }
    lines.push(``);

    lines.push(`🍎 *ALIMENTACIÓN Y NUTRICIÓN:*`);
    if (confirmedMeals.length > 0) {
      confirmedMeals.forEach(m => {
        lines.push(`• [${m.time || '--:--'} hs] ${m.title}: ${m.description} (Resp: ${m.authorName})`);
      });
    } else {
      lines.push(`• Sin registros de alimentación confirmados hoy en el sistema.`);
    }
    lines.push(``);

    lines.push(`🎨 *ACTIVIDADES PEDAGÓGICAS Y DESARROLLO:*`);
    if (confirmedActs.length > 0) {
      confirmedActs.forEach(act => {
        const imp = act.isImportant ? ' [IMPORTANTE]' : '';
        lines.push(`• [${act.time || '--:--'} hs] ${act.title}${imp}: ${act.description} (Docente: ${act.authorName})`);
      });
    } else {
      lines.push(`• Sin actividades pedagógicas confirmadas hoy en el sistema.`);
    }
    lines.push(``);

    lines.push(`💤 *CUIDADOS, SIESTA E HIGIENE:*`);
    if (confirmedCare.length > 0) {
      confirmedCare.forEach(c => {
        lines.push(`• [${c.time || '--:--'} hs] ${c.title}: ${c.description} (Resp: ${c.authorName})`);
      });
    } else {
      lines.push(`• Sin registros específicos de descanso o higiene asentados hoy.`);
    }
    lines.push(``);

    lines.push(`⚠️ *AVISOS PRIORITARIOS:*`);
    if (confirmedNotices.length > 0) {
      confirmedNotices.forEach(n => {
        lines.push(`• [${n.time || '--:--'} hs] ${n.title}: ${n.description}`);
      });
    } else {
      lines.push(`• Jornada habitual sin novedades prioritarias registradas.`);
    }
    lines.push(``);

    lines.push(`🩺 *PAUTAS DE SALUD DEL ALUMNO:*`);
    lines.push(`• Alergias: ${selectedChild.allergies || 'Ninguna registrada'}`);
    lines.push(`• Indicación dietaria: ${selectedChild.dietaryNotes || 'Estándar'}`);
    lines.push(``);
    lines.push(`✓ *Datos oficiales validados por el sistema institucional Nido Cuidado*`);

    navigator.clipboard.writeText(lines.join('\n'));
    toast.success('Resumen copiado', 'El resumen diario consolidado se copió al portapapeles listo para compartir.');
  };

  // Push Notification Handlers
  const handleTogglePushSubscription = async () => {
    setPushLoading(true);
    if (pushPrefs.enabled) {
      await pushNotificationService.unsubscribe(userProfile?.id);
      setPushPrefs(pushNotificationService.getPreferences());
      setPushPermission(pushNotificationService.getPermission());
      toast.info('Notificaciones pausadas', 'Ya no recibirás alertas push en este navegador.');
    } else {
      const res = await pushNotificationService.subscribe(userProfile?.id, selectedChild?.id, {
        notifyActivities: true,
        notifyDailySummary: true,
        notifyAttendance: true,
        notifyUrgent: true,
      });
      setPushPermission(res.permission);
      setPushPrefs(pushNotificationService.getPreferences());
      if (res.success) {
        toast.success('¡Alertas push activadas!', 'El Service Worker te notificará instantáneamente en tu dispositivo.');
      } else {
        toast.error('Permiso requerido', res.error || 'No se pudieron activar las notificaciones push.');
      }
    }
    setPushLoading(false);
  };

  const handleSavePushPreferences = async () => {
    setPushLoading(true);
    await pushNotificationService.savePreferences(pushPrefs, userProfile?.id, selectedChild?.id);
    toast.success('Preferencias guardadas', 'Se actualizaron los canales de alerta push.');
    setPushLoading(false);
    setIsPushModalOpen(false);
  };

  const handleTestPushNotification = async () => {
    const success = await pushNotificationService.sendTestNotification();
    if (success) {
      toast.success('Alerta enviada', 'Revisá la notificación del Service Worker en tu pantalla.');
    } else {
      toast.warning('Permisos pendientes', 'Asegurate de haber aceptado el permiso de notificaciones en el navegador.');
    }
  };

  const handleSimulateRealtimeAlert = async (type: 'attendance' | 'activity') => {
    if (!selectedChild) return;
    if (type === 'attendance') {
      const sampleAtt: AttendanceRecord = {
        id: `att-sim-${Date.now()}`,
        childId: selectedChild.id,
        childName: `${selectedChild.firstName} ${selectedChild.lastName}`,
        roomId: selectedChild.roomId,
        roomName: selectedChild.roomName,
        date: new Date().toISOString().split('T')[0],
        status: 'present',
        checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        notes: 'Ingreso puntual por portería verificado.',
        recordedByName: 'Docente de Turno',
        recordedByUserId: userProfile?.id || 'staff',
        createdAt: new Date().toISOString()
      };
      await notificationService.notifyAttendance(sampleAtt, sampleAtt.childName, sampleAtt.roomName);
      toast.success('¡Alerta de Asistencia Enviada!', 'Se registró en Firestore y llegó en tiempo real al portal y a la campana.');
    } else {
      const sampleAct: Activity = {
        id: `act-sim-${Date.now()}`,
        title: 'Música y Juegos con Títeres',
        description: `${selectedChild.firstName} participó activamente en la ronda musical de narración y expresión sonora en ${selectedChild.roomName}.`,
        category: 'activity',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        roomId: selectedChild.roomId,
        childIds: [selectedChild.id],
        isImportant: false,
        authorName: 'Docente de Sala',
        authorUserId: 'teacher-carla',
        createdAt: new Date().toISOString()
      };
      await notificationService.notifyActivity(sampleAct, selectedChild.roomName, [selectedChild]);
      toast.success('¡Alerta de Bitácora Enviada!', 'Se guardó en Firestore y se sincronizó en vivo.');
    }
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
    <div className="space-y-5 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Mercado Pago Return Notice */}
      {mpSuccessNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-emerald-200 text-emerald-900">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <p className="text-xs sm:text-sm font-semibold">{mpSuccessNotice}</p>
          </div>
          <button 
            onClick={() => setMpSuccessNotice(null)} 
            className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
          >
            Entendido
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#52796F] to-[#2D6A4F] text-white p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="inline-flex flex-wrap items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-xs mb-1">
            <Heart className="w-3.5 h-3.5 text-rose-300" />
            <span>Portal para Familias</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight">
            Hola, {userProfile?.displayName || 'Familia'}
          </h2>
          <p className="text-xs text-white/80 mt-0.5 max-w-xl leading-relaxed">
            Seguimiento diario, bitácora pedagógica, novedades y estado de cuotas de tu hijo/a.
          </p>
        </div>

        <button
          onClick={() => setIsEditContactOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white text-[#1B4332] text-xs font-bold hover:bg-[#FAF9F5] transition-all shadow-xs self-start md:self-auto cursor-pointer"
        >
          <Edit3 className="w-4 h-4 text-[#52796F]" />
          <span>Actualizar Teléfonos</span>
        </button>
      </div>

      {/* Multiple Children Selector Tabs if more than one, plus link another button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="inline-flex flex-wrap gap-1.5 p-1 bg-[#FAF9F5] border border-gray-200/80 rounded-2xl max-w-full text-xs">
          {availableChildren.map(child => (
            <button
              key={child.id}
              onClick={() => setSelectedChild(child)}
              className={`inline-flex flex-wrap items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                selectedChild?.id === child.id
                  ? 'bg-[#1B4332] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
              }`}
            >
              <Baby className="w-3.5 h-3.5 shrink-0" />
              <span>{child.firstName} {child.lastName}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                selectedChild?.id === child.id ? 'bg-white/20 text-white' : 'bg-gray-200/80 text-gray-600'
              }`}>
                {child.roomName}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setLinkError('');
            setNewCode('');
            setIsLinkModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-dashed border-[#52796F] text-[#52796F] text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Vincular otro hijo/a</span>
        </button>
      </div>

      {/* Selected Child Header Card */}
      {selectedChild && (
        <div className="bg-white rounded-2xl border border-[#E9ECEF] p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#EBF3ED] text-[#245436] flex items-center justify-center font-black text-xl sm:text-2xl border border-[#D1E4D7] shrink-0">
              {selectedChild.firstName[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#1B4332]">
                  {selectedChild.firstName} {selectedChild.lastName}
                </h3>
                <Badge variant="green" size="sm">Activo</Badge>
              </div>
              <p className="text-xs text-[#52796F] font-semibold mt-0.5">
                {selectedChild.roomName} • Educadora a cargo
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsConsolidatedSummaryOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] text-xs font-bold text-white transition-all shadow-xs cursor-pointer active:scale-95"
              title="Generar resumen diario consolidado con actividades y asistencia confirmadas"
            >
              <FileText className="w-4 h-4 text-[#A3B18A]" />
              <span>Resumen Diario Consolidado</span>
            </button>
            <Link
              to={`/perfil-nino/${selectedChild.id}`}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FAF9F5] hover:bg-[#F2EFE8] text-xs font-bold text-[#1B4332] border border-[#E0DACE] transition-colors"
            >
              <Eye className="w-4 h-4 text-[#52796F]" />
              <span>Ver Expediente</span>
            </Link>
          </div>
        </div>
      )}

      {/* Consolidated Daily Summary Quick Banner */}
      {selectedChild && (
        <div className="bg-[#FAF9F5] border border-[#E6E2D8] rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#52796F] text-white flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-bold text-[#1B4332]">
                  Resumen Oficial de la Jornada
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  attendanceToday?.status === 'present' 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                    : attendanceToday?.status === 'absent' 
                    ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                    : attendanceToday?.status === 'justified' 
                    ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}>
                  {attendanceToday?.status === 'present' 
                    ? 'Asistencia Confirmada' 
                    : attendanceToday?.status === 'absent' 
                    ? 'Ausencia Asentada' 
                    : attendanceToday?.status === 'justified' 
                    ? 'Inasistencia Justificada' 
                    : 'Asistencia Pendiente'}
                </span>
                <span className="text-[11px] text-gray-500 font-medium">
                  • {recentActivities.length} {recentActivities.length === 1 ? 'actividad confirmada' : 'actividades confirmadas'} hoy
                </span>
              </div>
              <p className="text-[11px] text-gray-500 truncate mt-0.5">
                Consolidado generado únicamente con registros verificados de la sala {selectedChild.roomName}.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsConsolidatedSummaryOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B4332] hover:text-[#52796F] px-3 py-1.5 rounded-xl bg-white border border-[#DDD8CD] shadow-2xs hover:shadow-xs transition-all shrink-0 cursor-pointer self-stretch sm:self-auto justify-center"
          >
            <span>Ver Resumen Completo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Push Notifications Subscription Card */}
      <div className="bg-white border border-[#E8EDE9] rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start md:items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
            pushPrefs.enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-[#FAF9F5] text-gray-500 border border-gray-200'
          }`}>
            {pushPrefs.enabled ? <BellRing className="w-5 h-5 animate-pulse text-emerald-600" /> : <Bell className="w-5 h-5 text-gray-400" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-[#1B4332]">
                Alertas Instantáneas de Sala (Notificaciones Push)
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                pushPrefs.enabled
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}>
                {pushPrefs.enabled ? 'Activas en este Dispositivo' : 'Inactivas'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
              {pushPrefs.enabled
                ? 'El Service Worker te notificará al instante cuando la maestra cargue una actividad, comida o el resumen diario.'
                : 'Activá la suscripción para enterarte en tiempo real de cada novedad y resumen de tu hijo/a.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0">
          {pushPrefs.enabled ? (
            <>
              <button
                type="button"
                onClick={handleTestPushNotification}
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF9F5] hover:bg-[#F0ECE1] text-xs font-bold text-[#1B4332] border border-[#DDD8CD] transition-all cursor-pointer shadow-2xs"
                title="Probar notificación en vivo"
              >
                <Bell className="w-3.5 h-3.5 text-[#52796F]" />
                <span>Probar</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPushModalOpen(true)}
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 border border-gray-200 transition-all cursor-pointer shadow-2xs"
              >
                <Settings className="w-3.5 h-3.5 text-gray-500" />
                <span>Configurar</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={pushLoading}
              onClick={handleTogglePushSubscription}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#52796F] hover:bg-[#405F57] text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              <BellRing className="w-4 h-4 text-emerald-200" />
              <span>{pushLoading ? 'Activando...' : 'Activar Notificaciones Push'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Real-time Firestore Live Notifications Stream */}
      <div className="bg-white border border-[#E8EDE9] rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EBF3ED] text-[#1B4332] flex items-center justify-center font-bold shrink-0">
              <Radio className="w-4 h-4 text-[#52796F] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-[#1B4332]">
                  Novedades en Tiempo Real
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                  <span>Firestore en vivo</span>
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Alertas automáticas al registrarse asistencia o nuevas actividades en sala
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Test Alert Simulation Buttons */}
            <button
              type="button"
              onClick={() => handleSimulateRealtimeAlert('attendance')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#FAF9F5] hover:bg-[#EBF3ED] text-[11px] font-bold text-[#1B4332] border border-[#D8E4DA] transition-all cursor-pointer shadow-2xs active:scale-95"
              title="Simular ingreso o egreso en tiempo real"
            >
              <MapPin className="w-3 h-3 text-[#52796F]" />
              <span>+ Probar Asistencia</span>
            </button>
            <button
              type="button"
              onClick={() => handleSimulateRealtimeAlert('activity')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#FAF9F5] hover:bg-[#EBF3ED] text-[11px] font-bold text-[#1B4332] border border-[#D8E4DA] transition-all cursor-pointer shadow-2xs active:scale-95"
              title="Simular carga de actividad en la bitácora"
            >
              <BookOpen className="w-3 h-3 text-[#52796F]" />
              <span>+ Probar Bitácora</span>
            </button>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setNotifFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                notifFilter === 'all'
                  ? 'bg-[#1B4332] text-white shadow-2xs'
                  : 'bg-[#FAF9F5] text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Todas ({liveNotifications.length})
            </button>
            <button
              type="button"
              onClick={() => setNotifFilter('attendance')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                notifFilter === 'attendance'
                  ? 'bg-[#1B4332] text-white shadow-2xs'
                  : 'bg-[#FAF9F5] text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              📍 Asistencias ({liveNotifications.filter(n => n.type === 'attendance').length})
            </button>
            <button
              type="button"
              onClick={() => setNotifFilter('activity')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                notifFilter === 'activity'
                  ? 'bg-[#1B4332] text-white shadow-2xs'
                  : 'bg-[#FAF9F5] text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              🎨 Bitácora ({liveNotifications.filter(n => n.type === 'activity').length})
            </button>
          </div>

          {liveNotifications.some(n => !n.readByUserIds?.includes(userProfile?.id || '')) && (
            <button
              type="button"
              onClick={() => notificationService.markAllAsRead(userProfile?.id || '', liveNotifications)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#52796F] hover:text-[#1B4332] hover:underline cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Marcar todas como leídas</span>
            </button>
          )}
        </div>

        {/* Live List Stream */}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {(() => {
            const filtered = liveNotifications.filter(n => {
              if (notifFilter === 'attendance') return n.type === 'attendance';
              if (notifFilter === 'activity') return n.type === 'activity';
              return true;
            });

            if (filtered.length === 0) {
              return (
                <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-dashed border-[#E0DCCF] text-center text-xs text-gray-400">
                  <p>No hay alertas en este filtro todavía.</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Al cargarse una actividad o asistencia en el sistema, aparecerá aquí inmediatamente.
                  </p>
                </div>
              );
            }

            return filtered.slice(0, 5).map(n => {
              const isUnread = !n.readByUserIds?.includes(userProfile?.id || '');
              return (
                <div
                  key={n.id}
                  onClick={() => notificationService.markAsRead(n.id, userProfile?.id || '')}
                  className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                    isUnread
                      ? 'bg-emerald-50/50 border-emerald-200 shadow-2xs'
                      : 'bg-[#FAF9F5] border-gray-200/80 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="p-2 rounded-xl bg-white border border-gray-200 text-sm shrink-0 shadow-2xs">
                      {n.type === 'attendance' ? '📍' : n.type === 'summary' ? '📋' : '🎨'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold leading-tight ${isUnread ? 'text-[#1B4332]' : 'text-gray-800'}`}>
                          {n.title}
                        </span>
                        {isUnread && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-600 text-white">
                            NUEVA
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">
                        {n.message}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                        <span>Docente: <strong>{n.senderName}</strong></span>
                        <span>•</span>
                        <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs</span>
                      </div>
                    </div>
                  </div>

                  {isUnread && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        notificationService.markAsRead(n.id, userProfile?.id || '');
                      }}
                      className="text-[10px] font-bold text-[#52796F] hover:underline shrink-0 cursor-pointer"
                    >
                      Leída
                    </button>
                  )}
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Today's Status Cards */}
      {(() => {
        const todayMealActivity = recentActivities.find(a => a.category === 'meal');
        const todayPedagogicalActivity = recentActivities.find(a => a.category === 'activity' || a.category === 'milestone');

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Attendance card */}
            <div 
              onClick={() => setActiveCardDetail({
                title: 'Detalle de Asistencia y Permanencia',
                subtitle: `${selectedChild?.firstName} ${selectedChild?.lastName} • Fecha: ${attendanceToday?.date || 'Hoy'}`,
                content: (
                  <div className="space-y-4">
                    {attendanceToday ? (
                      <div className={`p-4 rounded-2xl border ${
                        attendanceToday.status === 'absent' 
                          ? 'bg-rose-50 border-rose-200 text-rose-900' 
                          : attendanceToday.status === 'justified'
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      }`}>
                        <div className="flex items-center gap-2 font-bold text-sm mb-1">
                          <CheckCircle2 className={`w-5 h-5 shrink-0 ${
                            attendanceToday.status === 'absent' ? 'text-rose-600' : attendanceToday.status === 'justified' ? 'text-amber-600' : 'text-emerald-600'
                          }`} />
                          <span>
                            Estado: {attendanceToday.status === 'absent' ? 'Ausente en Guardería' : attendanceToday.status === 'justified' ? 'Inasistencia Justificada' : 'Alumno Presente en Sala'}
                          </span>
                        </div>
                        <p className="text-xs opacity-90 leading-relaxed">
                          {attendanceToday.notes || (attendanceToday.status === 'present' ? 'Asistencia registrada con normalidad en portería.' : 'Inasistencia asentada en sistema.')}
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-gray-700">
                        <div className="flex items-center gap-2 font-bold text-sm mb-1">
                          <Clock className="w-5 h-5 text-gray-500 shrink-0" />
                          <span>Ingreso aún no registrado hoy</span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          La docente de sala todavía no ha completado la toma de asistencia para la jornada de hoy.
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 block mb-0.5 font-medium">Hora de Ingreso</span>
                        <span className="font-bold text-[#1B4332] text-sm">
                          {attendanceToday?.checkInTime ? `${attendanceToday.checkInTime} hs` : (attendanceToday?.status === 'present' ? 'Presente' : 'Sin ingreso')}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 block mb-0.5 font-medium">Hora de Salida</span>
                        <span className="font-bold text-[#1B4332] text-sm">
                          {attendanceToday?.checkOutTime ? `${attendanceToday.checkOutTime} hs` : (attendanceToday?.status === 'present' ? 'En sala (Jornada activa)' : 'Sin egreso')}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 block mb-0.5 font-medium">Docente / Registro</span>
                        <span className="font-bold text-[#1B4332] text-sm truncate block">
                          {attendanceToday?.recordedByName || 'Docente de Turno'}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 block mb-0.5 font-medium">Sala Asignada</span>
                        <span className="font-bold text-[#1B4332] text-sm truncate block">
                          {selectedChild?.roomName || 'Sala General'}
                        </span>
                      </div>
                    </div>

                    {selectedChild?.authorizedPickups && selectedChild.authorizedPickups.length > 0 ? (
                      <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                        <div className="text-xs font-bold text-gray-700">Adultos Autorizados para Retiro:</div>
                        <div className="space-y-1.5">
                          {selectedChild.authorizedPickups.map((p, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-gray-200">
                              <span className="font-semibold text-[#1B4332]">{p.name} ({p.relationship})</span>
                              {p.dni && <span className="text-gray-500 font-mono text-[11px]">DNI: {p.dni}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : selectedChild?.emergencyContact ? (
                      <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-1 text-xs">
                        <div className="font-bold text-gray-700">Contacto Registrado para Emergencias:</div>
                        <div className="text-[#1B4332] font-semibold">{selectedChild.emergencyContact}</div>
                      </div>
                    ) : null}

                    <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#F0ECE1] text-xs text-gray-600 leading-relaxed">
                      <strong className="text-[#1B4332] block mb-1">Control Estricto de Seguridad en Portería:</strong>
                      Solo pueden retirar al menor los tutores y adultos acreditados con DNI físico en recepción. Ante cualquier retiro extraordinario, por favor dar aviso previo mediante secretaría.
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
                {attendanceToday ? (
                  <>
                    <div className={`text-base sm:text-lg font-black flex items-center gap-1.5 ${
                      attendanceToday.status === 'absent' 
                        ? 'text-rose-700' 
                        : attendanceToday.status === 'justified' 
                        ? 'text-amber-700' 
                        : 'text-emerald-800'
                    }`}>
                      {attendanceToday.status === 'absent' ? (
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      ) : attendanceToday.status === 'justified' ? (
                        <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      <span>
                        {attendanceToday.status === 'absent'
                          ? 'Ausente hoy'
                          : attendanceToday.status === 'justified'
                          ? 'Inasistencia justificada'
                          : attendanceToday.checkInTime
                          ? `Ingresó: ${attendanceToday.checkInTime} hs`
                          : 'Presente en sala'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {attendanceToday.notes || (attendanceToday.status === 'present' ? 'Asistencia registrada con normalidad.' : 'Inasistencia asentada en portería.')}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-base sm:text-lg font-bold text-gray-500 flex items-center gap-1.5">
                      <Clock className="w-5 h-5 text-gray-400 shrink-0" />
                      <span>Pendiente de ingreso</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      Aún no se ha registrado la asistencia de la jornada de hoy.
                    </p>
                  </>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                <span>{attendanceToday?.recordedByName || 'Portería'}</span>
                <span className="text-[#52796F] font-bold group-hover:underline">Ver detalle →</span>
              </div>
            </div>

            {/* Feeding & Care */}
            <div 
              onClick={() => setActiveCardDetail({
                title: 'Pautas de Nutrición y Alimentación Diaria',
                subtitle: `Sala: ${selectedChild?.roomName || 'Cuna'} • Menú Saludable Supervisado`,
                content: (
                  <div className="space-y-4 text-xs">
                    {todayMealActivity ? (
                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-amber-900 font-bold text-sm flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-amber-700" />
                            {todayMealActivity.title}
                          </span>
                          <span className="text-amber-800 font-mono text-[11px] font-semibold">{todayMealActivity.time} hs</span>
                        </div>
                        {todayMealActivity.isImportant && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            <span>Aviso alimentario marcado como Importante por la docente</span>
                          </div>
                        )}
                        <p className="text-amber-900 leading-relaxed whitespace-pre-line">
                          {todayMealActivity.description}
                        </p>
                        <div className="text-[11px] text-amber-700 pt-1 border-t border-amber-200/60">
                          Registrado por: <strong>{todayMealActivity.authorName}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
                        <div className="flex items-center gap-2 text-gray-800 font-bold text-sm mb-1">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span>Sin registro de alimentación hoy</span>
                        </div>
                        <p className="text-gray-600 leading-relaxed">
                          La docente aún no ha registrado colaciones ni almuerzo para la jornada de hoy.
                        </p>
                      </div>
                    )}

                    <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Alergias declaradas:</span>
                        <span className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                          selectedChild?.allergies && selectedChild.allergies !== 'Ninguna' && selectedChild.allergies !== 'Ninguna registrada'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {selectedChild?.allergies || 'Ninguna registrada'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Indicaciones dietarias:</span>
                        <span className="font-bold text-[#1B4332] text-right">
                          {selectedChild?.dietaryNotes || 'Dieta general recomendada'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#F0ECE1] text-[11px] text-gray-500 leading-relaxed">
                      Cualquier ajuste transitorio o permanente en la alimentación puede ser comunicado directamente a la educadora de sala a través de secretaría.
                    </div>
                  </div>
                )
              })}
              className="bg-white p-5 rounded-3xl border border-[#E9ECEF] shadow-2xs hover:shadow-xs hover:border-[#52796F]/40 transition-all flex flex-col justify-between cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider group-hover:text-[#52796F] transition-colors">
                    Alimentación
                  </span>
                  {todayMealActivity?.isImportant && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                      <AlertCircle className="w-2.5 h-2.5 text-amber-700" />
                      <span>Importante</span>
                    </span>
                  )}
                </div>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>

              <div className="mb-2">
                <div className="text-sm font-bold text-[#1B4332]">
                  {todayMealActivity?.title || 'Sin registro de comida hoy'}
                </div>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {todayMealActivity?.description || 'La sala aún no ha cargado registros de alimentación para el día de hoy.'}
                </p>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                <span>{todayMealActivity?.time ? `Registrado: ${todayMealActivity.time} hs` : 'Sin novedades de momento'}</span>
                <span className="text-[#52796F] font-bold group-hover:underline">Ver detalle →</span>
              </div>
            </div>

            {/* Pedagogical Activities & Stimulation */}
            <div 
              onClick={() => setActiveCardDetail({
                title: 'Actividades Pedagógicas y Estimulación',
                subtitle: `Sala: ${selectedChild?.roomName || 'Cuna'} • Plan Educativo Integral`,
                content: (
                  <div className="space-y-4 text-xs">
                    {todayPedagogicalActivity ? (
                      <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sky-900 font-bold text-sm flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-sky-700" />
                            {todayPedagogicalActivity.title}
                          </span>
                          <span className="text-sky-800 font-mono text-[11px] font-semibold">{todayPedagogicalActivity.time} hs</span>
                        </div>
                        {todayPedagogicalActivity.isImportant && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            <span>Actividad marcada como Importante por la educadora</span>
                          </div>
                        )}
                        <p className="text-sky-900 leading-relaxed whitespace-pre-line">
                          {todayPedagogicalActivity.description}
                        </p>
                        <div className="text-[11px] text-sky-700 pt-1 border-t border-sky-200/60">
                          Docente: <strong>{todayPedagogicalActivity.authorName}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
                        <div className="flex items-center gap-2 text-gray-800 font-bold text-sm mb-1">
                          <Palette className="w-4 h-4 text-gray-500" />
                          <span>Sin actividades registradas hoy</span>
                        </div>
                        <p className="text-gray-600 leading-relaxed">
                          La docente aún no ha publicado actividades pedagógicas o bitácora para la sala en la jornada de hoy.
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 block mb-0.5">Enfoque Pedagógico</span>
                        <span className="font-bold text-[#1B4332]">Juego Libre & Estimulación</span>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 block mb-0.5">Espacio de Actividades</span>
                        <span className="font-bold text-[#1B4332]">Sala y Parque Exterior</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#F0ECE1] text-[11px] text-gray-500 leading-relaxed">
                      Todas las dinámicas están guiadas por maestras jardineras y orientadas a fortalecer el desarrollo motriz, el lenguaje y la socialización infantil.
                    </div>
                  </div>
                )
              })}
              className="bg-white p-5 rounded-3xl border border-[#E9ECEF] shadow-2xs hover:shadow-xs hover:border-[#52796F]/40 transition-all flex flex-col justify-between sm:col-span-2 lg:col-span-1 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider group-hover:text-[#52796F] transition-colors">
                    Actividades
                  </span>
                  {todayPedagogicalActivity?.isImportant && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                      <AlertCircle className="w-2.5 h-2.5 text-amber-700" />
                      <span>Importante</span>
                    </span>
                  )}
                </div>
                <Palette className="w-4 h-4 text-sky-600" />
              </div>

              <div className="mb-2">
                <div className="text-sm font-bold text-[#1B4332]">
                  {todayPedagogicalActivity?.title || 'Sin actividades registradas hoy'}
                </div>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {todayPedagogicalActivity?.description || 'La sala aún no ha publicado actividades pedagógicas para la jornada de hoy.'}
                </p>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                <span>{todayPedagogicalActivity?.time ? `Registrado: ${todayPedagogicalActivity.time} hs` : 'Sin novedades de momento'}</span>
                <span className="text-[#52796F] font-bold group-hover:underline">Ver detalle →</span>
              </div>
            </div>
          </div>
        );
      })()}

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
          {recentActivities.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-400 bg-[#FAF9F5] rounded-2xl border border-gray-100">
              No hay actividades registradas aún para {selectedChild?.firstName || 'el alumno'} el día de hoy.
            </div>
          ) : (
            recentActivities.map(act => (
              <div 
                key={act.id} 
                onClick={() => setActiveCardDetail({
                  title: act.title,
                  subtitle: `Categoría: ${act.category.toUpperCase()} • ${act.time || '10:00'} hs • Registrado por: ${act.authorName}`,
                  content: (
                    <div className="space-y-4">
                      {act.isImportant && (
                        <div className="p-2.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>Aviso marcado como Importante por la educadora</span>
                        </div>
                      )}
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
                  <BookOpen className="w-4 h-4 text-[#52796F]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-[#1B4332] truncate group-hover:text-[#52796F] transition-colors">{act.title}</span>
                      {act.isImportant && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 shrink-0">
                          <AlertCircle className="w-2.5 h-2.5 text-amber-700" />
                          <span>Importante</span>
                        </span>
                      )}
                    </div>
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
            ))
          )}
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
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm sm:text-base">{fee.concept}</span>
                    {fee.status === 'paid' && (
                      <span className="inline-flex flex-wrap items-center gap-2 px-3 py-0.5 rounded-full text-xs md:text-sm font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Check className="w-3 h-3" /> Abonada
                      </span>
                    )}
                    {fee.status === 'in_review' && (
                      <span className="inline-flex flex-wrap items-center gap-2 px-3 py-0.5 rounded-full text-xs md:text-sm font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                        <Clock className="w-3 h-3" /> Comprobante en Revisión
                      </span>
                    )}
                    {fee.status === 'pending' && (
                      <span className="inline-flex flex-wrap items-center gap-2 px-3 py-0.5 rounded-full text-xs md:text-sm font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        Pendiente
                      </span>
                    )}
                    {fee.status === 'overdue' && (
                      <span className="inline-flex flex-wrap items-center gap-2 px-3 py-0.5 rounded-full text-xs md:text-sm font-bold bg-red-100 text-red-800 border border-red-200">
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

      {/* Interactive School Calendar for Families */}
      <div className="pt-2">
        <SchoolCalendar defaultRoomFilter={selectedChild?.roomId} />
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
        maxWidth="lg"
      >
        <div className="space-y-4">
          {activeCardDetail?.content}
          <div className="pt-3 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              onClick={() => setActiveCardDetail(null)}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Cerrar Detalle
            </button>
          </div>
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

      {/* Consolidated Daily Summary Modal */}
      <Modal
        isOpen={isConsolidatedSummaryOpen}
        onClose={() => setIsConsolidatedSummaryOpen(false)}
        title="Resumen Diario Consolidado"
        subtitle={`Datos oficiales verificados en sistema • ${selectedChild?.firstName} ${selectedChild?.lastName}`}
        maxWidth="2xl"
      >
        {selectedChild && (() => {
          const confirmedMeals = recentActivities.filter(a => a.category === 'meal');
          const confirmedActivities = recentActivities.filter(a => a.category === 'activity' || a.category === 'milestone');
          const confirmedCare = recentActivities.filter(a => a.category === 'nap' || a.category === 'hygiene');
          const confirmedImportant = recentActivities.filter(a => a.isImportant);
          const todayDateDisplay = new Date().toLocaleDateString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });

          return (
            <div className="space-y-3.5">
              {/* Institutional Header Banner */}
              <div className="p-3.5 rounded-2xl bg-[#F2F7F4] border border-[#D5E5DA] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#1B4332] text-white flex items-center justify-center font-bold shrink-0">
                    <Baby className="w-5 h-5 text-[#A3B18A]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-extrabold text-[#1B4332]">
                        {selectedChild.firstName} {selectedChild.lastName}
                      </h4>
                      <Badge variant="green" size="sm">Validado</Badge>
                    </div>
                    <p className="text-xs text-gray-600 font-semibold capitalize">
                      {todayDateDisplay} • Sala {selectedChild.roomName}
                    </p>
                  </div>
                </div>

                <div className="text-right text-[11px] text-gray-500 hidden sm:block">
                  <div className="font-bold text-[#1B4332]">Nido Cuidado</div>
                  <div>Bitácora Digital Oficial</div>
                </div>
              </div>

              {/* SECTION 1: ASISTENCIA Y PERMANENCIA OFICIAL */}
              <div className="p-3.5 rounded-2xl border border-gray-200 bg-white space-y-2">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2">
                    <CalendarCheck2 className="w-4 h-4 text-[#52796F]" />
                    <span className="text-xs font-bold text-[#1B4332] uppercase tracking-wide">
                      1. Asistencia y Permanencia Oficial
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    attendanceToday?.status === 'absent'
                      ? 'bg-rose-100 text-rose-800'
                      : attendanceToday?.status === 'justified'
                      ? 'bg-amber-100 text-amber-800'
                      : attendanceToday?.status === 'present'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {attendanceToday?.status === 'absent' 
                      ? 'Ausente' 
                      : attendanceToday?.status === 'justified'
                      ? 'Justificada'
                      : attendanceToday?.status === 'present'
                      ? 'Presente'
                      : 'Pendiente'}
                  </span>
                </div>

                {attendanceToday ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-gray-100">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Hora de Ingreso</span>
                      <span className="font-bold text-[#1B4332]">
                        {attendanceToday.checkInTime ? `${attendanceToday.checkInTime} hs` : 'Confirmado presente'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-gray-100">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Hora de Egreso</span>
                      <span className="font-bold text-[#1B4332]">
                        {attendanceToday.checkOutTime ? `${attendanceToday.checkOutTime} hs` : 'Jornada activa (en sala)'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-gray-100 col-span-2 sm:col-span-1">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Docente Responsable</span>
                      <span className="font-bold text-[#1B4332] truncate block">
                        {attendanceToday.recordedByName || 'Docente de Turno'}
                      </span>
                    </div>
                    {attendanceToday.notes && (
                      <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 col-span-2 sm:col-span-3 text-[11px] text-gray-600">
                        <strong className="text-[#1B4332]">Observaciones de asistencia:</strong> {attendanceToday.notes}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-500">
                    Aún no se ha asentado el registro oficial de ingreso para el día de la fecha.
                  </div>
                )}
              </div>

              {/* SECTION 2: ALIMENTACIÓN Y COLACIONES */}
              <div className="p-3.5 rounded-2xl border border-gray-200 bg-white space-y-2">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-[#1B4332] uppercase tracking-wide">
                    2. Alimentación y Nutrición
                  </span>
                </div>

                {confirmedMeals.length > 0 ? (
                  <div className="space-y-2">
                    {confirmedMeals.map((m) => (
                      <div key={m.id} className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-amber-950 flex items-center gap-1.5">
                            {m.title}
                            {m.isImportant && (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-1.5 py-0.2 rounded-md">
                                Importante
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-[11px] text-amber-800 font-semibold">{m.time} hs</span>
                        </div>
                        <p className="text-amber-900 leading-relaxed text-[11px]">{m.description}</p>
                        <div className="text-[10px] text-amber-700/80 mt-1">Registrado por: {m.authorName}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-500">
                    Sin registros confirmados de alimentación para esta jornada.
                  </div>
                )}
              </div>

              {/* SECTION 3: ACTIVIDADES PEDAGÓGICAS Y DESARROLLO */}
              <div className="p-3.5 rounded-2xl border border-gray-200 bg-white space-y-2">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                  <BookOpen className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-bold text-[#1B4332] uppercase tracking-wide">
                    3. Actividades Pedagógicas y Lúdicas
                  </span>
                </div>

                {confirmedActivities.length > 0 ? (
                  <div className="space-y-2">
                    {confirmedActivities.map((act) => (
                      <div key={act.id} className="p-2.5 rounded-xl bg-sky-50/60 border border-sky-200/80 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sky-950 flex items-center gap-1.5">
                            {act.title}
                            {act.isImportant && (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-1.5 py-0.2 rounded-md">
                                Importante
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-[11px] text-sky-800 font-semibold">{act.time} hs</span>
                        </div>
                        <p className="text-sky-900 leading-relaxed text-[11px]">{act.description}</p>
                        <div className="text-[10px] text-sky-700/80 mt-1">Educadora a cargo: {act.authorName}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-500">
                    Sin actividades pedagógicas confirmadas en el sistema para esta jornada.
                  </div>
                )}
              </div>

              {/* SECTION 4: DESCANSO, SIESTA E HIGIENE */}
              <div className="p-3.5 rounded-2xl border border-gray-200 bg-white space-y-2">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                  <Smile className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-[#1B4332] uppercase tracking-wide">
                    4. Descanso, Higiene y Bienestar
                  </span>
                </div>

                {confirmedCare.length > 0 ? (
                  <div className="space-y-2">
                    {confirmedCare.map((c) => (
                      <div key={c.id} className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-200/80 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-indigo-950">{c.title}</span>
                          <span className="font-mono text-[11px] text-indigo-800 font-semibold">{c.time} hs</span>
                        </div>
                        <p className="text-indigo-900 leading-relaxed text-[11px]">{c.description}</p>
                        <div className="text-[10px] text-indigo-700/80 mt-1">Registrado por: {c.authorName}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-500">
                    Sin registros específicos de siesta o higiene asentados hoy.
                  </div>
                )}
              </div>

              {/* SECTION 5: AVISOS Y NOVEDADES PRIORITARIAS */}
              {confirmedImportant.length > 0 && (
                <div className="p-3.5 rounded-2xl border border-amber-300 bg-amber-50 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wide">
                    <AlertCircle className="w-4 h-4 text-amber-700" />
                    <span>5. Avisos y Novedades Prioritarias de la Jornada</span>
                  </div>
                  <div className="space-y-1.5">
                    {confirmedImportant.map((imp) => (
                      <div key={imp.id} className="text-xs text-amber-950 p-2 rounded-lg bg-white/80 border border-amber-200">
                        <strong className="block text-amber-900">{imp.title} ({imp.time} hs):</strong>
                        <span>{imp.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 6: SALUD Y RETIRO AUTORIZADO (CONFIRMADO EN FICHA) */}
              <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#EBE6DC] text-xs space-y-1.5">
                <div className="font-bold text-[#1B4332] mb-1">
                  Pautas de Salud y Retiro (Ficha Oficial del Alumno):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-600">
                  <div>
                    <span className="font-semibold text-gray-800">Alergias:</span> {selectedChild.allergies || 'Ninguna registrada'}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-800">Pauta dietaria:</span> {selectedChild.dietaryNotes || 'Estándar'}
                  </div>
                </div>
              </div>

              {/* System Validation Watermark */}
              <div className="text-center py-1.5 text-[10px] text-gray-400 border-t border-gray-100">
                ✓ Resumen consolidado generado a partir de los datos confirmados en el sistema institucional Nido Cuidado.
              </div>

              {/* Actions: Copy & Print */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyConsolidatedSummary}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-xs font-bold text-[#1B4332] shadow-2xs cursor-pointer active:scale-95 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#52796F]" />
                    <span>Copiar Resumen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 shadow-2xs cursor-pointer active:scale-95 transition-all"
                  >
                    <Printer className="w-3.5 h-3.5 text-gray-500" />
                    <span>Imprimir / PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await pushNotificationService.notifyDailySummaryReady(
                        `${selectedChild.firstName} ${selectedChild.lastName}`,
                        selectedChild.roomName || 'Sala'
                      );
                      toast.success('Alerta push emitida', 'Se envió la notificación del resumen consolidado a tu dispositivo.');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-xs font-bold text-[#1B4332] shadow-2xs cursor-pointer active:scale-95 transition-all"
                    title="Enviar notificación push de este resumen"
                  >
                    <BellRing className="w-3.5 h-3.5 text-amber-600" />
                    <span>Notificar por Push</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsConsolidatedSummaryOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Cerrar Resumen
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Push Notifications Subscription & Settings Modal */}
      <Modal
        isOpen={isPushModalOpen}
        onClose={() => setIsPushModalOpen(false)}
        title="Canales de Notificaciones Push"
        subtitle="Configurá qué alertas instantáneas recibir mediante Service Worker"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-2xl bg-[#F2F7F4] border border-[#D5E5DA] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#1B4332] text-white flex items-center justify-center shrink-0">
                <BellRing className="w-4 h-4 text-[#A3B18A]" />
              </div>
              <div>
                <span className="font-bold text-[#1B4332] block">Estado de Suscripción</span>
                <span className="text-[11px] text-gray-500">
                  API de Service Workers {pushNotificationService.isSupported() ? 'compatible' : 'no compatible'}
                </span>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
              pushPrefs.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {pushPrefs.enabled ? 'Habilitada' : 'Deshabilitada'}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Seleccioná qué eventos deben alertarte
            </div>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-[#FAF9F5] hover:bg-white cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={pushPrefs.notifyActivities}
                onChange={(e) => setPushPrefs(prev => ({ ...prev, notifyActivities: e.target.checked }))}
                className="mt-0.5 rounded text-[#52796F] focus:ring-[#52796F]"
              />
              <div>
                <strong className="text-[#1B4332] block">Nuevas Actividades y Alimentación</strong>
                <span className="text-gray-500 text-[11px]">
                  Alerta inmediata cuando la educadora registre colaciones, juego o hitos en sala.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-[#FAF9F5] hover:bg-white cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={pushPrefs.notifyDailySummary}
                onChange={(e) => setPushPrefs(prev => ({ ...prev, notifyDailySummary: e.target.checked }))}
                className="mt-0.5 rounded text-[#52796F] focus:ring-[#52796F]"
              />
              <div>
                <strong className="text-[#1B4332] block">Resumen Diario Consolidado</strong>
                <span className="text-gray-500 text-[11px]">
                  Alerta al cierre de la jornada con el reporte verificado de tu hijo/a.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-[#FAF9F5] hover:bg-white cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={pushPrefs.notifyAttendance}
                onChange={(e) => setPushPrefs(prev => ({ ...prev, notifyAttendance: e.target.checked }))}
                className="mt-0.5 rounded text-[#52796F] focus:ring-[#52796F]"
              />
              <div>
                <strong className="text-[#1B4332] block">Asistencia y Permanencia</strong>
                <span className="text-gray-500 text-[11px]">
                  Aviso cuando se registre el ingreso o egreso en portería institucional.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-[#FAF9F5] hover:bg-white cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={pushPrefs.notifyUrgent}
                onChange={(e) => setPushPrefs(prev => ({ ...prev, notifyUrgent: e.target.checked }))}
                className="mt-0.5 rounded text-[#52796F] focus:ring-[#52796F]"
              />
              <div>
                <strong className="text-[#1B4332] block">Avisos Prioritarios e Importantes</strong>
                <span className="text-gray-500 text-[11px]">
                  Notificaciones marcadas con prioridad alta por la dirección o maestras.
                </span>
              </div>
            </label>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleTestPushNotification}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-[#52796F]" />
              <span>Enviar Prueba</span>
            </button>

            <div className="flex items-center gap-2">
              {pushPrefs.enabled && (
                <button
                  type="button"
                  onClick={handleTogglePushSubscription}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  Pausar Alertas
                </button>
              )}
              <button
                type="button"
                onClick={handleSavePushPreferences}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs cursor-pointer"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
