import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Users, 
  GraduationCap, 
  Sun, 
  Clock, 
  MapPin, 
  AlertCircle, 
  Filter, 
  Download, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  X, 
  CheckCircle2, 
  CalendarDays,
  ListFilter,
  Eye,
  Check
} from 'lucide-react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { CalendarEvent, CalendarEventType, Room } from '../../types';
import { INITIAL_CALENDAR_EVENTS, INITIAL_ROOMS } from '../../services/seedData';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';

interface SchoolCalendarProps {
  defaultRoomFilter?: string; // Optional room filter pre-selected
  compact?: boolean; // For sidebar or embedded widgets
  className?: string;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const SchoolCalendar: React.FC<SchoolCalendarProps> = ({ 
  defaultRoomFilter = 'all',
  compact = false,
  className = ''
}) => {
  const { role, userProfile } = useAuth();
  const toast = useToast();

  const canManage = role === 'admin' || role === 'teacher';

  // Current view reference date (defaults to current date, Oct 2026 in app context)
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    // Oct 2026 as standard school context
    return new Date(2026, 9, 1);
  });

  const [events, setEvents] = useState<CalendarEvent[]>(INITIAL_CALENDAR_EVENTS);
  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState<string>(defaultRoomFilter);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Interactive Selection State
  const [selectedDateStr, setSelectedDateStr] = useState<string>('2026-10-16');
  const [selectedEventDetail, setSelectedEventDetail] = useState<CalendarEvent | null>(null);

  // Creation / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [eventFormData, setEventFormData] = useState<Partial<CalendarEvent>>({
    title: '',
    description: '',
    type: 'school_event',
    date: '2026-10-16',
    startTime: '10:00',
    endTime: '11:30',
    location: 'Salón de Actos',
    targetRoomId: 'all',
    isImportant: false
  });

  // Fetch from Firestore if available
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const snap = await getDocs(collection(db, 'calendarEvents')).catch(() => null);
        if (snap && !snap.empty) {
          const list: CalendarEvent[] = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() } as CalendarEvent));
          setEvents(list);
        }
      } catch (err) {
        console.warn('Using seeded calendar events:', err);
      }
    };
    fetchEvents();
  }, []);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter(evt => {
      const matchCat = selectedCategory === 'all' || evt.type === selectedCategory;
      const matchRoom = selectedRoom === 'all' || !evt.targetRoomId || evt.targetRoomId === 'all' || evt.targetRoomId === selectedRoom;
      return matchCat && matchRoom;
    });
  }, [events, selectedCategory, selectedRoom]);

  // Counts for pills
  const counts = useMemo(() => {
    return {
      all: events.length,
      school_event: events.filter(e => e.type === 'school_event').length,
      holiday: events.filter(e => e.type === 'holiday').length,
      parent_meeting: events.filter(e => e.type === 'parent_meeting').length,
    };
  }, [events]);

  // Calendar Math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = Lun, 6 = Dom
  const prevMonthDays = new Date(year, month, 0).getDate();

  // Navigation
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    const today = new Date(2026, 9, 4); // Consistent with local app context
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateStr(today.toISOString().split('T')[0]);
  };

  // Helper formatting
  const formatDateStr = (y: number, m: number, d: number) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const getEventsForDay = (dateStr: string) => {
    return filteredEvents.filter(e => e.date === dateStr);
  };

  // Category Styling & Metadata
  const getCategoryMeta = (type: CalendarEventType) => {
    switch (type) {
      case 'school_event':
        return {
          label: 'Evento Escolar',
          bgLight: 'bg-emerald-50',
          bgSolid: 'bg-[#52796F]',
          textColor: 'text-[#1B4332]',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          dotClass: 'bg-emerald-600',
          icon: GraduationCap,
          ringColor: 'ring-emerald-500'
        };
      case 'holiday':
        return {
          label: 'Festivo / Feriado',
          bgLight: 'bg-amber-50',
          bgSolid: 'bg-amber-600',
          textColor: 'text-amber-900',
          badgeClass: 'bg-amber-100 text-amber-900 border-amber-200',
          dotClass: 'bg-amber-500',
          icon: Sun,
          ringColor: 'ring-amber-500'
        };
      case 'parent_meeting':
        return {
          label: 'Reunión de Padres',
          bgLight: 'bg-indigo-50',
          bgSolid: 'bg-indigo-600',
          textColor: 'text-indigo-900',
          badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-200',
          dotClass: 'bg-indigo-600',
          icon: Users,
          ringColor: 'ring-indigo-500'
        };
      default:
        return {
          label: 'General',
          bgLight: 'bg-gray-50',
          bgSolid: 'bg-gray-600',
          textColor: 'text-gray-900',
          badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
          dotClass: 'bg-gray-500',
          icon: CalendarIcon,
          ringColor: 'ring-gray-500'
        };
    }
  };

  // Handle Event Creation / Edit
  const handleOpenCreate = (prefillDate?: string) => {
    setEditingEvent(null);
    setFormError(null);
    setEventFormData({
      title: '',
      description: '',
      type: 'school_event',
      date: prefillDate || selectedDateStr || formatDateStr(year, month, 15),
      startTime: '10:00',
      endTime: '11:30',
      location: 'Salón de Usos Múltiples',
      targetRoomId: selectedRoom !== 'all' ? selectedRoom : 'all',
      isImportant: false
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (evt: CalendarEvent, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingEvent(evt);
    setFormError(null);
    setEventFormData({ ...evt });
    setIsModalOpen(true);
  };

  const handleDeleteEvent = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const toDelete = events.find(e => e.id === id);
    if (!confirm(`¿Confirma eliminar el evento "${toDelete?.title || 'seleccionado'}"?`)) return;

    setEvents(prev => prev.filter(evt => evt.id !== id));
    if (selectedEventDetail?.id === id) {
      setSelectedEventDetail(null);
    }
    toast.info('Evento eliminado', `Se quitó "${toDelete?.title || 'el evento'}" del calendario`);

    try {
      await deleteDoc(doc(db, 'calendarEvents', id));
    } catch (err) {
      console.warn('Deleted locally:', err);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!eventFormData.title || !eventFormData.date) {
      setFormError('Por favor complete el título y la fecha del evento.');
      return;
    }

    const assignedRoom = rooms.find(r => r.id === eventFormData.targetRoomId);
    const roomName = eventFormData.targetRoomId === 'all' ? 'Toda la guardería' : (assignedRoom?.name || 'Sala');

    const id = editingEvent ? editingEvent.id : `cal-${Date.now()}`;
    const newRecord: CalendarEvent = {
      id,
      title: eventFormData.title!,
      description: eventFormData.description || '',
      type: (eventFormData.type as CalendarEventType) || 'school_event',
      date: eventFormData.date!,
      startTime: eventFormData.startTime || undefined,
      endTime: eventFormData.endTime || undefined,
      location: eventFormData.location || '',
      targetRoomId: eventFormData.targetRoomId || 'all',
      targetRoomName: roomName,
      isImportant: !!eventFormData.isImportant,
      createdByUserId: userProfile?.id || 'admin',
      createdByName: userProfile?.displayName || 'Dirección',
      createdAt: editingEvent ? editingEvent.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (editingEvent) {
      setEvents(prev => prev.map(evt => evt.id === id ? newRecord : evt));
      if (selectedEventDetail?.id === id) {
        setSelectedEventDetail(newRecord);
      }
      toast.success('Evento actualizado', `"${newRecord.title}" modificado en el calendario`);
    } else {
      setEvents(prev => [...prev, newRecord]);
      setSelectedDateStr(newRecord.date);
      toast.success('Evento programado', `"${newRecord.title}" agregado para el ${newRecord.date}`);
    }

    try {
      await setDoc(doc(db, 'calendarEvents', id), newRecord);
    } catch (err) {
      console.warn('Saved in local state:', err);
    }

    setIsModalOpen(false);
  };

  // Google Calendar Link generator
  const getGoogleCalendarUrl = (evt: CalendarEvent) => {
    const title = encodeURIComponent(`[Nido Cuidado] ${evt.title}`);
    const details = encodeURIComponent(`${evt.description || ''}\n\nUbicación: ${evt.location || 'Guardería Nido Cuidado'}\nDestinatarios: ${evt.targetRoomName || 'General'}`);
    const location = encodeURIComponent(evt.location || 'Nido Cuidado Guardería');

    // format dates YYYYMMDDTHHmmssZ
    const cleanDate = evt.date.replace(/-/g, '');
    let datesParam = `${cleanDate}/${cleanDate}`;
    if (evt.startTime) {
      const cleanStart = evt.startTime.replace(/:/g, '') + '00';
      const cleanEnd = (evt.endTime ? evt.endTime.replace(/:/g, '') : '1200') + '00';
      datesParam = `${cleanDate}T${cleanStart}/${cleanDate}T${cleanEnd}`;
    }

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${datesParam}`;
  };

  // Download .ics file
  const handleDownloadIcs = (evt: CalendarEvent, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const cleanDate = evt.date.replace(/-/g, '');
    const startTimeStr = evt.startTime ? evt.startTime.replace(/:/g, '') + '00' : '090000';
    const endTimeStr = evt.endTime ? evt.endTime.replace(/:/g, '') + '00' : '103000';

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Nido Cuidado//Calendario Escolar//ES',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${evt.id}@nidocuidado.com`,
      `DTSTAMP:${cleanDate}T${startTimeStr}Z`,
      `DTSTART:${cleanDate}T${startTimeStr}`,
      `DTEND:${cleanDate}T${endTimeStr}`,
      `SUMMARY:${evt.title}`,
      `DESCRIPTION:${(evt.description || '').replace(/\n/g, '\\n')}`,
      `LOCATION:${evt.location || 'Guardería Nido Cuidado'}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${evt.title.toLowerCase().replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.info('Recordatorio generado', 'Se descargó el archivo .ics para tu calendario personal');
  };

  // Selected date events
  const selectedDateEvents = useMemo(() => {
    if (!selectedDateStr) return [];
    return getEventsForDay(selectedDateStr);
  }, [selectedDateStr, filteredEvents]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Header Toolbar with Title, View Toggles & Add Action */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E9ECEF] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#EBF3ED] text-[#245436] flex items-center justify-center shrink-0 shadow-2xs">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#1B4332] tracking-tight flex items-center gap-2">
              Calendario Escolar y Fechas Clave
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#1B4332]/10 text-[#1B4332]">
                Interactivo
              </span>
            </h3>
            <p className="text-xs text-[#52796F]">
              Visualización de eventos escolares, feriados y reuniones de familias.
            </p>
          </div>
        </div>

        {/* View Mode & Add Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Grid / List switcher */}
          <div className="inline-flex items-center p-1 bg-[#FAF9F5] rounded-2xl border border-[#EBE7DF]">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-[#1B4332] shadow-2xs border border-[#E0DCD3]'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Mes</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-[#1B4332] shadow-2xs border border-[#E0DCD3]'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={() => handleOpenCreate()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#52796F] hover:bg-[#405F57] text-white text-xs sm:text-sm font-bold shadow-xs active:scale-98 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Evento</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Responsive Filters & Category Pills */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="inline-flex flex-wrap gap-2 text-xs md:text-sm">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#1B4332] text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-[#E9ECEF]'
            }`}
          >
            <span>Todos los Eventos</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold ${
              selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
            }`}>
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('school_event')}
            className={`inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all cursor-pointer ${
              selectedCategory === 'school_event'
                ? 'bg-[#52796F] text-white shadow-xs'
                : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
            <span>Eventos Escolares</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold bg-emerald-100 text-emerald-800">
              {counts.school_event}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('holiday')}
            className={`inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all cursor-pointer ${
              selectedCategory === 'holiday'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-amber-900 hover:bg-amber-50 border border-amber-200'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-600" />
            <span>Festivos y Feriados</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold bg-amber-100 text-amber-900">
              {counts.holiday}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('parent_meeting')}
            className={`inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all cursor-pointer ${
              selectedCategory === 'parent_meeting'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-indigo-900 hover:bg-indigo-50 border border-indigo-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>Reuniones de Padres</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold bg-indigo-100 text-indigo-900">
              {counts.parent_meeting}
            </span>
          </button>
        </div>

        {/* Room Filter Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-500 font-medium">Filtrar sala:</span>
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="text-xs font-bold py-1.5 px-3 bg-white rounded-xl border border-[#E9ECEF] text-[#1B4332] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#52796F]"
          >
            <option value="all">Todas las Salas</option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Main Calendar Container: Month Grid + Day Side Inspector */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Month Calendar Grid (8 cols on desktop) */}
          <div className="lg:col-span-8 bg-white p-4 sm:p-5 rounded-3xl border border-[#E9ECEF] shadow-2xs flex flex-col justify-between">
            {/* Navigation Bar: Month & Year Selector */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h4 className="text-base sm:text-xl font-black text-[#1B4332]">
                  {MONTH_NAMES[month]} {year}
                </h4>
                <button
                  type="button"
                  onClick={handleGoToday}
                  className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-[#FAF9F5] border border-[#EBE7DF] text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Ir a Hoy
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-xl border border-[#E9ECEF] text-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
                  aria-label="Mes anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-xl border border-[#E9ECEF] text-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
                  aria-label="Mes siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
              {DAY_NAMES.map((d, idx) => (
                <div 
                  key={d} 
                  className={`text-[11px] font-bold uppercase tracking-wider py-1 ${
                    idx >= 5 ? 'text-rose-500' : 'text-gray-400'
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Days Matrix */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {/* Previous month padding days */}
              {Array.from({ length: firstDayIndex }).map((_, idx) => {
                const dayNum = prevMonthDays - firstDayIndex + idx + 1;
                return (
                  <div
                    key={`prev-${idx}`}
                    className="min-h-[58px] sm:min-h-[74px] p-1 sm:p-1.5 rounded-xl bg-gray-50/60 border border-transparent text-gray-300 opacity-50 flex flex-col justify-start"
                  >
                    <span className="text-[11px] font-medium">{dayNum}</span>
                  </div>
                );
              })}

              {/* Current Month Days */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dateStr = formatDateStr(year, month, dayNum);
                const dayEvents = getEventsForDay(dateStr);
                const isSelected = selectedDateStr === dateStr;
                const isToday = dateStr === '2026-10-04' || dateStr === new Date().toISOString().split('T')[0];

                return (
                  <div
                    key={`day-${dayNum}`}
                    onClick={() => setSelectedDateStr(dateStr)}
                    className={`min-h-[62px] sm:min-h-[80px] p-1 sm:p-1.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-[#EBF3ED]/80 border-[#52796F] shadow-sm ring-2 ring-[#52796F]/30'
                        : isToday
                        ? 'bg-emerald-50/40 border-emerald-300 hover:border-emerald-400'
                        : 'bg-white hover:bg-[#FAF9F5] border-[#E9ECEF]/80 hover:border-gray-300'
                    }`}
                  >
                    {/* Day number & indicators */}
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold rounded-md px-1 py-0.2 ${
                        isToday
                          ? 'bg-[#52796F] text-white shadow-2xs'
                          : isSelected
                          ? 'text-[#1B4332] font-black'
                          : 'text-gray-700'
                      }`}>
                        {dayNum}
                      </span>

                      {dayEvents.length > 0 && (
                        <div className="flex items-center gap-0.5">
                          {dayEvents.slice(0, 3).map((e) => {
                            const meta = getCategoryMeta(e.type);
                            return (
                              <span 
                                key={e.id} 
                                className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`}
                                title={e.title}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Event pills inside day cell (visible on sm+ screens) */}
                    <div className="mt-1 space-y-1 overflow-hidden">
                      {dayEvents.slice(0, 2).map((evt) => {
                        const meta = getCategoryMeta(evt.type);
                        return (
                          <div
                            key={evt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEventDetail(evt);
                              setSelectedDateStr(evt.date);
                            }}
                            className={`text-[9px] sm:text-[10px] font-bold px-1 py-0.5 rounded truncate border leading-tight ${meta.badgeClass} hover:opacity-85 transition-opacity`}
                            title={evt.title}
                          >
                            {evt.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <span className="text-[9px] font-semibold text-gray-500 block truncate">
                          +{dayEvents.length - 2} más
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day Inspector & Selected Date Events (4 cols on desktop) */}
          <div className="lg:col-span-4 bg-white p-4 sm:p-5 rounded-3xl border border-[#E9ECEF] shadow-2xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#E9ECEF] mb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                  Fecha Seleccionada
                </span>
                <h4 className="text-sm sm:text-base font-bold text-[#1B4332]">
                  {selectedDateStr ? (
                    new Date(selectedDateStr + 'T12:00:00Z').toLocaleDateString('es-ES', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long' 
                    })
                  ) : (
                    'Seleccione un día'
                  )}
                </h4>
              </div>

              {canManage && (
                <button
                  type="button"
                  onClick={() => handleOpenCreate(selectedDateStr)}
                  className="p-1.5 rounded-xl bg-[#EBF3ED] text-[#245436] hover:bg-[#d6e7dc] transition-colors"
                  title="Agregar evento en este día"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* List of events for selected day */}
            <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[380px] pr-1">
              {selectedDateEvents.length === 0 ? (
                <div className="py-8 text-center text-gray-400 space-y-2">
                  <CalendarIcon className="w-8 h-8 mx-auto text-gray-300" />
                  <p className="text-xs">No hay eventos ni reuniones programadas para este día.</p>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleOpenCreate(selectedDateStr)}
                      className="text-xs font-bold text-[#52796F] hover:underline"
                    >
                      + Programar fecha aquí
                    </button>
                  )}
                </div>
              ) : (
                selectedDateEvents.map((evt) => {
                  const meta = getCategoryMeta(evt.type);
                  const Icon = meta.icon;

                  return (
                    <div
                      key={evt.id}
                      onClick={() => setSelectedEventDetail(evt)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer hover:shadow-xs ${meta.bgLight} border-${meta.dotClass.replace('bg-', '')}/30`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`p-1.5 rounded-xl bg-white shadow-2xs ${meta.textColor}`}>
                            <Icon className="w-4 h-4" />
                          </span>
                          <div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${meta.badgeClass}`}>
                              {meta.label}
                            </span>
                          </div>
                        </div>

                        {evt.isImportant && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800">
                            Importante
                          </span>
                        )}
                      </div>

                      <h5 className="text-xs sm:text-sm font-bold text-[#1B4332] mt-2 leading-snug">
                        {evt.title}
                      </h5>

                      {evt.description && (
                        <p className="text-xs text-gray-600 line-clamp-2 mt-1 leading-relaxed">
                          {evt.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 mt-2.5 pt-2 border-t border-black/5">
                        {evt.startTime && (
                          <span className="flex items-center gap-1 font-semibold text-gray-700">
                            <Clock className="w-3 h-3 text-gray-400" />
                            {evt.startTime}{evt.endTime ? ` - ${evt.endTime}` : ''} hs
                          </span>
                        )}
                        {evt.location && (
                          <span className="flex items-center gap-1 truncate max-w-[140px]">
                            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                            {evt.location}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 4. Agenda List View */
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-[#E9ECEF] shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E9ECEF]">
            <h4 className="text-sm sm:text-base font-bold text-[#1B4332]">
              Próximas Fechas del Ciclo Escolar ({filteredEvents.length} eventos)
            </h4>
            <span className="text-xs text-gray-400">Orden cronológico</span>
          </div>

          <div className="divide-y divide-[#E9ECEF]">
            {filteredEvents.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <CalendarIcon className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p className="text-sm">No se encontraron eventos con los filtros seleccionados.</p>
              </div>
            ) : (
              [...filteredEvents]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((evt) => {
                  const meta = getCategoryMeta(evt.type);
                  const Icon = meta.icon;
                  const dateObj = new Date(evt.date + 'T12:00:00Z');

                  return (
                    <div
                      key={evt.id}
                      onClick={() => setSelectedEventDetail(evt)}
                      className="py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-[#FAF9F5] px-2 sm:px-3 rounded-2xl transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-3.5">
                        {/* Date badge */}
                        <div className="w-12 h-12 rounded-2xl bg-[#EBF3ED] text-[#1B4332] flex flex-col items-center justify-center shrink-0 border border-[#D1E4D7] shadow-2xs">
                          <span className="text-[10px] font-bold uppercase text-[#52796F] leading-none">
                            {dateObj.toLocaleDateString('es-ES', { month: 'short' })}
                          </span>
                          <span className="text-base font-black leading-none mt-0.5">
                            {dateObj.getDate()}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold px-2 py-0.2 rounded-md ${meta.badgeClass}`}>
                              {meta.label}
                            </span>
                            {evt.targetRoomName && (
                              <span className="text-[10px] font-medium text-gray-500">
                                • {evt.targetRoomName}
                              </span>
                            )}
                            {evt.isImportant && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-800">
                                Importante
                              </span>
                            )}
                          </div>
                          <h5 className="text-sm sm:text-base font-bold text-[#1B4332] group-hover:text-[#52796F] transition-colors">
                            {evt.title}
                          </h5>
                          {evt.description && (
                            <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">
                              {evt.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Meta & Quick Actions */}
                      <div className="flex items-center gap-3 text-xs text-gray-500 self-end sm:self-center shrink-0">
                        {evt.startTime && (
                          <span className="inline-flex items-center gap-1 font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-xl">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {evt.startTime}{evt.endTime ? ` - ${evt.endTime}` : ''}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDownloadIcs(evt, e)}
                          className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-white border border-[#E9ECEF] transition-all"
                          title="Descargar recordatorio"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* 5. Modal: Event Detail Inspector */}
      <Modal
        isOpen={!!selectedEventDetail}
        onClose={() => setSelectedEventDetail(null)}
        title={selectedEventDetail?.title || 'Detalle del Evento'}
        subtitle={selectedEventDetail ? `Fecha: ${selectedEventDetail.date}` : undefined}
        maxWidth="lg"
      >
        {selectedEventDetail && (() => {
          const meta = getCategoryMeta(selectedEventDetail.type);
          const Icon = meta.icon;
          const gCalUrl = getGoogleCalendarUrl(selectedEventDetail);

          return (
            <div className="space-y-4 text-xs sm:text-sm">
              {/* Category banner */}
              <div className={`p-4 rounded-2xl ${meta.bgLight} border border-black/5 flex items-start gap-3`}>
                <div className={`p-2.5 rounded-xl bg-white shadow-2xs ${meta.textColor}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${meta.badgeClass}`}>
                      {meta.label}
                    </span>
                    {selectedEventDetail.isImportant && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">
                        Fecha Destacada
                      </span>
                    )}
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-[#1B4332] mt-1">
                    {selectedEventDetail.title}
                  </h4>
                </div>
              </div>

              {/* Event Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-[#FAF9F5] rounded-2xl border border-[#EBE7DF]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Fecha y Horario</span>
                  <p className="font-bold text-[#1B4332] mt-0.5">
                    {new Date(selectedEventDetail.date + 'T12:00:00Z').toLocaleDateString('es-ES', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                  {selectedEventDetail.startTime && (
                    <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1 font-semibold">
                      <Clock className="w-3 h-3 text-gray-400" />
                      {selectedEventDetail.startTime} {selectedEventDetail.endTime ? `a ${selectedEventDetail.endTime}` : ''} hs
                    </p>
                  )}
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Lugar / Modalidad</span>
                  <p className="font-bold text-[#1B4332] mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    {selectedEventDetail.location || 'Guardería Nido Cuidado'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Destinado a: <strong className="text-gray-700">{selectedEventDetail.targetRoomName || 'Toda la institución'}</strong>
                  </p>
                </div>
              </div>

              {/* Description */}
              {selectedEventDetail.description && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-gray-700">Detalles y Pautas Informativas</span>
                  <p className="text-xs sm:text-sm text-gray-600 bg-white p-3.5 rounded-2xl border border-[#E9ECEF] leading-relaxed whitespace-pre-wrap">
                    {selectedEventDetail.description}
                  </p>
                </div>
              )}

              {/* Add to Calendar Sync Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E9ECEF]">
                <a
                  href={gCalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white border border-[#E9ECEF] hover:bg-gray-50 font-bold text-gray-700 shadow-2xs transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-blue-600" />
                  <span>Guardar en Google Calendar</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleDownloadIcs(selectedEventDetail)}
                  className="inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white border border-[#E9ECEF] hover:bg-gray-50 font-bold text-gray-700 shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-gray-600" />
                  <span>Descargar .ics</span>
                </button>
              </div>

              {/* Admin / Teacher Actions */}
              {canManage && (
                <div className="flex items-center justify-between pt-2 border-t border-[#E9ECEF]">
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(selectedEventDetail.id)}
                    className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-800 font-bold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar evento</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const evt = selectedEventDetail;
                      setSelectedEventDetail(null);
                      handleOpenEdit(evt);
                    }}
                    className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Modificar fecha</span>
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* 6. Modal: Create / Edit Event Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEvent ? 'Modificar Evento del Calendario' : 'Programar Nuevo Evento o Reunión'}
        subtitle="Registrá eventos institucionales, feriados o convocatorias a familias"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveEvent} className="space-y-4 text-xs sm:text-sm">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Event Category Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Tipo de Evento *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setEventFormData(prev => ({ ...prev, type: 'school_event' }))}
                className={`p-2.5 rounded-2xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  eventFormData.type === 'school_event'
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-[#1B4332] font-bold'
                    : 'bg-white border-[#E9ECEF] text-gray-600 hover:bg-gray-50'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs">Evento Escolar</span>
              </button>

              <button
                type="button"
                onClick={() => setEventFormData(prev => ({ ...prev, type: 'holiday' }))}
                className={`p-2.5 rounded-2xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  eventFormData.type === 'holiday'
                    ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 text-amber-900 font-bold'
                    : 'bg-white border-[#E9ECEF] text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs">Festivo / Feriado</span>
              </button>

              <button
                type="button"
                onClick={() => setEventFormData(prev => ({ ...prev, type: 'parent_meeting' }))}
                className={`p-2.5 rounded-2xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  eventFormData.type === 'parent_meeting'
                    ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-900 font-bold'
                    : 'bg-white border-[#E9ECEF] text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-xs">Reunión de Padres</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Título del Evento *
            </label>
            <input
              type="text"
              required
              value={eventFormData.title || ''}
              onChange={(e) => setEventFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ej: Muestra Anual de Ciencias / Reunión Informativa"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E9ECEF] focus:outline-none focus:ring-2 focus:ring-[#52796F] text-xs sm:text-sm bg-white"
            />
          </div>

          {/* Date and Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Fecha *
              </label>
              <input
                type="date"
                required
                value={eventFormData.date || ''}
                onChange={(e) => setEventFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-[#E9ECEF] focus:outline-none focus:ring-2 focus:ring-[#52796F] text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Horario Inicio
              </label>
              <input
                type="time"
                value={eventFormData.startTime || ''}
                onChange={(e) => setEventFormData(prev => ({ ...prev, startTime: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-[#E9ECEF] focus:outline-none focus:ring-2 focus:ring-[#52796F] text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Horario Fin
              </label>
              <input
                type="time"
                value={eventFormData.endTime || ''}
                onChange={(e) => setEventFormData(prev => ({ ...prev, endTime: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-[#E9ECEF] focus:outline-none focus:ring-2 focus:ring-[#52796F] text-xs bg-white"
              />
            </div>
          </div>

          {/* Location and Target Room */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Lugar o Enlace
              </label>
              <input
                type="text"
                value={eventFormData.location || ''}
                onChange={(e) => setEventFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Ej: Salón de Actos / Patio / Zoom"
                className="w-full px-3 py-2 rounded-xl border border-[#E9ECEF] focus:outline-none focus:ring-2 focus:ring-[#52796F] text-xs bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Destinatarios / Sala
              </label>
              <select
                value={eventFormData.targetRoomId || 'all'}
                onChange={(e) => setEventFormData(prev => ({ ...prev, targetRoomId: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-[#E9ECEF] focus:outline-none focus:ring-2 focus:ring-[#52796F] text-xs bg-white"
              >
                <option value="all">Toda la guardería (Todas las salas)</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Descripción y Pautas para Familias
            </label>
            <textarea
              rows={3}
              value={eventFormData.description || ''}
              onChange={(e) => setEventFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detallar consignas, qué deben traer los niños o temática de la reunión..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E9ECEF] focus:outline-none focus:ring-2 focus:ring-[#52796F] text-xs sm:text-sm bg-white resize-none"
            />
          </div>

          {/* Important Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isImportantEvent"
              checked={!!eventFormData.isImportant}
              onChange={(e) => setEventFormData(prev => ({ ...prev, isImportant: e.target.checked }))}
              className="w-4 h-4 rounded text-[#52796F] focus:ring-[#52796F] border-gray-300 cursor-pointer"
            />
            <label htmlFor="isImportantEvent" className="text-xs font-semibold text-gray-700 cursor-pointer">
              Marcar como fecha prioritaria / destacada (resalta con badge especial)
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E9ECEF]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-[#E9ECEF] text-gray-600 hover:bg-gray-100 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#52796F] hover:bg-[#405F57] text-white font-bold text-xs shadow-xs active:scale-98 transition-all cursor-pointer"
            >
              {editingEvent ? 'Guardar Cambios' : 'Crear Evento'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
