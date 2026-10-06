import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Baby, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Eye, 
  AlertCircle, 
  Calendar, 
  UserCheck, 
  ShieldAlert,
  Save,
  CheckCircle2
} from 'lucide-react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase/config';
import { Child, Room, EnrollmentStatus } from '../../types';
import { INITIAL_CHILDREN, INITIAL_ROOMS, INITIAL_FAMILIES } from '../../services/seedData';
import { dataService } from '../../services/dataService';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const ChildrenManagement: React.FC = () => {
  const toast = useToast();
  const [childrenList, setChildrenList] = useState<Child[]>(() => dataService.getChildren());
  const [rooms, setRooms] = useState<Room[]>(() => dataService.getRooms());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Child>>({
    firstName: '',
    lastName: '',
    birthDate: '',
    roomId: 'room-cuna',
    enrollmentStatus: 'active',
    enrollmentDate: new Date().toISOString().split('T')[0],
    allergies: '',
    dietaryNotes: '',
    medicalNotes: '',
    emergencyContact: '',
    administrativeNotes: '',
    authorizedParentIds: ['parent-laura']
  });

  useEffect(() => {
    setChildrenList(dataService.getChildren());
    setRooms(dataService.getRooms());

    const unsubChildren = dataService.subscribe('children', () => {
      setChildrenList(dataService.getChildren());
    });
    const unsubRooms = dataService.subscribe('rooms', () => {
      setRooms(dataService.getRooms());
    });

    dataService.syncFromFirestore();

    return () => {
      unsubChildren();
      unsubRooms();
    };
  }, []);

  const handleOpenCreate = () => {
    setEditingChild(null);
    setFormError(null);
    setFormData({
      firstName: '',
      lastName: '',
      birthDate: '2025-06-15',
      roomId: rooms[0]?.id || 'room-cuna',
      enrollmentStatus: 'active',
      enrollmentDate: new Date().toISOString().split('T')[0],
      allergies: 'Ninguna conocida',
      dietaryNotes: '',
      medicalNotes: '',
      emergencyContact: '',
      administrativeNotes: '',
      authorizedParentIds: ['parent-laura']
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (child: Child) => {
    setEditingChild(child);
    setFormError(null);
    setFormData({ ...child });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.firstName || !formData.lastName || !formData.birthDate || !formData.roomId) {
      setFormError('Por favor complete los campos obligatorios marcados con (*).');
      return;
    }

    const assignedRoom = rooms.find(r => r.id === formData.roomId);
    const id = editingChild ? editingChild.id : `child-${Date.now()}`;
    const newRecord: Child = {
      id,
      firstName: formData.firstName!,
      lastName: formData.lastName!,
      birthDate: formData.birthDate!,
      roomId: formData.roomId!,
      roomName: assignedRoom?.name || 'Sala',
      enrollmentStatus: (formData.enrollmentStatus as EnrollmentStatus) || 'active',
      enrollmentDate: formData.enrollmentDate || new Date().toISOString().split('T')[0],
      authorizedParentIds: formData.authorizedParentIds || [],
      allergies: formData.allergies || 'Ninguna',
      dietaryNotes: formData.dietaryNotes || '',
      medicalNotes: formData.medicalNotes || '',
      emergencyContact: formData.emergencyContact || '',
      administrativeNotes: formData.administrativeNotes || '',
      updatedAt: new Date().toISOString(),
      createdAt: editingChild ? editingChild.createdAt : new Date().toISOString()
    };

    // Update local state
    if (editingChild) {
      setChildrenList(prev => prev.map(c => c.id === id ? newRecord : c));
    } else {
      setChildrenList(prev => [newRecord, ...prev]);
    }

    await dataService.saveChild(newRecord);

    // Persist to Firestore if available
    try {
      await setDoc(doc(db, 'children', id), newRecord);
    } catch (err) {
      console.warn('Could not persist to Firestore directly, saved in memory/session:', err);
    }

    toast.success(
      editingChild ? 'Legajo actualizado' : 'Alumno registrado',
      `${newRecord.firstName} ${newRecord.lastName} (${newRecord.roomName}) guardado correctamente`
    );

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsModalOpen(false);
    }, 1000);
  };

  // Filter children
  const filteredChildren = childrenList.filter(child => {
    const matchesSearch = `${child.firstName} ${child.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRoom = selectedRoom === 'all' || child.roomId === selectedRoom;
    const matchesStatus = selectedStatus === 'all' || child.enrollmentStatus === selectedStatus;
    return matchesSearch && matchesRoom && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#1B4332] tracking-tight">
            Gestión y Nómina de Niños
          </h2>
          <p className="text-xs sm:text-sm text-[#52796F]">
            Registro de legajos individuales, salas asignadas, tutores autorizados y fichas médicas.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#52796F] hover:bg-[#405F57] text-white text-xs sm:text-sm font-bold shadow-xs active:scale-98 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Inscribir Nuevo Alumno</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-[#E9ECEF] shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o apellido..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#52796F]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Filtros:</span>
          </div>

          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#52796F] max-w-full"
          >
            <option value="all">Todas las salas</option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#52796F] max-w-full"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="pending">Pendientes</option>
          </select>
        </div>
      </div>

      {/* Children Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filteredChildren.map((child) => (
          <div
            key={child.id}
            className="bg-white rounded-3xl border border-[#E9ECEF] hover:border-[#52796F] p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between overflow-hidden"
          >
            <div>
              {/* Header with avatar & status */}
              <div className="flex items-start justify-between gap-2.5 mb-3 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#EBF3ED] text-[#245436] flex items-center justify-center font-bold text-sm sm:text-base shadow-2xs shrink-0">
                    {child.firstName[0]}{child.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-[#1B4332] text-sm sm:text-base leading-snug truncate">
                      {child.firstName} {child.lastName}
                    </h3>
                    <span className="text-xs text-[#52796F] font-semibold truncate block">
                      {child.roomName || 'Sala Asignada'}
                    </span>
                  </div>
                </div>

                <Badge
                  variant={child.enrollmentStatus === 'active' ? 'green' : 'amber'}
                  size="sm"
                >
                  {child.enrollmentStatus === 'active' ? 'Activo' : child.enrollmentStatus}
                </Badge>
              </div>

              {/* Data fields */}
              <div className="space-y-2 text-xs text-gray-600 bg-[#FAF9F5] p-3 rounded-2xl border border-[#F2EFE8] mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Nacimiento:</span>
                  <span className="font-semibold text-gray-700">{child.birthDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Ingreso:</span>
                  <span className="font-semibold text-gray-700">{child.enrollmentDate}</span>
                </div>
                {child.allergies && (
                  <div className="pt-1 border-t border-gray-200/60 flex items-start gap-1.5 text-amber-800">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="truncate">{child.allergies}</span>
                  </div>
                )}
              </div>

              {child.administrativeNotes && (
                <div className="mb-4 p-2.5 rounded-xl bg-purple-50/70 border border-purple-100 text-[11px] text-purple-900 flex items-start gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-purple-700 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{child.administrativeNotes}</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
              <Link
                to={`/perfil-nino/${child.id}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#FAF9F5] hover:bg-[#F0ECE1] text-xs font-bold text-[#1B4332] border border-[#E4DEC3] transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-[#52796F]" />
                <span>Ver Expediente</span>
              </Link>
              <button
                onClick={() => handleOpenEdit(child)}
                className="p-2 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 border border-gray-200 transition-colors"
                title="Editar información"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Create Child Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingChild ? `Editar Alumno: ${editingChild.firstName}` : 'Inscribir Nuevo Alumno'}
        subtitle="Complete los datos del expediente infantil y tutores autorizados"
        maxWidth="xl"
      >
        {saveSuccess ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
            <h4 className="text-base font-bold text-[#1B4332]">Expediente guardado correctamente</h4>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{formError}</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Ej: Mateo"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Apellido *</label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Ej: Rossi"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha Nacimiento *</label>
                <input
                  type="date"
                  required
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Sala Asignada *</label>
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
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Estado</label>
                <select
                  value={formData.enrollmentStatus}
                  onChange={(e) => setFormData({ ...formData, enrollmentStatus: e.target.value as EnrollmentStatus })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                  <option value="pending">Pendiente</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Alergias o Condiciones</label>
              <input
                type="text"
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                placeholder="Ej: Ninguna conocida, o Intolerancia a la lactosa"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Contacto de Emergencia</label>
              <input
                type="text"
                value={formData.emergencyContact}
                onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                placeholder="Nombre, parentesco y teléfono móvil"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Observaciones Administrativas Restringidas
              </label>
              <textarea
                rows={2}
                value={formData.administrativeNotes}
                onChange={(e) => setFormData({ ...formData, administrativeNotes: e.target.value })}
                placeholder="Autorizaciones especiales de retiro, documentación judicial o seguro médico..."
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
                <span>Guardar Expediente</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
