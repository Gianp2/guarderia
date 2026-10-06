import React, { useState, useEffect } from 'react';
import { 
  DoorClosed, 
  Plus, 
  Baby, 
  Clock, 
  Edit3, 
  Save, 
  CheckCircle2,
  GraduationCap,
  Bookmark,
  RotateCcw,
  Palette,
  Info,
  CalendarDays
} from 'lucide-react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase/config';
import { Room, Child, ArgentineEducationCycle, ArgentineShift } from '../../types';
import { INITIAL_ROOMS, INITIAL_CHILDREN } from '../../services/seedData';
import { dataService } from '../../services/dataService';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

// Plantillas y ejemplos típicos del sistema educativo de Nivel Inicial en Argentina
export const ARGENTINE_ROOM_TEMPLATES = [
  {
    templateKey: 'lactantes',
    label: 'Lactantes (45d - 1a)',
    icon: '👶',
    name: 'Sala Lactantes (45 días a 1 año)',
    symbolicName: 'Lactantes - Espacio Cunas',
    cycle: 'Jardín Maternal' as ArgentineEducationCycle,
    shift: 'Jornada Completa' as ArgentineShift,
    ageRange: '45 días a 1 año',
    capacity: 8,
    color: '#0D9488',
    schedule: '08:00 - 17:00 hs',
    description: 'Atención personalizada, estimulación temprana, lactancia diferida y descanso seguro en cunas reglamentarias para bebés desde 45 días al año.'
  },
  {
    templateKey: 'deambuladores',
    label: 'Deambuladores (1 año)',
    icon: '🚶',
    name: 'Sala Deambuladores (1 año)',
    symbolicName: 'Deambuladores - Pasitos',
    cycle: 'Jardín Maternal' as ArgentineEducationCycle,
    shift: 'Jornada Completa' as ArgentineShift,
    ageRange: '12 a 24 meses (1 año)',
    capacity: 12,
    color: '#0284C7',
    schedule: '08:00 - 17:00 hs',
    description: 'Espacio acolchado y seguro para primeros pasos, desplazamiento motor, exploración sensorial, gateo activo y primeras palabras.'
  },
  {
    templateKey: '2anos',
    label: 'Sala 2 Años (Celeste)',
    icon: '🧸',
    name: 'Sala de 2 Años (Sala Celeste)',
    symbolicName: 'Sala Celeste',
    cycle: 'Jardín Maternal' as ArgentineEducationCycle,
    shift: 'Turno Mañana' as ArgentineShift,
    ageRange: '2 años',
    capacity: 15,
    color: '#2563EB',
    schedule: '08:30 - 12:30 hs',
    description: 'Adquisición del lenguaje, juego simbólico, hábitos de convivencia y autonomía, e inicio paulatino del control de esfínteres.'
  },
  {
    templateKey: '3anos',
    label: 'Sala 3 Años (Amarilla)',
    icon: '🎨',
    name: 'Sala de 3 Años (Sala Amarilla)',
    symbolicName: 'Sala Amarilla',
    cycle: 'Jardín de Infantes' as ArgentineEducationCycle,
    shift: 'Turno Mañana' as ArgentineShift,
    ageRange: '3 años',
    capacity: 18,
    color: '#D97706',
    schedule: '08:30 - 12:30 hs',
    description: 'Inicio del ciclo de Jardín de Infantes: juego por rincones, expresión corporal y plástica, ronda inicial y socialización grupal.'
  },
  {
    templateKey: '4anos',
    label: 'Sala 4 Años (Verde)',
    icon: '🌱',
    name: 'Sala de 4 Años (Sala Verde)',
    symbolicName: 'Sala Verde',
    cycle: 'Jardín de Infantes' as ArgentineEducationCycle,
    shift: 'Turno Mañana' as ArgentineShift,
    ageRange: '4 años',
    capacity: 20,
    color: '#16A34A',
    schedule: '08:30 - 12:30 hs',
    description: 'Sala obligatoria: proyectos pedagógicos integrales, iniciación a las ciencias y literatura infantil, psicomotricidad fina y trabajo colaborativo.'
  },
  {
    templateKey: '5anos',
    label: 'Sala 5 Años (Naranja Preescolar)',
    icon: '🎓',
    name: 'Sala de 5 Años - Preescolar (Sala Naranja)',
    symbolicName: 'Sala Naranja',
    cycle: 'Jardín de Infantes' as ArgentineEducationCycle,
    shift: 'Turno Mañana' as ArgentineShift,
    ageRange: '5 años',
    capacity: 22,
    color: '#EA580C',
    schedule: '08:30 - 12:30 hs',
    description: 'Preescolar obligatorio: articulación directa con nivel primario, lectoescritura emergente, nociones lógico-matemáticas y proyectos comunitarios.'
  }
];

