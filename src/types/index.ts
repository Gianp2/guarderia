/**
 * Nido Cuidado - Definiciones de Tipos e Interfaces Estrictas
 * 
 * Contiene todas las entidades principales del dominio:
 * - User / UserProfile (Administradores, Docentes, Familias)
 * - Child (Expedientes de alumnos infantiles)
 * - Family (Tutores y núcleos familiares)
 * - Room (Salas pedagógicas y espacios asignados)
 * - Attendance / AttendanceRecord (Registros diarios de asistencia y permanencia)
 * - Activity (Bitácora pedagógica, alimentación, descanso y fotos)
 * - Announcement (Comunicados institucionales y novedades)
 * - AuditLog (Trazabilidad y auditoría de acciones administrativas)
 * - EnrollmentCode (Códigos seguros de vinculación de hijos)
 * - ProgressReport (Reportes de desarrollo y avances pedagógicos)
 */

// ==========================================
// ROLES Y ACCESOS
// ==========================================
export type UserRole = 'admin' | 'teacher' | 'parent';

/**
 * Entidad de Usuario del Sistema
 */
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  phone?: string;
  photoURL?: string;
  assignedRoomIds?: string[]; // Salas asignadas (Docentes)
  linkedChildIds?: string[];  // Hijos vinculados autorizados (Padres/Madres)
  familyId?: string;          // Núcleo familiar al que pertenece
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

// Alias para compatibilidad estricta con el contexto de autenticación
export type UserProfile = User;

// ==========================================
// EXPEDIENTE INFANTIL (CHILD)
// ==========================================
export type EnrollmentStatus = 'active' | 'inactive' | 'pending';

/**
 * Entidad de Niño / Alumno Infantil
 */
