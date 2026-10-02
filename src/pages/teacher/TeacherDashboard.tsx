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
  Sparkles, 
  Users, 
  TrendingUp, 
  MessageSquare, 
  Save, 
  Utensils, 
  Moon, 
  Check, 
  Bell,
  XCircle,
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Edit,
  History,
  DoorClosed
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
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
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc 
} from 'firebase/firestore';
import { db } from '../../services/firebase/config';

export const TeacherDashboard: React.FC = () => {
  const { userProfile } = useAuth();

  // Teacher assigned rooms
  const assignedRoomIds = userProfile?.assignedRoomIds && userProfile.assignedRoomIds.length > 0
    ? userProfile.assignedRoomIds
    : ['room-cuna', 'room-1ano'];

  // State from Firestore with Seed Fallback
  const [roomsList, setRoomsList] = useState<Room[]>(INITIAL_ROOMS);
  const [childrenList, setChildrenList] = useState<Child[]>(INITIAL_CHILDREN);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
  const [activitiesList, setActivitiesList] = useState<Activity[]>(INITIAL_ACTIVITIES);
  const [reportsList, setReportsList] = useState<ProgressReport[]>(INITIAL_PROGRESS_REPORTS);
  const [announcementsList, setAnnouncementsList] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);

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
  const [activeManageTab, setActiveManageTab] = useState<'activity' | 'milestone' | 'attendance' | 'announcement'>('activity');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Card view modals
  const [viewActivityDetail, setViewActivityDetail] = useState<Activity | null>(null);
  const [viewAnnouncementDetail, setViewAnnouncementDetail] = useState<Announcement | null>(null);

  // Form states for the modal
  const [activityForm, setActivityForm] = useState({
    title: '',
    category: 'activity' as ActivityCategory,
    description: '',
    photoUrl: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=600&auto=format&fit=crop&q=80',
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

  // 1. Synchronize in Realtime with Firestore
  useEffect(() => {
    // Rooms
    const unsubRooms = onSnapshot(collection(db, 'rooms'), (snap) => {
      if (!snap.empty) {
        const loaded: Room[] = [];
        snap.forEach(d => loaded.push(d.data() as Room));
        setRoomsList(loaded);
      }
    }, () => {/* use fallback */});

    // Children
    const unsubChildren = onSnapshot(collection(db, 'children'), (snap) => {
      if (!snap.empty) {
        const loaded: Child[] = [];
        snap.forEach(d => loaded.push(d.data() as Child));
        setChildrenList(loaded);
      }
    }, () => {/* use fallback */});

    // Attendance
    const unsubAtt = onSnapshot(collection(db, 'attendance'), (snap) => {
      if (!snap.empty) {
        const loaded: AttendanceRecord[] = [];
        snap.forEach(d => loaded.push(d.data() as AttendanceRecord));
        setAttendanceList(loaded);
      }
    }, () => {/* use fallback */});

    // Activities
    const unsubAct = onSnapshot(collection(db, 'activities'), (snap) => {
      if (!snap.empty) {
        const loaded: Activity[] = [];
        snap.forEach(d => loaded.push(d.data() as Activity));
        setActivitiesList(loaded);
      }
    }, () => {/* use fallback */});

    // Progress Reports
    const unsubReports = onSnapshot(collection(db, 'progressReports'), (snap) => {
      if (!snap.empty) {
        const loaded: ProgressReport[] = [];
        snap.forEach(d => loaded.push(d.data() as ProgressReport));
        setReportsList(loaded);
      }
    }, () => {/* use fallback */});

    // Announcements
    const unsubAnn = onSnapshot(collection(db, 'announcements'), (snap) => {
      if (!snap.empty) {
        const loaded: Announcement[] = [];
        snap.forEach(d => loaded.push(d.data() as Announcement));
        setAnnouncementsList(loaded);
      }
    }, () => {/* use fallback */});

    return () => {
      unsubRooms();
      unsubChildren();
      unsubAtt();
      unsubAct();
      unsubReports();
      unsubAnn();
    };
  }, []);

  // Update selected room if assigned list changes
  useEffect(() => {
    if (myRooms.length > 0 && !myRooms.some(r => r.id === selectedRoomId)) {
      setSelectedRoomId(myRooms[0].id);
    }
  }, [myRooms, selectedRoomId]);

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

  // Direct Form Launchers
  const handleOpenAttendance = (child: Child) => {
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

  const handleOpenActivity = (child: Child, initialCategory: ActivityCategory = 'activity', existingAct?: Activity) => {
    setSelectedChild(child);
    setActiveManageTab('activity');

    if (existingAct) {
      setEditingRecordId(existingAct.id);
      setActivityForm({
        title: existingAct.title,
        category: existingAct.category,
        description: existingAct.description,
        photoUrl: existingAct.photoUrl || '',
        time: existingAct.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } else {
      setEditingRecordId(null);
      let defaultTitle = '';
      if (initialCategory === 'meal') defaultTitle = 'Almuerzo / Colación nutritiva';
      else if (initialCategory === 'nap') defaultTitle = 'Descanso / Siesta de la mañana';
      else if (initialCategory === 'hygiene') defaultTitle = 'Higiene y cambio de muda';
      else defaultTitle = 'Actividad pedagógica y motriz';

      setActivityForm({
        title: defaultTitle,
        category: initialCategory,
        description: '',
        photoUrl: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=600&auto=format&fit=crop&q=80',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
      photoUrl: activityForm.photoUrl || undefined,
      authorUserId: teacherId,
      authorName: teacherName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setActivitiesList(prev => [newRecord, ...prev.filter(a => a.id !== recId)]);

    try {
      await setDoc(doc(db, 'activities', recId), newRecord);
    } catch (err) {
      console.warn('Saved locally:', err);
    }

    setFeedbackMessage(editingRecordId ? `Actividad actualizada para ${selectedChild.firstName}` : `Actividad registrada para ${selectedChild.firstName}`);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsManageModalOpen(false);
      setEditingRecordId(null);
    }, 1100);
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

    setReportsList(prev => [newRecord, ...prev.filter(r => r.id !== recId)]);

    try {
      await setDoc(doc(db, 'progressReports', recId), newRecord);
    } catch (err) {
      console.warn('Saved locally:', err);
    }

    setFeedbackMessage(editingRecordId ? `Avance actualizado para ${selectedChild.firstName}` : `Avance pedagógico registrado para ${selectedChild.firstName}`);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsManageModalOpen(false);
      setEditingRecordId(null);
    }, 1100);
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

    setAttendanceList(prev => [newRecord, ...prev.filter(a => !(a.childId === selectedChild.id && a.date === todayStr))]);

    try {
      await setDoc(doc(db, 'attendance', recId), newRecord);
    } catch (err) {
      console.warn('Saved locally:', err);
    }

    setFeedbackMessage(`Asistencia de ${selectedChild.firstName} guardada (${attendanceForm.status === 'present' ? 'Presente' : attendanceForm.status === 'absent' ? 'Ausente' : 'Justificado'})`);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsManageModalOpen(false);
      setEditingRecordId(null);
    }, 1100);
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
      targetAudience: 'parents',
      roomId: activeRoom.id,
      roomName: activeRoom.name,
      authorUserId: teacherId,
      authorName: teacherName,
      publishDate: todayStr,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setAnnouncementsList(prev => [newRecord, ...prev]);

    try {
      await setDoc(doc(db, 'announcements', recId), newRecord);
    } catch (err) {
      console.warn('Saved locally:', err);
    }

    setFeedbackMessage('Novedad comunicada a las familias');
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsManageModalOpen(false);
    }, 1100);
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden animate-fade-in">
      {/* 1. HERO HEADER */}
      <div className="bg-gradient-to-r from-[#1B4332] via-[#2D6A4F] to-[#52796F] text-white p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-black text-2xl sm:text-3xl text-white shadow-xs shrink-0">
            {userProfile?.displayName ? userProfile.displayName.charAt(0) : 'D'}
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[#D8E4DA] text-xs font-semibold backdrop-blur-xs mb-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-[#A3B18A]" />
              <span>Docente a Cargo</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              {userProfile?.displayName || 'Profa. Carla Méndez'}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-white/80">
              <span>Salas Asignadas:</span>
              {myRooms.map(r => (
                <span key={r.id} className="bg-white/20 px-2 py-0.5 rounded-lg font-bold text-white">
                  {r.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/asistencia"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-[#1B4332] text-xs font-bold hover:bg-[#FAF9F5] transition-all shadow-xs active:scale-98"
          >
            <CalendarCheck2 className="w-4 h-4 text-[#52796F]" />
            <span>Planilla General</span>
          </Link>
          <Link
            to="/actividades"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all border border-white/20 active:scale-98"
          >
            <BookOpen className="w-4 h-4" />
            <span>Bitácora Institucional</span>
          </Link>
        </div>
      </div>

      {/* 2. ROOM SELECTOR PILLS */}
      <div className="bg-white p-4 rounded-3xl border border-[#E9ECEF] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
            <DoorClosed className="w-4 h-4 text-[#52796F]" />
            <span>Salas:</span>
          </span>
          {myRooms.map(room => {
            const count = childrenList.filter(c => c.roomId === room.id).length;
            const isSelected = selectedRoomId === room.id;
            return (
              <button
                key={room.id}
                onClick={() => setSelectedRoomId(room.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                  isSelected
                    ? 'bg-[#1B4332] text-white shadow-xs scale-102'
                    : 'bg-[#FAF9F5] text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span>{room.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {count} alumnos
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => {
            setSelectedChild(roomChildren[0] || null);
            setActiveManageTab('announcement');
            setIsManageModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-[#52796F] hover:bg-[#405F57] text-white text-xs font-bold shadow-2xs active:scale-98 cursor-pointer shrink-0"
        >
          <Bell className="w-3.5 h-3.5" />
          <span>+ Nuevo Comunicado a Familias</span>
        </button>
      </div>

      {/* 3. ACTIVE ROOM OVERVIEW STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E9ECEF] shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase">Matriculados</span>
            <Baby className="w-4 h-4 text-[#52796F]" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#1B4332]">
            {roomChildren.length} <span className="text-xs text-gray-400 font-normal">/ cap. {activeRoom.capacity || 12}</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5 truncate">{activeRoom.name}</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E9ECEF] shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase">Presentes Hoy</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700">
            {presentCount} <span className="text-xs text-gray-400 font-normal">({roomChildren.length > 0 ? Math.round((presentCount / roomChildren.length) * 100) : 0}%)</span>
          </div>
          <p className="text-[11px] text-emerald-600 mt-0.5">En sala ahora</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E9ECEF] shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase">Ausentes / Justif.</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-800">
            {absentCount} <span className="text-xs text-amber-600 font-normal">({justifiedCount} justificados)</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">{unregisteredCount} sin registrar hoy</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E9ECEF] shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase">Bitácora de Sala</span>
            <BookOpen className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#1B4332]">
            {roomActivities.length}
          </div>
          <p className="text-[11px] text-[#52796F] mt-0.5">Registros cargados</p>
        </div>
      </div>

      {/* 4. CHILDREN CARDS WITH DIRECT EDITING FORMS */}
      <div className="bg-white rounded-3xl border border-[#E9ECEF] p-5 sm:p-6 shadow-2xs space-y-4">
        {/* Title and Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#52796F]" />
              <h3 className="font-extrabold text-[#1B4332] text-base sm:text-lg">
                Alumnos en {activeRoom.name} ({filteredChildren.length})
              </h3>
            </div>
            <p className="text-xs text-gray-500">
              Acceso directo e individual para registrar y editar asistencia, actividades y avances pedagógicos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar alumno..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#52796F]"
              />
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1 bg-[#FAF9F5] p-1 rounded-xl border border-gray-200 text-xs font-bold">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${filterStatus === 'all' ? 'bg-[#52796F] text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterStatus('present')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${filterStatus === 'present' ? 'bg-[#52796F] text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Presentes ({presentCount})
              </button>
              <button
                onClick={() => setFilterStatus('unregistered')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${filterStatus === 'unregistered' ? 'bg-[#52796F] text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Sin Registrar ({unregisteredCount})
              </button>
              <button
                onClick={() => setFilterStatus('allergies')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${filterStatus === 'allergies' ? 'bg-amber-600 text-white' : 'text-amber-800 hover:text-amber-950'}`}
              >
                Alergias
              </button>
            </div>
          </div>
        </div>

        {/* Children Grid */}
        {filteredChildren.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500 bg-[#FAF9F5] rounded-2xl border border-gray-100">
            No se encontraron alumnos que coincidan con la búsqueda en esta sala.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredChildren.map(child => {
              const childAtt = attendanceList.find(a => a.childId === child.id && a.date === todayStr);
              const childActivitiesToday = activitiesList.filter(a => a.childIds?.includes(child.id) && a.date === todayStr);
              const childReports = reportsList.filter(r => r.childId === child.id);
              const isExpanded = expandedChildId === child.id;

              return (
                <div
                  key={child.id}
                  className="p-4 sm:p-5 rounded-2xl bg-[#FAF9F5] border border-[#F0ECE1] hover:border-[#52796F] transition-all shadow-2xs space-y-3"
                >
                  {/* Child Top Bar */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-[#EBF3ED] text-[#245436] flex items-center justify-center font-black text-base border border-[#D1E4D7] shrink-0">
                        {child.firstName[0]}{child.lastName[0]}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-[#1B4332] text-sm sm:text-base leading-tight truncate">
                          {child.firstName} {child.lastName}
                        </h4>
                        <span className="text-[11px] text-gray-500 block">
                          Nacimiento: {child.birthDate} • Sala {child.roomName || activeRoom.name}
                        </span>
                      </div>
                    </div>

                    {/* Attendance Pill */}
                    {childAtt?.status === 'present' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Presente {childAtt.checkInTime ? `(${childAtt.checkInTime})` : ''}</span>
                      </span>
                    ) : childAtt?.status === 'absent' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Ausente</span>
                      </span>
                    ) : childAtt?.status === 'justified' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Justificado</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-gray-200 text-gray-600 shrink-0">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>Sin registrar</span>
                      </span>
                    )}
                  </div>

                  {/* Medical alert if any */}
                  {child.allergies && child.allergies !== 'Ninguna' && child.allergies !== 'Ninguna conocida' && (
                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate"><strong>Atención:</strong> {child.allergies}</span>
                    </div>
                  )}

                  {/* Today Quick Summary Counters */}
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] bg-white p-2 rounded-xl border border-gray-100">
                    <div>
                      <span className="text-gray-400 block text-[10px]">Actividades Hoy</span>
                      <strong className="text-[#1B4332] font-black">{childActivitiesToday.length}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Hitos / Avances</span>
                      <strong className="text-[#52796F] font-black">{childReports.length}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Egreso</span>
                      <strong className="text-gray-700 font-bold">{childAtt?.checkOutTime ? `${childAtt.checkOutTime} hs` : '--:--'}</strong>
                    </div>
                  </div>

                  {/* DIRECT ACCESS BUTTONS TO EDITING FORMS */}
                  <div className="pt-2 border-t border-gray-200/70 flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {/* 1. Direct Attendance Form Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenAttendance(child)}
                      className={`inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-98 ${
                        childAtt
                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
                          : 'bg-[#52796F] text-white hover:bg-[#405F57]'
                      }`}
                      title={childAtt ? 'Modificar o asentar salida de hoy' : 'Registrar asistencia de hoy'}
                    >
                      <CalendarCheck2 className="w-3.5 h-3.5" />
                      <span>{childAtt ? 'Editar Asistencia' : 'Tomar Asistencia'}</span>
                    </button>

                    {/* 2. Direct Activity / Routine Form Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenActivity(child, 'activity')}
                      className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 transition-all cursor-pointer shadow-2xs active:scale-98"
                      title="Cargar actividad, alimentación, siesta o muda"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[#52796F]" />
                      <span>+ Actividad</span>
                    </button>

                    {/* 3. Direct Progress Report Form Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenMilestone(child)}
                      className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 transition-all cursor-pointer shadow-2xs active:scale-98"
                      title="Registrar hito pedagógico, conducta y sugerencias"
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-[#2D6A4F]" />
                      <span>+ Avance</span>
                    </button>

                    {/* 4. View Child Profile Link */}
                    <Link
                      to={`/perfil-nino/${child.id}`}
                      className="inline-flex items-center gap-1 py-1.5 px-2.5 rounded-xl bg-white hover:bg-gray-100 text-xs font-semibold text-gray-700 border border-gray-200 transition-colors ml-auto"
                      title="Ver expediente y contactos familiares"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#52796F]" />
                      <span>Expediente</span>
                    </Link>

                    {/* Toggle Today's Records List */}
                    {childActivitiesToday.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpandedChildId(isExpanded ? null : child.id)}
                        className="w-full mt-1 pt-1 border-t border-dashed border-gray-200 flex items-center justify-between text-[11px] font-bold text-[#52796F] hover:underline cursor-pointer"
                      >
                        <span className="flex items-center gap-1">
                          <History className="w-3 h-3" />
                          <span>Ver {childActivitiesToday.length} registros cargados hoy</span>
                        </span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  {/* Expanded Accordion with today's activities and edit buttons */}
                  {isExpanded && childActivitiesToday.length > 0 && (
                    <div className="pt-2 space-y-2 border-t border-gray-200 animate-fade-in">
                      <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        Historial de {child.firstName} hoy:
                      </div>
                      {childActivitiesToday.map(act => (
                        <div
                          key={act.id}
                          className="p-2.5 rounded-xl bg-white border border-gray-200 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[#1B4332] truncate">{act.title}</span>
                              <Badge variant="blue" size="sm">{act.category}</Badge>
                            </div>
                            <p className="text-gray-500 text-[11px] line-clamp-1">{act.description}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenActivity(child, act.category, act)}
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

      {/* 5. RECENT ROOM ACTIVITIES & ANNOUNCEMENTS TWO-COLUMN SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Room Activities */}
        <div className="bg-white rounded-3xl border border-[#E9ECEF] p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#52796F]" />
              <h3 className="font-bold text-[#1B4332] text-base">
                Bitácora Reciente de {activeRoom.name}
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
                      <Badge variant="blue" size="sm">{act.category}</Badge>
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

        {/* Announcements for Room & Nursery */}
        <div className="bg-white rounded-3xl border border-[#E9ECEF] p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#52796F]" />
              <h3 className="font-bold text-[#1B4332] text-base">
                Novedades y Avisos a Familias
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
              + Nueva novedad
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

      {/* 6. MODAL WITH FORMS FOR INDIVIDUAL CHILD MANAGEMENT */}
      <Modal
        isOpen={isManageModalOpen}
        onClose={() => {
          setIsManageModalOpen(false);
          setEditingRecordId(null);
        }}
        title={
          selectedChild 
            ? `${editingRecordId ? 'Modificar Registro' : 'Nuevo Registro'}: ${selectedChild.firstName} ${selectedChild.lastName}` 
            : 'Gestión Docente'
        }
        subtitle={`Sala: ${selectedChild?.roomName || activeRoom.name} • Docente: ${userProfile?.displayName || 'Profa. Carla Méndez'}`}
        maxWidth="xl"
      >
        {saveSuccess ? (
          <div className="text-center py-8 animate-fade-in">
            <div className="w-14 h-14 rounded-3xl bg-[#EBF3ED] text-[#245436] flex items-center justify-center mx-auto mb-3 border border-[#D1E4D7] shadow-xs">
              <Check className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-[#1B4332]">
              {feedbackMessage || 'Registro guardado exitosamente'}
            </h4>
            <p className="text-xs text-gray-400 mt-1">
              Los datos se guardaron en la base de datos y se notificaron a la familia del alumno.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Modal Navigation Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-[#FAF9F5] rounded-2xl border border-[#EBE7DF]">
              <button
                type="button"
                onClick={() => setActiveManageTab('activity')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeManageTab === 'activity'
                    ? 'bg-[#52796F] text-white shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Actividad / Rutina</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveManageTab('milestone')}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeManageTab === 'milestone'
                    ? 'bg-[#52796F] text-white shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Avance / Desarrollo</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveManageTab('attendance')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeManageTab === 'attendance'
                    ? 'bg-[#52796F] text-white shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <CalendarCheck2 className="w-3.5 h-3.5" />
                <span>Asistencia</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveManageTab('announcement')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeManageTab === 'announcement'
                    ? 'bg-[#52796F] text-white shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Aviso / Novedad</span>
              </button>
            </div>

            {/* FORM 1: ACTIVIDAD / RUTINA / ALIMENTACIÓN / DESCANSO */}
            {activeManageTab === 'activity' && (
              <form onSubmit={handleSaveActivity} className="space-y-3.5 animate-fade-in">
                {/* Category quick selectors */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Tipo de Rutina o Actividad *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setActivityForm(prev => ({ 
                        ...prev, 
                        category: 'meal',
                        title: prev.title === 'Actividad pedagógica y motriz' || !prev.title ? 'Almuerzo / Colación nutritiva' : prev.title
                      }))}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                        activityForm.category === 'meal'
                          ? 'bg-amber-50 text-amber-900 border-amber-400'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <Utensils className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Alimentación</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivityForm(prev => ({ 
                        ...prev, 
                        category: 'nap',
                        title: prev.title === 'Almuerzo / Colación nutritiva' || !prev.title ? 'Descanso / Siesta del mediodía' : prev.title
                      }))}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                        activityForm.category === 'nap'
                          ? 'bg-purple-50 text-purple-900 border-purple-400'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <Moon className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Descanso / Siesta</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivityForm(prev => ({ 
                        ...prev, 
                        category: 'hygiene',
                        title: prev.title.startsWith('Almuerzo') || !prev.title ? 'Higiene y cambio de muda' : prev.title
                      }))}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                        activityForm.category === 'hygiene'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-400'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Higiene / Mudas</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivityForm(prev => ({ ...prev, category: 'activity' }))}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                        activityForm.category === 'activity'
                          ? 'bg-sky-50 text-sky-900 border-sky-400'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <BookOpen className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>Juego Pedagógico</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivityForm(prev => ({ ...prev, category: 'milestone' }))}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                        activityForm.category === 'milestone'
                          ? 'bg-rose-50 text-rose-900 border-rose-400'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Hito del Día</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivityForm(prev => ({ ...prev, category: 'general' }))}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                        activityForm.category === 'general'
                          ? 'bg-gray-100 text-gray-900 border-gray-400'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4 text-gray-600 shrink-0" />
                      <span>Nota General</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Título del Registro *
                    </label>
                    <input
                      type="text"
                      required
                      value={activityForm.title}
                      onChange={(e) => setActivityForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="EJ: Almuerzo completo y siesta de 1h"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Hora del Registro *
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
                    Detalle y Observación para la Familia *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={activityForm.description}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describa cómo participó el niño, apetito, descanso o interacción con sus pares..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Fotografía o Archivo Adjunto (Opcional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={activityForm.photoUrl}
                      onChange={(e) => setActivityForm(prev => ({ ...prev, photoUrl: e.target.value }))}
                      placeholder="URL de imagen..."
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-[#52796F]"
                    />
                    {activityForm.photoUrl && (
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-200 shrink-0">
                        <img src={activityForm.photoUrl} alt="Vista previa" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-[11px] text-gray-400">
                  <span>Alumno: <strong>{selectedChild?.firstName} {selectedChild?.lastName}</strong></span>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs cursor-pointer active:scale-98"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingRecordId ? 'Guardar Cambios' : 'Registrar Actividad'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* FORM 2: AVANCES PEDAGÓGICOS / DESARROLLO */}
            {activeManageTab === 'milestone' && (
              <form onSubmit={handleSaveMilestone} className="space-y-3.5 animate-fade-in">
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
                      <option value="language">Lenguaje, Comprensión y Diálogo</option>
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
                    Logro Pedagógico o Conducta Observada *
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
                    Observación Pedagógica Detallada *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={milestoneForm.observation}
                    onChange={(e) => setMilestoneForm(prev => ({ ...prev, observation: e.target.value }))}
                    placeholder="Describa la evolución del niño de forma respetuosa y pedagógica..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Fortalezas Destacadas
                    </label>
                    <input
                      type="text"
                      value={milestoneForm.strengths}
                      onChange={(e) => setMilestoneForm(prev => ({ ...prev, strengths: e.target.value }))}
                      placeholder="EJ: Gran entusiasmo y curiosidad activa"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-[#52796F]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Sugerencias para la Familia
                    </label>
                    <input
                      type="text"
                      value={milestoneForm.recommendations}
                      onChange={(e) => setMilestoneForm(prev => ({ ...prev, recommendations: e.target.value }))}
                      placeholder="EJ: Juegos de encastre y lectura de cuentos antes de dormir"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-[#52796F]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-[11px] text-gray-400">
                  <span>Quedará registrado en el expediente pedagógico del niño</span>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs cursor-pointer active:scale-98"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingRecordId ? 'Guardar Cambios' : 'Registrar Avance'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* FORM 3: ASISTENCIA Y PERMANENCIA DEL ALUMNO */}
            {activeManageTab === 'attendance' && (
              <form onSubmit={handleSaveAttendance} className="space-y-3.5 animate-fade-in">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Estado de Asistencia Hoy ({todayStr}) *
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
                      Horario de Ingreso
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
                      Horario de Retiro / Salida
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
                    placeholder="EJ: Retiró abuela autorizada con DNI en portería"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-[11px] text-gray-400">
                  <span>Actualiza la nómina de sala en tiempo real</span>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs cursor-pointer active:scale-98"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar Asistencia</span>
                  </button>
                </div>
              </form>
            )}

            {/* FORM 4: AVISOS Y COMUNICADOS A FAMILIAS */}
            {activeManageTab === 'announcement' && (
              <form onSubmit={handleSaveAnnouncement} className="space-y-3.5 animate-fade-in">
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
                    <option value="important">Importante (Reunión, muda extra, paseo)</option>
                    <option value="urgent">Urgente (Salud o retiro anticipado)</option>
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
                    placeholder="EJ: Traer botella de agua con nombre y muda fresca"
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
                    placeholder="Escriba el comunicado que recibirán los tutores en su portal familiar..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-[11px] text-gray-400">
                  <span>Visible inmediatamente para las familias de la sala</span>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs cursor-pointer active:scale-98"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Publicar Novedad</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>

      {/* Activity Card Detail Modal */}
      <Modal
        isOpen={!!viewActivityDetail}
        onClose={() => setViewActivityDetail(null)}
        title={viewActivityDetail?.title || 'Detalle de Bitácora'}
        subtitle={`Sala: ${viewActivityDetail?.roomName || activeRoom.name} • ${viewActivityDetail?.date} a las ${viewActivityDetail?.time} hs`}
        maxWidth="md"
      >
        {viewActivityDetail && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#F0ECE1]">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="blue" size="sm">{viewActivityDetail.category}</Badge>
                <span className="font-bold text-[#1B4332] text-sm">{viewActivityDetail.title}</span>
              </div>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                {viewActivityDetail.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-400 block mb-0.5">Autor</span>
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
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs cursor-pointer"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Announcement Card Detail Modal */}
      <Modal
        isOpen={!!viewAnnouncementDetail}
        onClose={() => setViewAnnouncementDetail(null)}
        title={viewAnnouncementDetail?.title || 'Comunicado a Familias'}
        subtitle={`Publicado el ${viewAnnouncementDetail?.publishDate}`}
        maxWidth="md"
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
              <span>Destinatarios: <strong>Familias</strong></span>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setViewAnnouncementDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs cursor-pointer"
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