// Paleta de colores tradicionales para salas de jardín
const COLOR_OPTIONS = [
  { name: 'Celeste', hex: '#2563EB' },
  { name: 'Amarillo', hex: '#D97706' },
  { name: 'Verde', hex: '#16A34A' },
  { name: 'Naranja', hex: '#EA580C' },
  { name: 'Turquesa', hex: '#0D9488' },
  { name: 'Cielo', hex: '#0284C7' },
  { name: 'Violeta', hex: '#7C3AED' },
  { name: 'Rojo', hex: '#DC2626' },
  { name: 'Rosa', hex: '#DB2777' }
];

export const RoomsManagement: React.FC = () => {
  const toast = useToast();
  const [rooms, setRooms] = useState<Room[]>(() => dataService.getRooms());
  const [childrenList, setChildrenList] = useState<Child[]>(() => dataService.getChildren());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Filtro de ciclo educativo argentino
  const [selectedCycleFilter, setSelectedCycleFilter] = useState<'all' | 'maternal' | 'infantes'>('all');

  // Form State
  const [formData, setFormData] = useState<Partial<Room>>({
    name: '',
    symbolicName: '',
    description: '',
    cycle: 'Jardín Maternal',
    shift: 'Turno Mañana',
    ageRange: '2 años',
    capacity: 15,
    status: 'active',
    schedule: '08:30 - 12:30 hs',
    color: '#2563EB',
    assignedTeacherIds: ['teacher-carla']
  });

  useEffect(() => {
    setRooms(dataService.getRooms());
    setChildrenList(dataService.getChildren());

    const unsubRooms = dataService.subscribe('rooms', () => {
      setRooms(dataService.getRooms());
    });
    const unsubChildren = dataService.subscribe('children', () => {
      setChildrenList(dataService.getChildren());
    });

    dataService.syncFromFirestore();

    return () => {
      unsubRooms();
      unsubChildren();
    };
  }, []);

  const handleOpenCreate = () => {
    setEditingRoom(null);
    setFormData({
      name: '',
      symbolicName: '',
      description: '',
      cycle: 'Jardín Maternal',
      shift: 'Turno Mañana',
      ageRange: '2 años',
      capacity: 15,
      status: 'active',
      schedule: '08:30 - 12:30 hs',
      color: '#2563EB',
      assignedTeacherIds: ['teacher-carla']
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      ...room,
      cycle: room.cycle || (room.ageRange.includes('45') || room.ageRange.includes('1') || room.ageRange.includes('2') ? 'Jardín Maternal' : 'Jardín de Infantes'),
      shift: room.shift || (room.schedule?.includes('17:00') ? 'Jornada Completa' : 'Turno Mañana')
    });
    setIsModalOpen(true);
  };

  // Carga automática de plantilla modelo argentina en el formulario
  const handleApplyTemplate = (tpl: typeof ARGENTINE_ROOM_TEMPLATES[0]) => {
    setFormData(prev => ({
      ...prev,
      name: tpl.name,
      symbolicName: tpl.symbolicName,
      cycle: tpl.cycle,
      shift: tpl.shift,
      ageRange: tpl.ageRange,
      capacity: tpl.capacity,
      color: tpl.color,
      schedule: tpl.schedule,
      description: tpl.description
    }));
    toast.info('Plantilla cargada', `Datos de "${tpl.name}" aplicados al formulario.`);
  };

  // Restablecer todas las salas a las 6 salas modelo de Argentina
  const handleResetToArgentineExamples = async () => {
    if (!confirm('¿Desea restablecer las salas con los ejemplos modelo de jardines de infantes y maternales de Argentina? Podrá editarlas y cambiarlas a las reales cuando lo desee.')) {
      return;
    }

    setRooms(INITIAL_ROOMS);
    try {
      for (const r of INITIAL_ROOMS) {
        await setDoc(doc(db, 'rooms', r.id), r);
      }
    } catch (err) {
      console.warn('Persisted locally:', err);
    }

    toast.success('Salas modelo restablecidas', 'Se cargaron 6 salas representativas de Nivel Inicial en Argentina.');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const id = editingRoom ? editingRoom.id : `room-${Date.now()}`;
    const newRecord: Room = {
      id,
      name: formData.name.trim(),
      symbolicName: formData.symbolicName?.trim() || '',
      description: formData.description?.trim() || '',
      cycle: formData.cycle || 'Jardín Maternal',
      shift: formData.shift || 'Turno Mañana',
      ageRange: formData.ageRange?.trim() || '',
      capacity: Number(formData.capacity) || 15,
      color: formData.color || '#2563EB',
      assignedTeacherIds: formData.assignedTeacherIds || ['teacher-carla'],
      status: formData.status || 'active',
      schedule: formData.schedule?.trim() || '08:30 - 12:30 hs',
      createdAt: editingRoom ? editingRoom.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (editingRoom) {
      setRooms(prev => prev.map(r => r.id === id ? newRecord : r));
    } else {
      setRooms(prev => [...prev, newRecord]);
    }

    await dataService.saveRoom(newRecord);

    try {
      await setDoc(doc(db, 'rooms', id), newRecord);
    } catch (err) {
      console.warn('Saved in memory:', err);
    }

    toast.success(
      editingRoom ? 'Sala actualizada' : 'Sala creada',
      `Configuración de "${newRecord.name}" guardada con éxito.`
    );

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsModalOpen(false);
    }, 900);
  };

  // Contadores por ciclo educativo argentino
  const maternalCount = rooms.filter(r => 
    r.cycle === 'Jardín Maternal' || 
    r.ageRange.includes('45') || 
    r.ageRange.includes('1') || 
    r.ageRange.includes('2')
  ).length;

  const infantesCount = rooms.filter(r => 
    r.cycle === 'Jardín de Infantes' || 
    r.ageRange.includes('3') || 
    r.ageRange.includes('4') || 
    r.ageRange.includes('5')
  ).length;

  // Filtrado activo
  const filteredRooms = rooms.filter(room => {
    const isMaternal = room.cycle === 'Jardín Maternal' || 
      room.ageRange.includes('45') || 
      room.ageRange.includes('1') || 
      room.ageRange.includes('2');

    if (selectedCycleFilter === 'maternal') return isMaternal;
    if (selectedCycleFilter === 'infantes') return !isMaternal;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-[#1B4332] tracking-tight">
              Salas y Espacios Pedagógicos
            </h2>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EBF3ED] text-[#1B4332] border border-[#D1E4D7]">
              Sistema Argentino
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#52796F] mt-0.5">
            Configuración de secciones por edades, aforo máximo, turnos y docentes a cargo.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleResetToArgentineExamples}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl bg-white hover:bg-gray-50 border border-[#E9ECEF] text-gray-700 text-xs font-semibold shadow-2xs active:scale-98 transition-all"
            title="Cargar ejemplos habituales de salas argentinas"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#52796F]" />
            <span>Ejemplos de Argentina</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#52796F] hover:bg-[#405F57] text-white text-xs sm:text-sm font-bold shadow-xs active:scale-98 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nueva Sala</span>
          </button>
        </div>
      </div>

      {/* Guía Estructura de Nivel Inicial en Argentina */}
      <div className="bg-[#FAF9F5] border border-[#EBE7DF] rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#52796F]/10 text-[#52796F] flex items-center justify-center shrink-0 mt-0.5">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-[#1B4332] flex items-center gap-2">
              <span>Estructura de Nivel Inicial en Argentina (Ley 26.206)</span>
            </h4>
            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
              <strong className="text-gray-800">Jardín Maternal:</strong> Lactantes (45d a 1a), Deambuladores (1a) y Sala de 2 años. 
              <br className="hidden sm:inline" />
              <strong className="text-gray-800 ml-0 sm:ml-2">Jardín de Infantes:</strong> Sala de 3, Sala de 4 y Sala de 5 (Preescolar obligatorio).
            </p>
            <span className="text-[11px] text-[#52796F] font-medium block mt-1">
              ✨ Se muestran salas de ejemplo como punto de partida. Podés editar nombres, colores, cupos o reemplazarlas por las salas reales de tu institución.
            </span>
          </div>
        </div>
      </div>

      {/* Filtros por Ciclo Educativo */}
      <div className="inline-flex flex-wrap gap-2 text-xs md:text-sm border-b border-[#E9ECEF] pb-3 w-full">
        <button
          onClick={() => setSelectedCycleFilter('all')}
          className={`inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all cursor-pointer ${
            selectedCycleFilter === 'all'
              ? 'bg-[#1B4332] text-white shadow-xs'
              : 'bg-white hover:bg-gray-100 text-gray-600 border border-[#E9ECEF]'
          }`}
        >
          Todas las Salas ({rooms.length})
        </button>

        <button
          onClick={() => setSelectedCycleFilter('maternal')}
          className={`inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all cursor-pointer ${
            selectedCycleFilter === 'maternal'
              ? 'bg-[#0D9488] text-white shadow-xs'
              : 'bg-white hover:bg-gray-100 text-gray-600 border border-[#E9ECEF]'
          }`}
        >
          <Baby className="w-3.5 h-3.5" />
          <span>Jardín Maternal ({maternalCount})</span>
        </button>

        <button
          onClick={() => setSelectedCycleFilter('infantes')}
          className={`inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all cursor-pointer ${
            selectedCycleFilter === 'infantes'
              ? 'bg-[#2563EB] text-white shadow-xs'
              : 'bg-white hover:bg-gray-100 text-gray-600 border border-[#E9ECEF]'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Jardín de Infantes ({infantesCount})</span>
        </button>
      </div>

      {/* Grid de Salas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredRooms.map((room) => {
          const roomChildren = childrenList.filter(c => c.roomId === room.id);
          const occupancyRate = Math.min(100, Math.round((roomChildren.length / (room.capacity || 1)) * 100));
          const isMaternal = room.cycle === 'Jardín Maternal' || 
            room.ageRange.includes('45') || 
            room.ageRange.includes('1') || 
            room.ageRange.includes('2');

          return (
            <div
              key={room.id}
              className="bg-white rounded-3xl border border-[#E9ECEF] hover:border-[#52796F] p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header Card */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-2xs shrink-0"
                      style={{ backgroundColor: room.color || '#52796F' }}
                    >
                      <DoorClosed className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-[#1B4332] text-base leading-tight truncate">
                        {room.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-semibold text-[#52796F]">
                          {room.ageRange}
                        </span>
                        {room.shift && (
                          <span className="text-[10px] px-2 py-0.2 rounded-md bg-[#FAF9F5] border border-[#EBE7DF] text-gray-600 font-medium">
                            {room.shift}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Badge variant={room.status === 'active' ? 'green' : 'amber'} size="sm">
                    {room.status === 'active' ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>

                {/* Ciclo Educativo Badge */}
                <div className="flex items-center gap-1.5 mb-3">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
                    isMaternal 
                      ? 'bg-teal-50 text-teal-700 border border-teal-200' 
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {isMaternal ? <Baby className="w-3 h-3" /> : <GraduationCap className="w-3 h-3" />}
                    <span>{room.cycle || (isMaternal ? 'Jardín Maternal' : 'Jardín de Infantes')}</span>
                  </span>
                  
                  {room.symbolicName && (
                    <span className="text-[10px] text-gray-500 font-medium truncate">
                      • {room.symbolicName}
                    </span>
                  )}
                </div>

                {/* Descripción Pedagógica */}
                <p className="text-xs text-gray-600 mb-4 leading-relaxed line-clamp-3">
                  {room.description || 'Espacio pedagógico configurado para el desarrollo integral.'}
                </p>

                {/* Barra de Ocupación y Métricas */}
                <div className="p-3 rounded-2xl bg-[#FAF9F5] border border-[#F0ECE1] mb-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-medium">Ocupación de Sala:</span>
                    <span className="font-bold text-[#1B4332]">
                      {roomChildren.length} / {room.capacity} alumnos ({occupancyRate}%)
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{ 
                        width: `${occupancyRate}%`,
                        backgroundColor: room.color || '#52796F'
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                    <span>Docentes a cargo:</span>
                    <span className="font-semibold text-gray-700">
                      {room.assignedTeacherIds?.length || 1} asignado(s)
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Row */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock className="w-3.5 h-3.5 text-[#52796F]" />
                  <span>{room.schedule || '08:00 - 17:00 hs'}</span>
                </div>
                <button
                  onClick={() => handleOpenEdit(room)}
                  className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit / Create Room Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRoom ? `Configurar: ${editingRoom.name}` : 'Crear Nueva Sala'}
        subtitle="Defina las características del espacio, nivel educativo y turnos habituales en Argentina"
        maxWidth="lg"
      >
        {saveSuccess ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2 animate-bounce" />
            <h4 className="text-base font-bold text-[#1B4332]">Sala guardada con éxito</h4>
            <p className="text-xs text-gray-500 mt-1">Los cambios se actualizaron correctamente.</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 max-h-[85vh] overflow-y-auto pr-1">
            {/* Plantillas de Ejemplo de Argentina */}
            <div className="bg-[#FAF9F5] border border-[#EBE7DF] rounded-2xl p-3">
              <label className="block text-xs font-bold text-[#1B4332] mb-1.5 flex items-center gap-1">
                <Bookmark className="w-3.5 h-3.5 text-[#52796F]" />
                <span>Cargar plantilla rápida de ejemplo (Argentina):</span>
              </label>
              <div className="inline-flex flex-wrap gap-2 text-xs md:text-sm">
                {ARGENTINE_ROOM_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.templateKey}
                    type="button"
                    onClick={() => handleApplyTemplate(tpl)}
                    className="inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-full bg-white hover:bg-[#EBF3ED] text-gray-700 hover:text-[#1B4332] border border-[#E2DED5] text-xs md:text-sm font-semibold transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    <span>{tpl.icon}</span>
                    <span>{tpl.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Nombre de la Sala */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nombre de la Sala *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Sala de 2 Años (Sala Celeste)"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F] outline-hidden"
              />
            </div>

            {/* Ciclo Educativo y Turno */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Ciclo / Nivel en Argentina
                </label>
                <select
                  value={formData.cycle}
                  onChange={(e) => setFormData({ ...formData, cycle: e.target.value as ArgentineEducationCycle })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F] bg-white outline-hidden"
                >
                  <option value="Jardín Maternal">Jardín Maternal (45 días a 2 años)</option>
                  <option value="Jardín de Infantes">Jardín de Infantes (3 a 5 años / Preescolar)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Turno habitual
                </label>
                <select
                  value={formData.shift}
                  onChange={(e) => setFormData({ ...formData, shift: e.target.value as ArgentineShift })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F] bg-white outline-hidden"
                >
                  <option value="Turno Mañana">Turno Mañana (TM: ~08:30 a 12:30 hs)</option>
                  <option value="Turno Tarde">Turno Tarde (TT: ~13:00 a 17:00 hs)</option>
                  <option value="Jornada Completa">Jornada Completa (~08:00 a 17:00 hs)</option>
                  <option value="Jornada Extendida">Jornada Extendida con talleres</option>
                </select>
              </div>
            </div>

            {/* Rango de Edad y Capacidad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Rango de Edad
                </label>
                <input
                  type="text"
                  value={formData.ageRange}
                  onChange={(e) => setFormData({ ...formData, ageRange: e.target.value })}
                  placeholder="Ej: 45 días a 1 año, 2 años, 3 años"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Capacidad Máxima (Aforo alumnos)
                </label>
                <input
                  type="number"
                  min={1}
                  max={35}
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F] outline-hidden"
                />
              </div>
            </div>

            {/* Horario y Color identificatorio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Horario de Funcionamiento
                </label>
                <input
                  type="text"
                  value={formData.schedule}
                  onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                  placeholder="Ej: 08:30 - 12:30 hs"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-[#52796F]" />
                  <span>Color identificatorio de la sala</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: c.hex })}
                        style={{ backgroundColor: c.hex }}
                        className={`w-6 h-6 rounded-full border transition-all cursor-pointer ${
                          formData.color === c.hex ? 'ring-2 ring-offset-2 ring-gray-600 scale-110' : 'opacity-80 hover:opacity-100'
                        }`}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Descripción Pedagógica */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Descripción / Enfoque pedagógico
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Objetivos pedagógicos, distribución de rincones o actividades principales..."
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F] outline-hidden"
              />
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs active:scale-98 transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Sala</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
