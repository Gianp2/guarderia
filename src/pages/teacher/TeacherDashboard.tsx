import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Baby, 
  CalendarCheck2, 
  BookOpen, 
  Plus, 
  Clock, 
  AlertCircle, 
  Eye, 
  CheckCircle2, 
  Users, 
  TrendingUp, 
  MessageSquare, 
  Save, 
  Utensils, 
  Check, 
  Bell,
  XCircle,
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Edit,
  History,
  DoorClosed,
  Zap,
  Droplets,
  HeartHandshake
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  Room, 
  Child, 
  AttendanceRecord, 
  Activity, 
  ProgressReport, 
  Announcement, 
  ActivityCategory, 
  DevelopmentArea, 
  AttendanceStatus, 
  ImportanceLevel 
} from '../../types';
import { 
  INITIAL_ROOMS, 
  INITIAL_CHILDREN, 
  INITIAL_ATTENDANCE, 
  INITIAL_ACTIVITIES, 
  INITIAL_PROGRESS_REPORTS, 
  INITIAL_ANNOUNCEMENTS 
} from '../../services/seedData';
import { dataService } from '../../services/dataService';
import { pushNotificationService } from '../../services/pushNotificationService';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { SchoolCalendar } from '../../components/calendar/SchoolCalendar';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc 
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase/config';

