/**
 * Servicio de Suscripción a Notificaciones Push y Alertas Instantáneas
 * Utiliza la API de Service Workers y Notification API del navegador.
 */
import { Activity, PushNotificationPreferences, PushNotificationSubscription } from '../types';
import { db, auth } from './firebase/config';
import { doc, setDoc } from 'firebase/firestore';

const STORAGE_KEY = 'nido_cuidado_push_prefs';
const SUBSCRIPTION_KEY = 'nido_cuidado_push_sub_id';

const DEFAULT_PREFERENCES: PushNotificationPreferences = {
  enabled: false,
  notifyActivities: true,
  notifyDailySummary: true,
  notifyAttendance: true,
  notifyUrgent: true,
};

class PushNotificationService {
  private registration: ServiceWorkerRegistration | null = null;
  private isRegistering: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Auto-register service worker on startup
      this.initServiceWorker().catch(() => {});
    }
  }

  /**
   * Verifica si el navegador soporta Service Workers y Notificaciones
   */
  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'Notification' in window
    );
  }

  /**
   * Obtiene el estado actual del permiso de notificaciones
   */
  public getPermission(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  /**
   * Inicializa y registra el Service Worker
   */
  public async initServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) return null;
    if (this.registration) return this.registration;
    if (this.isRegistering) {
      // Wait if already registering
      await new Promise((resolve) => setTimeout(resolve, 300));
      return this.registration;
    }

    try {
      this.isRegistering = true;
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      this.registration = reg;
      return reg;
    } catch (err) {
      console.warn('No se pudo registrar el Service Worker:', err);
      return null;
    } finally {
      this.isRegistering = false;
    }
  }

  /**
   * Obtiene las preferencias almacenadas localmente
   */
  public getPreferences(): PushNotificationPreferences {
    if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (err) {
      console.warn('Error al leer preferencias push:', err);
    }
    return DEFAULT_PREFERENCES;
  }

  /**
   * Guarda las preferencias de notificaciones
   */
  public async savePreferences(
    prefs: Partial<PushNotificationPreferences>,
    userId?: string,
    childId?: string
  ): Promise<PushNotificationPreferences> {
    const current = this.getPreferences();
    const updated: PushNotificationPreferences = { ...current, ...prefs };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('Error al guardar preferencias push:', err);
      }
    }

    // Si el usuario está autenticado, sincronizar la suscripción en Firestore
    const activeUserId = userId || auth?.currentUser?.uid || 'parent-current';
    const subId = this.getSubscriptionId();

    const record: PushNotificationSubscription = {
      id: subId,
      userId: activeUserId,
      userEmail: auth?.currentUser?.email || undefined,
      childId: childId || undefined,
      preferences: updated,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (db) {
        await setDoc(doc(db, 'push_subscriptions', subId), record, { merge: true });
      }
    } catch (err) {
      console.warn('Suscripción push guardada en almacenamiento local:', err);
    }

    return updated;
  }

  /**
   * Genera o recupera el identificador único de suscripción del dispositivo
   */
  public getSubscriptionId(): string {
    if (typeof window === 'undefined') return 'sub-device-default';
    let subId = localStorage.getItem(SUBSCRIPTION_KEY);
    if (!subId) {
      subId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(SUBSCRIPTION_KEY, subId);
    }
    return subId;
  }

  /**
   * Solicita permiso al usuario y activa la suscripción
   */
  public async subscribe(
    userId?: string,
    childId?: string,
    initialPrefs?: Partial<PushNotificationPreferences>
  ): Promise<{ success: boolean; permission: NotificationPermission | 'unsupported'; error?: string }> {
    if (!this.isSupported()) {
      return { success: false, permission: 'unsupported', error: 'Tu navegador no soporta la API de Notificaciones o Service Workers.' };
    }

    try {
      // 1. Asegurar registro del Service Worker
      await this.initServiceWorker();

      // 2. Solicitar permiso al navegador
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        await this.savePreferences({
          enabled: true,
          ...(initialPrefs || {})
        }, userId, childId);

        // 3. Enviar notificación de bienvenida y confirmación a través del Service Worker
        await this.showNotification('🔔 ¡Notificaciones activadas!', {
          body: 'Recibirás alertas instantáneas cada vez que la docente cargue una actividad o el resumen del día.',
          tag: 'nido-welcome-alert',
          data: { url: '/familia' }
        });

        return { success: true, permission: 'granted' };
      } else {
        await this.savePreferences({ enabled: false }, userId, childId);
        return {
          success: false,
          permission,
          error: permission === 'denied' 
            ? 'Los permisos fueron denegados. Podés habilitarlos desde la configuración de tu navegador.'
            : 'Permiso de notificaciones no concedido.'
        };
      }
    } catch (err: any) {
      console.error('Error al suscribir a notificaciones push:', err);
      return { success: false, permission: this.getPermission(), error: err.message || 'Error al solicitar permisos.' };
    }
  }

  /**
   * Desactiva la suscripción
   */
  public async unsubscribe(userId?: string): Promise<boolean> {
    await this.savePreferences({ enabled: false }, userId);
    return true;
  }

  /**
   * Muestra una notificación usando la API del Service Worker (o fallback nativo)
   */
  public async showNotification(
    title: string,
    options: NotificationOptions & { data?: any } = {}
  ): Promise<boolean> {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    const swReg = await this.initServiceWorker();

    const fullOptions = {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [150, 80, 150],
      renotify: true,
      tag: options.tag || 'nido-alert',
      data: options.data || { url: '/familia' },
      ...options
    };

    // 1. Prioridad: Mostrar vía ServiceWorkerRegistration
    if (swReg && 'showNotification' in swReg) {
      try {
        await swReg.showNotification(title, fullOptions);
        return true;
      } catch (err) {
        console.warn('Fallo al invocar swReg.showNotification, intentando postMessage:', err);
      }
    }

    // 2. Vía ServiceWorker postMessage
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        options: fullOptions
      });
      return true;
    }

    // 3. Fallback: Notification nativa en ventana
    try {
      new Notification(title, fullOptions);
      return true;
    } catch (err) {
      console.warn('Fallo al disparar Notification:', err);
      return false;
    }
  }

  /**
   * Dispara una alerta de nueva actividad cargada por la docente
   */
  public async notifyNewActivity(activity: Activity, childName?: string, roomName?: string): Promise<void> {
    const prefs = this.getPreferences();
    if (!prefs.enabled || !prefs.notifyActivities) return;

    let emoji = '📌';
    let categoryName = 'Actividad';

    switch (activity.category) {
      case 'meal':
        emoji = '🍎';
        categoryName = 'Alimentación';
        break;
      case 'activity':
        emoji = '🎨';
        categoryName = 'Pedagógica';
        break;
      case 'nap':
        emoji = '💤';
        categoryName = 'Descanso';
        break;
      case 'hygiene':
        emoji = '🧼';
        categoryName = 'Higiene';
        break;
      case 'milestone':
        emoji = '🌟';
        categoryName = 'Hito de Desarrollo';
        break;
      case 'event':
        emoji = '📅';
        categoryName = 'Evento Institucional';
        break;
      case 'general':
      default:
        emoji = '📌';
        categoryName = 'Novedad de Sala';
        break;
    }

    const title = activity.isImportant
      ? `🚨 ${emoji} AVISO IMPORTANTE: ${activity.title}`
      : `${emoji} ${categoryName}: ${activity.title}`;

    const childSuffix = childName ? ` para ${childName}` : (roomName ? ` en ${roomName}` : '');
    const body = `${activity.authorName} cargó un nuevo registro${childSuffix}: "${activity.description.length > 90 ? activity.description.substring(0, 87) + '...' : activity.description}"`;

    await this.showNotification(title, {
      body,
      tag: `nido-activity-${activity.id}`,
      data: { url: '/familia', activityId: activity.id }
    });
  }

  /**
   * Dispara una alerta cuando se genera o publica el resumen diario consolidado
   */
  public async notifyDailySummaryReady(childName: string, roomName: string): Promise<void> {
    const prefs = this.getPreferences();
    if (!prefs.enabled || !prefs.notifyDailySummary) return;

    await this.showNotification('📋 Resumen Diario Consolidado Disponible', {
      body: `Ya podés revisar el resumen consolidado de ${childName} en Sala ${roomName} con asistencia y actividades verificadas.`,
      tag: `nido-summary-${Date.now()}`,
      data: { url: '/familia' }
    });
  }

  /**
   * Dispara una alerta de asistencia (ingreso / egreso en portería)
   */
  public async notifyAttendance(childName: string, statusText: string, time?: string): Promise<void> {
    const prefs = this.getPreferences();
    if (!prefs.enabled || !prefs.notifyAttendance) return;

    const timeStr = time ? ` (${time} hs)` : '';
    await this.showNotification(`📍 Asistencia: ${childName}`, {
      body: `${childName} ha sido registrado: ${statusText}${timeStr}.`,
      tag: `nido-attendance-${Date.now()}`,
      data: { url: '/familia' }
    });
  }

  /**
   * Prueba una notificación push de ejemplo
   */
  public async sendTestNotification(): Promise<boolean> {
    return this.showNotification('🔔 Notificación de Prueba — Nido Cuidado', {
      body: '¡Excelente! El Service Worker está configurado correctamente y listo para enviarte novedades de tu hijo/a.',
      tag: 'nido-test-notification',
      data: { url: '/familia' }
    });
  }
}

export const pushNotificationService = new PushNotificationService();
