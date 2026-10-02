import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase/config';
import { Fee, Payment, PaymentStatus, FeeStatus } from '../types';

export interface MPStatusResponse {
  configured: boolean;
  isSandbox: boolean;
  publicKey: string | null;
  message: string;
}

export interface MPPreferenceResponse {
  success: boolean;
  configured?: boolean;
  preferenceId: string;
  initPoint: string | null;
  sandboxInitPoint: string | null;
  message?: string;
  notice?: string;
}

export interface MPVerifyResponse {
  verified: boolean;
  status?: string;
  statusDetail?: string;
  amount?: number;
  feeId?: string;
  isApproved?: boolean;
  error?: string;
}

/**
 * Consulta el estado de configuración de Mercado Pago en el servidor
 */
export async function getMercadoPagoStatus(): Promise<MPStatusResponse> {
  try {
    const res = await fetch('/api/mercadopago/status');
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.warn('Error fetching Mercado Pago status:', error);
    return {
      configured: false,
      isSandbox: true,
      publicKey: null,
      message: 'No se pudo conectar con el servicio local de Mercado Pago'
    };
  }
}

/**
 * Crea una preferencia de pago en Mercado Pago mediante el backend oficial
 */
export async function createCheckoutPreference(params: {
  feeId: string;
  title: string;
  amount: number;
  payerEmail?: string;
  payerName?: string;
  childName?: string;
}): Promise<MPPreferenceResponse> {
  const res = await fetch('/api/mercadopago/create-preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error del servidor' }));
    throw new Error(err.error || `Error creando preferencia (${res.status})`);
  }

  return await res.json();
}

/**
 * Solicita al servidor verificar un pago mediante la API oficial de Mercado Pago
 */
export async function verifyServerPayment(paymentId: string, feeId?: string): Promise<MPVerifyResponse> {
  const res = await fetch('/api/mercadopago/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId, feeId })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error de verificación' }));
    throw new Error(err.error || `Error verificando pago (${res.status})`);
  }

  return await res.json();
}

/**
 * Registra un comprobante de transferencia bancaria enviado por un padre/tutor
 */
export async function submitTransferReceipt(params: {
  feeId: string;
  childId: string;
  childName: string;
  payerUserId: string;
  payerName: string;
  payerEmail: string;
  amount: number;
  receiptDataUrl: string;
  receiptType: 'image' | 'pdf';
  receiptName: string;
  notes?: string;
  bankOrigin?: string;
}): Promise<Payment> {
  const paymentId = `transf-${params.feeId}-${Date.now()}`;
  const now = new Date().toISOString();

  const paymentData: Payment = {
    id: paymentId,
    feeId: params.feeId,
    childId: params.childId,
    childName: params.childName,
    payerUserId: params.payerUserId,
    payerName: params.payerName,
    payerEmail: params.payerEmail,
    amount: params.amount,
    method: 'transfer',
    status: 'pending',
    transferReceiptUrl: params.receiptDataUrl,
    transferReceiptType: params.receiptType,
    transferReceiptName: params.receiptName,
    transferNotes: params.notes,
    transferBankOrigin: params.bankOrigin,
    createdAt: now,
    updatedAt: now
  };

  // 1. Guardar registro en colección payments
  await setDoc(doc(db, 'payments', paymentId), paymentData);

  // 2. Actualizar estado de la cuota a in_review
  await updateDoc(doc(db, 'fees', params.feeId), {
    status: 'in_review',
    paymentMethod: 'transfer',
    paymentId: paymentId,
    updatedAt: now
  });

  return paymentData;
}

/**
 * Aprueba o rechaza un comprobante de transferencia (Acción exclusiva del Administrador)
 */
export async function reviewTransferPayment(params: {
  paymentId: string;
  feeId: string;
  approved: boolean;
  reviewerUserId: string;
  reviewerName: string;
  rejectionReason?: string;
}): Promise<void> {
  const now = new Date().toISOString();

  const newStatus: PaymentStatus = params.approved ? 'approved' : 'rejected';
  const newFeeStatus: FeeStatus = params.approved ? 'paid' : 'pending';

  // 1. Actualizar el pago
  await updateDoc(doc(db, 'payments', params.paymentId), {
    status: newStatus,
    reviewedByUserId: params.reviewerUserId,
    reviewedByName: params.reviewerName,
    reviewedAt: now,
    ...(params.rejectionReason ? { rejectionReason: params.rejectionReason } : {}),
    updatedAt: now
  });

  // 2. Actualizar la cuota correspondiente
  const feeUpdate: any = {
    status: newFeeStatus,
    updatedAt: now
  };

  if (params.approved) {
    feeUpdate.paidAt = now;
    feeUpdate.paymentMethod = 'transfer';
    feeUpdate.paymentId = params.paymentId;
  } else {
    // Si se rechaza, vuelve a pending y se remueve el paymentId
    feeUpdate.paymentId = null;
    feeUpdate.paymentMethod = null;
  }

  await updateDoc(doc(db, 'fees', params.feeId), feeUpdate);
}

/**
 * Crea una nueva cuota asignada a un niño
 */
export async function createSingleFee(feeData: Omit<Fee, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const id = `fee-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newFee: Fee = {
    ...feeData,
    id,
    createdAt: now,
    updatedAt: now
  };

  await setDoc(doc(db, 'fees', id), newFee);
  return id;
}

/**
 * Crea cuotas en lote para una sala o conjunto de niños
 */
export async function createBatchFees(children: Array<{ id: string; name: string }>, details: {
  concept: string;
  amount: number;
  dueDate: string;
  period: string;
  notes?: string;
}): Promise<number> {
  let count = 0;
  for (const child of children) {
    await createSingleFee({
      childId: child.id,
      childName: child.name,
      concept: details.concept,
      amount: details.amount,
      dueDate: details.dueDate,
      period: details.period,
      status: 'pending',
      notes: details.notes
    });
    count++;
  }
  return count;
}
