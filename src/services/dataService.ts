import { doc, setDoc, deleteDoc, getDocs, collection } from 'firebase/firestore';
import { db, auth } from './firebase/config';
import { 
  Activity, 
  AttendanceRecord, 
  Announcement, 
  ProgressReport, 
  Child, 
  Room 
} from '../types';
import { 
  INITIAL_ACTIVITIES, 
  INITIAL_ATTENDANCE, 
  INITIAL_ANNOUNCEMENTS, 
  INITIAL_PROGRESS_REPORTS,
  INITIAL_CHILDREN,
  INITIAL_ROOMS 
} from './seedData';
import { notificationService } from './notificationService';

type Listener = () => void;
export type DataEvent = 'activities' | 'attendance' | 'announcements' | 'reports' | 'children' | 'rooms';

class CentralizedDataService {
  private listeners: Map<string, Set<Listener>> = new Map();

  constructor() {
    this.initStorage();
  }

  private initStorage() {
    try {
      if (!localStorage.getItem('nido_activities')) {
        localStorage.setItem('nido_activities', JSON.stringify(INITIAL_ACTIVITIES));
      }
      if (!localStorage.getItem('nido_attendance')) {
        localStorage.setItem('nido_attendance', JSON.stringify(INITIAL_ATTENDANCE));
      }
      if (!localStorage.getItem('nido_announcements')) {
        localStorage.setItem('nido_announcements', JSON.stringify(INITIAL_ANNOUNCEMENTS));
      }
      if (!localStorage.getItem('nido_progress_reports')) {
        localStorage.setItem('nido_progress_reports', JSON.stringify(INITIAL_PROGRESS_REPORTS));
      }
      if (!localStorage.getItem('nido_children')) {
        localStorage.setItem('nido_children', JSON.stringify(INITIAL_CHILDREN));
      }
      if (!localStorage.getItem('nido_rooms')) {
        localStorage.setItem('nido_rooms', JSON.stringify(INITIAL_ROOMS));
      }
    } catch (e) {
      console.warn('LocalStorage not accessible:', e);
    }
  }

