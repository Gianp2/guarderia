/**
 * Servicio de Notificaciones en Tiempo Real (Firestore + Service Worker Push)
 * Gestiona alertas instantáneas de asistencias, bitácora pedagógica, resúmenes diarios y avisos.
 */
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  arrayUnion,
  updateDoc 
} from 'firebase/firestore';
import { db, auth } from './firebase/config';
import { 
  InternalNotification, 
  Activity, 
  AttendanceRecord, 
  Child, 
  UserRole,
  ImportanceLevel 
} from '../types';
import { INITIAL_NOTIFICATIONS } from './seedData';
import { pushNotificationService } from './pushNotificationService';

const STORAGE_KEY = 'nido_internal_notifications';

type NotificationListener = (notifications: InternalNotification[]) => void;

export interface NotificationSubscriptionFilter {
  userId?: string;
  role?: UserRole;
  roomIds?: string[];
  childIds?: string[];
  familyId?: string;
}

class NotificationService {
  private localNotifications: InternalNotification[] = [];
  private listeners: Set<NotificationListener> = new Set();

  constructor() {
    this.localNotifications = this.loadFromStorage();
  }

  private loadFromStorage(): InternalNotification[] {
    if (typeof window === 'undefined') return INITIAL_NOTIFICATIONS;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Error al leer notificaciones de localStorage:', e);
    }
    return INITIAL_NOTIFICATIONS;
  }

  private saveToStorage(notifications: InternalNotification[]) {
    this.localNotifications = notifications;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
      } catch (e) {
        console.warn('Error al guardar notificaciones en localStorage:', e);
      }
    }
    this.notifyLocalListeners();
  }

  private notifyLocalListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.localNotifications);
      } catch (err) {
        console.error('Error en listener de notificaciones:', err);
      }
    });
  }

  /**
   * Obtiene la lista actual en memoria/caché local
   */
  public getCachedNotifications(): InternalNotification[] {
    return this.localNotifications;
  }

  /**
   * Guarda o actualiza una notificación en Firestore y almacenamiento local
   */
  public async sendNotification(notification: InternalNotification): Promise<void> {
    // 1. Actualizar caché local
    const current = this.loadFromStorage();
    const index = current.findIndex(n => n.id === notification.id);
    let updated: InternalNotification[];

    if (index >= 0) {
      updated = [...current];
      updated[index] = { ...notification, updatedAt: new Date().toISOString() };
    } else {
      updated = [notification, ...current];
    }
    this.saveToStorage(updated);

    // 2. Persistir en Firestore en tiempo real
    try {
      if (db) {
        await setDoc(doc(db, 'notifications', notification.id), notification, { merge: true });
      }
    } catch (err) {
      console.warn('Advertencia al sincronizar notificación en Firestore:', err);
    }

    // 3. Disparar alerta en Service Worker (Web Push) si corresponde
    try {
      if (pushNotificationService.isSupported()) {
        const iconEmoji = notification.type === 'attendance' ? '📍' : notification.type === 'summary' ? '📋' : '🎨';
        await pushNotificationService.showNotification(`${iconEmoji} ${notification.title}`, {
          body: notification.message,
          tag: `nido-${notification.id}`,
          data: { url: notification.url || '/familia', notifId: notification.id }
        });
      }
    } catch (pushErr) {
      console.warn('Aviso push secundario no enviado:', pushErr);
    }
  }

  /**
   * Genera y envía una notificación en tiempo real cuando la docente carga una actividad en la bitácora
   */
  public async notifyActivity(
    activity: Activity,
    roomName?: string,
    children?: Child[],
    teacherName?: string,
    teacherId?: string
  ): Promise<InternalNotification> {
    const notifId = `notif-act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const effectiveRoomName = roomName || 'Sala';
    const effectiveTeacherName = teacherName || activity.authorName || 'Docente de Sala';
    const effectiveTeacherId = teacherId || activity.authorUserId || 'teacher';

    let categoryLabel = 'Actividad';
    let iconEmoji = '🎨';
    switch (activity.category) {
      case 'meal':
        categoryLabel = 'Alimentación';
        iconEmoji = '🍎';
        break;
      case 'nap':
        categoryLabel = 'Descanso y Siesta';
        iconEmoji = '💤';
        break;
      case 'hygiene':
        categoryLabel = 'Higiene y Mudas';
        iconEmoji = '🧼';
        break;
      case 'milestone':
        categoryLabel = 'Hito Pedagógico';
        iconEmoji = '🌟';
        break;
      case 'event':
        categoryLabel = 'Evento';
        iconEmoji = '📅';
        break;
      default:
        categoryLabel = 'Bitácora Pedagógica';
        iconEmoji = '🎨';
        break;
    }

    // Identificar si la actividad es individual para un niño específico o grupal
    let targetType: 'all' | 'room' | 'child' = 'room';
    let targetChildId: string | undefined = undefined;
    let targetChildName: string | undefined = undefined;

    if (activity.childIds && activity.childIds.length === 1) {
      targetType = 'child';
      targetChildId = activity.childIds[0];
      const matchedChild = children?.find(c => c.id === targetChildId);
      if (matchedChild) {
        targetChildName = `${matchedChild.firstName} ${matchedChild.lastName}`;
      }
    }

    const title = activity.isImportant 
      ? `🚨 Aviso Importante: ${activity.title}`
      : `${iconEmoji} ${categoryLabel}: ${activity.title}`;

    const childSuffix = targetChildName ? ` de ${targetChildName}` : ` en ${effectiveRoomName}`;
    const message = `${effectiveTeacherName} cargó un nuevo registro${childSuffix}: "${activity.description.length > 120 ? activity.description.substring(0, 117) + '...' : activity.description}"`;

    const newNotification: InternalNotification = {
      id: notifId,
      title,
      message,
      type: 'activity',
      targetType,
      targetRoomId: activity.roomId,
      targetRoomName: effectiveRoomName,
      targetChildId,
      targetChildName,
      category: activity.category,
      url: '/familia',
      metadata: {
        activityId: activity.id,
        category: activity.category,
        time: activity.time,
        date: activity.date,
      },
      senderUserId: effectiveTeacherId,
      senderName: effectiveTeacherName,
      senderRole: 'teacher',
      importance: activity.isImportant ? 'urgent' : 'normal',
      readByUserIds: [],
      createdAt: new Date().toISOString()
    };

    await this.sendNotification(newNotification);
    return newNotification;
  }

  /**
   * Genera y envía una notificación en tiempo real cuando se asienta un registro de asistencia en portería o sala
   */
  public async notifyAttendance(
    attendance: AttendanceRecord,
    childName: string,
    roomName?: string,
    recorderName?: string,
    recorderId?: string
  ): Promise<InternalNotification> {
    const notifId = `notif-att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const effectiveRoomName = roomName || 'Sala';
    const effectiveRecorderName = recorderName || attendance.recordedByName || 'Docente de Turno';
    const effectiveRecorderId = recorderId || attendance.recordedByUserId || 'staff';

    let statusText = 'Presente en sala';
    let importance: ImportanceLevel = 'normal';

    if (attendance.status === 'absent') {
      statusText = 'Ausente en guardería';
      importance = 'important';
    } else if (attendance.status === 'justified') {
      statusText = 'Inasistencia justificada';
      importance = 'normal';
    } else {
      if (attendance.checkInTime) {
        statusText = `Presente (Ingreso registrado a las ${attendance.checkInTime} hs)`;
      } else {
        statusText = 'Presente en sala';
      }
    }

    if (attendance.checkOutTime) {
      statusText = `Egreso asentado a las ${attendance.checkOutTime} hs`;
    }

    const title = `📍 Asistencia: ${childName}`;
    const notesSuffix = attendance.notes ? ` Observación: "${attendance.notes}"` : '';
    const message = `${effectiveRecorderName} registró a ${childName} (${effectiveRoomName}) como: ${statusText}.${notesSuffix}`;

    const newNotification: InternalNotification = {
      id: notifId,
      title,
      message,
      type: 'attendance',
      targetType: 'child',
      targetChildId: attendance.childId,
      targetChildName: childName,
      targetRoomId: attendance.roomId,
      targetRoomName: effectiveRoomName,
      category: 'attendance',
      url: '/familia',
      metadata: {
        attendanceId: attendance.id,
        status: attendance.status,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        date: attendance.date
      },
      senderUserId: effectiveRecorderId,
      senderName: effectiveRecorderName,
      senderRole: 'teacher',
      importance,
      readByUserIds: [],
      createdAt: new Date().toISOString()
    };

    await this.sendNotification(newNotification);
    return newNotification;
  }

  /**
   * Genera notificación cuando el resumen diario consolidado está disponible
   */
  public async notifyDailySummary(
    childId: string,
    childName: string,
    roomName: string,
    dateStr: string,
    recorderName?: string
  ): Promise<InternalNotification> {
    const notifId = `notif-sum-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const effectiveRecorderName = recorderName || 'Equipo Pedagógico';

    const newNotification: InternalNotification = {
      id: notifId,
      title: `📋 Resumen Diario Consolidado: ${childName}`,
      message: `Ya podés revisar la ficha oficial de ${childName} (${roomName}) del día de hoy con asistencia, alimentación y dinámicas verificadas.`,
      type: 'summary',
      targetType: 'child',
      targetChildId: childId,
      targetChildName: childName,
      targetRoomName: roomName,
      category: 'summary',
      url: '/familia',
      metadata: { childId, date: dateStr },
      senderUserId: 'system',
      senderName: effectiveRecorderName,
      senderRole: 'teacher',
      importance: 'normal',
      readByUserIds: [],
      createdAt: new Date().toISOString()
    };

    await this.sendNotification(newNotification);
    return newNotification;
  }

  /**
   * Suscribe en tiempo real a las notificaciones usando Firestore onSnapshot
   * Filtra las notificaciones pertinentes para el usuario / familia actual.
   */
  public subscribeToNotifications(
    filter: NotificationSubscriptionFilter,
    callback: NotificationListener
  ): () => void {
    // 1. Notificar estado local inicial de inmediato
    const initialList = this.filterNotifications(this.loadFromStorage(), filter);
    callback(initialList);

    // 2. Si no hay conexión Firestore o cliente web, escuchar listener local
    if (!db) {
      this.listeners.add(callback);
      return () => {
        this.listeners.delete(callback);
      };
    }

    // 3. Conexión en tiempo real con Firestore onSnapshot
    try {
      const notifsCol = collection(db, 'notifications');
      // Escuchamos los documentos ordenados por fecha
      const q = query(notifsCol, orderBy('createdAt', 'desc'), limit(60));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const remoteList: InternalNotification[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as InternalNotification;
              remoteList.push({ ...data, id: docSnap.id });
            });

            // Combinar y almacenar en local
            this.saveToStorage(remoteList);
            const filtered = this.filterNotifications(remoteList, filter);
            callback(filtered);
          } else {
            // Colección aún vacía, usar local
            const local = this.filterNotifications(this.loadFromStorage(), filter);
            callback(local);
          }
        },
        (error) => {
          console.warn('onSnapshot notifications fallback to local cache:', error);
          const local = this.filterNotifications(this.loadFromStorage(), filter);
          callback(local);
        }
      );

      return () => {
        unsubscribe();
      };
    } catch (err) {
      console.warn('Error al iniciar onSnapshot de notificaciones:', err);
      this.listeners.add(callback);
      return () => {
        this.listeners.delete(callback);
      };
    }
  }

  /**
   * Filtra la lista de notificaciones según el perfil, hijos vinculados y salas de la familia
   */
  public filterNotifications(
    list: InternalNotification[],
    filter: NotificationSubscriptionFilter
  ): InternalNotification[] {
    const { userId, role, roomIds = [], childIds = [], familyId } = filter;

    // Directores ven todas las notificaciones
    if (role === 'admin') {
      return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // Docentes ven las de sus salas asignadas o generales
    if (role === 'teacher') {
      return list.filter((n) => {
        if (n.targetType === 'all') return true;
        if (n.targetType === 'room' && n.targetRoomId && roomIds.includes(n.targetRoomId)) return true;
        if (n.senderUserId === userId) return true;
        return false;
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // Familias: Notificaciones dirigidas a todos, a las salas de sus hijos, o a sus hijos específicos
    return list.filter((n) => {
      // 1. General para toda la institución
      if (n.targetType === 'all') return true;

      // 2. Dirigida a la sala donde asiste su hijo
      if (n.targetType === 'room' && n.targetRoomId && roomIds.includes(n.targetRoomId)) {
        return true;
      }

      // 3. Dirigida a su hijo en particular
      if (n.targetType === 'child' && n.targetChildId && childIds.includes(n.targetChildId)) {
        return true;
      }

      // 4. Dirigida a su familia
      if (n.targetType === 'family' && n.targetFamilyId && n.targetFamilyId === familyId) {
        return true;
      }

      return false;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Marca una notificación como leída por el usuario
   */
  public async markAsRead(notificationId: string, userId: string): Promise<void> {
    if (!userId) return;

    // 1. Actualizar caché local
    const current = this.loadFromStorage();
    const target = current.find(n => n.id === notificationId);
    if (target) {
      if (!target.readByUserIds) target.readByUserIds = [];
      if (!target.readByUserIds.includes(userId)) {
        target.readByUserIds.push(userId);
        this.saveToStorage([...current]);
      }
    }

    // 2. Actualizar en Firestore
    if (db && auth.currentUser) {
      try {
        const docRef = doc(db, 'notifications', notificationId);
        await updateDoc(docRef, {
          readByUserIds: arrayUnion(userId),
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Error al marcar leída en Firestore:', err);
      }
    }
  }

  /**
   * Marca todas las notificaciones visibles como leídas
   */
  public async markAllAsRead(userId: string, notifications: InternalNotification[]): Promise<void> {
    if (!userId || notifications.length === 0) return;

    // 1. Actualizar local
    const current = this.loadFromStorage();
    let hasChanges = false;
    current.forEach((n) => {
      if (notifications.some(visible => visible.id === n.id)) {
        if (!n.readByUserIds) n.readByUserIds = [];
        if (!n.readByUserIds.includes(userId)) {
          n.readByUserIds.push(userId);
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      this.saveToStorage([...current]);
    }

    // 2. Actualizar en Firestore en paralelo
    if (db && auth.currentUser) {
      await Promise.allSettled(
        notifications.map((n) => {
          if (!n.readByUserIds?.includes(userId)) {
            const docRef = doc(db, 'notifications', n.id);
            return updateDoc(docRef, {
              readByUserIds: arrayUnion(userId),
              updatedAt: new Date().toISOString()
            });
          }
          return Promise.resolve();
        })
      );
    }
  }

  /**
   * Elimina una notificación
   */
  public async deleteNotification(notificationId: string): Promise<void> {
    const current = this.loadFromStorage();
    const updated = current.filter(n => n.id !== notificationId);
    this.saveToStorage(updated);

    if (db && auth.currentUser) {
      try {
        await deleteDoc(doc(db, 'notifications', notificationId));
      } catch (err) {
        console.warn('Error al eliminar notificación en Firestore:', err);
      }
    }
  }
}

export const notificationService = new NotificationService();
