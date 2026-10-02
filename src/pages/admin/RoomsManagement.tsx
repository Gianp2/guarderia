import React, { useState, useEffect } from 'react';
import { 
  DoorClosed, 
  Plus, 
  Users, 
  Baby, 
  Clock, 
  Edit3, 
  Save, 
  CheckCircle2,
  GraduationCap
} from 'lucide-react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase/config';
import { Room, Child } from '../../types';
import { INITIAL_ROOMS, INITIAL_CHILDREN } from '../../services/seedData';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const RoomsManagement: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);
  const [childrenList, setChildrenList] = useState<Child[]>(INITIAL_CHILDREN);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Room>>({
    name: '',
    description: '',
    ageRange: '',
    capacity: 10,
    status: 'active',
    schedule: '08:00 - 17:00 hs',
    color: '#76987E'
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!auth?.currentUser) return;
      try {
        const [rSnap, cSnap] = await Promise.all([
          getDocs(collection(db, 'rooms')).catch(() => null),
          getDocs(collection(db, 'children')).catch(() => null),
        ]);
        if (rSnap && !rSnap.empty) {
          const list: Room[] = [];
          rSnap.forEach(d => list.push(d.data() as Room));
          setRooms(list);
        }
        if (cSnap && !cSnap.empty) {
          const list: Child[] = [];
          cSnap.forEach(d => list.push(d.data() as Child));
          setChildrenList(list);
        }
      } catch (err) {
        console.warn('Using seeded rooms:', err);
      }
    };
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setEditingRoom(null);
    setFormData({
      name: '',
      description: '',
      ageRange: '1 a 2 años',
      capacity: 12,
      status: 'active',
      schedule: '08:00 - 17:00 hs',
      color: '#76987E',
      assignedTeacherIds: ['teacher-carla']
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({ ...room });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const id = editingRoom ? editingRoom.id : `room-${Date.now()}`;
    const newRecord: Room = {
      id,
      name: formData.name!,
      description: formData.description || '',
      ageRange: formData.ageRange || '',
      capacity: Number(formData.capacity) || 10,
      color: formData.color || '#76987E',
      assignedTeacherIds: formData.assignedTeacherIds || ['teacher-carla'],
      status: formData.status || 'active',
      schedule: formData.schedule || '08:00 - 17:00 hs',
      createdAt: editingRoom ? editingRoom.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (editingRoom) {
      setRooms(prev => prev.map(r => r.id === id ? newRecord : r));
    } else {
      setRooms(prev => [...prev, newRecord]);
    }

    try {
      await setDoc(doc(db, 'rooms', id), newRecord);
    } catch (err) {
      console.warn('Saved in memory:', err);
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsModalOpen(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#1B4332] tracking-tight">
            Salas y Espacios Pedagógicos
          </h2>
          <p className="text-xs sm:text-sm text-[#52796F]">
            Configuración de secciones por edades, aforo máximo y docentes asignados.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#52796F] hover:bg-[#405F57] text-white text-xs sm:text-sm font-bold shadow-xs active:scale-98 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Nueva Sala</span>
        </button>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {rooms.map((room) => {
          const roomChildren = childrenList.filter(c => c.roomId === room.id);

          return (
            <div
              key={room.id}
              className="bg-white rounded-3xl border border-[#E9ECEF] hover:border-[#52796F] p-6 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-2xs"
                      style={{ backgroundColor: room.color || '#52796F' }}
                    >
                      <DoorClosed className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1B4332] text-lg">
                        {room.name}
                      </h3>
                      <span className="text-xs font-semibold text-[#52796F]">
                        Rango: {room.ageRange}
                      </span>
                    </div>
                  </div>

                  <Badge variant={room.status === 'active' ? 'green' : 'amber'} size="sm">
                    {room.status === 'active' ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>

                <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                  {room.description}
                </p>

                {/* Metrics Row */}
                <div className="grid grid-cols-2 gap-3 text-center p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#F0ECE1] mb-4">
                  <div>
                    <div className="text-base font-bold text-[#1B4332]">
                      {roomChildren.length} / {room.capacity}
                    </div>
                    <div className="text-[10px] text-gray-500 font-semibold uppercase">Alumnos Inscritos</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-[#1B4332]">
                      {room.assignedTeacherIds?.length || 1}
                    </div>
                    <div className="text-[10px] text-gray-500 font-semibold uppercase">Docentes a Cargo</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock className="w-3.5 h-3.5 text-[#52796F]" />
                  <span>{room.schedule || '08:00 - 17:00 hs'}</span>
                </div>
                <button
                  onClick={() => handleOpenEdit(room)}
                  className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Configurar</span>
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
        subtitle="Defina las características del espacio, capacidad y docentes"
        maxWidth="md"
      >
        {saveSuccess ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <h4 className="text-base font-bold text-[#1B4332]">Sala guardada con éxito</h4>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre de la Sala *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Sala 2 Años (Exploradores)"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Descripción pedagógica</label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Objetivo y distribución del espacio..."
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Rango de Edad</label>
                <input
                  type="text"
                  value={formData.ageRange}
                  onChange={(e) => setFormData({ ...formData, ageRange: e.target.value })}
                  placeholder="Ej: 2 a 3 años"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Capacidad Máxima</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                />
              </div>
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
                <span>Guardar Sala</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
