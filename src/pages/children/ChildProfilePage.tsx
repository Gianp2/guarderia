import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Baby, 
  Calendar, 
  Clock, 
  Heart, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  FileText, 
  ArrowLeft,
  GraduationCap,
  Save,
  Activity as ActivityIcon,
  Edit3,
  Trash2,
  Utensils,
  Moon,
  Smile
} from 'lucide-react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { Child, Activity, ProgressReport, AttendanceRecord, DevelopmentArea } from '../../types';
import { 
  INITIAL_CHILDREN, 
  INITIAL_ACTIVITIES, 
  INITIAL_PROGRESS_REPORTS, 
  INITIAL_ATTENDANCE,
  INITIAL_FAMILIES,
  INITIAL_ROOMS
} from '../../services/seedData';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const ChildProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { role, userProfile } = useAuth();
  const toast = useToast();
  
  const [child, setChild] = useState<Child | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [progressReports, setProgressReports] = useState<ProgressReport[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'timeline' | 'milestones' | 'attendance' | 'info'>('timeline');

  // Modal for new/edit progress report (for teacher/admin)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<{ title: string; subtitle?: string; content: React.ReactNode } | null>(null);
  const [reportForm, setReportForm] = useState<Partial<ProgressReport>>({
    title: '',
    period: 'Trimestre Actual',
    area: 'cognitive',
    observation: '',
    strengths: '',
    recommendations: ''
  });

  // Modal for editing child details
  const [isEditChildModalOpen, setIsEditChildModalOpen] = useState(false);
  const [childForm, setChildForm] = useState<Partial<Child>>({});

  // Modal for editing an activity
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [activityForm, setActivityForm] = useState<Partial<Activity>>({});

  // Modal for editing an attendance record
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<AttendanceRecord | null>(null);
  const [attendanceForm, setAttendanceForm] = useState<Partial<AttendanceRecord>>({});

  const getAreaLabel = (area?: string) => {
    switch (area) {
      case 'cognitive':
        return 'Aprendizaje y Cognición';
      case 'behavior_habits':
        return 'Comportamiento y Convivencia';
      case 'social_emotional':
        return 'Socioemocional y Afecto';
      case 'language':
        return 'Lenguaje y Comunicación';
      case 'autonomy':
        return 'Autonomía y Desafíos';
      default:
        return 'Aprendizaje Pedagógico';
    }
  };

  const canEditPedagogical = role === 'admin' || role === 'teacher';

  useEffect(() => {
    const childId = id || 'child-mateo';
    const allChildren = dataService.getChildren();
    const found = allChildren.find(c => c.id === childId) || allChildren[0];
    setChild(found);

    const updateChildData = (currentChild: Child) => {
      const childActivities = dataService.getActivities().filter(a => 
        a.roomId === currentChild.roomId && (!a.childIds || a.childIds.length === 0 || a.childIds.includes(currentChild.id))
      );
      setActivities(childActivities);

      const childReports = dataService.getProgressReports().filter(r => r.childId === currentChild.id);
      setProgressReports(childReports);

      const childAtt = dataService.getAttendance().filter(att => att.childId === currentChild.id);
      setAttendance(childAtt);
    };

    if (found) {
      updateChildData(found);
    }

    const unsubChildren = dataService.subscribe('children', () => {
      const updatedChildren = dataService.getChildren();
      const updatedFound = updatedChildren.find(c => c.id === childId) || updatedChildren[0];
      if (updatedFound) {
        setChild(updatedFound);
        updateChildData(updatedFound);
      }
    });

    const unsubActivities = dataService.subscribe('activities', () => {
      if (found) updateChildData(found);
    });

    const unsubAttendance = dataService.subscribe('attendance', () => {
      if (found) updateChildData(found);
    });

    const unsubReports = dataService.subscribe('reports', () => {
      if (found) updateChildData(found);
    });

    dataService.syncFromFirestore();

    return () => {
      unsubChildren();
      unsubActivities();
      unsubAttendance();
      unsubReports();
    };
  }, [id]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab, id]);

  // --- 1. CHILD EDIT HANDLERS ---
  const handleOpenEditChild = () => {
    if (!child) return;
    setChildForm({
      firstName: child.firstName,
      lastName: child.lastName,
      birthDate: child.birthDate,
      roomId: child.roomId,
      roomName: child.roomName,
      allergies: child.allergies || 'Ninguna registrada',
      dietaryNotes: child.dietaryNotes || 'Menú general',
      medicalNotes: child.medicalNotes || 'Controles al día',
      emergencyContact: child.emergencyContact || '',
      administrativeNotes: child.administrativeNotes || ''
    });
    setIsEditChildModalOpen(true);
  };

  const handleSaveChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!child) return;
    const assignedRoom = INITIAL_ROOMS.find(r => r.id === childForm.roomId);
    const updated: Child = {
      ...child,
      firstName: childForm.firstName || child.firstName,
      lastName: childForm.lastName || child.lastName,
      birthDate: childForm.birthDate || child.birthDate,
      roomId: childForm.roomId || child.roomId,
      roomName: assignedRoom?.name || child.roomName,
      allergies: childForm.allergies ?? child.allergies,
      dietaryNotes: childForm.dietaryNotes ?? child.dietaryNotes,
      medicalNotes: childForm.medicalNotes ?? child.medicalNotes,
      emergencyContact: childForm.emergencyContact ?? child.emergencyContact,
      administrativeNotes: childForm.administrativeNotes ?? child.administrativeNotes,
      updatedAt: new Date().toISOString()
    };
    setChild(updated);
    await dataService.saveChild(updated);
    toast.success(
      'Expediente actualizado',
      `Ficha médica y datos personales de ${updated.firstName} guardados correctamente`
    );
    try {
      await setDoc(doc(db, 'children', child.id), updated, { merge: true });
    } catch (err) {
      console.warn('Updated child locally:', err);
    }
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsEditChildModalOpen(false);
    }, 900);
  };

  // --- 2. PROGRESS REPORT HANDLERS ---
  const handleOpenCreateReport = () => {
    setEditingReportId(null);
    setReportForm({
      title: '',
      period: 'Trimestre Actual',
      area: 'cognitive',
      observation: '',
      strengths: '',
      recommendations: ''
    });
    setIsReportModalOpen(true);
  };

  const handleOpenEditReport = (rep: ProgressReport, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingReportId(rep.id);
    setReportForm({
      title: rep.title,
      period: rep.period,
      area: rep.area,
      observation: rep.observation,
      strengths: rep.strengths || '',
      recommendations: rep.recommendations || ''
    });
    setIsReportModalOpen(true);
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!child || !reportForm.title || !reportForm.observation) return;

    if (editingReportId) {
      const existing = progressReports.find(r => r.id === editingReportId);
      const updated: ProgressReport = {
        ...existing!,
        period: reportForm.period || 'Trimestre Actual',
        area: (reportForm.area as DevelopmentArea) || existing?.area || 'cognitive',
        title: reportForm.title!,
        observation: reportForm.observation!,
        strengths: reportForm.strengths || '',
        recommendations: reportForm.recommendations || '',
        updatedAt: new Date().toISOString()
      };
      setProgressReports(prev => prev.map(r => r.id === editingReportId ? updated : r));
      try {
        await setDoc(doc(db, 'progressReports', editingReportId), updated, { merge: true });
      } catch (err) {
        console.warn('Updated in local state:', err);
      }
    } else {
      const repId = `rep-${Date.now()}`;
      const newReport: ProgressReport = {
        id: repId,
        childId: child.id,
        childName: `${child.firstName} ${child.lastName}`,
        roomId: child.roomId,
        period: reportForm.period || 'Trimestre Actual',
        area: (reportForm.area as DevelopmentArea) || 'cognitive',
        title: reportForm.title!,
        observation: reportForm.observation!,
        strengths: reportForm.strengths || '',
        recommendations: reportForm.recommendations || '',
        authorUserId: userProfile?.id || 'docente',
        authorName: userProfile?.displayName || 'Equipo Pedagógico',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setProgressReports(prev => [newReport, ...prev]);
      await dataService.saveProgressReport(newReport);

      try {
        await setDoc(doc(db, 'progressReports', repId), newReport);
      } catch (err) {
        console.warn('Saved in local state:', err);
      }
    }

    toast.success(
      editingReportId ? 'Informe pedagógico actualizado' : 'Informe pedagógico guardado',
      `"${reportForm.title}" registrado para ${child.firstName}`
    );

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsReportModalOpen(false);
      setEditingReportId(null);
    }, 900);
  };

  // --- 3. ACTIVITY EDIT HANDLERS ---
  const handleOpenEditActivity = (act: Activity, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingActivity(act);
    setActivityForm({
      title: act.title,
      description: act.description,
      category: act.category,
      time: act.time,
      date: act.date,
      isImportant: !!act.isImportant
    });
    setIsActivityModalOpen(true);
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity) return;
    const updated: Activity = {
      ...editingActivity,
      title: activityForm.title || editingActivity.title,
      description: activityForm.description || editingActivity.description,
      category: (activityForm.category as any) || editingActivity.category,
      time: activityForm.time || editingActivity.time,
      date: activityForm.date || editingActivity.date,
      isImportant: !!activityForm.isImportant,
      updatedAt: new Date().toISOString()
    };
    setActivities(prev => prev.map(a => a.id === editingActivity.id ? updated : a));
    await dataService.saveActivity(updated);
    toast.success('Actividad actualizada', `"${updated.title}" modificada correctamente`);
    try {
      await setDoc(doc(db, 'activities', editingActivity.id), updated, { merge: true });
    } catch (err) {
      console.warn('Updated activity locally:', err);
    }
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsActivityModalOpen(false);
      setEditingActivity(null);
    }, 900);
  };

  // --- 4. ATTENDANCE EDIT HANDLERS ---
  const handleOpenEditAttendance = (att: AttendanceRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingAttendance(att);
    setAttendanceForm({
      status: att.status,
      checkInTime: att.checkInTime || '08:30',
      checkOutTime: att.checkOutTime || '',
      notes: att.notes || ''
    });
    setIsAttendanceModalOpen(true);
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttendance) return;
    const updated: AttendanceRecord = {
      ...editingAttendance,
      status: attendanceForm.status as any || editingAttendance.status,
      checkInTime: attendanceForm.checkInTime || editingAttendance.checkInTime,
      checkOutTime: attendanceForm.checkOutTime || editingAttendance.checkOutTime,
      notes: attendanceForm.notes ?? editingAttendance.notes,
      updatedAt: new Date().toISOString()
    };
    setAttendance(prev => prev.map(a => a.id === editingAttendance.id ? updated : a));
    await dataService.saveAttendance(updated);
    const statusLabel = 
      updated.status === 'present' ? 'Presente' :
      updated.status === 'absent' ? 'Ausente' : 'Justificado';
    toast.success('Asistencia actualizada', `${child?.firstName || 'Alumno'} marcado como ${statusLabel}`);
    try {
      await setDoc(doc(db, 'attendance', editingAttendance.id), updated, { merge: true });
    } catch (err) {
      console.warn('Updated attendance locally:', err);
    }
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsAttendanceModalOpen(false);
      setEditingAttendance(null);
    }, 900);
  };

  if (!child) return null;

  const linkedIds = userProfile?.linkedChildIds ?? ['child-mateo'];
  const isAuthorizedParent = role !== 'parent' || (child && linkedIds.includes(child.id));

  if (!isAuthorizedParent) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-200 shadow-xs">
          <ShieldCheck className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-xl font-black text-[#1B4332] mb-2">
          Expediente No Vinculado
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 mb-6 leading-relaxed">
          Por estrictas políticas de protección de datos de menores, solo puede consultar el expediente de los alumnos formalmente vinculados a su cuenta familiar.
        </p>
        <Link
          to={`/perfil-nino/${linkedIds[0] || 'child-mateo'}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#52796F] text-white text-xs font-bold hover:bg-[#405F57] transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al perfil de mi hijo</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to={role === 'parent' ? '/familia' : '/admin/ninos'}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#52796F] hover:text-[#1B4332] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{role === 'parent' ? 'Volver a Portal Familiar' : 'Volver a Nómina de Niños'}</span>
        </Link>
      </div>

      {/* Child Header Card */}
      <div className="bg-white rounded-2xl border border-[#E9ECEF] p-4 sm:p-6 shadow-xs flex flex-col md:flex-row items-center md:items-center justify-between gap-4 text-center sm:text-left overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 min-w-0 w-full sm:w-auto">
          <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-3xl bg-[#EBF3ED] text-[#245436] flex items-center justify-center font-black text-xl sm:text-3xl border-2 border-[#D1E4D7] shadow-xs shrink-0">
            {child.firstName[0]}{child.lastName[0]}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <h2 className="text-xl sm:text-3xl font-black text-[#1B4332] tracking-tight truncate max-w-full">
                {child.firstName} {child.lastName}
              </h2>
              <Badge variant="green" size="sm">Activo</Badge>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-[#52796F] truncate">
              {child.roomName} • Nacido el {child.birthDate}
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                Ingreso: {child.enrollmentDate}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                Familia Rossi
              </span>
            </div>
          </div>
        </div>

        {canEditPedagogical && (
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleOpenEditChild}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-[#D1E4D7] hover:bg-[#F2F8F4] text-[#1B4332] text-xs sm:text-sm font-bold shadow-2xs active:scale-95 transition-all duration-150 cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-[#52796F]" />
              <span>Editar Alumno</span>
            </button>
            <button
              onClick={handleOpenCreateReport}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#52796F] hover:bg-[#405F57] text-white text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition-all duration-150 cursor-pointer"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Nuevo Avance</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-[#E9ECEF] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'timeline'
              ? 'bg-[#1B4332] text-white shadow-xs'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          Línea de Tiempo Diaria
        </button>
        <button
          onClick={() => setActiveTab('milestones')}
          className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-150 active:scale-95 cursor-pointer ${
            activeTab === 'milestones'
              ? 'bg-[#1B4332] text-white shadow-xs'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          Aprendizaje y Conducta ({progressReports.length})
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'attendance'
              ? 'bg-[#1B4332] text-white shadow-xs'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          Historial de Asistencia
        </button>
        <button
          onClick={() => setActiveTab('info')}
          className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'info'
              ? 'bg-[#1B4332] text-white shadow-xs'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          Ficha Médica y Autorizaciones
        </button>
      </div>

      {/* Tab 1: Daily Timeline */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <div className="bg-[#FAF9F5] p-4 rounded-3xl border border-[#EFECE5] flex items-center justify-between text-xs text-gray-600">
            <span>Acontecimientos y rutinas registrados por las educadoras durante la jornada:</span>
            <span className="font-semibold text-[#1B4332]">{activities.length} eventos hoy</span>
          </div>

          <div className="space-y-3">
            {activities.map((act) => (
              <div
                key={act.id}
                onClick={() => setSelectedDetail({
                  title: act.title,
                  subtitle: `Actividad Diaria • ${act.time} hs • Registrado por: ${act.authorName}`,
                  content: (
                    <div className="space-y-4 text-xs">
                      {act.isImportant && (
                        <div className="p-2.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>Aviso marcado como Importante por la educadora</span>
                        </div>
                      )}
                      <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#F0ECE1]">
                        <h4 className="text-sm font-bold text-[#1B4332] mb-1">{act.title}</h4>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-line">{act.description}</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                          <span className="text-gray-400 block mb-0.5">Horario</span>
                          <span className="font-bold text-[#1B4332]">{act.time} hs</span>
                        </div>
                        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                          <span className="text-gray-400 block mb-0.5">Responsable</span>
                          <span className="font-bold text-[#1B4332]">{act.authorName}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
                className="bg-white p-5 rounded-3xl border border-[#E9ECEF] hover:border-[#52796F]/50 hover:bg-[#FAF9F5] transition-all flex items-start gap-4 shadow-2xs cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#EBF3ED] text-[#245436] flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                  <Clock className="w-5 h-5 text-[#52796F]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#1B4332] group-hover:text-[#52796F] transition-colors">{act.title}</span>
                      {act.isImportant && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                          <AlertCircle className="w-2.5 h-2.5 text-amber-700" />
                          <span>Importante</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-gray-400">{act.time} hs</span>
                      {canEditPedagogical && (
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditActivity(act, e)}
                          className="p-1 text-gray-400 hover:text-[#1B4332] hover:bg-[#EBF3ED] rounded-lg transition-colors cursor-pointer"
                          title="Editar actividad"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#52796F]" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed mb-2">
                    {act.description}
                  </p>
                  <div className="text-[10px] text-gray-400">
                    Registrado por: {act.authorName}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Development Milestones (Learning and Behavior) */}
      {activeTab === 'milestones' && (
        <div className="space-y-4">
          <div className="p-4 sm:p-5 rounded-3xl bg-[#FAF9F5] border border-[#EFECE5] flex items-start gap-3">
            <GraduationCap className="w-5 h-5 text-[#52796F] shrink-0 mt-0.5" />
            <div className="text-xs text-gray-600 leading-relaxed">
              <strong className="text-[#1B4332] block sm:inline font-bold">Avances de Aprendizaje y Conducta: </strong>
              Este registro documenta exclusivamente el proceso formativo y pedagógico: cómo va aprendiendo el niño, su comportamiento y convivencia en la sala, comprensión del entorno, adquisición de lenguaje, autonomía y maduración socioemocional. <span className="font-semibold text-[#52796F]">(Enfocado en el aprendizaje y su comportamiento social, no en medidas ni desarrollo corporal).</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {progressReports.map((report) => (
              <div
                key={report.id}
                onClick={() => setSelectedDetail({
                  title: report.title,
                  subtitle: `Área: ${getAreaLabel(report.area)} • Período: ${report.period}`,
                  content: (
                    <div className="space-y-4 text-xs">
                      <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#F0ECE1]">
                        <h4 className="text-sm font-bold text-[#1B4332] mb-2">{report.title}</h4>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-line">{report.observation}</p>
                      </div>
                      {report.strengths && (
                        <div className="p-3.5 rounded-2xl bg-[#EBF3ED] border border-[#D1E4D7] text-[#245436]">
                          <strong>Fortalezas Observadas:</strong> {report.strengths}
                        </div>
                      )}
                      {report.recommendations && (
                        <div className="p-3.5 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E]">
                          <strong>Sugerencias para el Hogar:</strong> {report.recommendations}
                        </div>
                      )}
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex justify-between text-gray-500">
                        <span>Educadora: <strong>{report.authorName}</strong></span>
                        <span>Fecha: {report.createdAt?.split('T')[0]}</span>
                      </div>
                    </div>
                  )
                })}
                className="bg-white p-6 rounded-3xl border border-[#E9ECEF] hover:border-[#52796F]/50 hover:bg-[#FAF9F5] transition-all shadow-2xs flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="green" size="sm">
                      {getAreaLabel(report.area)}
                    </Badge>
                    <span className="text-xs text-gray-400 font-medium">{report.period}</span>
                  </div>

                  <h3 className="text-base font-bold text-[#1B4332] mb-2 group-hover:text-[#52796F] transition-colors">
                    {report.title}
                  </h3>

                  <p className="text-xs text-gray-600 leading-relaxed mb-4">
                    {report.observation}
                  </p>

                  {report.strengths && (
                    <div className="p-3 rounded-2xl bg-[#EBF3ED]/70 border border-[#D1E4D7] text-xs text-[#245436] mb-3">
                      <strong>Fortalezas:</strong> {report.strengths}
                    </div>
                  )}

                  {report.recommendations && (
                    <div className="p-3 rounded-2xl bg-[#FEF3C7]/70 border border-[#FDE68A] text-xs text-[#92400E]">
                      <strong>Sugerencias para el hogar:</strong> {report.recommendations}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                  <span>Educadora: <strong>{report.authorName}</strong></span>
                  <div className="flex items-center gap-2">
                    {canEditPedagogical && (
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditReport(report, e)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#EBF3ED] hover:bg-[#D8EADB] text-[#1B4332] font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-2xs"
                        title="Editar avance pedagógico"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#52796F]" />
                        <span>Editar</span>
                      </button>
                    )}
                    <span>{report.createdAt?.split('T')[0]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Attendance History */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-3xl border border-[#E9ECEF] p-6 shadow-2xs space-y-4">
          <h3 className="font-bold text-[#1B4332] text-sm">Historial de Asistencias del Mes</h3>
          <div className="space-y-2">
            {attendance.map((att) => (
              <div key={att.id} className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#F0ECE1] flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <Badge variant={att.status === 'present' ? 'green' : 'amber'} size="sm">
                    {att.status === 'present' ? 'Presente' : att.status}
                  </Badge>
                  <span className="font-semibold text-gray-800">{att.date}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  {att.checkInTime && <span>Ingreso: <strong>{att.checkInTime} hs</strong></span>}
                  {att.checkOutTime && <span>Egreso: <strong>{att.checkOutTime} hs</strong></span>}
                  <span className="text-[11px] text-gray-400 hidden sm:inline">{att.notes}</span>
                  {canEditPedagogical && (
                    <button
                      type="button"
                      onClick={(e) => handleOpenEditAttendance(att, e)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-700 shadow-2xs active:scale-95 transition-all cursor-pointer"
                      title="Editar registro de asistencia"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#52796F]" />
                      <span>Editar</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Health and Authorizations */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white p-6 rounded-3xl border border-[#E9ECEF] shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#1B4332] text-base flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <span>Ficha Médica y Cuidados</span>
              </h3>
              {canEditPedagogical && (
                <button
                  type="button"
                  onClick={handleOpenEditChild}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EBF3ED] hover:bg-[#D8EADB] text-[#1B4332] text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#52796F]" />
                  <span>Editar Cuidados</span>
                </button>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-[#FAF9F5] border border-[#F0ECE1]">
                <span className="text-gray-400 block mb-0.5">Alergias o Intolerancias:</span>
                <span className="font-semibold text-gray-800">{child.allergies || 'Ninguna registrada'}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#FAF9F5] border border-[#F0ECE1]">
                <span className="text-gray-400 block mb-0.5">Pautas Alimentarias:</span>
                <span className="font-semibold text-gray-800">{child.dietaryNotes || 'Menú general'}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#FAF9F5] border border-[#F0ECE1]">
                <span className="text-gray-400 block mb-0.5">Notas Pediátricas:</span>
                <span className="font-semibold text-gray-800">{child.medicalNotes || 'Controles al día'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-[#E9ECEF] shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#1B4332] text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#52796F]" />
                <span>Autorizaciones de Retiro y Emergencias</span>
              </h3>
              {canEditPedagogical && (
                <button
                  type="button"
                  onClick={handleOpenEditChild}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EBF3ED] hover:bg-[#D8EADB] text-[#1B4332] text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#52796F]" />
                  <span>Editar Contactos</span>
                </button>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-[#FAF9F5] border border-[#F0ECE1]">
                <span className="text-gray-400 block mb-0.5">Contacto Principal de Emergencia:</span>
                <span className="font-semibold text-gray-800">{child.emergencyContact}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#FAF9F5] border border-[#F0ECE1]">
                <span className="text-gray-400 block mb-0.5">Observaciones de Retiro:</span>
                <span className="font-semibold text-gray-800">{child.administrativeNotes}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New / Edit Progress Report Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setEditingReportId(null);
        }}
        title={editingReportId ? "Editar Avance de Aprendizaje y Conducta" : "Registrar Avance de Aprendizaje y Conducta"}
        subtitle={editingReportId ? `Modifique la observación pedagógica para ${child.firstName}` : `Documente el progreso pedagógico y conductual para ${child.firstName}`}
        maxWidth="lg"
      >
        {saveSuccess ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <h4 className="text-base font-bold text-[#1B4332]">
              {editingReportId ? 'Avance actualizado con éxito' : 'Hito guardado con éxito'}
            </h4>
          </div>
        ) : (
          <form onSubmit={handleSaveReport} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Título del Avance o Conducta Observada *</label>
              <input
                type="text"
                required
                value={reportForm.title}
                onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                placeholder="Ej: Curiosidad ante desafíos lúdicos o Cooperación en sala"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Área Pedagógica / Conductual *</label>
                <select
                  value={reportForm.area}
                  onChange={(e) => setReportForm({ ...reportForm, area: e.target.value as DevelopmentArea })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                >
                  <option value="cognitive">Aprendizaje y Exploración Cognitiva</option>
                  <option value="behavior_habits">Comportamiento, Pautas y Convivencia</option>
                  <option value="social_emotional">Socioemocional y Vínculos Afectivos</option>
                  <option value="language">Lenguaje, Comprensión y Diálogo</option>
                  <option value="autonomy">Autonomía y Resolución de Retos</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Período</label>
                <input
                  type="text"
                  value={reportForm.period}
                  onChange={(e) => setReportForm({ ...reportForm, period: e.target.value })}
                  placeholder="Ej: Septiembre 2026"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Observación Pedagógica *</label>
              <textarea
                rows={3}
                required
                value={reportForm.observation}
                onChange={(e) => setReportForm({ ...reportForm, observation: e.target.value })}
                placeholder="Describa de manera positiva y pedagógica los progresos observados en la sala..."
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Fortalezas Destacadas</label>
              <input
                type="text"
                value={reportForm.strengths}
                onChange={(e) => setReportForm({ ...reportForm, strengths: e.target.value })}
                placeholder="Ej: Gran curiosidad y persistencia en los juegos"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Sugerencias para la Familia</label>
              <input
                type="text"
                value={reportForm.recommendations}
                onChange={(e) => setReportForm({ ...reportForm, recommendations: e.target.value })}
                placeholder="Ej: Continuar estimulando con lectura de cuentos cortos antes de dormir"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setIsReportModalOpen(false);
                  setEditingReportId(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs active:scale-95 transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{editingReportId ? 'Actualizar Avance' : 'Guardar Hito'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit Child Modal (Teacher & Admin control) */}
      <Modal
        isOpen={isEditChildModalOpen}
        onClose={() => setIsEditChildModalOpen(false)}
        title={`Editar Ficha de ${child.firstName} ${child.lastName}`}
        subtitle="Control docente y administrativo de datos, salud y cuidados del alumno"
        maxWidth="lg"
      >
        {saveSuccess ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <h4 className="text-base font-bold text-[#1B4332]">Ficha del alumno actualizada</h4>
          </div>
        ) : (
          <form onSubmit={handleSaveChild} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={childForm.firstName || ''}
                  onChange={(e) => setChildForm({ ...childForm, firstName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Apellido *</label>
                <input
                  type="text"
                  required
                  value={childForm.lastName || ''}
                  onChange={(e) => setChildForm({ ...childForm, lastName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Sala Asignada *</label>
                <select
                  value={childForm.roomId || ''}
                  onChange={(e) => setChildForm({ ...childForm, roomId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                >
                  {INITIAL_ROOMS.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha de Nacimiento *</label>
                <input
                  type="date"
                  required
                  value={childForm.birthDate || ''}
                  onChange={(e) => setChildForm({ ...childForm, birthDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-amber-900 mb-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Alergias o Intolerancias Conocidas</span>
              </label>
              <input
                type="text"
                value={childForm.allergies || ''}
                onChange={(e) => setChildForm({ ...childForm, allergies: e.target.value })}
                placeholder="Ej: APLV, Maní, Huevo, o Ninguna registrada"
                className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-amber-50/40 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Pautas de Alimentación / Dieta</label>
                <input
                  type="text"
                  value={childForm.dietaryNotes || ''}
                  onChange={(e) => setChildForm({ ...childForm, dietaryNotes: e.target.value })}
                  placeholder="Ej: Papillas tibias, agua mineral, colación frutas"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notas Pediátricas / Salud</label>
                <input
                  type="text"
                  value={childForm.medicalNotes || ''}
                  onChange={(e) => setChildForm({ ...childForm, medicalNotes: e.target.value })}
                  placeholder="Ej: Vacunación al día, pediatra Dr. Gómez"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Teléfono Principal de Emergencia</label>
                <input
                  type="text"
                  value={childForm.emergencyContact || ''}
                  onChange={(e) => setChildForm({ ...childForm, emergencyContact: e.target.value })}
                  placeholder="Ej: Madre (+54 11 4455-6677)"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Observaciones de Retiro / Personas Autorizadas</label>
                <input
                  type="text"
                  value={childForm.administrativeNotes || ''}
                  onChange={(e) => setChildForm({ ...childForm, administrativeNotes: e.target.value })}
                  placeholder="Ej: Autorizada abuela Marta con DNI"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsEditChildModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Cambios del Alumno</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit Activity Modal in Child Profile */}
      <Modal
        isOpen={isActivityModalOpen}
        onClose={() => {
          setIsActivityModalOpen(false);
          setEditingActivity(null);
        }}
        title="Editar Actividad de la Línea de Tiempo"
        subtitle={`Modifique la rutina o registro diario para ${child.firstName}`}
        maxWidth="md"
      >
        {saveSuccess ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <h4 className="text-base font-bold text-[#1B4332]">Actividad actualizada</h4>
          </div>
        ) : (
          <form onSubmit={handleSaveActivity} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Título de la Actividad *</label>
              <input
                type="text"
                required
                value={activityForm.title || ''}
                onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Horario (hs)</label>
                <input
                  type="text"
                  value={activityForm.time || ''}
                  onChange={(e) => setActivityForm({ ...activityForm, time: e.target.value })}
                  placeholder="10:30"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Categoría</label>
                <select
                  value={activityForm.category || 'activity'}
                  onChange={(e) => setActivityForm({ ...activityForm, category: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                >
                  <option value="activity">Juego / Estimulación</option>
                  <option value="meal">Alimentación</option>
                  <option value="nap">Descanso / Siesta</option>
                  <option value="hygiene">Higiene</option>
                  <option value="milestone">Hito Pedagógico</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Descripción y Detalles *</label>
              <textarea
                rows={3}
                required
                value={activityForm.description || ''}
                onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
              />
            </div>

            {/* Checkbox Importante */}
            <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs font-semibold text-amber-900">
              <input
                type="checkbox"
                checked={!!activityForm.isImportant}
                onChange={(e) => setActivityForm({ ...activityForm, isImportant: e.target.checked })}
                className="w-4 h-4 rounded text-[#1B4332] focus:ring-[#52796F]"
              />
              <span>Marcar como importante (destacar aviso para la familia)</span>
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setIsActivityModalOpen(false);
                  setEditingActivity(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Actividad</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit Attendance Record Modal in Child Profile */}
      <Modal
        isOpen={isAttendanceModalOpen}
        onClose={() => {
          setIsAttendanceModalOpen(false);
          setEditingAttendance(null);
        }}
        title="Editar Registro de Asistencia"
        subtitle={`Modifique la presencia y horarios para ${child.firstName}`}
        maxWidth="sm"
      >
        {saveSuccess ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <h4 className="text-base font-bold text-[#1B4332]">Asistencia actualizada</h4>
          </div>
        ) : (
          <form onSubmit={handleSaveAttendance} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Estado de Asistencia *</label>
              <select
                value={attendanceForm.status || 'present'}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
              >
                <option value="present">Presente</option>
                <option value="absent">Ausente</option>
                <option value="justified">Justificado / Con Licencia</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Horario Ingreso</label>
                <input
                  type="text"
                  value={attendanceForm.checkInTime || ''}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, checkInTime: e.target.value })}
                  placeholder="08:30"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Horario Egreso</label>
                <input
                  type="text"
                  value={attendanceForm.checkOutTime || ''}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, checkOutTime: e.target.value })}
                  placeholder="16:30"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Observaciones</label>
              <input
                type="text"
                value={attendanceForm.notes || ''}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, notes: e.target.value })}
                placeholder="Ej: Ingreso puntual, retirado por mamá"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setIsAttendanceModalOpen(false);
                  setEditingAttendance(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Asistencia</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Card Detail Modal - Instant background scroll lock */}
      <Modal
        isOpen={!!selectedDetail}
        onClose={() => setSelectedDetail(null)}
        title={selectedDetail?.title || 'Detalle Pedagógico'}
        subtitle={selectedDetail?.subtitle}
        maxWidth="md"
      >
        <div className="space-y-4">
          {selectedDetail?.content}
          <div className="flex justify-end pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setSelectedDetail(null)}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Cerrar Detalle
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