export interface Child {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string; // Formato YYYY-MM-DD
  roomId: string;
  roomName?: string;
  enrollmentStatus: EnrollmentStatus;
  enrollmentDate: string;
  authorizedParentIds: string[]; // UIDs de Firebase autorizados a ver a este niño
  familyId?: string;
  allergies?: string;
  dietaryNotes?: string;
  medicalNotes?: string;
  emergencyContact?: string;
  authorizedPickups?: Array<{
    name: string;
    relationship: string;
    dni?: string;
    phone?: string;
  }>;
  administrativeNotes?: string;
  photoUrl?: string;
  bloodType?: string;
  pediatricianName?: string;
  pediatricianPhone?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// FAMILIA Y TUTORES (FAMILY)
// ==========================================
/**
 * Entidad de Familia / Núcleo Familiar
 */
export interface Family {
  id: string;
  familyName: string;
  primaryGuardianName: string;
  primaryGuardianEmail: string;
  primaryGuardianPhone?: string;
  secondaryGuardianName?: string;
  secondaryGuardianPhone?: string;
  guardianUserIds: string[]; // UIDs de usuarios con rol parent
  childIds: string[];        // IDs de niños que integran esta familia
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// SALAS Y ESPACIOS (ROOM) - SISTEMA ARGENTINO
// ==========================================
export type ArgentineEducationCycle = 'Jardín Maternal' | 'Jardín de Infantes';
export type ArgentineShift = 'Turno Mañana' | 'Turno Tarde' | 'Jornada Completa' | 'Jornada Extendida';

/**
 * Entidad de Sala Pedagógica (Estructura adaptada al Nivel Inicial de Argentina)
 */
export interface Room {
  id: string;
  name: string;
  description: string;
  ageRange: string;
  capacity: number;
  color?: string;
  assignedTeacherIds: string[]; // UIDs de docentes asignados a la sala
  status: 'active' | 'inactive';
  schedule?: string;
  cycle?: ArgentineEducationCycle; // 'Jardín Maternal' | 'Jardín de Infantes'
  shift?: ArgentineShift;          // 'Turno Mañana' | 'Turno Tarde' | 'Jornada Completa'
  symbolicName?: string;          // Ej: "Sala Celeste", "Solcitos", "Sala Verde"
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// ASISTENCIA (ATTENDANCE)
// ==========================================
export type AttendanceStatus = 'present' | 'absent' | 'justified';

/**
 * Entidad de Asistencia y Permanencia Diaria
 */
export interface Attendance {
  id: string;
  childId: string;
  childName: string;
  roomId: string;
  roomName?: string;
  date: string; // Formato YYYY-MM-DD
  status: AttendanceStatus;
  checkInTime?: string;  // Formato HH:MM
  checkOutTime?: string; // Formato HH:MM
  notes?: string;
  recordedByUserId: string;
  recordedByName: string;
  createdAt?: string;
  updatedAt?: string;
}

// Alias estricto para compatibilidad total con páginas existentes
export type AttendanceRecord = Attendance;

// ==========================================
// ACTIVIDADES Y BITÁCORA (ACTIVITY)
// ==========================================
export type ActivityCategory = 
  | 'activity' 
  | 'event'
  | 'meal' 
  | 'nap' 
  | 'hygiene' 
  | 'milestone' 
  | 'general';

/**
 * Entidad de Actividad Pedagógica o Rutina Diaria
 */
export interface Activity {
  id: string;
  title: string;
  description: string;
  category: ActivityCategory;
  date: string; // Formato YYYY-MM-DD
  time?: string; // Formato HH:MM
  endDate?: string; // Para eventos que abarcan múltiples fechas o horario de cierre
  isUpcoming?: boolean; // Para eventos futuros y próximas actividades
  isImportant?: boolean; // Indicador explícito si la docente marcó la actividad como importante
  roomId: string;
  roomName?: string;
  childIds?: string[]; // IDs de niños específicos, o vacío si aplica a toda la sala
  authorUserId: string;
  authorName: string;
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// NOTIFICACIONES INTERNAS DE LA PLATAFORMA
// ==========================================
export type NotificationType = 
  | 'fee_reminder'       // Recordatorio de cuota
  | 'due_date'           // Aviso de vencimiento
  | 'payment_pending'    // Pago pendiente
  | 'activity'           // Actividad o bitácora pedagógica
  | 'attendance'         // Asistencia y permanencia (ingreso / egreso)
  | 'summary'            // Resumen diario consolidado
  | 'event'              // Evento o fecha importante
  | 'announcement'       // Comunicado importante
  | 'general';           // Aviso general

export type NotificationTargetType = 'all' | 'room' | 'family' | 'child';

export interface InternalNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  targetType: NotificationTargetType;
  targetRoomId?: string;
  targetRoomName?: string;
  targetFamilyId?: string;
  targetFamilyName?: string;
  targetChildId?: string;
  targetChildName?: string;
  category?: string;
  url?: string;
  metadata?: Record<string, any>;
  senderUserId: string;
  senderName: string;
  senderRole: UserRole;
  importance?: ImportanceLevel;
  readByUserIds: string[]; // IDs de usuarios que la marcaron como leída
  createdAt: string;
  updatedAt?: string;
}

// ==========================================
// COMUNICADOS Y NOVEDADES (ANNOUNCEMENT)
// ==========================================
export type ImportanceLevel = 'normal' | 'important' | 'urgent';
export type TargetAudience = 'all' | 'teachers' | 'parents';

/**
 * Entidad de Comunicado Institucional / Novedad
 */
export interface Announcement {
  id: string;
  title: string;
  content: string;
  importance: ImportanceLevel;
  targetAudience: TargetAudience;
  roomId?: string; // Opcional: si el comunicado es específico de una sala
  roomName?: string;
  authorUserId: string;
  authorName: string;
  publishDate: string;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// CALENDARIO ESCOLAR (CALENDAR EVENT)
// ==========================================
export type CalendarEventType = 'school_event' | 'holiday' | 'parent_meeting';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  type: CalendarEventType;
  date: string; // Formato YYYY-MM-DD
  endDate?: string; // Formato YYYY-MM-DD opcional
  startTime?: string; // Formato HH:MM
  endTime?: string; // Formato HH:MM
  location?: string; // Ej: "Salón de Actos", "Virtual por Zoom", "Sala Cuna"
  targetRoomId?: string; // 'all' o roomId específico
  targetRoomName?: string;
  isImportant?: boolean;
  createdByUserId?: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// AUDITORÍA Y TRAZABILIDAD (AUDITLOG)
// ==========================================
/**
 * Entidad de Registro de Auditoría
 */
export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  performedByUserId: string;
  performedByUserEmail: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
  createdAt?: string;
}

// ==========================================
// VINCULACIÓN SEGURA DE HIJOS (ENROLLMENTCODE)
// ==========================================
/**
 * Código único alfanumérico generado para vincular un hijo a sus padres
 */
export interface EnrollmentCode {
  id: string;
  code: string;
  childId: string;
  childName: string;
  roomId: string;
  familyId?: string;
  isClaimed?: boolean;
  claimedByUserIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// REPORTES DE APRENDIZAJE Y CONDUCTA (PROGRESSREPORT)
// ==========================================
export type DevelopmentArea = 
  | 'cognitive'           // Aprendizaje, curiosidad y razonamiento
  | 'behavior_habits'     // Comportamiento, convivencia y hábitos en sala
  | 'social_emotional'    // Desarrollo socioemocional y empatía
  | 'language'            // Lenguaje, comprensión y comunicación
  | 'autonomy'            // Autonomía e iniciativa personal
  | 'motor';              // Compatibilidad

/**
 * Informe de progreso pedagógico: cómo va aprendiendo, conducta y socialización
 */
export interface ProgressReport {
  id: string;
  childId: string;
  childName: string;
  roomId: string;
  period: string; // Ej: "Septiembre 2026", "T1"
  area: DevelopmentArea;
  title: string;
  observation: string;
  strengths?: string;
  recommendations?: string;
  authorUserId: string;
  authorName: string;
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// CUOTAS Y PAGOS (FEES & PAYMENTS)
// ==========================================
export type FeeStatus = 'pending' | 'paid' | 'overdue' | 'in_review' | 'cancelled';
export type PaymentMethod = 'mercadopago' | 'transfer' | 'cash';
export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'in_process';

/**
 * Entidad de Cuota o Arancel mensual/anual asignado a un niño
 */
export interface Fee {
  id: string;
  childId: string;
  childName: string;
  familyId?: string;
  concept: string; // Ej: "Cuota Octubre 2026 - Turno Tarde"
  amount: number;  // Monto en ARS (ej: 45000)
  dueDate: string; // YYYY-MM-DD
  period: string;  // Ej: "2026-10"
  status: FeeStatus;
  paidAt?: string;
  paymentMethod?: PaymentMethod;
  paymentId?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Entidad de Pago / Comprobante de Transacción
 */
export interface Payment {
  id: string;
  feeId: string;
  childId: string;
  childName: string;
  payerUserId: string;
  payerName: string;
  payerEmail: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  
  // Datos para Transferencia Bancaria
  transferReceiptUrl?: string; // Data URL o link al comprobante
  transferReceiptType?: 'image' | 'pdf';
  transferReceiptName?: string;
  transferNotes?: string;
  transferBankOrigin?: string;
  reviewedByUserId?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  rejectionReason?: string;