  public subscribe(event: DataEvent, callback: Listener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private notify(event: DataEvent) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(cb => {
        try {
          cb();
        } catch (e) {
          console.error(`Error notifying listener for ${event}:`, e);
        }
      });
    }
  }

  // ==========================================
  // SALAS (ROOMS)
  // ==========================================
  public getRooms(): Room[] {
    try {
      const raw = localStorage.getItem('nido_rooms');
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Error reading rooms from storage:', e);
    }
    return INITIAL_ROOMS;
  }

  public async saveRoom(room: Room): Promise<void> {
    const list = this.getRooms();
    const index = list.findIndex(r => r.id === room.id);
    let updated: Room[];

    if (index >= 0) {
      updated = [...list];
      updated[index] = { ...room, updatedAt: new Date().toISOString() };
    } else {
      updated = [...list, { ...room, createdAt: room.createdAt || new Date().toISOString() }];
    }

    try {
      localStorage.setItem('nido_rooms', JSON.stringify(updated));
    } catch (e) {
      console.warn('Error saving room to storage:', e);
    }

    this.notify('rooms');

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'rooms', room.id), room, { merge: true });
      } catch (err) {
        console.warn('Firestore room sync warning:', err);
      }
    }
  }

  public async deleteRoom(id: string): Promise<void> {
    const list = this.getRooms();
    const updated = list.filter(r => r.id !== id);

    try {
      localStorage.setItem('nido_rooms', JSON.stringify(updated));
    } catch (e) {
      console.warn('Error deleting room from storage:', e);
    }

    this.notify('rooms');

    if (auth.currentUser) {
      try {
        await deleteDoc(doc(db, 'rooms', id));
      } catch (err) {
        console.warn('Firestore room delete warning:', err);
      }
    }
  }

  // ==========================================
  // NIÑOS Y LEGAJOS (CHILDREN)
  // ==========================================
  public getChildren(): Child[] {
    try {
      const raw = localStorage.getItem('nido_children');
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Error reading children from storage:', e);
    }
    return INITIAL_CHILDREN;
  }

  public async saveChild(child: Child): Promise<void> {
    const list = this.getChildren();
    const index = list.findIndex(c => c.id === child.id);
    let updated: Child[];

    if (index >= 0) {
      updated = [...list];
      updated[index] = { ...child, updatedAt: new Date().toISOString() };
    } else {
      updated = [{ ...child, createdAt: child.createdAt || new Date().toISOString() }, ...list];
    }

    try {
      localStorage.setItem('nido_children', JSON.stringify(updated));
    } catch (e) {
      console.warn('Error saving child to storage:', e);
    }

    this.notify('children');

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'children', child.id), child, { merge: true });
      } catch (err) {
        console.warn('Firestore child sync warning:', err);
      }
    }
  }

  public async deleteChild(id: string): Promise<void> {
    const list = this.getChildren();
    const updated = list.filter(c => c.id !== id);

    try {
      localStorage.setItem('nido_children', JSON.stringify(updated));
    } catch (e) {
      console.warn('Error deleting child from storage:', e);
    }

    this.notify('children');

    if (auth.currentUser) {
      try {
        await deleteDoc(doc(db, 'children', id));
      } catch (err) {
        console.warn('Firestore child delete warning:', err);
      }
    }
  }

  // ==========================================
  // ACTIVIDADES (ACTIVITIES)
  // ==========================================
  public getActivities(): Activity[] {
    try {
      const raw = localStorage.getItem('nido_activities');
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Error reading activities from storage:', e);
    }
    return INITIAL_ACTIVITIES;
  }

  public async saveActivity(activity: Activity): Promise<void> {
    const list = this.getActivities();
    const index = list.findIndex(a => a.id === activity.id);
    let updated: Activity[];

    if (index >= 0) {
      updated = [...list];
      updated[index] = { ...activity, updatedAt: new Date().toISOString() };
    } else {
      updated = [{ ...activity, createdAt: activity.createdAt || new Date().toISOString() }, ...list];
    }

    try {
      localStorage.setItem('nido_activities', JSON.stringify(updated));
    } catch (e) {
      console.warn('Error saving activity to storage:', e);
    }

    this.notify('activities');

    // Disparar notificación en tiempo real a familias (Firestore + Push)
    try {
      const room = this.getRooms().find(r => r.id === activity.roomId);
      const allChildren = this.getChildren();
      notificationService.notifyActivity(activity, room?.name, allChildren).catch(console.warn);
    } catch (e) {
      console.warn('Error al disparar notificación de actividad:', e);
    }

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'activities', activity.id), activity, { merge: true });
      } catch (err) {
        console.warn('Firestore activity sync warning:', err);
      }
    }
  }

  public async deleteActivity(id: string): Promise<void> {
    const list = this.getActivities();
    const updated = list.filter(a => a.id !== id);

    try {
      localStorage.setItem('nido_activities', JSON.stringify(updated));
    } catch (e) {
      console.warn('Error deleting activity from storage:', e);
    }

    this.notify('activities');

    if (auth.currentUser) {
      try {
        await deleteDoc(doc(db, 'activities', id));
      } catch (err) {
        console.warn('Firestore activity delete warning:', err);
      }
    }
  }

  // ==========================================
  // ASISTENCIA (ATTENDANCE)
  // ==========================================
  public getAttendance(): AttendanceRecord[] {
    try {
      const raw = localStorage.getItem('nido_attendance');
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Error reading attendance from storage:', e);
    }
    return INITIAL_ATTENDANCE;
  }

  public async saveAttendance(record: AttendanceRecord): Promise<void> {
    const list = this.getAttendance();
    // Unique key: childId + date
    const index = list.findIndex(a => 
      a.id === record.id || (a.childId === record.childId && a.date === record.date)
    );
    let updated: AttendanceRecord[];

    if (index >= 0) {
      updated = [...list];
      updated[index] = { ...record, updatedAt: new Date().toISOString() };
    } else {
      updated = [record, ...list];
    }

    try {
      localStorage.setItem('nido_attendance', JSON.stringify(updated));
    } catch (e) {
      console.warn('Error saving attendance to storage:', e);
    }

    this.notify('attendance');

    // Disparar notificación en tiempo real a familias (Firestore + Push)
    try {
      notificationService.notifyAttendance(
        record, 
        record.childName, 
        record.roomName, 
        record.recordedByName, 
        record.recordedByUserId
      ).catch(console.warn);
    } catch (e) {
      console.warn('Error al disparar notificación de asistencia:', e);
    }

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'attendance', record.id), record, { merge: true });
      } catch (err) {
        console.warn('Firestore attendance sync warning:', err);
      }
    }
  }

  public async deleteAttendance(id: string): Promise<void> {
    const list = this.getAttendance();
    const updated = list.filter(a => a.id !== id);

    try {
      localStorage.setItem('nido_attendance', JSON.stringify(updated));
    } catch (e) {
      console.warn('Error deleting attendance from storage:', e);
    }

    this.notify('attendance');

    if (auth.currentUser) {
      try {
        await deleteDoc(doc(db, 'attendance', id));
      } catch (err) {
        console.warn('Firestore attendance delete warning:', err);
      }
    }
  }

  // ==========================================
  // COMUNICADOS (ANNOUNCEMENTS)
  // ==========================================
  public getAnnouncements(): Announcement[] {
    try {
      const raw = localStorage.getItem('nido_announcements');
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Error reading announcements from storage:', e);
    }
    return INITIAL_ANNOUNCEMENTS;
  }

  public async saveAnnouncement(ann: Announcement): Promise<void> {
    const list = this.getAnnouncements();
    const index = list.findIndex(a => a.id === ann.id);
    let updated: Announcement[];

    if (index >= 0) {
      updated = [...list];
      updated[index] = { ...ann, updatedAt: new Date().toISOString() };
    } else {
      updated = [ann, ...list];
    }

    try {
      localStorage.setItem('nido_announcements', JSON.stringify(updated));
    } catch (e) {
      console.warn('Error saving announcement to storage:', e);
    }

    this.notify('announcements');

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'announcements', ann.id), ann, { merge: true });
      } catch (err) {
        console.warn('Firestore announcement sync warning:', err);
      }
    }
  }

  public async deleteAnnouncement(id: string): Promise<void> {
    const list = this.getAnnouncements();
    const updated = list.filter(a => a.id !== id);

    try {
      localStorage.setItem('nido_announcements', JSON.stringify(updated));
    } catch (e) {
      console.warn('Error deleting announcement from storage:', e);
    }

    this.notify('announcements');

    if (auth.currentUser) {
      try {
        await deleteDoc(doc(db, 'announcements', id));
      } catch (err) {
        console.warn('Firestore announcement delete warning:', err);
      }
    }
  }

  // ==========================================
  // INFORMES PEDAGÓGICOS (PROGRESS REPORTS)
  // ==========================================
  public getProgressReports(): ProgressReport[] {
    try {
      const raw = localStorage.getItem('nido_progress_reports');
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Error reading progress reports from storage:', e);
    }
    return INITIAL_PROGRESS_REPORTS;
  }

  public async saveProgressReport(report: ProgressReport): Promise<void> {
    const list = this.getProgressReports();
    const index = list.findIndex(r => r.id === report.id);
    let updated: ProgressReport[];

    if (index >= 0) {
      updated = [...list];
      updated[index] = { ...report, updatedAt: new Date().toISOString() };
    } else {
      updated = [report, ...list];
    }

    try {
      localStorage.setItem('nido_progress_reports', JSON.stringify(updated));
    } catch (e) {
      console.warn('Error saving progress report to storage:', e);
    }

    this.notify('reports');

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'progressReports', report.id), report, { merge: true });
      } catch (err) {
        console.warn('Firestore report sync warning:', err);
      }
    }
  }

  // Sync with Firestore if authenticated
  public async syncFromFirestore(): Promise<void> {
    if (!auth.currentUser) return;
    try {
      const [actSnap, attSnap, annSnap, repSnap, cSnap, rSnap] = await Promise.all([
        getDocs(collection(db, 'activities')).catch(() => null),
        getDocs(collection(db, 'attendance')).catch(() => null),
        getDocs(collection(db, 'announcements')).catch(() => null),
        getDocs(collection(db, 'progressReports')).catch(() => null),
        getDocs(collection(db, 'children')).catch(() => null),
        getDocs(collection(db, 'rooms')).catch(() => null),
      ]);

      if (actSnap && !actSnap.empty) {
        const loaded: Activity[] = [];
        actSnap.forEach(d => loaded.push({ id: d.id, ...d.data() } as Activity));
        localStorage.setItem('nido_activities', JSON.stringify(loaded));
        this.notify('activities');
      }

      if (attSnap && !attSnap.empty) {
        const loaded: AttendanceRecord[] = [];
        attSnap.forEach(d => loaded.push({ id: d.id, ...d.data() } as AttendanceRecord));
        localStorage.setItem('nido_attendance', JSON.stringify(loaded));
        this.notify('attendance');
      }

      if (annSnap && !annSnap.empty) {
        const loaded: Announcement[] = [];
        annSnap.forEach(d => loaded.push({ id: d.id, ...d.data() } as Announcement));
        localStorage.setItem('nido_announcements', JSON.stringify(loaded));
        this.notify('announcements');
      }

      if (repSnap && !repSnap.empty) {
        const loaded: ProgressReport[] = [];
        repSnap.forEach(d => loaded.push({ id: d.id, ...d.data() } as ProgressReport));
        localStorage.setItem('nido_progress_reports', JSON.stringify(loaded));
        this.notify('reports');
      }

      if (cSnap && !cSnap.empty) {
        const loaded: Child[] = [];
        cSnap.forEach(d => loaded.push({ id: d.id, ...d.data() } as Child));
        localStorage.setItem('nido_children', JSON.stringify(loaded));
        this.notify('children');
      }

      if (rSnap && !rSnap.empty) {
        const loaded: Room[] = [];
        rSnap.forEach(d => loaded.push({ id: d.id, ...d.data() } as Room));
        localStorage.setItem('nido_rooms', JSON.stringify(loaded));
        this.notify('rooms');
      }
    } catch (err) {
      console.warn('Error during Firestore sync:', err);
    }
  }
}

export const dataService = new CentralizedDataService();
