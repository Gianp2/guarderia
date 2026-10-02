import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Baby, 
  Users, 
  DoorClosed, 
  CalendarCheck2, 
  AlertCircle, 
  ArrowUpRight, 
  Plus, 
  BookOpen, 
  ShieldCheck,
  Clock,
  Sparkles,
  CreditCard,
  DollarSign,
  UserCheck
} from 'lucide-react';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { db, auth } from '../../services/firebase/config';
import { 
  INITIAL_CHILDREN, 
  INITIAL_FAMILIES, 
  INITIAL_ROOMS, 
  INITIAL_USERS, 
  INITIAL_ATTENDANCE, 
  INITIAL_ANNOUNCEMENTS
} from '../../services/seedData';
import { Child, Room, AttendanceRecord, Announcement } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const AdminDashboard: React.FC = () => {
  const [childrenCount, setChildrenCount] = useState<number>(INITIAL_CHILDREN.length);
  const [familiesCount, setFamiliesCount] = useState<number>(INITIAL_FAMILIES.length);
  const [teachersCount, setTeachersCount] = useState<number>(2);
  const [roomsCount, setRoomsCount] = useState<number>(INITIAL_ROOMS.length);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [allergiesAlerts, setAllergiesAlerts] = useState<Child[]>(
    INITIAL_CHILDREN.filter(c => c.allergies && c.allergies !== 'Ninguna' && c.allergies !== 'Ninguna conocida')
  );

  // Financial Stats
  const [totalCollectedMonth, setTotalCollectedMonth] = useState<number>(48000);
  const [totalPendingDebt, setTotalPendingDebt] = useState<number>(145000);
  const [pendingReviewsCount, setPendingReviewsCount] = useState<number>(1);
  
  // Card click view modals (instant background scroll lock)
  const [selectedChildAllergy, setSelectedChildAllergy] = useState<Child | null>(null);
  const [selectedAnnouncementDetail, setSelectedAnnouncementDetail] = useState<Announcement | null>(null);

  useEffect(() => {
    // Attempt live fetch if collections are populated and user is authenticated
    const fetchData = async () => {
      if (!auth?.currentUser) return;
      try {
        const [cSnap, fSnap, rSnap, aSnap, feesSnap, paySnap] = await Promise.all([
          getDocs(collection(db, 'children')).catch(() => null),
          getDocs(collection(db, 'families')).catch(() => null),
          getDocs(collection(db, 'rooms')).catch(() => null),
          getDocs(collection(db, 'announcements')).catch(() => null),
          getDocs(collection(db, 'fees')).catch(() => null),
          getDocs(collection(db, 'payments')).catch(() => null),
        ]);

        if (cSnap && !cSnap.empty) {
          setChildrenCount(cSnap.size);
          const childList: Child[] = [];
          cSnap.forEach(d => childList.push(d.data() as Child));
          setAllergiesAlerts(childList.filter(c => c.allergies && c.allergies !== 'Ninguna' && c.allergies !== 'Ninguna conocida'));
        }
        if (fSnap && !fSnap.empty) setFamiliesCount(fSnap.size);
        if (rSnap && !rSnap.empty) setRoomsCount(rSnap.size);
        if (aSnap && !aSnap.empty) {
          const list: Announcement[] = [];
          aSnap.forEach(d => list.push(d.data() as Announcement));
          setRecentAnnouncements(list.slice(0, 3));
        }

        if (feesSnap && !feesSnap.empty) {
          let collected = 0;
          let pendingDebt = 0;
          feesSnap.forEach(d => {
            const f = d.data();
            if (f.status === 'paid') collected += (f.amount || 0);
            else if (f.status === 'pending' || f.status === 'overdue' || f.status === 'in_review') {
              pendingDebt += (f.amount || 0);
            }
          });
          setTotalCollectedMonth(collected);
          setTotalPendingDebt(pendingDebt);
        }

        if (paySnap && !paySnap.empty) {
          let count = 0;
          paySnap.forEach(d => {
            const p = d.data();
            if (p.method === 'transfer' && p.status === 'pending') count++;
          });
          setPendingReviewsCount(count);
        }
      } catch (err) {
        console.warn('Using seeded data for dashboard metrics:', err);
      }
    };
    fetchData();
  }, []);

  const presentsCount = todayAttendance.filter(a => a.status === 'present').length;
  const absentsCount = todayAttendance.filter(a => a.status === 'absent').length;
  const justifiedCount = todayAttendance.filter(a => a.status === 'justified').length;
  const attendancePercentage = Math.round((presentsCount / (todayAttendance.length || 1)) * 100);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-[#52796F] to-[#2D6A4F] text-white p-5 sm:p-8 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-xs mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#A3B18A]" />
            <span>Ciclo Lectivo 2026 • Turno Activo</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Panel de Dirección y Supervisión
          </h2>
          <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-xl">
            Control integral de salas, nómina de niños, comunicación con familias, asistencia, bitácora pedagógica y finanzas.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <Link
            to="/admin/ninos"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-[#1B4332] text-xs font-bold hover:bg-[#F7F5F0] transition-all shadow-xs active:scale-98"
          >
            <Plus className="w-4 h-4 text-[#52796F]" />
            <span>Inscribir Niño</span>
          </Link>
          <Link
            to="/asistencia"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all border border-white/20 active:scale-98"
          >
            <CalendarCheck2 className="w-4 h-4" />
            <span>Ver Asistencias</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Children Card */}
        <Link 
          to="/admin/ninos" 
          className="bg-white p-3.5 sm:p-5 rounded-3xl border border-[#E9ECEF] hover:border-[#52796F] transition-all hover:shadow-xs group min-w-0 overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#EBF3ED] text-[#245436] flex items-center justify-center font-bold">
              <Baby className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-[#52796F] transition-colors" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#1B4332]">{childrenCount}</div>
          <div className="text-[11px] sm:text-xs font-semibold text-gray-500 mt-0.5 truncate">Niños Registrados</div>
          <div className="text-[10px] sm:text-[11px] text-[#52796F] font-medium mt-1 truncate">4 en Sala Cuna y 1 Año</div>
        </Link>

        {/* Families Card */}
        <Link 
          to="/admin/familias" 
          className="bg-white p-3.5 sm:p-5 rounded-3xl border border-[#E9ECEF] hover:border-[#52796F] transition-all hover:shadow-xs group min-w-0 overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#E0F2FE] text-[#0369A1] flex items-center justify-center font-bold">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-[#0369A1] transition-colors" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#1B4332]">{familiesCount}</div>
          <div className="text-[11px] sm:text-xs font-semibold text-gray-500 mt-0.5 truncate">Familias Vinculadas</div>
          <div className="text-[10px] sm:text-[11px] text-gray-400 mt-1 truncate">Tutores autorizados activos</div>
        </Link>

        {/* Rooms Card */}
        <Link 
          to="/admin/salas" 
          className="bg-white p-3.5 sm:p-5 rounded-3xl border border-[#E9ECEF] hover:border-[#52796F] transition-all hover:shadow-xs group min-w-0 overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#FEF3C7] text-[#92400E] flex items-center justify-center font-bold">
              <DoorClosed className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-[#92400E] transition-colors" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#1B4332]">{roomsCount}</div>
          <div className="text-[11px] sm:text-xs font-semibold text-gray-500 mt-0.5 truncate">Salas Activas</div>
          <div className="text-[10px] sm:text-[11px] text-gray-400 mt-1 truncate">{teachersCount} docentes a cargo</div>
        </Link>

        {/* Teachers / Staff Card */}
        <Link 
          to="/admin/usuarios" 
          className="bg-white p-3.5 sm:p-5 rounded-3xl border border-[#E9ECEF] hover:border-[#52796F] transition-all hover:shadow-xs group min-w-0 overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#F3E8FF] text-[#6B21A8] flex items-center justify-center font-bold">
              <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-[#6B21A8] transition-colors" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#1B4332]">{teachersCount}</div>
          <div className="text-[11px] sm:text-xs font-semibold text-gray-500 mt-0.5 truncate">Docentes Activas</div>
          <div className="text-[10px] sm:text-[11px] text-[#6B21A8] font-medium mt-1 truncate">Asignadas por sala</div>
        </Link>
      </div>

      {/* Financial & Fee Management Summary Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E9ECEF] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold shrink-0 border border-emerald-100">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-[#1B4332] text-base sm:text-lg">
                Resumen de Cuotas y Cobranzas
              </h3>
              {pendingReviewsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 animate-pulse">
                  {pendingReviewsCount} por revisar
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Integración activa de Mercado Pago y validación administrativa de transferencias.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
          <div>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400 block">Recaudado este mes</span>
            <span className="text-lg sm:text-xl font-black text-emerald-700">
              ${totalCollectedMonth.toLocaleString('es-AR')}
            </span>
          </div>

          <div>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400 block">Deuda Pendiente</span>
            <span className="text-lg sm:text-xl font-black text-amber-700">
              ${totalPendingDebt.toLocaleString('es-AR')}
            </span>
          </div>

          <Link
            to="/admin/cuotas"
            className="btn-fluid px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#1B4332] text-white hover:bg-[#2d5f47] shadow-xs flex items-center gap-1.5"
          >
            <CreditCard className="w-4 h-4" />
            <span>Gestionar Cuotas</span>
          </Link>
        </div>
      </div>

      {/* Attendance & Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Summary */}
        <div className="bg-white p-6 rounded-3xl border border-[#E9ECEF] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarCheck2 className="w-5 h-5 text-[#52796F]" />
                <h3 className="font-bold text-[#1B4332] text-sm sm:text-base">
                  Asistencia de Hoy
                </h3>
              </div>
              <span className="text-xs font-semibold text-gray-400">
                {new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </div>

            <div className="flex items-end gap-3 mb-4">
              <span className="text-3xl font-black text-[#1B4332]">{attendancePercentage}%</span>
              <span className="text-xs text-gray-500 pb-1">presentismo general</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center mb-4">
              <div className="p-3 rounded-2xl bg-[#EBF3ED] border border-[#D1E4D7]">
                <div className="text-lg font-bold text-[#245436]">{presentsCount}</div>
                <div className="text-[10px] uppercase font-semibold text-gray-500">Presentes</div>
              </div>
              <div className="p-3 rounded-2xl bg-[#FEE2E2] border border-[#FECACA]">
                <div className="text-lg font-bold text-[#991B1B]">{absentsCount}</div>
                <div className="text-[10px] uppercase font-semibold text-gray-500">Ausentes</div>
              </div>
              <div className="p-3 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A]">
                <div className="text-lg font-bold text-[#92400E]">{justifiedCount}</div>
                <div className="text-[10px] uppercase font-semibold text-gray-500">Justificados</div>
              </div>
            </div>
          </div>

          <Link
            to="/asistencia"
            className="w-full py-2.5 rounded-xl bg-[#FAF9F5] hover:bg-[#F2EFE8] text-xs font-bold text-[#1B4332] text-center border border-[#E8E4DB] transition-colors"
          >
            Gestionar Registro de Asistencia
          </Link>
        </div>

        {/* Medical & Allergies Alert Panel */}
        <div className="bg-white p-6 rounded-3xl border border-[#E9ECEF] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-[#1B4332] text-sm sm:text-base">
                  Alertas Médicas y Dietarias
                </h3>
              </div>
              <Badge variant="amber" size="sm">Atención</Badge>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              Alumnos con requerimientos alimenticios específicos o alertas supervisadas:
            </p>

            <div className="space-y-2.5">
              {allergiesAlerts.slice(0, 3).map((child) => (
                <div 
                  key={child.id}
                  onClick={() => setSelectedChildAllergy(child)}
                  className="p-3 rounded-2xl bg-[#FFFBEB] border border-[#FEF3C7] hover:border-amber-300 hover:bg-[#FEF9C3] transition-all flex items-start gap-3 cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                    {child.firstName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1B4332] group-hover:text-amber-900 transition-colors">
                        {child.firstName} {child.lastName}
                      </span>
                      <span className="text-[10px] text-gray-500">{child.roomName}</span>
                    </div>
                    <p className="text-[11px] text-amber-900 mt-0.5 truncate">
                      {child.allergies || child.dietaryNotes}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Link
            to="/admin/ninos"
            className="w-full mt-4 py-2.5 rounded-xl bg-[#FAF9F5] hover:bg-[#F2EFE8] text-xs font-bold text-[#1B4332] text-center border border-[#E8E4DB] transition-colors"
          >
            Ver Fichas Médicas de Alumnos
          </Link>
        </div>

        {/* Recent Announcements & Notices */}
        <div className="bg-white p-6 rounded-3xl border border-[#E9ECEF] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#52796F]" />
                <h3 className="font-bold text-[#1B4332] text-sm sm:text-base">
                  Novedades Recientes
                </h3>
              </div>
              <Link to="/actividades" className="text-xs font-bold text-[#52796F] hover:underline">
                Ver todas
              </Link>
            </div>

            <div className="space-y-3">
              {recentAnnouncements.map((ann) => (
                <div 
                  key={ann.id} 
                  onClick={() => setSelectedAnnouncementDetail(ann)}
                  className="p-3 rounded-2xl bg-[#FAF9F5] border border-[#F0ECE1] hover:border-[#52796F]/40 hover:bg-[#F5F2EB] transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#1B4332] truncate max-w-[180px] group-hover:text-[#52796F] transition-colors">
                      {ann.title}
                    </span>
                    <Badge variant={ann.importance === 'urgent' ? 'red' : 'green'} size="sm">
                      {ann.importance}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-gray-600 line-clamp-2">
                    {ann.content}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-100 text-[10px] text-gray-400">
                    <span>{ann.authorName}</span>
                    <span>{ann.publishDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Link
            to="/actividades"
            className="w-full mt-4 py-2.5 rounded-xl bg-[#52796F] hover:bg-[#405F57] text-xs font-bold text-white text-center transition-colors shadow-2xs"
          >
            Publicar Nueva Novedad
          </Link>
        </div>
      </div>

      {/* Allergy Alert Card Modal */}
      <Modal
        isOpen={!!selectedChildAllergy}
        onClose={() => setSelectedChildAllergy(null)}
        title={selectedChildAllergy ? `Ficha Médica: ${selectedChildAllergy.firstName} ${selectedChildAllergy.lastName}` : 'Alerta Médica'}
        subtitle={`Sala: ${selectedChildAllergy?.roomName || 'Sala'} • Grupo Sanguíneo: ${selectedChildAllergy?.bloodType || 'A+'}`}
        maxWidth="md"
      >
        {selectedChildAllergy && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <span className="text-amber-900 font-bold block mb-1">Alergias Conocidas:</span>
              <p className="text-amber-800 leading-relaxed font-semibold">{selectedChildAllergy.allergies || 'Sin alergias severas'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Pautas dietarias:</span>
                <span className="font-bold text-[#1B4332]">{selectedChildAllergy.dietaryNotes || 'General'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Pediatra de cabecera:</span>
                <span className="font-bold text-[#1B4332]">{selectedChildAllergy.pediatricianName || 'Dra. Silvina Ramos'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Teléfono Pediatra:</span>
                <span className="font-bold text-[#1B4332]">{selectedChildAllergy.pediatricianPhone || '+54 11 4988-2233'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Contacto de Urgencia:</span>
                <span className="font-bold text-[#1B4332]">{selectedChildAllergy.emergencyContact || 'Padre / Madre directo'}</span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedChildAllergy(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Announcement Detail Modal */}
      <Modal
        isOpen={!!selectedAnnouncementDetail}
        onClose={() => setSelectedAnnouncementDetail(null)}
        title={selectedAnnouncementDetail?.title || 'Comunicado'}
        subtitle={`Fecha de publicación: ${selectedAnnouncementDetail?.publishDate}`}
        maxWidth="md"
      >
        {selectedAnnouncementDetail && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#F0ECE1]">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={selectedAnnouncementDetail.importance === 'urgent' ? 'red' : 'green'} size="sm">
                  {selectedAnnouncementDetail.importance}
                </Badge>
                <span className="font-bold text-[#1B4332] text-sm">{selectedAnnouncementDetail.title}</span>
              </div>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                {selectedAnnouncementDetail.content}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-gray-500">
              <span>Publicado por: <strong className="text-[#1B4332]">{selectedAnnouncementDetail.authorName}</strong></span>
              <span>Destino: <strong>{selectedAnnouncementDetail.targetAudience}</strong></span>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedAnnouncementDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
