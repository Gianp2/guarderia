import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Filter, 
  Calendar, 
  Utensils, 
  Moon, 
  Award, 
  Smile, 
  Bell, 
  Baby, 
  Clock, 
  Save, 
  CheckCircle2,
  Lock,
  Tag,
  AlertCircle,
  Edit3,
  Trash2
} from 'lucide-react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase/config';
import { Activity, ActivityCategory, Child, Room } from '../../types';
import { INITIAL_ACTIVITIES, INITIAL_CHILDREN, INITIAL_ROOMS } from '../../services/seedData';
import { dataService } from '../../services/dataService';
import { pushNotificationService } from '../../services/pushNotificationService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const ActivitiesPage: React.FC = () => {
  const { role, userProfile } = useAuth();
  const toast = useToast();
  const [activities, setActivities] = useState<Activity[]>(() => dataService.getActivities());
  const [childrenList, setChildrenList] = useState<Child[]>(() => dataService.getChildren());
  const [rooms, setRooms] = useState<Room[]>(() => dataService.getRooms());
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [roomFilter, setRoomFilter] = useState<string>('all');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedCardActivity, setSelectedCardActivity] = useState<Activity | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Activity>>({
    title: '',
    description: '',
    category: 'activity',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    roomId: 'room-cuna',
    childIds: [],
    isImportant: false
  });

  const canCreate = role === 'admin' || role === 'teacher';

  useEffect(() => {
    // Sync with central data store and listen for live updates
    setActivities(dataService.getActivities());
    setChildrenList(dataService.getChildren());
    setRooms(dataService.getRooms());

    const unsub = dataService.subscribe('activities', () => {
      setActivities(dataService.getActivities());
    });
    const unsubChildren = dataService.subscribe('children', () => {
      setChildrenList(dataService.getChildren());
    });
    const unsubRooms = dataService.subscribe('rooms', () => {
      setRooms(dataService.getRooms());
    });

    dataService.syncFromFirestore();
    return () => {
      unsub();
      unsubChildren();
      unsubRooms();
    };
  }, []);

  const getCategoryDetails = (cat: ActivityCategory) => {
    switch (cat) {
      case 'meal':
        return { label: 'Alimentación', icon: Utensils, variant: 'amber' as const };
      case 'nap':
        return { label: 'Descanso / Siesta', icon: Moon, variant: 'purple' as const };
      case 'milestone':
        return { label: 'Hito Pedagógico', icon: Award, variant: 'green' as const };
      case 'hygiene':
        return { label: 'Higiene y Mudas', icon: Smile, variant: 'blue' as const };
      default:
        return { label: 'Actividad Lúdica', icon: BookOpen, variant: 'gray' as const };
    }
  };

  const handleOpenCreate = () => {
    setEditingActivity(null);
    setFormError(null);
    setFormData({
      title: '',
      description: '',
      category: 'activity',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      roomId: rooms[0]?.id || 'room-cuna',
      childIds: [],
      isImportant: false
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (act: Activity, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingActivity(act);
    setFormError(null);
    setFormData({
      title: act.title,
      description: act.description,
      category: act.category,
      date: act.date,
      time: act.time,
      roomId: act.roomId,
      childIds: act.childIds || [],
      isImportant: !!act.isImportant
    });
    setIsModalOpen(true);
  };

  const handleDeleteActivity = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const actToDelete = activities.find(a => a.id === id);
    if (!confirm('¿Confirma que desea eliminar esta actividad?')) return;
    
    await dataService.deleteActivity(id);
    setActivities(dataService.getActivities());

    if (selectedCardActivity?.id === id) {
      setSelectedCardActivity(null);
    }
    toast.info('Actividad eliminada', actToDelete ? `"${actToDelete.title}" fue eliminada del registro` : 'El registro ha sido eliminado');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.title || !formData.description) {
      setFormError('Por favor complete el título y la descripción de la actividad.');
      return;
    }

    const assignedRoom = rooms.find(r => r.id === formData.roomId);

    if (editingActivity) {
      const updatedRecord: Activity = {
        ...editingActivity,
        title: formData.title!,
        description: formData.description!,
        category: formData.category as ActivityCategory,
        date: formData.date || editingActivity.date,
        time: formData.time || editingActivity.time,
        roomId: formData.roomId || editingActivity.roomId,
        roomName: assignedRoom?.name || editingActivity.roomName,
        childIds: formData.childIds || editingActivity.childIds,
        isImportant: !!formData.isImportant,
        updatedAt: new Date().toISOString()
      };

      await dataService.saveActivity(updatedRecord);
      setActivities(dataService.getActivities());

      if (selectedCardActivity?.id === editingActivity.id) {
        setSelectedCardActivity(updatedRecord);
      }

      toast.success('Actividad actualizada', `"${updatedRecord.title}" modificada con éxito`);
    } else {
      const id = `act-${Date.now()}`;
      const newRecord: Activity = {
        id,
        title: formData.title!,
        description: formData.description!,
        category: formData.category as ActivityCategory,
        date: formData.date || new Date().toISOString().split('T')[0],
        time: formData.time || '10:00',
        roomId: formData.roomId || 'room-cuna',
        roomName: assignedRoom?.name || 'Sala',
        childIds: formData.childIds || [],
        isImportant: !!formData.isImportant,
        authorUserId: userProfile?.id || 'admin',
        authorName: userProfile?.displayName || 'Educadora',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dataService.saveActivity(newRecord);
      setActivities(dataService.getActivities());

      // Disparar notificación push instantánea a familias vía Service Worker
      pushNotificationService.notifyNewActivity(newRecord).catch(() => {});

      toast.success('Actividad registrada', `"${newRecord.title}" guardada para ${newRecord.roomName}`);
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsModalOpen(false);
      setEditingActivity(null);
      setFormData({
        title: '',
        description: '',
        category: 'activity',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        roomId: 'room-cuna',
        childIds: [],
        isImportant: false
      });
    }, 900);
  };

  // Filter list
  const filteredActivities = activities.filter(act => {
    const matchesCategory = categoryFilter === 'all' || act.category === categoryFilter;
    const matchesRoom = roomFilter === 'all' || act.roomId === roomFilter;
    
    // Parent restriction: see records for their child or general for their child's room
    if (role === 'parent') {
      const linkedIds = userProfile?.linkedChildIds ?? ['child-mateo'];
      const myChildren = childrenList.filter(c => linkedIds.includes(c.id));
      const parentRoomIds = myChildren.map(c => c.roomId);

      const isForMyChild = !act.childIds || act.childIds.length === 0 || act.childIds.some(cid => linkedIds.includes(cid));
      const isForMyRoom = parentRoomIds.includes(act.roomId);
      return matchesCategory && matchesRoom && isForMyRoom && isForMyChild;
    }

    return matchesCategory && matchesRoom;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#1B4332] tracking-tight">
            Bitácora de Actividades y Novedades
          </h2>
          <p className="text-xs sm:text-sm text-[#52796F]">
            Registro diario de estimulación, alimentación, descanso e hitos pedagógicos en tiempo real.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={handleOpenCreate}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#52796F] hover:bg-[#405F57] text-white text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cargar Registro en Bitácora</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-[#E9ECEF] shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-2 text-xs md:text-sm">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-all cursor-pointer ${
              categoryFilter === 'all'
                ? 'bg-[#1B4332] text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas las Categorías
          </button>
          <button
            onClick={() => setCategoryFilter('activity')}
            className={`inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-all cursor-pointer ${
              categoryFilter === 'activity'
                ? 'bg-[#1B4332] text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Juegos / Estimulación
          </button>
          <button
            onClick={() => setCategoryFilter('meal')}
            className={`inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-all cursor-pointer ${
              categoryFilter === 'meal'
                ? 'bg-[#1B4332] text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Alimentación
          </button>
          <button
            onClick={() => setCategoryFilter('nap')}
            className={`inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-all cursor-pointer ${
              categoryFilter === 'nap'
                ? 'bg-[#1B4332] text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Siesta / Descanso
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs md:text-sm font-medium text-gray-700 focus:ring-2 focus:ring-[#52796F]"
          >
            <option value="all">Todas las salas</option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline Feed */}
      <div className="space-y-4">
        {filteredActivities.map((act) => {
          const catInfo = getCategoryDetails(act.category);
          const Icon = catInfo.icon;
          const targetChild = act.childIds && act.childIds.length > 0
            ? childrenList.find(c => c.id === act.childIds![0])
            : null;

          return (
            <div
              key={act.id}
              onClick={() => setSelectedCardActivity(act)}
              className="bg-white rounded-3xl border border-[#E9ECEF] p-5 sm:p-6 shadow-2xs hover:shadow-xs hover:border-[#52796F]/50 transition-all flex flex-col sm:flex-row gap-4 sm:gap-6 items-start cursor-pointer group"
            >
              {/* Category Icon */}
              <div className="w-12 h-12 rounded-2xl bg-[#FAF9F5] border border-[#EBE7DF] text-[#1B4332] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <Icon className="w-6 h-6 text-[#52796F]" />
              </div>

              {/* Main Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant={catInfo.variant} size="sm">
                      {catInfo.label}
                    </Badge>
                    <span className="text-xs font-semibold text-[#52796F]">
                      {act.roomName || 'Sala'}
                    </span>
                    {act.isImportant && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                        <AlertCircle className="w-3 h-3 text-amber-700" />
                        <span>Importante</span>
                      </span>
                    )}
                    {targetChild && (
                      <span className="inline-flex flex-wrap items-center gap-2 text-xs md:text-sm font-semibold text-[#245436] bg-[#EBF3ED] px-2.5 py-0.5 rounded-full border border-[#D1E4D7]">
                        <Baby className="w-3 h-3" />
                        <span>{targetChild.firstName} {targetChild.lastName}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="font-mono">{act.date} • {act.time} hs</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-[#1B4332] mb-1.5 group-hover:text-[#52796F] transition-colors">
                  {act.title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  {act.description}
                </p>

                <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400">
                  <span>Registrado por: <strong className="text-gray-600 font-semibold">{act.authorName}</strong></span>
                  <div className="flex items-center gap-2">
                    {canCreate && (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleOpenEdit(act, e)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#EBF3ED] hover:bg-[#D8EADB] text-[#1B4332] font-bold text-xs transition-all duration-150 active:scale-95 cursor-pointer shadow-2xs"
                          title="Editar actividad"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#52796F]" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteActivity(act.id, e)}
                          className="p-1 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-150 active:scale-95 cursor-pointer"
                          title="Eliminar actividad"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <span className="inline-flex items-center gap-1 text-[#52796F] font-semibold">
                      <span>Ver detalle →</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Activity Form Modal (Create / Edit) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingActivity(null);
        }}
        title={editingActivity ? "Editar Actividad en Bitácora" : "Publicar en Bitácora Diaria"}
        subtitle={editingActivity ? "Modifique los detalles de la actividad para actualizar el expediente" : "Comparta momentos, rutinas de sueño, comidas o hitos del día"}
        maxWidth="lg"
      >
        {saveSuccess ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <h4 className="text-base font-bold text-[#1B4332]">Publicado con éxito</h4>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 max-h-[85vh] overflow-y-auto pr-1">
            {formError && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{formError}</span>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Título de la Entrada *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ej: Siesta reparadora o Colación de frutas"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Categoría *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as ActivityCategory })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                >
                  <option value="activity">Juego / Estimulación</option>
                  <option value="meal">Alimentación</option>
                  <option value="nap">Descanso / Siesta</option>
                  <option value="hygiene">Higiene</option>
                  <option value="milestone">Hito Pedagógico</option>
                  <option value="general">Novedad General</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Sala *</label>
                <select
                  value={formData.roomId}
                  onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                >
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Hora</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Destinatario (Opcional - dejar vacío si es para toda la sala)
              </label>
              <select
                value={formData.childIds?.[0] || ''}
                onChange={(e) => setFormData({ ...formData, childIds: e.target.value ? [e.target.value] : [] })}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
              >
                <option value="">Toda la sala</option>
                {childrenList.map(c => (
                  <option key={c.id} value={c.id}>Solo para: {c.firstName} {c.lastName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Descripción y Detalles *</label>
              <textarea
                rows={3}
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describa el desarrollo de la actividad, cantidades ingeridas, minutos de descanso o respuesta afectiva..."
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
              />
            </div>

            {/* Checkbox Importante */}
            <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs font-semibold text-amber-900">
              <input
                type="checkbox"
                checked={!!formData.isImportant}
                onChange={(e) => setFormData({ ...formData, isImportant: e.target.checked })}
                className="w-4 h-4 rounded text-[#1B4332] focus:ring-[#52796F]"
              />
              <span>Marcar como importante (destacar aviso para las familias)</span>
            </label>

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
                <span>Guardar Entrada</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Activity Card Detail Modal - Instant background scroll lock */}
      <Modal
        isOpen={!!selectedCardActivity}
        onClose={() => setSelectedCardActivity(null)}
        title={selectedCardActivity?.title || 'Detalle de Bitácora'}
        subtitle={`${selectedCardActivity?.roomName || 'Sala'} • ${selectedCardActivity?.date} ${selectedCardActivity?.time ? `a las ${selectedCardActivity.time} hs` : ''}`}
        maxWidth="md"
      >
        {selectedCardActivity && (
          <div className="space-y-4 max-h-[85vh] overflow-y-auto pr-1 text-xs md:text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={getCategoryDetails(selectedCardActivity.category).variant} size="sm">
                {getCategoryDetails(selectedCardActivity.category).label}
              </Badge>
              <span className="text-xs text-[#52796F] font-semibold">
                {selectedCardActivity.roomName || 'Sala general'}
              </span>
              {selectedCardActivity.isImportant && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                  <AlertCircle className="w-3 h-3 text-amber-700" />
                  <span>Importante</span>
                </span>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#F0ECE1]">
              <h4 className="text-base font-bold text-[#1B4332] mb-2">{selectedCardActivity.title}</h4>
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {selectedCardActivity.description}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-400 block mb-0.5">Fecha y Horario</span>
                <span className="font-bold text-[#1B4332]">{selectedCardActivity.date} - {selectedCardActivity.time || '10:00'} hs</span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-400 block mb-0.5">Educadora Responsable</span>
                <span className="font-bold text-[#1B4332]">{selectedCardActivity.authorName}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 gap-2">
              {canCreate ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const act = selectedCardActivity;
                      setSelectedCardActivity(null);
                      handleOpenEdit(act);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#1B4332] bg-[#EBF3ED] hover:bg-[#D8EADB] border border-[#D1E4D7] shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#52796F]" />
                    <span>Editar Actividad</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteActivity(selectedCardActivity.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 shadow-2xs active:scale-95 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                </div>
              ) : <div />}
              <button
                type="button"
                onClick={() => setSelectedCardActivity(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#52796F] hover:bg-[#405F57] shadow-xs cursor-pointer active:scale-95 transition-all"
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