  // Datos para Mercado Pago
  mpPreferenceId?: string;
  mpPaymentId?: string;
  mpStatus?: string;
  mpStatusDetail?: string;
  mpMerchantOrderId?: string;

  createdAt: string;
  updatedAt: string;
}

/**
 * Datos Bancarios de la Guardería para Transferencias
 */
export interface GuarderiaBankDetails {
  bankName: string;
  accountHolder: string;
  accountType: string;
  cuit: string;
  cbu: string;
  alias: string;
  instructions: string;
}

export const GUARDERIA_BANK_DETAILS: GuarderiaBankDetails = {
  bankName: 'Banco Galicia',
  accountHolder: 'Guardería Infantil Nido Cuidado S.R.L.',
  accountType: 'Cuenta Corriente en Pesos',
  cuit: '30-71829340-9',
  cbu: '0720123920000001234567',
  alias: 'NIDO.CUIDADO.PAGOS',
  instructions: 'Por favor indicar en el concepto el nombre y apellido del niño/a. Una vez realizada la transferencia, suba el comprobante digital (PDF o foto) en este panel para validación administrativa.'
};

// ==========================================
// NOTIFICACIONES PUSH & SERVICE WORKER
// ==========================================
export interface PushNotificationPreferences {
  enabled: boolean;
  notifyActivities: boolean;
  notifyDailySummary: boolean;
  notifyAttendance: boolean;
  notifyUrgent: boolean;
}

export interface PushNotificationSubscription {
  id: string;
  userId: string;
  userEmail?: string;
  childId?: string;
  endpoint?: string;
  preferences: PushNotificationPreferences;
  createdAt: string;
  updatedAt: string;
}

