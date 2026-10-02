import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { useAuth } from '../../context/AuthContext';
import { 
  Fee, 
  Payment, 
  Child, 
  Room, 
  FeeStatus, 
  PaymentMethod,
  GUARDERIA_BANK_DETAILS 
} from '../../types';
import { 
  getMercadoPagoStatus, 
  reviewTransferPayment, 
  createSingleFee, 
  createBatchFees,
  verifyServerPayment,
  MPStatusResponse 
} from '../../services/mercadoPagoService';
import { 
  CreditCard, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Eye, 
  Check, 
  X, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Building2, 
  RefreshCw, 
  ShieldCheck, 
  ArrowUpRight,
  ExternalLink,
  Users
} from 'lucide-react';

export function FeesManagement() {
  const { userProfile } = useAuth();
  const [fees, setFees] = useState<Fee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Mercado Pago Service Status
  const [mpStatus, setMpStatus] = useState<MPStatusResponse | null>(null);
  const [mpChecking, setMpChecking] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isVerifyMpModalOpen, setIsVerifyMpModalOpen] = useState(false);
  const [isBankDetailsModalOpen, setIsBankDetailsModalOpen] = useState(false);

  // Selected for review
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessingReview, setIsProcessingReview] = useState(false);

  // Manual MP Verification form
  const [verifyPaymentId, setVerifyPaymentId] = useState('');
  const [verifyFeeId, setVerifyFeeId] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Create Fee Form State
  const [singleFeeData, setSingleFeeData] = useState({
    childId: '',
    concept: 'Cuota Mensual Noviembre 2026',
    amount: 48000,
    dueDate: '2026-11-10',
    period: '2026-11',
    notes: ''
  });

  // Batch Fee Form State
  const [batchData, setBatchData] = useState({
    roomId: '',
    concept: 'Cuota Mensual Noviembre 2026',
    amount: 48000,
    dueDate: '2026-11-10',
    period: '2026-11',
    notes: 'Jornada habitual'
  });

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Load Realtime Data
  useEffect(() => {
    // 1. Fees
    const feesQuery = query(collection(db, 'fees'), orderBy('dueDate', 'desc'));
    const unsubFees = onSnapshot(feesQuery, (snap) => {
      const data: Fee[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as Fee));
      setFees(data);
      setLoading(false);
    }, (err) => {
      console.warn('Error loading fees snapshot:', err);
      setLoading(false);
    });

    // 2. Payments (Comprobantes)
    const paymentsQuery = query(collection(db, 'payments'), orderBy('createdAt', 'desc'));
    const unsubPayments = onSnapshot(paymentsQuery, (snap) => {
      const data: Payment[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as Payment));
      setPayments(data);
    }, (err) => {
      console.warn('Error loading payments snapshot:', err);
    });

    // 3. Children
    const unsubChildren = onSnapshot(collection(db, 'children'), (snap) => {
      const data: Child[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as Child));
      setChildren(data);
    });

    // 4. Rooms
    const unsubRooms = onSnapshot(collection(db, 'rooms'), (snap) => {
      const data: Room[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as Room));
      setRooms(data);
    });

    // 5. Check MP Status
    checkMp();

    return () => {
      unsubFees();
      unsubPayments();
      unsubChildren();
      unsubRooms();
    };
  }, []);

  const checkMp = async () => {
    setMpChecking(true);
    const status = await getMercadoPagoStatus();
    setMpStatus(status);
    setMpChecking(false);
  };

  // Filtered Fees
  const filteredFees = fees.filter((fee) => {
    const matchesSearch = 
      fee.childName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fee.concept.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fee.period && fee.period.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    return fee.status === statusFilter;
  });

  // Pending Review Transfer Payments
  const pendingTransferPayments = payments.filter(
    (p) => p.method === 'transfer' && p.status === 'pending'
  );

  // Financial Stats
  const totalCollected = fees
    .filter((f) => f.status === 'paid')
    .reduce((sum, f) => sum + (f.amount || 0), 0);

  const totalPendingDebt = fees
    .filter((f) => f.status === 'pending' || f.status === 'overdue' || f.status === 'in_review')
    .reduce((sum, f) => sum + (f.amount || 0), 0);

  const totalPaidCount = fees.filter((f) => f.status === 'paid').length;
  const totalPendingCount = fees.filter((f) => f.status === 'pending' || f.status === 'overdue').length;

  // Handle Review of Transfer Payment
  const handleReviewAction = async (approved: boolean) => {
    if (!selectedPayment) return;
    setIsProcessingReview(true);
    try {
      await reviewTransferPayment({
        paymentId: selectedPayment.id,
        feeId: selectedPayment.feeId,
        approved,
        reviewerUserId: userProfile?.id || 'admin',
        reviewerName: userProfile?.displayName || 'Dirección General',
        rejectionReason: approved ? undefined : rejectionReason
      });

      showNotification(
        approved 
          ? 'Comprobante aprobado exitosamente. La cuota ha sido marcada como abonada.' 
          : 'Comprobante rechazado. La cuota volvió al estado pendiente.',
        approved ? 'success' : 'error'
      );
      setIsReviewModalOpen(false);
      setSelectedPayment(null);
      setSelectedFee(null);
      setRejectionReason('');
    } catch (err: any) {
      showNotification(`Error al procesar comprobante: ${err.message}`, 'error');
    } finally {
      setIsProcessingReview(false);
    }
  };

  // Handle Create Single Fee
  const handleCreateSingleFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleFeeData.childId) {
      showNotification('Seleccione un alumno', 'error');
      return;
    }
    const targetChild = children.find((c) => c.id === singleFeeData.childId);
    if (!targetChild) return;

    try {
      await createSingleFee({
        childId: targetChild.id,
        childName: `${targetChild.firstName} ${targetChild.lastName}`,
        familyId: targetChild.familyId,
        concept: singleFeeData.concept,
        amount: Number(singleFeeData.amount),
        dueDate: singleFeeData.dueDate,
        period: singleFeeData.period,
        status: 'pending',
        notes: singleFeeData.notes
      });

      showNotification('Cuota creada correctamente');
      setIsCreateModalOpen(false);
      setSingleFeeData({
        childId: '',
        concept: 'Cuota Mensual Noviembre 2026',
        amount: 48000,
        dueDate: '2026-11-10',
        period: '2026-11',
        notes: ''
      });
    } catch (err: any) {
      showNotification(`Error creando cuota: ${err.message}`, 'error');
    }
  };

  // Handle Batch Creation
  const handleBatchCreation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchData.roomId) {
      showNotification('Seleccione una sala', 'error');
      return;
    }

    const roomChildren = children.filter(
      (c) => c.roomId === batchData.roomId && c.enrollmentStatus === 'active'
    );

    if (roomChildren.length === 0) {
      showNotification('No hay alumnos activos en la sala seleccionada', 'error');
      return;
    }

    try {
      const count = await createBatchFees(
        roomChildren.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}` })),
        {
          concept: batchData.concept,
          amount: Number(batchData.amount),
          dueDate: batchData.dueDate,
          period: batchData.period,
          notes: batchData.notes
        }
      );

      showNotification(`Se generaron exitosamente ${count} cuotas para la sala.`);
      setIsBatchModalOpen(false);
    } catch (err: any) {
      showNotification(`Error en generación en lote: ${err.message}`, 'error');
    }
  };

  // Manual Verify Payment with MP Official API
  const handleVerifyMp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyPaymentId) return;

    setIsVerifying(true);
    setVerifyResult(null);

    try {
      const res = await verifyServerPayment(verifyPaymentId, verifyFeeId || undefined);
      setVerifyResult(res);
      if (res.isApproved) {
        showNotification('¡Pago verificado y aprobado por Mercado Pago! Cuota actualizada.');
      } else {
        showNotification(`Mercado Pago reporta estado: ${res.status || 'No aprobado'}`);
      }
    } catch (err: any) {
      setVerifyResult({ verified: false, error: err.message });
      showNotification(`Error al verificar: ${err.message}`, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusBadge = (status: FeeStatus) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Abonada
          </span>
        );
      case 'in_review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
            <Clock className="w-3.5 h-3.5" /> En Revisión
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            <AlertCircle className="w-3.5 h-3.5" /> Vencida
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            Cancelada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3.5 h-3.5" /> Pendiente
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-page-enter">
      {/* Toast Notification */}
      {notification && (
        <div 
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-xl border text-sm font-medium flex items-center gap-3 transition-all duration-200 ${
            notification.type === 'success' 
              ? 'bg-emerald-600 text-white border-emerald-700' 
              : 'bg-red-600 text-white border-red-700'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#1B4332]/10 text-[#1B4332]">
              Administración y Finanzas
            </span>
            <span className="text-xs text-gray-500">• Gestión de Cuotas y Aranceles</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B4332] tracking-tight mt-1">
            Cuotas, Pagos y Cobranzas
          </h1>
          <p className="text-sm text-gray-600 mt-0.5">
            Control de mensualidades, validación de transferencias bancarias e integración con Mercado Pago.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsBankDetailsModalOpen(true)}
            className="btn-fluid px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-xs flex items-center gap-1.5"
          >
            <Building2 className="w-4 h-4 text-[#1B4332]" />
            Datos Bancarios
          </button>

          <button
            onClick={() => setIsVerifyMpModalOpen(true)}
            className="btn-fluid px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-[#009EE3]/10 text-[#009EE3] border border-[#009EE3]/20 hover:bg-[#009EE3]/20 shadow-xs flex items-center gap-1.5"
            title="Consultar API oficial de Mercado Pago"
          >
            <ShieldCheck className="w-4 h-4 text-[#009EE3]" />
            Validar Mercado Pago
          </button>

          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="btn-fluid px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 shadow-xs flex items-center gap-1.5"
          >
            <Users className="w-4 h-4 text-emerald-700" />
            Emisión por Sala
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-fluid px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#1B4332] text-white hover:bg-[#2d5f47] shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Nueva Cuota
          </button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Recaudado */}
        <div className="p-5 rounded-2xl bg-white border border-[#E9ECEF] shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Recaudado</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-[#1B4332]">
            ${totalCollected.toLocaleString('es-AR')}
          </div>
          <div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
            <span className="font-semibold text-emerald-700">{totalPaidCount}</span> cuotas abonadas
          </div>
        </div>

        {/* Deuda Pendiente */}
        <div className="p-5 rounded-2xl bg-white border border-[#E9ECEF] shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Deuda por Cobrar</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700">
            ${totalPendingDebt.toLocaleString('es-AR')}
          </div>
          <div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
            <span className="font-semibold text-amber-700">{totalPendingCount}</span> cuotas pendientes/en revisión
          </div>
        </div>

        {/* Comprobantes por Revisar */}
        <div className={`p-5 rounded-2xl border shadow-xs relative overflow-hidden transition-all ${
          pendingTransferPayments.length > 0 
            ? 'bg-amber-50/70 border-amber-200' 
            : 'bg-white border-[#E9ECEF]'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Por Revisar</span>
            <span className={`p-2 rounded-xl ${pendingTransferPayments.length > 0 ? 'bg-amber-200 text-amber-900 animate-pulse' : 'bg-gray-100 text-gray-600'}`}>
              <FileText className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-gray-900">
            {pendingTransferPayments.length}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {pendingTransferPayments.length === 1 ? '1 comprobante de transferencia' : `${pendingTransferPayments.length} comprobantes pendientes`}
          </div>
        </div>

        {/* Estado Mercado Pago */}
        <div className="p-5 rounded-2xl bg-white border border-[#E9ECEF] shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Mercado Pago</span>
            <button 
              onClick={checkMp} 
              disabled={mpChecking}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600"
              title="Actualizar estado del servicio"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${mpChecking ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-sm font-bold text-gray-800">
              {mpStatus?.configured ? (mpStatus.isSandbox ? 'Sandbox Activo' : 'Producción Activo') : 'Webhook Listo'}
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-500 truncate" title="/api/mercadopago/webhook">
            Webhook: <code className="text-[10px] bg-gray-100 px-1 py-0.5 rounded">/api/mercadopago/webhook</code>
          </div>
        </div>
      </div>

      {/* SECCIÓN CRÍTICA: COMPROBANTES DE TRANSFERENCIA PENDIENTES DE REVISIÓN */}
      {pendingTransferPayments.length > 0 && (
        <div className="p-6 rounded-3xl bg-amber-50/80 border-2 border-amber-200 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-200 text-amber-900">
                <AlertCircle className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-amber-950">
                  Comprobantes de Transferencia Pendientes de Revisión ({pendingTransferPayments.length})
                </h2>
                <p className="text-xs text-amber-800">
                  Los padres han subido comprobantes bancarios. Revise el archivo adjunto para aprobar o rechazar la cuota.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {pendingTransferPayments.map((payment) => {
              const matchedFee = fees.find((f) => f.id === payment.feeId);
              return (
                <div 
                  key={payment.id} 
                  className="p-4 rounded-2xl bg-white border border-amber-200/80 shadow-xs flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{new Date(payment.createdAt).toLocaleDateString('es-AR')}</span>
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ${payment.amount.toLocaleString('es-AR')}
                      </span>
                    </div>

                    <h3 className="font-bold text-gray-900 mt-1.5 text-sm sm:text-base">
                      {payment.childName || matchedFee?.childName || 'Alumno'}
                    </h3>

                    <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">
                      {matchedFee?.concept || 'Cuota mensual'}
                    </p>

                    <div className="mt-2 text-xs text-gray-500 bg-[#FAF9F5] p-2 rounded-xl border border-gray-100 space-y-1">
                      <div><strong className="text-gray-700">Tutor:</strong> {payment.payerName} ({payment.payerEmail})</div>
                      {payment.transferBankOrigin && (
                        <div><strong className="text-gray-700">Banco de Origen:</strong> {payment.transferBankOrigin}</div>
                      )}
                      {payment.transferNotes && (
                        <div className="italic text-gray-600">"{payment.transferNotes}"</div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedPayment(payment);
                        setSelectedFee(matchedFee || null);
                        setIsReviewModalOpen(true);
                      }}
                      className="btn-fluid flex-1 py-1.5 px-3 rounded-xl text-xs font-bold bg-[#1B4332] text-white hover:bg-[#2d5f47] flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Revisar Comprobante
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Fees Table & Controls */}
      <div className="p-6 rounded-3xl bg-white border border-[#E9ECEF] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#1B4332]">Historial y Estado de Cuotas</h2>
            <p className="text-xs text-gray-500">Registro cronológico de importes, vencimientos y transacciones.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por alumno o concepto..."
                className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-[#1B4332]"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
              {[
                { id: 'all', label: 'Todas' },
                { id: 'pending', label: 'Pendientes' },
                { id: 'in_review', label: 'En Revisión' },
                { id: 'paid', label: 'Abonadas' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                    statusFilter === f.id
                      ? 'bg-white text-[#1B4332] font-bold shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-xs font-bold uppercase tracking-wider">
                <th className="pb-3 px-3">Alumno</th>
                <th className="pb-3 px-3">Concepto</th>
                <th className="pb-3 px-3">Período</th>
                <th className="pb-3 px-3">Importe</th>
                <th className="pb-3 px-3">Vencimiento</th>
                <th className="pb-3 px-3">Estado</th>
                <th className="pb-3 px-3">Método / Ref</th>
                <th className="pb-3 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">
                    Cargando cuotas del sistema...
                  </td>
                </tr>
              ) : filteredFees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">
                    No se encontraron cuotas con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredFees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 px-3 font-bold text-gray-900">
                      {fee.childName}
                    </td>
                    <td className="py-3.5 px-3 text-gray-700">
                      {fee.concept}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-gray-500 text-xs">
                      {fee.period || '-'}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-emerald-800">
                      ${fee.amount.toLocaleString('es-AR')}
                    </td>
                    <td className="py-3.5 px-3 text-gray-600">
                      {fee.dueDate}
                    </td>
                    <td className="py-3.5 px-3">
                      {getStatusBadge(fee.status)}
                    </td>
                    <td className="py-3.5 px-3">
                      {fee.paymentMethod === 'mercadopago' && (
                        <span className="inline-flex items-center gap-1 text-xs text-[#009EE3] font-semibold">
                          <CreditCard className="w-3.5 h-3.5" /> Mercado Pago
                        </span>
                      )}
                      {fee.paymentMethod === 'transfer' && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-semibold">
                          <Building2 className="w-3.5 h-3.5" /> Transferencia
                        </span>
                      )}
                      {!fee.paymentMethod && (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                      {fee.paymentId && (
                        <span className="block text-[10px] font-mono text-gray-400 truncate max-w-[120px]" title={fee.paymentId}>
                          {fee.paymentId}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {fee.status === 'in_review' && (
                        <button
                          onClick={() => {
                            const p = payments.find((pay) => pay.feeId === fee.id);
                            if (p) {
                              setSelectedPayment(p);
                              setSelectedFee(fee);
                              setIsReviewModalOpen(true);
                            }
                          }}
                          className="btn-fluid px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg"
                        >
                          Revisar
                        </button>
                      )}
                      {fee.status === 'pending' && (
                        <button
                          onClick={async () => {
                            if (confirm(`¿Marcar cuota de ${fee.childName} como pagada manualmente?`)) {
                              await updateDoc(doc(db, 'fees', fee.id), {
                                status: 'paid',
                                paidAt: new Date().toISOString(),
                                paymentMethod: 'cash',
                                updatedAt: new Date().toISOString()
                              });
                              showNotification('Cuota marcada como pagada (Efectivo/Manual)');
                            }
                          }}
                          className="btn-fluid px-2.5 py-1 text-xs text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                        >
                          Cobrar manual
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: REVISIÓN DE COMPROBANTE DE TRANSFERENCIA */}
      {isReviewModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Revisar Comprobante de Transferencia</h3>
                <p className="text-xs text-gray-500">
                  Validación administrativa del comprobante bancario antes de aprobar la cuota
                </p>
              </div>
              <button 
                onClick={() => setIsReviewModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Payment Details */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-[#FAF9F5] p-3.5 rounded-2xl border border-gray-200">
                <div>
                  <span className="text-gray-500 block">Alumno / Sala:</span>
                  <strong className="text-gray-800 text-sm">{selectedPayment.childName}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block">Monto a Validar:</span>
                  <strong className="text-emerald-800 text-base font-black">${selectedPayment.amount.toLocaleString('es-AR')}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block">Tutor que envió:</span>
                  <span className="text-gray-800">{selectedPayment.payerName} ({selectedPayment.payerEmail})</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Fecha de Envío:</span>
                  <span className="text-gray-800">{new Date(selectedPayment.createdAt).toLocaleString('es-AR')}</span>
                </div>
                {selectedPayment.transferBankOrigin && (
                  <div>
                    <span className="text-gray-500 block">Banco de Origen:</span>
                    <span className="text-gray-800">{selectedPayment.transferBankOrigin}</span>
                  </div>
                )}
                {selectedPayment.transferNotes && (
                  <div className="col-span-2">
                    <span className="text-gray-500 block">Notas del Tutor:</span>
                    <span className="italic text-gray-700">"{selectedPayment.transferNotes}"</span>
                  </div>
                )}
              </div>

              {/* Receipt File Preview */}
              <div>
                <span className="text-xs font-bold text-gray-700 block mb-1.5">Archivo Comprobante:</span>
                {selectedPayment.transferReceiptUrl ? (
                  selectedPayment.transferReceiptType === 'pdf' ? (
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-center space-y-2">
                      <FileText className="w-10 h-10 text-red-600 mx-auto" />
                      <div className="text-xs font-semibold text-gray-700">{selectedPayment.transferReceiptName || 'Comprobante.pdf'}</div>
                      <a
                        href={selectedPayment.transferReceiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-fluid inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#1B4332] text-white"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Abrir Documento PDF
                      </a>
                    </div>
                  ) : (
                    <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-900/5 max-h-[320px] flex items-center justify-center p-2">
                      <img
                        src={selectedPayment.transferReceiptUrl}
                        alt="Comprobante de transferencia"
                        className="max-h-[300px] w-auto object-contain rounded-lg shadow-xs"
                      />
                    </div>
                  )
                ) : (
                  <div className="p-4 rounded-xl bg-gray-100 text-center text-xs text-gray-500">
                    No se adjuntó archivo visual
                  </div>
                )}
              </div>

              {/* Rejection Reason Input (shown only if rejecting) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Motivo de Rechazo (Opcional, en caso de no coincidir importe o datos):
                </label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Ej: Monto incompleto o no se visualiza la acreditación bancaria..."
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleReviewAction(false)}
                disabled={isProcessingReview}
                className="btn-fluid px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                Rechazar Comprobante
              </button>

              <button
                type="button"
                onClick={() => handleReviewAction(true)}
                disabled={isProcessingReview}
                className="btn-fluid px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-700 text-white hover:bg-emerald-800 shadow-md flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Aprobar y Confirmar Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREAR CUOTA INDIVIDUAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-[#1B4332]">Nueva Cuota Individual</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSingleFee} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Alumno:</label>
                <select
                  required
                  value={singleFeeData.childId}
                  onChange={(e) => setSingleFeeData({ ...singleFeeData, childId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1B4332]"
                >
                  <option value="">Seleccione un alumno...</option>
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.roomName || 'Sala'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Concepto:</label>
                <input
                  type="text"
                  required
                  value={singleFeeData.concept}
                  onChange={(e) => setSingleFeeData({ ...singleFeeData, concept: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Importe ($ ARS):</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={singleFeeData.amount}
                    onChange={(e) => setSingleFeeData({ ...singleFeeData, amount: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1B4332]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Período (YYYY-MM):</label>
                  <input
                    type="text"
                    required
                    value={singleFeeData.period}
                    onChange={(e) => setSingleFeeData({ ...singleFeeData, period: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1B4332]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Fecha de Vencimiento:</label>
                <input
                  type="date"
                  required
                  value={singleFeeData.dueDate}
                  onChange={(e) => setSingleFeeData({ ...singleFeeData, dueDate: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Observaciones (Opcional):</label>
                <textarea
                  value={singleFeeData.notes}
                  onChange={(e) => setSingleFeeData({ ...singleFeeData, notes: e.target.value })}
                  placeholder="Detalles sobre jornada, comedor, etc..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-fluid px-5 py-2 rounded-xl bg-[#1B4332] text-white font-bold hover:bg-[#2d5f47]"
                >
                  Generar Cuota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EMISIÓN EN LOTE POR SALA */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-[#1B4332]">Emisión de Cuotas por Sala</h3>
                <p className="text-xs text-gray-500">Crea la cuota para todos los alumnos activos de la sala</p>
              </div>
              <button onClick={() => setIsBatchModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBatchCreation} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Seleccionar Sala:</label>
                <select
                  required
                  value={batchData.roomId}
                  onChange={(e) => setBatchData({ ...batchData, roomId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1B4332]"
                >
                  <option value="">Seleccione una sala pedagógica...</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.ageRange})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Concepto:</label>
                <input
                  type="text"
                  required
                  value={batchData.concept}
                  onChange={(e) => setBatchData({ ...batchData, concept: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Importe ($ ARS):</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={batchData.amount}
                    onChange={(e) => setBatchData({ ...batchData, amount: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1B4332]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Período:</label>
                  <input
                    type="text"
                    required
                    value={batchData.period}
                    onChange={(e) => setBatchData({ ...batchData, period: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1B4332]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Fecha de Vencimiento:</label>
                <input
                  type="date"
                  required
                  value={batchData.dueDate}
                  onChange={(e) => setBatchData({ ...batchData, dueDate: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-fluid px-5 py-2 rounded-xl bg-emerald-700 text-white font-bold hover:bg-emerald-800"
                >
                  Emitir Cuotas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: VALIDACIÓN OFICIAL MERCADO PAGO */}
      {isVerifyMpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#009EE3]" />
                <h3 className="text-lg font-bold text-gray-900">Validar Pago con Mercado Pago</h3>
              </div>
              <button onClick={() => setIsVerifyMpModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Esta función consulta directamente el endpoint oficial de Mercado Pago (<code>/v1/payments/{'{id}'}</code>) mediante el servidor para validar el estado de la transacción sin depender del cliente.
            </p>

            <form onSubmit={handleVerifyMp} className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-gray-700 mb-1">ID de Pago de Mercado Pago (Payment ID):</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 1234567890"
                  value={verifyPaymentId}
                  onChange={(e) => setVerifyPaymentId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 font-mono focus:outline-none focus:border-[#009EE3]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">ID de Cuota Interna (Opcional):</label>
                <input
                  type="text"
                  placeholder="Ej: fee-mateo-oct"
                  value={verifyFeeId}
                  onChange={(e) => setVerifyFeeId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 font-mono focus:outline-none focus:border-[#009EE3]"
                />
              </div>

              {verifyResult && (
                <div className={`p-3 rounded-2xl text-xs space-y-1 ${
                  verifyResult.isApproved 
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
                    : 'bg-gray-50 text-gray-800 border border-gray-200'
                }`}>
                  <div><strong>Verificado por servidor:</strong> {verifyResult.verified ? 'Sí' : 'No'}</div>
                  <div><strong>Estado MP:</strong> {verifyResult.status || 'Desconocido'}</div>
                  {verifyResult.statusDetail && <div><strong>Detalle:</strong> {verifyResult.statusDetail}</div>}
                  {verifyResult.amount && <div><strong>Monto:</strong> ${verifyResult.amount} ARS</div>}
                  {verifyResult.error && <div className="text-red-600 font-semibold">{verifyResult.error}</div>}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsVerifyMpModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="btn-fluid px-5 py-2 rounded-xl bg-[#009EE3] text-white font-bold hover:bg-[#0081bb] flex items-center gap-1.5 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                  Consultar API Oficial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: DATOS BANCARIOS */}
      {isBankDetailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#1B4332]" />
                <h3 className="text-lg font-bold text-[#1B4332]">Datos Bancarios Institucionales</h3>
              </div>
              <button onClick={() => setIsBankDetailsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm bg-[#FAF9F5] p-4 rounded-2xl border border-gray-200">
              <div>
                <span className="text-gray-500 block text-xs">Banco:</span>
                <strong className="text-gray-800">{GUARDERIA_BANK_DETAILS.bankName}</strong>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">Titular:</span>
                <strong className="text-gray-800">{GUARDERIA_BANK_DETAILS.accountHolder}</strong>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">Tipo de Cuenta:</span>
                <span className="text-gray-800">{GUARDERIA_BANK_DETAILS.accountType}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">CUIT:</span>
                <span className="font-mono text-gray-800">{GUARDERIA_BANK_DETAILS.cuit}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">CBU:</span>
                <span className="font-mono text-gray-900 font-bold select-all bg-white p-1 rounded border border-gray-200 block mt-0.5">
                  {GUARDERIA_BANK_DETAILS.cbu}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">Alias:</span>
                <span className="font-mono text-[#1B4332] font-black select-all bg-white p-1 rounded border border-gray-200 block mt-0.5">
                  {GUARDERIA_BANK_DETAILS.alias}
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-500 italic">
              Estos datos se muestran automáticamente a los padres cuando eligen pagar por Transferencia Bancaria en el Portal de Familia.
            </p>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsBankDetailsModalOpen(false)}
                className="btn-fluid px-5 py-2 rounded-xl bg-[#1B4332] text-white font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
