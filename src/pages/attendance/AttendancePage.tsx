import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck2, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Plus, 
  Edit3, 
  Save, 
  Baby,
  Calendar,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase/config';
import { AttendanceRecord, Child, Room, AttendanceStatus } from '../../types';
import { INITIAL_ATTENDANCE, INITIAL_CHILDREN, INITIAL_ROOMS } from '../../services/seedData';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const AttendancePage: React.FC = () => {
  const { role, userProfile } = useAuth();
  const toast = useToast();
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>(() => dataService.getAttendance());
  const [childrenList, setChildrenList] = useState<Child[]>(() => dataService.getChildren());
  const [rooms, setRooms] = useState<Room[]>(() => dataService.getRooms());
  
  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [viewAttendanceRecord, setViewAttendanceRecord] = useState<AttendanceRecord | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<AttendanceRecord>>({
    childId: '',
    date: new Date().toISOString().split('T')[0],
    status: 'present',
    checkInTime: '08:30',
    checkOutTime: '',
    notes: ''
  });

  const canEdit = role === 'admin' || role === 'teacher';

  useEffect(() => {
    // Initial fetch from dataService
    setAttendanceList(dataService.getAttendance());
    setChildrenList(dataService.getChildren());
    setRooms(dataService.getRooms());

    const unsubAttendance = dataService.subscribe('attendance', () => {
      setAttendanceList(dataService.getAttendance());
    });
    const unsubChildren = dataService.subscribe('children', () => {
      setChildrenList(dataService.getChildren());
    });
    const unsubRooms = dataService.subscribe('rooms', () => {
      setRooms(dataService.getRooms());
    });

    dataService.syncFromFirestore();

    return () => {
      unsubAttendance();
      unsubChildren();
      unsubRooms();
    };
  }, []);

  const handleOpenAdd = (child?: Child) => {
    setEditingRecord(null);
    setFormData({
      childId: child?.id || childrenList[0]?.id || '',
      date: selectedDate,
      status: 'present',
      checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      checkOutTime: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    setFormData({ ...rec });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.childId || !formData.date || !formData.status) return;

    const child = childrenList.find(c => c.id === formData.childId);
    const id = editingRecord ? editingRecord.id : `att-${formData.childId}-${formData.date}`;
    
    const newRecord: AttendanceRecord = {
      id,
      childId: formData.childId!,
      childName: child ? `${child.firstName} ${child.lastName}` : 'Alumno',
      roomId: child?.roomId || 'room-cuna',
      date: formData.date!,
      status: formData.status as AttendanceStatus,
      checkInTime: formData.status === 'present' ? (formData.checkInTime || '08:30') : undefined,
      checkOutTime: formData.checkOutTime || undefined,
      notes: formData.notes || '',
      recordedByUserId: userProfile?.id || 'admin',
      recordedByName: userProfile?.displayName || 'Personal de Turno',
      createdAt: editingRecord ? editingRecord.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (editingRecord) {
      setAttendanceList(prev => prev.map(a => a.id === id ? newRecord : a));
    } else {
      // Overwrite if same child & date already exists to prevent duplicate rows
      setAttendanceList(prev => [newRecord, ...prev.filter(a => !(a.childId === formData.childId && a.date === formData.date))]);
    }

    await dataService.saveAttendance(newRecord);

    try {
      await setDoc(doc(db, 'attendance', id), newRecord);
    } catch (err) {
      console.warn('Persisted locally:', err);
    }

    const statusLabel = 
      newRecord.status === 'present' ? 'Presente' :
      newRecord.status === 'absent' ? 'Ausente' : 'Justificado';

    toast.success(
      editingRecord ? 'Asistencia actualizada' : 'Asistencia guardada',
      `${newRecord.childName} registrado como ${statusLabel} (${newRecord.date})`
    );

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsModalOpen(false);
    }, 1000);
  };

  // Filter attendance records
  const filteredAttendance = attendanceList.filter(rec => {
    const matchesDate = !selectedDate || rec.date === selectedDate;
    const matchesRoom = selectedRoom === 'all' || rec.roomId === selectedRoom;
    const matchesStatus = selectedStatus === 'all' || rec.status === selectedStatus;
    
    // Parent restriction: only show own children
    if (role === 'parent') {
      const linkedIds = userProfile?.linkedChildIds ?? ['child-mateo'];
      return matchesDate && matchesRoom && matchesStatus && linkedIds.includes(rec.childId);
    }
    return matchesDate && matchesRoom && matchesStatus;
  });

  const presentsCount = filteredAttendance.filter(a => a.status === 'present').length;
  const absentsCount = filteredAttendance.filter(a => a.status === 'absent').length;
  const justifiedCount = filteredAttendance.filter(a => a.status === 'justified').length;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#1B4332] tracking-tight">
            Control de Asistencia Diaria
          </h2>
          <p className="text-xs sm:text-sm text-[#52796F]">
            Registro de ingresos, egresos de jornada, justificaciones y observaciones pedagógicas.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => handleOpenAdd()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#52796F] hover:bg-[#405F57] text-white text-xs sm:text-sm font-bold shadow-xs active:scale-98 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Entrada / Estado</span>
          </button>
        )}
      </div>

      {/* Date & Filter Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-[#E9ECEF] shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#52796F]" />
          <span className="text-xs font-bold text-gray-700">Fecha:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-800 focus:ring-2 focus:ring-[#52796F]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros:</span>
          </div>

          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 focus:ring-2 focus:ring-[#52796F]"
          >
            <option value="all">Todas las salas</option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 focus:ring-2 focus:ring-[#52796F]"
          >
            <option value="all">Todos los estados</option>
            <option value="present">Presentes</option>
            <option value="absent">Ausentes</option>
            <option value="justified">Justificados</option>
          </select>
        </div>
      </div>

      {/* Daily Summary Ribbon */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-[#FAFDFB] p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-[#D1E4D7] flex items-center justify-between shadow-2xs overflow-hidden">
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs font-bold text-[#245436] uppercase tracking-wider truncate">Presentes</div>
            <div className="text-xl sm:text-2xl font-black text-[#1B4332]">{presentsCount}</div>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#EBF3ED] text-[#245436] flex items-center justify-center font-bold shrink-0 ml-1">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-[#FFFBFB] p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-[#FECACA] flex items-center justify-between shadow-2xs overflow-hidden">
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs font-bold text-[#991B1B] uppercase tracking-wider truncate">Ausentes</div>
            <div className="text-xl sm:text-2xl font-black text-[#991B1B]">{absentsCount}</div>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#FEE2E2] text-[#991B1B] flex items-center justify-center font-bold shrink-0 ml-1">
            <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-[#FFFEF9] p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-[#FDE68A] flex items-center justify-between shadow-2xs overflow-hidden">
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs font-bold text-[#92400E] uppercase tracking-wider truncate">Justif.</div>
            <div className="text-xl sm:text-2xl font-black text-[#92400E]">{justifiedCount}</div>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#FEF3C7] text-[#92400E] flex items-center justify-center font-bold shrink-0 ml-1">
            <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* Mobile Card List for Attendance (Zero Horizontal Overflow) */}
      <div className="block sm:hidden space-y-3">
        {filteredAttendance.length > 0 ? (
          filteredAttendance.map((rec) => (
            <div 
              key={rec.id} 
              onClick={() => setViewAttendanceRecord(rec)}
              className="bg-white p-4 rounded-2xl border border-[#E9ECEF] shadow-2xs hover:shadow-xs hover:border-[#52796F]/40 transition-all space-y-3 cursor-pointer group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#EBF3ED] text-[#245436] flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                    <Baby className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[#1B4332] text-sm truncate group-hover:text-[#52796F] transition-colors">{rec.childName}</div>
                    <div className="text-[10px] text-gray-400">ID: {rec.childId}</div>
                  </div>
                </div>
                {rec.status === 'present' ? (
                  <Badge variant="green" size="sm" icon={<CheckCircle2 className="w-3 h-3" />}>Presente</Badge>
                ) : rec.status === 'absent' ? (
                  <Badge variant="red" size="sm" icon={<XCircle className="w-3 h-3" />}>Ausente</Badge>
                ) : (
                  <Badge variant="amber" size="sm" icon={<HelpCircle className="w-3 h-3" />}>Justificado</Badge>
                )}
              </div>

              <div className="flex items-center justify-between text-xs bg-[#FAF9F5] p-2.5 rounded-xl border border-[#F0ECE1]">
                <div className="flex items-center gap-1 font-semibold text-emerald-700">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Entrada: {rec.checkInTime ? `${rec.checkInTime} hs` : '-'}</span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-sky-700">
                  <Clock className="w-3.5 h-3.5 text-sky-600" />
                  <span>Salida: {rec.checkOutTime ? `${rec.checkOutTime} hs` : 'En guardería'}</span>
                </div>
              </div>

              {rec.notes && (
                <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-xl border border-gray-100">
                  {rec.notes}
                </p>
              )}

              <div className="flex items-center justify-between pt-1 text-[11px] text-gray-400">
                <span>Registrado por: {rec.recordedByName}</span>
                {canEdit ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEdit(rec);
                    }}
                    className="p-1 rounded-lg text-[#52796F] hover:bg-[#EBF3ED] font-semibold flex items-center gap-1 text-xs cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Editar</span>
                  </button>
                ) : (
                  <span className="text-[#52796F] font-semibold">Ver detalle →</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-6 rounded-2xl border border-[#E9ECEF] text-center text-gray-400 text-xs">
            No se encontraron registros de asistencia para esta fecha o filtros seleccionados.
          </div>
        )}
      </div>

      {/* Desktop Attendance Records Table */}
      <div className="hidden sm:block bg-white rounded-3xl border border-[#E9ECEF] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF9F5] text-[#1B4332] font-bold border-b border-[#E9ECEF]">
              <tr>
                <th className="py-3.5 px-5">Alumno</th>
                <th className="py-3.5 px-5">Estado</th>
                <th className="py-3.5 px-5">Entrada</th>
                <th className="py-3.5 px-5">Salida</th>
                <th className="py-3.5 px-5">Observaciones</th>
                <th className="py-3.5 px-5">Registrado por</th>
                {canEdit && <th className="py-3.5 px-5 text-right">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F4F7]">
              {filteredAttendance.length > 0 ? (
                filteredAttendance.map((rec) => (
                  <tr key={rec.id} className="hover:bg-[#FAF9F5]/70 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#EBF3ED] text-[#245436] flex items-center justify-center font-bold text-xs">
                          <Baby className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-[#1B4332] text-sm">{rec.childName}</div>
                          <div className="text-[10px] text-gray-400">ID: {rec.childId}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      {rec.status === 'present' ? (
                        <Badge variant="green" size="sm" icon={<CheckCircle2 className="w-3 h-3" />}>Presente</Badge>
                      ) : rec.status === 'absent' ? (
                        <Badge variant="red" size="sm" icon={<XCircle className="w-3 h-3" />}>Ausente</Badge>
                      ) : (
                        <Badge variant="amber" size="sm" icon={<HelpCircle className="w-3 h-3" />}>Justificado</Badge>
                      )}
                    </td>

                    <td className="py-4 px-5 font-mono text-gray-700">
                      {rec.checkInTime ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                          <Clock className="w-3 h-3 text-emerald-600" />
                          <span>{rec.checkInTime} hs</span>
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>

                    <td className="py-4 px-5 font-mono text-gray-700">
                      {rec.checkOutTime ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-sky-700">
                          <Clock className="w-3 h-3 text-sky-600" />
                          <span>{rec.checkOutTime} hs</span>
                        </span>
                      ) : (
                        <span className="text-amber-600 font-sans text-[11px] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          En guardería
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-5 text-gray-600 max-w-xs truncate">
                      {rec.notes || <span className="text-gray-300 italic">Sin observaciones</span>}
                    </td>

                    <td className="py-4 px-5 text-gray-500 text-[11px]">
                      {rec.recordedByName}
                    </td>

                    {canEdit && (
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => handleOpenEdit(rec)}
                          className="p-1.5 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 border border-gray-200 transition-colors"
                          title="Corregir asistencia / Marcar egreso"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    No se encontraron registros de asistencia para los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Attendance Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRecord ? `Modificar Asistencia: ${editingRecord.childName}` : 'Registrar Asistencia'}
        subtitle="Controle ingreso, salida y observaciones de la jornada"
        maxWidth="md"
      >
        {saveSuccess ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <h4 className="text-base font-bold text-[#1B4332]">Asistencia registrada</h4>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 max-h-[85vh] overflow-y-auto pr-1">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Alumno *</label>
              <select
                disabled={!!editingRecord}
                value={formData.childId}
                onChange={(e) => setFormData({ ...formData, childId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
              >
                {childrenList.map(c => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.roomName})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha *</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Estado *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as AttendanceStatus })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                >
                  <option value="present">Presente</option>
                  <option value="absent">Ausente</option>
                  <option value="justified">Justificado</option>
                </select>
              </div>
            </div>

            {formData.status === 'present' && (
              <div className="grid grid-cols-2 gap-3.5 p-3 rounded-2xl bg-[#FAF9F5] border border-[#EFECE5]">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Hora Ingreso</label>
                  <input
                    type="time"
                    value={formData.checkInTime || '08:30'}
                    onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Hora Egreso (Salida)</label>
                  <input
                    type="time"
                    value={formData.checkOutTime || ''}
                    onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
                    placeholder="HH:MM"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                  />
                  <span className="text-[10px] text-gray-400">Dejar vacío si aún continúa</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Observaciones</label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Persona que lo retira, estado de ánimo o novedad al ingreso..."
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Asistencia</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Attendance Record View Detail Modal - Instant background scroll lock */}
      <Modal
        isOpen={!!viewAttendanceRecord}
        onClose={() => setViewAttendanceRecord(null)}
        title={viewAttendanceRecord?.childName ? `Asistencia: ${viewAttendanceRecord.childName}` : 'Detalle de Asistencia'}
        subtitle={`Fecha: ${viewAttendanceRecord?.date || 'Hoy'}`}
        maxWidth="md"
      >
        {viewAttendanceRecord && (
          <div className="space-y-4 text-xs md:text-sm max-h-[85vh] overflow-y-auto pr-1">
            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#F0ECE1] flex items-center justify-between">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Estado</span>
                <span className="text-sm font-bold text-[#1B4332]">
                  {viewAttendanceRecord.status === 'present' ? 'Presente en Guardería' : viewAttendanceRecord.status === 'absent' ? 'Ausente' : 'Inasistencia Justificada'}
                </span>
              </div>
              {viewAttendanceRecord.status === 'present' ? (
                <Badge variant="green" size="md">Presente</Badge>
              ) : viewAttendanceRecord.status === 'absent' ? (
                <Badge variant="red" size="md">Ausente</Badge>
              ) : (
                <Badge variant="amber" size="md">Justificado</Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-400 block mb-1">Hora de Ingreso</span>
                <span className="font-bold text-emerald-700 text-sm">{viewAttendanceRecord.checkInTime ? `${viewAttendanceRecord.checkInTime} hs` : '-'}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-400 block mb-1">Hora de Salida</span>
                <span className="font-bold text-sky-700 text-sm">{viewAttendanceRecord.checkOutTime ? `${viewAttendanceRecord.checkOutTime} hs` : 'En sala'}</span>
              </div>
            </div>

            {viewAttendanceRecord.notes && (
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-400 block mb-1">Observaciones registradas:</span>
                <p className="text-gray-700 leading-relaxed font-medium">{viewAttendanceRecord.notes}</p>
              </div>
            )}

            <div className="p-3 rounded-xl bg-[#FAF9F5] text-[11px] text-gray-500 border border-[#F0ECE1]">
              Registrado por personal autorizado: <strong className="text-[#1B4332]">{viewAttendanceRecord.recordedByName}</strong>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setViewAttendanceRecord(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
