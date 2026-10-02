import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  Baby, 
  CheckCircle2, 
  ShieldCheck, 
  Edit3, 
  Save,
  MapPin,
  Heart,
  AlertCircle
} from 'lucide-react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase/config';
import { Family, Child } from '../../types';
import { INITIAL_FAMILIES, INITIAL_CHILDREN } from '../../services/seedData';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const FamiliesManagement: React.FC = () => {
  const [families, setFamilies] = useState<Family[]>(INITIAL_FAMILIES);
  const [childrenList, setChildrenList] = useState<Child[]>(INITIAL_CHILDREN);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Family>>({
    familyName: '',
    primaryGuardianName: '',
    primaryGuardianEmail: '',
    primaryGuardianPhone: '',
    secondaryGuardianName: '',
    secondaryGuardianPhone: '',
    address: '',
    status: 'active',
    childIds: []
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!auth?.currentUser) return;
      try {
        const [fSnap, cSnap] = await Promise.all([
          getDocs(collection(db, 'families')).catch(() => null),
          getDocs(collection(db, 'children')).catch(() => null),
        ]);
        if (fSnap && !fSnap.empty) {
          const list: Family[] = [];
          fSnap.forEach(d => list.push(d.data() as Family));
          setFamilies(list);
        }
        if (cSnap && !cSnap.empty) {
          const list: Child[] = [];
          cSnap.forEach(d => list.push(d.data() as Child));
          setChildrenList(list);
        }
      } catch (err) {
        console.warn('Using seeded families:', err);
      }
    };
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setEditingFamily(null);
    setFormError(null);
    setFormData({
      familyName: '',
      primaryGuardianName: '',
      primaryGuardianEmail: '',
      primaryGuardianPhone: '',
      secondaryGuardianName: '',
      secondaryGuardianPhone: '',
      address: '',
      status: 'active',
      childIds: []
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (fam: Family) => {
    setEditingFamily(fam);
    setFormError(null);
    setFormData({ ...fam });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.familyName || !formData.primaryGuardianName || !formData.primaryGuardianEmail) {
      setFormError('Por favor complete los campos obligatorios: Apellido familiar, Tutor Principal y Correo Electrónico.');
      return;
    }

    const id = editingFamily ? editingFamily.id : `family-${Date.now()}`;
    const newRecord: Family = {
      id,
      familyName: formData.familyName!,
      primaryGuardianName: formData.primaryGuardianName!,
      primaryGuardianEmail: formData.primaryGuardianEmail!,
      primaryGuardianPhone: formData.primaryGuardianPhone || '',
      secondaryGuardianName: formData.secondaryGuardianName || '',
      secondaryGuardianPhone: formData.secondaryGuardianPhone || '',
      guardianUserIds: editingFamily?.guardianUserIds || ['parent-laura'],
      childIds: formData.childIds || [],
      address: formData.address || '',
      status: formData.status || 'active',
      notes: formData.notes || '',
      createdAt: editingFamily ? editingFamily.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (editingFamily) {
      setFamilies(prev => prev.map(f => f.id === id ? newRecord : f));
    } else {
      setFamilies(prev => [newRecord, ...prev]);
    }

    try {
      await setDoc(doc(db, 'families', id), newRecord);
    } catch (err) {
      console.warn('Persisted locally:', err);
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsModalOpen(false);
    }, 1000);
  };

  const filteredFamilies = families.filter(f => 
    f.familyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.primaryGuardianName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.primaryGuardianEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#1B4332] tracking-tight">
            Familias y Tutores Autorizados
          </h2>
          <p className="text-xs sm:text-sm text-[#52796F]">
            Padrón de tutores primarios, secundarios, canales de comunicación y niños vinculados.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#52796F] hover:bg-[#405F57] text-white text-xs sm:text-sm font-bold shadow-xs active:scale-98 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Vincular Nueva Familia</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-[#E9ECEF] shadow-2xs">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por apellido familiar, tutor o correo..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#52796F]"
          />
        </div>
      </div>

      {/* Families Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
        {filteredFamilies.map((fam) => {
          const linkedChildren = childrenList.filter(c => fam.childIds?.includes(c.id));

          return (
            <div
              key={fam.id}
              className="bg-white rounded-3xl border border-[#E9ECEF] hover:border-[#52796F] p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] text-[#0369A1] flex items-center justify-center font-bold text-lg">
                      <Heart className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1B4332] text-base">
                        {fam.familyName}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {fam.primaryGuardianName}
                      </p>
                    </div>
                  </div>

                  <Badge variant={fam.status === 'active' ? 'green' : 'amber'} size="sm">
                    {fam.status === 'active' ? 'Cuenta Activa' : 'Inactiva'}
                  </Badge>
                </div>

                {/* Contacts Box */}
                <div className="bg-[#FAF9F5] p-3.5 rounded-2xl border border-[#F0ECE1] space-y-2 text-xs text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#52796F]" />
                    <span className="font-medium text-gray-700">{fam.primaryGuardianEmail}</span>
                  </div>
                  {fam.primaryGuardianPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#52796F]" />
                      <span>{fam.primaryGuardianPhone}</span>
                    </div>
                  )}
                  {fam.secondaryGuardianName && (
                    <div className="pt-2 border-t border-gray-200/60 text-[11px] text-gray-500">
                      <strong>Segundo Tutor:</strong> {fam.secondaryGuardianName} {fam.secondaryGuardianPhone ? `(${fam.secondaryGuardianPhone})` : ''}
                    </div>
                  )}
                  {fam.address && (
                    <div className="flex items-center gap-2 text-[11px] text-gray-500">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span>{fam.address}</span>
                    </div>
                  )}
                </div>

                {/* Linked Children */}
                <div>
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                    Hijos Vinculados ({linkedChildren.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {linkedChildren.length > 0 ? (
                      linkedChildren.map(c => (
                        <div 
                          key={c.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#EBF3ED] text-[#245436] text-xs font-semibold border border-[#D1E4D7]"
                        >
                          <Baby className="w-3.5 h-3.5" />
                          <span>{c.firstName} {c.lastName}</span>
                          <span className="text-[10px] text-gray-500 font-normal">({c.roomName})</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400 italic">Sin hijos vinculados actualmente</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer action */}
              <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-end">
                <button
                  onClick={() => handleOpenEdit(fam)}
                  className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar Familia</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit / Create Family Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFamily ? `Editar: ${editingFamily.familyName}` : 'Vincular Nueva Familia'}
        subtitle="Complete los contactos del hogar y autorizaciones de retiro"
        maxWidth="lg"
      >
        {saveSuccess ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <h4 className="text-base font-bold text-[#1B4332]">Familia guardada con éxito</h4>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{formError}</span>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre de Familia *</label>
              <input
                type="text"
                required
                value={formData.familyName}
                onChange={(e) => setFormData({ ...formData, familyName: e.target.value })}
                placeholder="Ej: Familia Rossi"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tutor Primario *</label>
                <input
                  type="text"
                  required
                  value={formData.primaryGuardianName}
                  onChange={(e) => setFormData({ ...formData, primaryGuardianName: e.target.value })}
                  placeholder="Nombre y Apellido"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={formData.primaryGuardianEmail}
                  onChange={(e) => setFormData({ ...formData, primaryGuardianEmail: e.target.value })}
                  placeholder="correo@ejemplo.com"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Teléfono Primario</label>
                <input
                  type="tel"
                  value={formData.primaryGuardianPhone}
                  onChange={(e) => setFormData({ ...formData, primaryGuardianPhone: e.target.value })}
                  placeholder="+54 9 11 ..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tutor Secundario</label>
                <input
                  type="text"
                  value={formData.secondaryGuardianName}
                  onChange={(e) => setFormData({ ...formData, secondaryGuardianName: e.target.value })}
                  placeholder="Nombre y Apellido"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Dirección del Hogar</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Calle, Número, Localidad"
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
                <span>Guardar Familia</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