export const TeacherDashboard: React.FC = () => {
  const { userProfile, currentUser } = useAuth();
  const toast = useToast();

  // Teacher assigned rooms
  const assignedRoomIds = userProfile?.assignedRoomIds && userProfile.assignedRoomIds.length > 0
    ? userProfile.assignedRoomIds
    : ['room-cuna', 'room-1ano'];

  // State from Firestore with Seed Fallback
  const [roomsList, setRoomsList] = useState<Room[]>(() => dataService.getRooms());
  const [childrenList, setChildrenList] = useState<Child[]>(() => dataService.getChildren());
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>(() => dataService.getAttendance());
  const [activitiesList, setActivitiesList] = useState<Activity[]>(() => dataService.getActivities());
  const [reportsList, setReportsList] = useState<ProgressReport[]>(() => dataService.getProgressReports());
  const [announcementsList, setAnnouncementsList] = useState<Announcement[]>(() => dataService.getAnnouncements());

  // Filter teacher's assigned rooms
  const myRooms = roomsList.filter(r => assignedRoomIds.includes(r.id));
  const [selectedRoomId, setSelectedRoomId] = useState<string>(myRooms[0]?.id || assignedRoomIds[0] || 'room-cuna');

  // Child search & filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'absent' | 'unregistered' | 'allergies'>('all');

  // Expanded child today's history accordion
  const [expandedChildId, setExpandedChildId] = useState<string | null>(null);

  // Selected child for quick management modal
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [activeManageTab, setActiveManageTab] = useState<'meal' | 'activity' | 'hygiene' | 'milestone' | 'attendance' | 'announcement'>('meal');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Group activity modal
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupActivityForm, setGroupActivityForm] = useState({
    title: 'Taller de Expresión y Motricidad',
    category: 'activity' as ActivityCategory,
    description: 'Dinámica grupal de exploración sensorial, ronda de canciones y juego cooperativo en sala.',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isImportant: false
  });

  // Card view modals
  const [viewActivityDetail, setViewActivityDetail] = useState<Activity | null>(null);
  const [viewAnnouncementDetail, setViewAnnouncementDetail] = useState<Announcement | null>(null);

  // Form states for the modal
  const [activityForm, setActivityForm] = useState({
    title: '',
    category: 'meal' as ActivityCategory,
    description: '',
    isImportant: false,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  const [milestoneForm, setMilestoneForm] = useState({
    area: 'cognitive' as DevelopmentArea,
    title: '',
    observation: '',
    strengths: '',
    recommendations: '',
    period: 'Trimestre Actual'
  });

  const [attendanceForm, setAttendanceForm] = useState({
    status: 'present' as AttendanceStatus,
    checkInTime: '08:30',
    checkOutTime: '',
    notes: ''
  });

  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    importance: 'normal' as ImportanceLevel
  });

  // Synchronize in Realtime with centralized dataService and Firestore
  useEffect(() => {
    // Initial fetch from dataService
    setRoomsList(dataService.getRooms());
    setChildrenList(dataService.getChildren());
    setAttendanceList(dataService.getAttendance());
    setActivitiesList(dataService.getActivities());
    setReportsList(dataService.getProgressReports());
    setAnnouncementsList(dataService.getAnnouncements());

    const unsub1 = dataService.subscribe('activities', () => {
      setActivitiesList(dataService.getActivities());
    });
    const unsub2 = dataService.subscribe('attendance', () => {
      setAttendanceList(dataService.getAttendance());
    });
    const unsub3 = dataService.subscribe('announcements', () => {
      setAnnouncementsList(dataService.getAnnouncements());
    });
    const unsub4 = dataService.subscribe('reports', () => {
      setReportsList(dataService.getProgressReports());
    });
    const unsub5 = dataService.subscribe('children', () => {
      setChildrenList(dataService.getChildren());
    });
    const unsub6 = dataService.subscribe('rooms', () => {
      setRoomsList(dataService.getRooms());
    });

    dataService.syncFromFirestore();

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
    };
  }, []);

  // Update selected room if assigned list changes
  useEffect(() => {
    if (myRooms.length > 0 && !myRooms.some(r => r.id === selectedRoomId)) {
      setSelectedRoomId(myRooms[0].id);
    }
  }, [myRooms, selectedRoomId]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [selectedRoomId]);

  // Active room data
  const activeRoom = myRooms.find(r => r.id === selectedRoomId) || myRooms[0] || {
    id: selectedRoomId,
    name: 'Sala Asignada',
    ageRange: '45 días a 3 años',
    capacity: 10,
    color: '#52796F',
    assignedTeacherIds: assignedRoomIds,
    status: 'active' as const
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Filter children for active room
  const roomChildren = childrenList.filter(c => c.roomId === activeRoom.id);
  const roomAttendance = attendanceList.filter(a => a.roomId === activeRoom.id && a.date === todayStr);
  const roomActivities = activitiesList.filter(a => a.roomId === activeRoom.id);

  // Counts
  const presentCount = roomAttendance.filter(a => a.status === 'present').length;
  const absentCount = roomAttendance.filter(a => a.status === 'absent').length;
  const justifiedCount = roomAttendance.filter(a => a.status === 'justified').length;
  const unregisteredCount = Math.max(0, roomChildren.length - roomAttendance.length);

  // Filtered children list
  const filteredChildren = roomChildren.filter(child => {
    const matchesSearch = `${child.firstName} ${child.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    const childAtt = attendanceList.find(a => a.childId === child.id && a.date === todayStr);

    if (filterStatus === 'present') return childAtt?.status === 'present';
    if (filterStatus === 'absent') return childAtt?.status === 'absent';
    if (filterStatus === 'unregistered') return !childAtt;
    if (filterStatus === 'allergies') return !!child.allergies && child.allergies !== 'Ninguna' && child.allergies !== 'Ninguna conocida';

    return true;
  });

  // FAST 1-CLICK ATTENDANCE (Instantly saves in local state + Firestore)
  const handleQuickAttendance = async (child: Child, status: AttendanceStatus) => {
    const teacherId = userProfile?.id || 'teacher-carla';
    const teacherName = userProfile?.displayName || 'Docente Titular';
    const recId = `att-${child.id}-${todayStr}`;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const existing = attendanceList.find(a => a.childId === child.id && a.date === todayStr);

    const newRecord: AttendanceRecord = {
      id: existing?.id || recId,
      childId: child.id,
      childName: `${child.firstName} ${child.lastName}`,
      roomId: child.roomId,
      date: todayStr,
      status: status,
      checkInTime: status === 'present' ? (existing?.checkInTime || nowTime) : undefined,
      checkOutTime: existing?.checkOutTime,
      notes: existing?.notes || (status === 'absent' ? 'Inasistencia asentada por la docente' : status === 'justified' ? 'Inasistencia justificada por familia' : 'Ingreso registrado en sala'),
      recordedByUserId: teacherId,
      recordedByName: teacherName,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dataService.saveAttendance(newRecord);
    setAttendanceList(dataService.getAttendance());

    const statusLabel = status === 'present' 
      ? `Presente (${nowTime} hs)` 
      : status === 'absent' 
      ? 'Ausente en sala' 
      : 'Inasistencia justificada';

    if (status === 'present') {
      toast.success(`Asistencia: ${child.firstName} ${child.lastName}`, `Marcado/a como ${statusLabel}`);
    } else if (status === 'absent') {
      toast.error(`Asistencia: ${child.firstName} ${child.lastName}`, `Marcado/a como ${statusLabel}`);
    } else {
      toast.warning(`Asistencia: ${child.firstName} ${child.lastName}`, `Marcado/a como ${statusLabel}`);
    }
  };

  // 1-CLICK BULK ATTENDANCE: Mark all children in room present
  const handleMarkAllPresent = async () => {
    const teacherId = userProfile?.id || 'teacher-carla';
    const teacherName = userProfile?.displayName || 'Docente Titular';
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newRecords: AttendanceRecord[] = [];

    for (const child of roomChildren) {
      const existing = attendanceList.find(a => a.childId === child.id && a.date === todayStr);
      if (existing?.status === 'present') continue; // already marked

      const recId = existing?.id || `att-${child.id}-${todayStr}`;
      const rec: AttendanceRecord = {
        id: recId,
        childId: child.id,
        childName: `${child.firstName} ${child.lastName}`,
        roomId: child.roomId,
        date: todayStr,
        status: 'present',
        checkInTime: existing?.checkInTime || nowTime,
        checkOutTime: existing?.checkOutTime,
        notes: existing?.notes || 'Ingreso asentado en jornada matutina de sala',
        recordedByUserId: teacherId,
        recordedByName: teacherName,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      newRecords.push(rec);
      await dataService.saveAttendance(rec);
    }

    if (newRecords.length > 0) {
      setAttendanceList(dataService.getAttendance());
      toast.success(
        'Asistencia general completada',
        `Se marcó Presente a todos los alumnos de ${activeRoom.name}`
      );
      setFeedbackMessage(`Se marcó presente a todos los alumnos de ${activeRoom.name}`);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1400);
    } else {
      toast.info('Asistencia al día', `Todos los alumnos de ${activeRoom.name} ya estaban marcados como Presentes`);
    }
  };

  // Direct Form Launchers with easy presets
  const handleOpenAttendanceDetail = (child: Child) => {
    setSelectedChild(child);
    setActiveManageTab('attendance');
    const existingAtt = attendanceList.find(a => a.childId === child.id && a.date === todayStr);

    if (existingAtt) {
      setEditingRecordId(existingAtt.id);
      setAttendanceForm({
        status: existingAtt.status,
        checkInTime: existingAtt.checkInTime || '08:30',
        checkOutTime: existingAtt.checkOutTime || '',
        notes: existingAtt.notes || ''
      });
    } else {
      setEditingRecordId(null);
      setAttendanceForm({
        status: 'present',
        checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        checkOutTime: '',
        notes: ''
      });
    }
    setIsManageModalOpen(true);
  };

  const handleOpenRoutine = (child: Child, tab: 'meal' | 'activity' | 'hygiene', existingAct?: Activity) => {
    setSelectedChild(child);
    setActiveManageTab(tab);

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (existingAct) {
      setEditingRecordId(existingAct.id);
      setActivityForm({
        title: existingAct.title,
        category: existingAct.category,
        description: existingAct.description,
        isImportant: !!existingAct.isImportant,
        time: existingAct.time || nowTime
      });
    } else {
      setEditingRecordId(null);
      let defaultTitle = '';
      let defaultDesc = '';
      let category: ActivityCategory = 'activity';

      if (tab === 'meal') {
        category = 'meal';
        defaultTitle = 'Colación de Frutas Saludables';
        defaultDesc = 'Comió con excelente apetito e hidratación adecuada durante la colación matutina.';
      } else if (tab === 'hygiene') {
        category = 'hygiene';
        defaultTitle = 'Higiene y Cambio de Pañal';
        defaultDesc = 'Muda completa con aplicación de crema protectora. Piel sana y limpia.';
      } else {
        category = 'activity';
        defaultTitle = 'Taller de Expresión y Motricidad';
        defaultDesc = 'Participó activamente en la dinámica pedagógica con gran entusiasmo y juego compartido.';
      }

      setActivityForm({
        title: defaultTitle,
        category: category,
        description: defaultDesc,
        isImportant: false,
        time: nowTime
      });
    }
    setIsManageModalOpen(true);
  };

  const handleOpenMilestone = (child: Child, existingReport?: ProgressReport) => {
    setSelectedChild(child);
    setActiveManageTab('milestone');

    if (existingReport) {
      setEditingRecordId(existingReport.id);
      setMilestoneForm({
        area: existingReport.area,
        title: existingReport.title,
        observation: existingReport.observation,
        strengths: existingReport.strengths || '',
        recommendations: existingReport.recommendations || '',
        period: existingReport.period
      });
    } else {
      setEditingRecordId(null);
      setMilestoneForm({
        area: 'cognitive',
        title: '',
        observation: '',
        strengths: '',
        recommendations: '',
        period: 'Trimestre Actual'
      });
    }
    setIsManageModalOpen(true);
  };

  // Form Submissions
  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild || !activityForm.title || !activityForm.description) return;

    const teacherId = userProfile?.id || 'teacher-carla';
    const teacherName = userProfile?.displayName || 'Docente Titular';
    const recId = editingRecordId || `act-${Date.now()}`;

    const newRecord: Activity = {
      id: recId,
      title: activityForm.title,
      description: activityForm.description,
      category: activityForm.category,
      date: todayStr,
      time: activityForm.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      roomId: selectedChild.roomId,
      roomName: selectedChild.roomName || activeRoom?.name,
      childIds: [selectedChild.id],
      isImportant: !!activityForm.isImportant,
      authorUserId: teacherId,
      authorName: teacherName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dataService.saveActivity(newRecord);
    setActivitiesList(dataService.getActivities());

    // Disparar alerta push instantánea a familias vía Service Worker
    pushNotificationService.notifyNewActivity(
      newRecord,
      `${selectedChild.firstName} ${selectedChild.lastName}`,
      activeRoom?.name
    ).catch(() => {});

    toast.success(
      editingRecordId ? 'Registro actualizado' : 'Registro guardado',
      `Se guardó "${activityForm.title}" para ${selectedChild.firstName}`
    );
    setFeedbackMessage(editingRecordId ? `Registro actualizado para ${selectedChild.firstName}` : `Registro cargado para ${selectedChild.firstName}`);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsManageModalOpen(false);
      setEditingRecordId(null);
    }, 1000);
  };

  const handleSaveGroupActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupActivityForm.title || !groupActivityForm.description) return;

    const teacherId = userProfile?.id || 'teacher-carla';
    const teacherName = userProfile?.displayName || 'Docente Titular';
    const recId = `act-group-${Date.now()}`;

    const newRecord: Activity = {
      id: recId,
      title: groupActivityForm.title,
      description: groupActivityForm.description,
      category: groupActivityForm.category,
      date: todayStr,
      time: groupActivityForm.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      roomId: activeRoom.id,
      roomName: activeRoom.name,
      childIds: roomChildren.map(c => c.id),
      isImportant: !!groupActivityForm.isImportant,
      authorUserId: teacherId,
      authorName: teacherName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dataService.saveActivity(newRecord);
    setActivitiesList(dataService.getActivities());

    // Disparar alerta push instantánea a familias de la sala vía Service Worker
    pushNotificationService.notifyNewActivity(
      newRecord,
      undefined,
      activeRoom.name
    ).catch(() => {});

    toast.success(
      'Actividad grupal guardada',
      `"${groupActivityForm.title}" asignada a los ${roomChildren.length} alumnos de ${activeRoom.name}`
    );
    setIsGroupModalOpen(false);
    setFeedbackMessage(`Actividad grupal guardada para los ${roomChildren.length} alumnos`);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 1200);
  };

  const handleSaveMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild || !milestoneForm.title || !milestoneForm.observation) return;

    const teacherId = userProfile?.id || 'teacher-carla';
    const teacherName = userProfile?.displayName || 'Docente Titular';
    const recId = editingRecordId || `rep-${Date.now()}`;

    const newRecord: ProgressReport = {
      id: recId,
      childId: selectedChild.id,
      childName: `${selectedChild.firstName} ${selectedChild.lastName}`,
      roomId: selectedChild.roomId,
      period: milestoneForm.period,
      area: milestoneForm.area,
      title: milestoneForm.title,
      observation: milestoneForm.observation,
      strengths: milestoneForm.strengths,
      recommendations: milestoneForm.recommendations,
      authorUserId: teacherId,
      authorName: teacherName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dataService.saveProgressReport(newRecord);
    setReportsList(dataService.getProgressReports());

    toast.success(
      editingRecordId ? 'Avance pedagógico actualizado' : 'Avance pedagógico guardado',
      `"${milestoneForm.title}" para ${selectedChild.firstName} ${selectedChild.lastName}`
    );
    setFeedbackMessage(editingRecordId ? `Avance actualizado para ${selectedChild.firstName}` : `Avance pedagógico registrado para ${selectedChild.firstName}`);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsManageModalOpen(false);
      setEditingRecordId(null);
    }, 1000);
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild) return;

    const teacherId = userProfile?.id || 'teacher-carla';
    const teacherName = userProfile?.displayName || 'Docente Titular';
    const recId = editingRecordId || `att-${selectedChild.id}-${todayStr}`;

    const newRecord: AttendanceRecord = {
      id: recId,
      childId: selectedChild.id,
      childName: `${selectedChild.firstName} ${selectedChild.lastName}`,
      roomId: selectedChild.roomId,
      date: todayStr,
      status: attendanceForm.status,
      checkInTime: attendanceForm.status === 'present' ? attendanceForm.checkInTime : undefined,
      checkOutTime: attendanceForm.checkOutTime || undefined,
      notes: attendanceForm.notes,
      recordedByUserId: teacherId,
      recordedByName: teacherName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dataService.saveAttendance(newRecord);
    setAttendanceList(dataService.getAttendance());

    // Disparar alerta push instantánea de asistencia vía Service Worker
    const statusLabel = newRecord.status === 'present' 
      ? 'Presente en sala' 
      : newRecord.status === 'absent' 
      ? 'Ausente en jornada' 
      : 'Inasistencia justificada';
    pushNotificationService.notifyAttendance(
      newRecord.childName,
      statusLabel,
      newRecord.checkInTime
    ).catch(() => {});

    toast.success(
      'Asistencia y notas guardadas',
      `${selectedChild.firstName}: ${attendanceForm.status === 'present' ? 'Presente' : attendanceForm.status === 'absent' ? 'Ausente' : 'Justificado'}`
    );
    setFeedbackMessage(`Asistencia de ${selectedChild.firstName} guardada`);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsManageModalOpen(false);
      setEditingRecordId(null);
    }, 1000);
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementForm.title || !announcementForm.content) return;

    const teacherId = userProfile?.id || 'teacher-carla';
    const teacherName = userProfile?.displayName || 'Docente Titular';
    const recId = `ann-${Date.now()}`;

    const newRecord: Announcement = {
      id: recId,
      title: announcementForm.title,
      content: announcementForm.content,
      importance: announcementForm.importance,
      publishDate: todayStr,
      authorUserId: teacherId,
      authorName: teacherName,
      targetAudience: 'parents',
      roomId: activeRoom.id,
      roomName: activeRoom.name,
      createdAt: new Date().toISOString()
    };

    await dataService.saveAnnouncement(newRecord);
    setAnnouncementsList(dataService.getAnnouncements());

    toast.info(
      'Aviso publicado a familias',
      `"${announcementForm.title}" visible para ${activeRoom.name}`
    );
    setFeedbackMessage(`Aviso publicado para las familias de ${activeRoom.name}`);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsManageModalOpen(false);
      setAnnouncementForm({ title: '', content: '', importance: 'normal' });
    }, 1000);
  };

  return (
    <div className="space-y-5 sm:space-y-6 max-w-7xl mx-auto pb-8">
      {/* 1. SIMPLE & WELCOMING TEACHER BANNER */}
      <div className="bg-[#1B4332] text-white p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#2D6A4F]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-black text-2xl text-white shadow-xs shrink-0">
            {userProfile?.displayName ? userProfile.displayName.charAt(0) : 'D'}
          </div>
          <div>
            <div className="inline-flex flex-wrap items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 text-[#D8E4DA] text-xs md:text-sm font-semibold backdrop-blur-xs mb-1">
              <GraduationCap className="w-3.5 h-3.5 text-[#A3B18A]" />
              <span>Docente a Cargo • {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              ¡Hola, {userProfile?.displayName || 'Profa. Carla Méndez'}!
            </h2>
            <p className="text-xs text-white/80 mt-0.5">
              Panel simplificado de control de asistencia, alimentación, mudas y actividades pedagógicas.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleMarkAllPresent}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#52796F] hover:bg-[#405F57] text-white text-xs font-bold transition-all shadow-xs active:scale-98 cursor-pointer"
            title="Marcar a todos los alumnos de la sala como presentes con un solo clic"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Marcar Todos Presentes</span>
          </button>

          <button
            onClick={() => setIsGroupModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all border border-white/20 active:scale-98 cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>+ Actividad Grupal</span>
          </button>

          <Link
            to="/asistencia"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-[#1B4332] text-xs font-bold hover:bg-[#FAF9F5] transition-all shadow-xs active:scale-98"
          >
            <CalendarCheck2 className="w-4 h-4 text-[#52796F]" />
            <span>Planilla</span>
          </Link>
        </div>
      </div>

      {/* 2. ROOM SWITCHER TABS & ROOM ACTION */}
      <div className="bg-white p-3 sm:p-4 rounded-3xl border border-[#E9ECEF] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 w-full md:w-auto">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 hidden sm:flex items-center gap-1.5 pl-1">
            <DoorClosed className="w-3.5 h-3.5 text-[#52796F]" />
            <span>Salas:</span>
          </span>
          <div className="inline-flex items-center gap-1.5 p-1 bg-[#FAF9F5] rounded-2xl border border-gray-200/80 shrink-0 w-full sm:w-auto overflow-x-auto no-scrollbar">
            {myRooms.map(room => {
              const count = childrenList.filter(c => c.roomId === room.id).length;
              const isSelected = selectedRoomId === room.id;
              return (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center justify-center gap-2 active:scale-95 ${
                    isSelected
                      ? 'bg-[#1B4332] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
                  }`}
                >
                  <span>{room.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => {
            setSelectedChild(roomChildren[0] || null);
            setActiveManageTab('announcement');
            setIsManageModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold shadow-2xs active:scale-98 cursor-pointer shrink-0 self-stretch sm:self-auto"
        >
          <Bell className="w-3.5 h-3.5 text-amber-700" />
          <span>+ Nuevo Aviso a Familias</span>
        </button>
      </div>

      {/* 3. COMPACT OVERVIEW STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E9ECEF] shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase">Matrícula</span>
            <Baby className="w-4 h-4 text-[#52796F]" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#1B4332]">
            {roomChildren.length} <span className="text-xs text-gray-400 font-normal">alumnos</span>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-emerald-100 bg-emerald-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-[11px] font-bold uppercase">Presentes</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700">
            {presentCount} <span className="text-xs text-gray-400 font-normal">({roomChildren.length > 0 ? Math.round((presentCount / roomChildren.length) * 100) : 0}%)</span>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E9ECEF] shadow-2xs">
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-[11px] font-bold uppercase">Ausentes</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-700">
            {absentCount + justifiedCount}
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E9ECEF] shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-bold uppercase">Bitácora Hoy</span>
            <BookOpen className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#1B4332]">
            {roomActivities.filter(a => a.date === todayStr).length} <span className="text-xs text-gray-400 font-normal">cargadas</span>
          </div>
        </div>
      </div>

      {/* 4. MAIN ROSTER: CHILDREN CARDS WITH FAST 1-CLICK ATTENDANCE & SHORTCUTS */}
      <div className="bg-white rounded-3xl border border-[#E9ECEF] p-4 sm:p-6 shadow-2xs space-y-4">
        {/* Title and Fast Search / Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#52796F]" />
              <h3 className="font-extrabold text-[#1B4332] text-base sm:text-lg">
                Alumnos en {activeRoom.name} ({filteredChildren.length})
              </h3>
            </div>
            <p className="text-xs text-gray-500">
              Marcá asistencia con 1 clic y cargá alimentación, higiene o actividades de forma rápida.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar niño..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs bg-[#FAF9F5]/60 focus:bg-white focus:ring-2 focus:ring-[#52796F] transition-all"
              />
            </div>

            {/* Filter Pills */}
            <div className="inline-flex flex-wrap gap-2 text-xs md:text-sm p-1.5 bg-[#FAF9F5] rounded-2xl border border-gray-200/80 font-semibold">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`inline-flex flex-wrap items-center justify-center gap-2 px-3.5 py-1.5 rounded-full text-xs md:text-sm transition-all cursor-pointer text-center active:scale-95 ${
                  filterStatus === 'all'
                    ? 'bg-[#1B4332] text-white shadow-xs font-bold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <span>Todos</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs font-black ${
                  filterStatus === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {roomChildren.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatus('present')}
                className={`inline-flex flex-wrap items-center justify-center gap-2 px-3.5 py-1.5 rounded-full text-xs md:text-sm transition-all cursor-pointer text-center active:scale-95 ${
                  filterStatus === 'present'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-gray-600 hover:text-emerald-800 hover:bg-emerald-50/50'
                }`}
              >
                <span>Presentes</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs font-black ${
                  filterStatus === 'present' ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {presentCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatus('unregistered')}
                className={`inline-flex flex-wrap items-center justify-center gap-2 px-3.5 py-1.5 rounded-full text-xs md:text-sm transition-all cursor-pointer text-center active:scale-95 ${
                  filterStatus === 'unregistered'
                    ? 'bg-gray-800 text-white shadow-xs font-bold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <span>Sin Registrar</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs font-black ${
                  filterStatus === 'unregistered' ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {unregisteredCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatus('allergies')}
                className={`inline-flex flex-wrap items-center justify-center gap-2 px-3.5 py-1.5 rounded-full text-xs md:text-sm transition-all cursor-pointer text-center active:scale-95 ${
                  filterStatus === 'allergies'
                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                    : 'text-gray-600 hover:text-amber-900 hover:bg-amber-50/50'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <span>Alergias</span>
              </button>
            </div>
          </div>
        </div>

        {/* Children Grid */}
        {filteredChildren.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500 bg-[#FAF9F5] rounded-2xl border border-gray-100">
            No se encontraron alumnos con los filtros seleccionados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredChildren.map(child => {
              const childAtt = attendanceList.find(a => a.childId === child.id && a.date === todayStr);
              const childActivitiesToday = activitiesList.filter(a => a.childIds?.includes(child.id) && a.date === todayStr);
              const isExpanded = expandedChildId === child.id;

              return (
                <div
                  key={child.id}
                  className="p-4 sm:p-5 rounded-2xl bg-[#FAF9F5] border border-[#F0ECE1] hover:border-[#52796F] transition-all shadow-2xs space-y-3"
                >
                  {/* Child Header: Name, Avatar, Age */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-[#EBF3ED] text-[#245436] flex items-center justify-center font-black text-base border border-[#D1E4D7] shrink-0">
                        {child.firstName[0]}{child.lastName[0]}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-[#1B4332] text-sm sm:text-base leading-tight truncate">
                          {child.firstName} {child.lastName}
                        </h4>
                        <span className="text-[11px] text-gray-500 block truncate">
                          Nacimiento: {child.birthDate} • Sala {child.roomName || activeRoom.name}
                        </span>
                      </div>
                    </div>

                    <Link
                      to={`/perfil-nino/${child.id}`}
                      className="inline-flex items-center gap-1 py-1 px-2.5 rounded-xl bg-white hover:bg-gray-100 text-[11px] font-semibold text-gray-600 border border-gray-200 transition-colors shrink-0 shadow-2xs"
                      title="Ver expediente y contactos familiares"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#52796F]" />
                      <span>Expediente</span>
                    </Link>
                  </div>

                  {/* Allergy Alert if declared */}
                  {child.allergies && child.allergies !== 'Ninguna' && child.allergies !== 'Ninguna conocida' && (
                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate"><strong>Atención:</strong> {child.allergies}</span>
                    </div>
                  )}

                  {/* 1-CLICK ATTENDANCE SEGMENTED PILLS */}
                  <div className="p-2.5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          childAtt?.status === 'present' ? 'bg-emerald-500' :
                          childAtt?.status === 'absent' ? 'bg-rose-500' :
                          childAtt?.status === 'justified' ? 'bg-amber-500' :
                          'bg-gray-300'
                        }`} />
                        <span className="text-gray-600 font-semibold">
                          {childAtt?.status === 'present' ? `Presente (${childAtt.checkInTime || '08:30'} hs)` :
                           childAtt?.status === 'absent' ? 'Ausente hoy' :
                           childAtt?.status === 'justified' ? 'Justificado' :
                           'Sin registrar hoy'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenAttendanceDetail(child)}
                        className="text-[#52796F] hover:text-[#1B4332] flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                        title="Modificar horario exacto o nota"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Detalle</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-1 p-1 bg-[#FAF9F5] rounded-xl border border-gray-200/60">
                      <button
                        type="button"
                        onClick={() => handleQuickAttendance(child, 'present')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                          childAtt?.status === 'present'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-gray-500 hover:text-emerald-800 hover:bg-emerald-50/60'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Presente</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickAttendance(child, 'absent')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                          childAtt?.status === 'absent'
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'text-gray-500 hover:text-rose-800 hover:bg-rose-50/60'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Ausente</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickAttendance(child, 'justified')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                          childAtt?.status === 'justified'
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'text-gray-500 hover:text-amber-800 hover:bg-amber-50/60'
                        }`}
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Justif.</span>
                      </button>
                    </div>
                  </div>

                  {/* QUICK LOGGING ACTION PILLS */}
                  <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleOpenRoutine(child, 'meal')}
                      className="inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100/90 text-amber-900 border border-amber-200/80 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                      title="Registrar alimentación, colación o almuerzo"
                    >
                      <Utensils className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>Comida</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenRoutine(child, 'activity')}
                      className="inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-sky-50 hover:bg-sky-100/90 text-sky-900 border border-sky-200/80 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                      title="Cargar actividad pedagógica, juego o motricidad"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                      <span>Actividad</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenRoutine(child, 'hygiene')}
                      className="inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100/90 text-emerald-900 border border-emerald-200/80 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                      title="Registrar higiene, cambio de pañal o control de esfínteres"
                    >
                      <Droplets className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>Higiene</span>
                    </button>
                  </div>

                  {/* Secondary shortcuts: Progress Milestone & History */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 text-xs">
                    <button
                      type="button"
                      onClick={() => handleOpenMilestone(child)}
                      className="inline-flex items-center gap-1 font-bold text-[#52796F] hover:underline cursor-pointer"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>+ Avance Pedagógico</span>
                    </button>

                    {childActivitiesToday.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setExpandedChildId(isExpanded ? null : child.id)}
                        className="inline-flex items-center gap-1 font-semibold text-gray-500 hover:text-gray-800 cursor-pointer text-[11px]"
                      >
                        <History className="w-3 h-3 text-[#52796F]" />
                        <span>{childActivitiesToday.length} registros hoy</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    ) : (
                      <span className="text-[11px] text-gray-400">Sin bitácora hoy</span>
                    )}
                  </div>

                  {/* Expanded Accordion with today's activities and edit buttons */}
                  {isExpanded && childActivitiesToday.length > 0 && (
                    <div className="pt-2 space-y-2 border-t border-gray-200">
                      <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        Historial de hoy ({child.firstName}):
                      </div>
                      {childActivitiesToday.map(act => (
                        <div
                          key={act.id}
                          className="p-2.5 rounded-xl bg-white border border-gray-200 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[#1B4332] truncate">{act.title}</span>
                              <Badge variant={act.category === 'meal' ? 'amber' : act.category === 'hygiene' ? 'green' : 'blue'} size="sm">
                                {act.category === 'meal' ? 'Alimentación' : act.category === 'hygiene' ? 'Higiene' : 'Actividad'}
                              </Badge>
                              {act.isImportant && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                                  <AlertCircle className="w-2.5 h-2.5 text-amber-700" />
                                  <span>Importante</span>
                                </span>
                              )}
                            </div>
                            <p className="text-gray-500 text-[11px] line-clamp-1">{act.description}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenRoutine(child, act.category === 'meal' ? 'meal' : act.category === 'hygiene' ? 'hygiene' : 'activity', act)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-[#52796F] hover:text-white text-gray-700 text-[11px] font-bold transition-colors cursor-pointer shrink-0"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Editar</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. RECENT ROOM ACTIVITIES & ANNOUNCEMENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Room Activities Feed */}
        <div className="bg-white rounded-3xl border border-[#E9ECEF] p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#52796F]" />
              <h3 className="font-bold text-[#1B4332] text-base">
                Bitácora de {activeRoom.name}
              </h3>
            </div>
            <Link to="/actividades" className="text-xs font-bold text-[#52796F] hover:underline">
              Ver todas &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {roomActivities.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No hay actividades registradas aún en esta sala.</p>
            ) : (
              roomActivities.slice(0, 4).map(act => (
                <div 
                  key={act.id} 
                  onClick={() => setViewActivityDetail(act)}
                  className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#F0ECE1] hover:border-[#52796F]/50 hover:bg-[#F5F2EB] transition-all flex items-center justify-between text-xs cursor-pointer group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1B4332] truncate group-hover:text-[#52796F] transition-colors">{act.title}</span>
                      <Badge variant={act.category === 'meal' ? 'amber' : act.category === 'hygiene' ? 'green' : 'blue'} size="sm">
                        {act.category === 'meal' ? 'Alimentación' : act.category === 'hygiene' ? 'Higiene' : 'Actividad'}
                      </Badge>
                      {act.isImportant && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                          <AlertCircle className="w-2.5 h-2.5 text-amber-700" />
                          <span>Importante</span>
                        </span>
                      )}
                    </div>
                    <span className="text-gray-500 text-[11px] line-clamp-1 mt-0.5">{act.description}</span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">Por: {act.authorName}</span>
                  </div>
                  <span className="text-[11px] font-mono text-gray-400 shrink-0 font-semibold">{act.time || '10:00'} hs</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Announcements for Room */}
        <div className="bg-white rounded-3xl border border-[#E9ECEF] p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#52796F]" />
              <h3 className="font-bold text-[#1B4332] text-base">
                Avisos y Comunicados a Familias
              </h3>
            </div>
            <button
              onClick={() => {
                setSelectedChild(roomChildren[0] || null);
                setActiveManageTab('announcement');
                setIsManageModalOpen(true);
              }}
              className="text-xs font-bold text-[#52796F] hover:underline cursor-pointer"
            >
              + Nuevo aviso
            </button>
          </div>

          <div className="space-y-3">
            {announcementsList.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No hay comunicados publicados.</p>
            ) : (
              announcementsList.slice(0, 4).map(ann => (
                <div 
                  key={ann.id} 
                  onClick={() => setViewAnnouncementDetail(ann)}
                  className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#F0ECE1] hover:border-[#52796F]/50 hover:bg-[#F5F2EB] transition-all text-xs space-y-1 cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[#1B4332] truncate group-hover:text-[#52796F] transition-colors">{ann.title}</span>
                    <Badge variant={ann.importance === 'urgent' ? 'red' : ann.importance === 'important' ? 'amber' : 'green'} size="sm">
                      {ann.importance}
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-[11px] line-clamp-2">{ann.content}</p>
                  <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-200/50">
                    <span>Autor: {ann.authorName}</span>
                    <span>{ann.publishDate}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 6. INTERACTIVE SCHOOL CALENDAR (EVENTS, HOLIDAYS & PARENT MEETINGS) */}
      <div className="pt-2">
        <SchoolCalendar defaultRoomFilter={activeRoom.id} />
      </div>

      {/* 7. INDIVIDUAL CHILD RECORD MODAL (WITH QUICK PRESET CHIPS, NO SIESTAS) */}
      <Modal
        isOpen={isManageModalOpen}
        onClose={() => {
          setIsManageModalOpen(false);
          setEditingRecordId(null);
        }}
        title={
          selectedChild 
            ? `${editingRecordId ? 'Modificar Registro' : 'Cargar Registro'}: ${selectedChild.firstName} ${selectedChild.lastName}` 
            : 'Gestión Docente'
        }
        subtitle={`Sala: ${selectedChild?.roomName || activeRoom.name} • Docente: ${userProfile?.displayName || 'Profa. Carla Méndez'}`}
        maxWidth="lg"
      >
        {saveSuccess ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-3xl bg-[#EBF3ED] text-[#245436] flex items-center justify-center mx-auto mb-3 border border-[#D1E4D7] shadow-xs">
              <Check className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-[#1B4332]">
              {feedbackMessage || 'Registro guardado exitosamente'}
            </h4>
            <p className="text-xs text-gray-400 mt-1">
              Actualizado inmediatamente en la base de datos institucional.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Modal Navigation Tabs (NO SIESTAS!) */}
            <div className="flex items-center gap-1.5 p-1 bg-[#FAF9F5] rounded-2xl border border-[#EBE7DF] overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => {
                  setActiveManageTab('meal');
                  setActivityForm(prev => ({
                    ...prev,
                    category: 'meal',
                    title: prev.title || 'Colación de Frutas Saludables'
                  }));
                }}
                className={`flex-1 min-w-[72px] sm:min-w-0 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-95 ${
                  activeManageTab === 'meal'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <Utensils className="w-3.5 h-3.5 shrink-0" />
                <span>Comida</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveManageTab('activity');
                  setActivityForm(prev => ({
                    ...prev,
                    category: 'activity',
                    title: prev.title || 'Actividad Pedagógica y Juego'
                  }));
                }}
                className={`flex-1 min-w-[72px] sm:min-w-0 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-95 ${
                  activeManageTab === 'activity'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>Actividad</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveManageTab('hygiene');
                  setActivityForm(prev => ({
                    ...prev,
                    category: 'hygiene',
                    title: prev.title || 'Higiene y Cambio de Pañal'
                  }));
                }}
                className={`flex-1 min-w-[72px] sm:min-w-0 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-95 ${
                  activeManageTab === 'hygiene'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <Droplets className="w-3.5 h-3.5 shrink-0" />
                <span>Higiene</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveManageTab('milestone')}
                className={`flex-1 min-w-[72px] sm:min-w-0 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-95 ${
                  activeManageTab === 'milestone'
                    ? 'bg-[#52796F] text-white shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                <span>Avance</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveManageTab('attendance')}
                className={`flex-1 min-w-[72px] sm:min-w-0 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-95 ${
                  activeManageTab === 'attendance'
                    ? 'bg-[#1B4332] text-white shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <CalendarCheck2 className="w-3.5 h-3.5 shrink-0" />
                <span>Asistencia</span>
              </button>
            </div>

            {/* FORM 1, 2, 3: ROUTINES (MEAL, ACTIVITY, HYGIENE) */}
            {(activeManageTab === 'meal' || activeManageTab === 'activity' || activeManageTab === 'hygiene') && (
              <form onSubmit={handleSaveActivity} className="space-y-3.5">
                {/* 1-Click Fast Presets */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Opciones Rápidas (Hacé clic para autocompletar):
                  </label>
                  <div className="inline-flex flex-wrap gap-2 text-xs md:text-sm">
                    {activeManageTab === 'meal' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActivityForm(prev => ({
                            ...prev,
                            title: 'Colación de Frutas Frescas',
                            description: 'Comió toda la porción de manzana y banana con excelente apetito e hidratación.'
                          }))}
                          className="inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100/90 text-amber-900 border border-amber-200/80 text-xs md:text-sm font-semibold cursor-pointer shadow-2xs active:scale-95 transition-all"
                        >
                          🍎 Colación de frutas (completa)
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivityForm(prev => ({
                            ...prev,
                            title: 'Almuerzo Nutritivo Supervisado',
                            description: 'Almuerzo completo con verduras y puré. Muy buena aceptación del menú.'
                          }))}
                          className="inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100/90 text-amber-900 border border-amber-200/80 text-xs md:text-sm font-semibold cursor-pointer shadow-2xs active:scale-95 transition-all"
                        >
                          🍲 Almuerzo balanceado
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivityForm(prev => ({
                            ...prev,
                            title: 'Merienda de la Tarde',
                            description: 'Merienda con yogur y cereales. Aceptó la mitad de la porción con agua.'
                          }))}
                          className="inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100/90 text-amber-900 border border-amber-200/80 text-xs md:text-sm font-semibold cursor-pointer shadow-2xs active:scale-95 transition-all"
                        >
                          🥛 Merienda con yogur
                        </button>
                      </>
                    )}

                    {activeManageTab === 'activity' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActivityForm(prev => ({
                            ...prev,
                            title: 'Taller de Pintura y Colores',
                            description: 'Exploración dactilar con pinturas al agua no tóxicas. Disfrutó mucho la actividad.'
                          }))}
                          className="inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 hover:bg-sky-100/90 text-sky-900 border border-sky-200/80 text-xs md:text-sm font-semibold cursor-pointer shadow-2xs active:scale-95 transition-all"
                        >
                          🎨 Taller de Pintura
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivityForm(prev => ({
                            ...prev,
                            title: 'Juegos de Encastre y Motricidad',
                            description: 'Manipulación de bloques de encastre y coordinación óculo-manual.'
                          }))}
                          className="inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 hover:bg-sky-100/90 text-sky-900 border border-sky-200/80 text-xs md:text-sm font-semibold cursor-pointer shadow-2xs active:scale-95 transition-all"
                        >
                          🧩 Bloques de encastre
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivityForm(prev => ({
                            ...prev,
                            title: 'Ronda Musical y Canciones',
                            description: 'Participación en rondas con instrumentos musicales sencillos y baile.'
                          }))}
                          className="inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 hover:bg-sky-100/90 text-sky-900 border border-sky-200/80 text-xs md:text-sm font-semibold cursor-pointer shadow-2xs active:scale-95 transition-all"
                        >
                          🎵 Ronda Musical
                        </button>
                      </>
                    )}

                    {activeManageTab === 'hygiene' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActivityForm(prev => ({
                            ...prev,
                            title: 'Cambio de Pañal y Muda Limpia',
                            description: 'Muda completa sin rozaduras. Se aplicó crema protectora.'
                          }))}
                          className="inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100/90 text-emerald-900 border border-emerald-200/80 text-xs md:text-sm font-semibold cursor-pointer shadow-2xs active:scale-95 transition-all"
                        >
                          💧 Cambio de Pañal
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivityForm(prev => ({
                            ...prev,
                            title: 'Control de Esfínteres',
                            description: 'Uso exitoso del bacín/inodoro adaptado. Gran progreso en autonomía.'
                          }))}
                          className="inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100/90 text-emerald-900 border border-emerald-200/80 text-xs md:text-sm font-semibold cursor-pointer shadow-2xs active:scale-95 transition-all"
                        >
                          🚽 Control de Esfínteres
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivityForm(prev => ({
                            ...prev,
                            title: 'Higiene de Manos y Cara',
                            description: 'Lavado con agua y jabón antes de comer y tras el juego.'
                          }))}
                          className="inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100/90 text-emerald-900 border border-emerald-200/80 text-xs md:text-sm font-semibold cursor-pointer shadow-2xs active:scale-95 transition-all"
                        >
                          🧼 Higiene de Manos
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Título *
                    </label>
                    <input
                      type="text"
                      required
                      value={activityForm.title}
                      onChange={(e) => setActivityForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Ej: Colación de frutas"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Horario *
                    </label>
                    <input
                      type="time"
                      required
                      value={activityForm.time}
                      onChange={(e) => setActivityForm(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-[#52796F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Observación para la Familia *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={activityForm.description}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describa el comportamiento, apetito o logros observados..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                  />
                </div>

                {/* Checkbox Importante */}
                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs font-semibold text-amber-900">
                  <input
                    type="checkbox"
                    checked={!!activityForm.isImportant}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, isImportant: e.target.checked }))}
                    className="w-4 h-4 rounded text-[#1B4332] focus:ring-[#52796F]"
                  />
                  <span>Marcar como importante (destacar aviso para la familia)</span>
                </label>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-[11px] text-gray-500">
                  <span>Alumno: <strong>{selectedChild?.firstName} {selectedChild?.lastName}</strong></span>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs cursor-pointer active:scale-98"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar Registro</span>
                  </button>
                </div>
              </form>
            )}

            {/* FORM 4: AVANCES PEDAGÓGICOS */}
            {activeManageTab === 'milestone' && (
              <form onSubmit={handleSaveMilestone} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Área del Desarrollo *
                    </label>
                    <select
                      value={milestoneForm.area}
                      onChange={(e) => setMilestoneForm(prev => ({ ...prev, area: e.target.value as DevelopmentArea }))}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-[#52796F]"
                    >
                      <option value="cognitive">Exploración y Desarrollo Cognitivo</option>
                      <option value="language">Lenguaje y Comunicación</option>
                      <option value="motor">Desarrollo Motor Fino y Grueso</option>
                      <option value="social_emotional">Socioemocional y Vínculos con Pares</option>
                      <option value="autonomy">Hábitos y Autonomía</option>
                      <option value="behavior_habits">Pautas de Convivencia</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Período Evaluado
                    </label>
                    <input
                      type="text"
                      value={milestoneForm.period}
                      onChange={(e) => setMilestoneForm(prev => ({ ...prev, period: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-[#52796F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Logro o Conducta Observada *
                  </label>
                  <input
                    type="text"
                    required
                    value={milestoneForm.title}
                    onChange={(e) => setMilestoneForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="EJ: Primeros pasos firmes o Reconocimiento de colores primarios"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Observación Pedagógica *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={milestoneForm.observation}
                    onChange={(e) => setMilestoneForm(prev => ({ ...prev, observation: e.target.value }))}
                    placeholder="Describa el progreso del alumno de forma respetuosa y pedagógica..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-[11px] text-gray-400">
                  <span>Queda guardado en el expediente del alumno</span>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs cursor-pointer active:scale-98"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar Avance</span>
                  </button>
                </div>
              </form>
            )}

            {/* FORM 5: ASISTENCIA DETALLADA (HORARIOS Y NOTAS) */}
            {activeManageTab === 'attendance' && (
              <form onSubmit={handleSaveAttendance} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Estado de Asistencia *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAttendanceForm(prev => ({ ...prev, status: 'present' }))}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                        attendanceForm.status === 'present'
                          ? 'bg-[#EBF3ED] text-[#245436] border-[#52796F]'
                          : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Presente</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAttendanceForm(prev => ({ ...prev, status: 'absent' }))}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                        attendanceForm.status === 'absent'
                          ? 'bg-rose-50 text-rose-700 border-rose-300'
                          : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>Ausente</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAttendanceForm(prev => ({ ...prev, status: 'justified' }))}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                        attendanceForm.status === 'justified'
                          ? 'bg-amber-50 text-amber-700 border-amber-300'
                          : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      <HelpCircle className="w-4 h-4 text-amber-600" />
                      <span>Justificado</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Hora de Ingreso
                    </label>
                    <input
                      type="time"
                      value={attendanceForm.checkInTime}
                      onChange={(e) => setAttendanceForm(prev => ({ ...prev, checkInTime: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-[#52796F]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Hora de Salida / Retiro
                    </label>
                    <input
                      type="time"
                      value={attendanceForm.checkOutTime}
                      onChange={(e) => setAttendanceForm(prev => ({ ...prev, checkOutTime: e.target.value }))}
                      placeholder="16:30"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-[#52796F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Observaciones y Persona que Retira
                  </label>
                  <input
                    type="text"
                    value={attendanceForm.notes}
                    onChange={(e) => setAttendanceForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Ej: Retiró madre autorizada con DNI"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-[11px] text-gray-400">
                  <span>Actualiza la nómina de sala en tiempo real</span>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs cursor-pointer active:scale-98"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar Asistencia</span>
                  </button>
                </div>
              </form>
            )}

            {/* FORM 6: COMUNICADO A FAMILIAS */}
            {activeManageTab === 'announcement' && (
              <form onSubmit={handleSaveAnnouncement} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nivel de Importancia *
                  </label>
                  <select
                    value={announcementForm.importance}
                    onChange={(e) => setAnnouncementForm(prev => ({ ...prev, importance: e.target.value as ImportanceLevel }))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-[#52796F]"
                  >
                    <option value="normal">Informativo Habitual</option>
                    <option value="important">Importante (Reunión, muda extra)</option>
                    <option value="urgent">Urgente (Aviso de salud)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Título del Comunicado *
                  </label>
                  <input
                    type="text"
                    required
                    value={announcementForm.title}
                    onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ej: Traer botella de agua con nombre"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Mensaje para los Padres de {activeRoom.name} *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={announcementForm.content}
                    onChange={(e) => setAnnouncementForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Escriba el comunicado que recibirán las familias..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-[11px] text-gray-400">
                  <span>Visible inmediatamente en el portal de las familias</span>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs cursor-pointer active:scale-98"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Publicar Aviso</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>

      {/* 7. GROUP ACTIVITY MODAL (WHOLE ROOM IN 1 CLICK) */}
      <Modal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        title={`Actividad Grupal para ${activeRoom.name}`}
        subtitle={`Se registrará automáticamente en la bitácora de los ${roomChildren.length} alumnos de la sala`}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveGroupActivity} className="space-y-4">
          <div className="p-3 rounded-2xl bg-[#EBF3ED] text-[#245436] border border-[#D1E4D7] text-xs flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-[#52796F] shrink-0" />
            <span>Esta actividad quedará visible en la bitácora de todos los niños de la sala sin tener que cargarla uno por uno.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Título de la Actividad *
              </label>
              <input
                type="text"
                required
                value={groupActivityForm.title}
                onChange={(e) => setGroupActivityForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ej: Taller de Pintura y Colores"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Horario *
              </label>
              <input
                type="time"
                required
                value={groupActivityForm.time}
                onChange={(e) => setGroupActivityForm(prev => ({ ...prev, time: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-[#52796F]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Descripción de la Dinámica *
            </label>
            <textarea
              rows={3}
              required
              value={groupActivityForm.description}
              onChange={(e) => setGroupActivityForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describa cómo participó el grupo, materiales utilizados y objetivos..."
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
            />
          </div>

          {/* Checkbox Importante */}
          <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs font-semibold text-amber-900">
            <input
              type="checkbox"
              checked={!!groupActivityForm.isImportant}
              onChange={(e) => setGroupActivityForm(prev => ({ ...prev, isImportant: e.target.checked }))}
              className="w-4 h-4 rounded text-[#1B4332] focus:ring-[#52796F]"
            />
            <span>Marcar como importante (destacar aviso para las familias)</span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsGroupModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs cursor-pointer active:scale-98"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar para Toda la Sala</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 8. ACTIVITY DETAIL MODAL */}
      <Modal
        isOpen={!!viewActivityDetail}
        onClose={() => setViewActivityDetail(null)}
        title={viewActivityDetail?.title || 'Detalle de Bitácora'}
        subtitle={`Sala: ${viewActivityDetail?.roomName || activeRoom.name} • ${viewActivityDetail?.date} a las ${viewActivityDetail?.time} hs`}
        maxWidth="lg"
      >
        {viewActivityDetail && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#F0ECE1]">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant={viewActivityDetail.category === 'meal' ? 'amber' : viewActivityDetail.category === 'hygiene' ? 'green' : 'blue'} size="sm">
                  {viewActivityDetail.category === 'meal' ? 'Alimentación' : viewActivityDetail.category === 'hygiene' ? 'Higiene' : 'Actividad'}
                </Badge>
                {viewActivityDetail.isImportant && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                    <AlertCircle className="w-3 h-3 text-amber-700" />
                    <span>Importante</span>
                  </span>
                )}
                <span className="font-bold text-[#1B4332] text-sm">{viewActivityDetail.title}</span>
              </div>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                {viewActivityDetail.description}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-400 block mb-0.5">Docente</span>
                <span className="font-bold text-[#1B4332]">{viewActivityDetail.authorName}</span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-400 block mb-0.5">Horario</span>
                <span className="font-bold text-[#1B4332]">{viewActivityDetail.time || '10:00'} hs</span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setViewActivityDetail(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 9. ANNOUNCEMENT DETAIL MODAL */}
      <Modal
        isOpen={!!viewAnnouncementDetail}
        onClose={() => setViewAnnouncementDetail(null)}
        title={viewAnnouncementDetail?.title || 'Comunicado a Familias'}
        subtitle={`Publicado el ${viewAnnouncementDetail?.publishDate}`}
        maxWidth="lg"
      >
        {viewAnnouncementDetail && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#F0ECE1]">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={viewAnnouncementDetail.importance === 'urgent' ? 'red' : viewAnnouncementDetail.importance === 'important' ? 'amber' : 'green'} size="sm">
                  {viewAnnouncementDetail.importance}
                </Badge>
                <span className="font-bold text-[#1B4332] text-sm">{viewAnnouncementDetail.title}</span>
              </div>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                {viewAnnouncementDetail.content}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-gray-500">
              <span>Autor: <strong className="text-[#1B4332]">{viewAnnouncementDetail.authorName}</strong></span>
              <span>Destinatarios: <strong>Familias de la Sala</strong></span>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setViewAnnouncementDetail(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs cursor-pointer"
              >
                Cerrar Comunicado
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
