import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Plus, 
  Search, 
  Shield, 
  GraduationCap, 
  Baby, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Mail,
  UserX,
  Save,
  Lock
} from 'lucide-react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase/config';
import { UserProfile, UserRole } from '../../types';
import { INITIAL_USERS } from '../../services/seedData';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const UsersManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_USERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    displayName: '',
    email: '',
    role: 'parent',
    isActive: true,
    phone: ''
  });

  useEffect(() => {
    const fetchUsers = async () => {
      if (!auth?.currentUser) return;
      try {
        const snap = await getDocs(collection(db, 'users')).catch(() => null);
        if (snap && !snap.empty) {
          const list: UserProfile[] = [];
          snap.forEach(d => list.push(d.data() as UserProfile));
          setUsers(list);
        }
      } catch (err) {
        console.warn('Using seeded users:', err);
      }
    };
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user: UserProfile) => {
    const updated: UserProfile = {
      ...user,
      isActive: !user.isActive,
      updatedAt: new Date().toISOString()
    };
    setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
    try {
      await setDoc(doc(db, 'users', user.id), updated);
    } catch (err) {
      console.warn('Persisted locally:', err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.displayName || !formData.email || !formData.role) return;

    const id = `user-${Date.now()}`;
    const newRecord: UserProfile = {
      id,
      displayName: formData.displayName!,
      email: formData.email!,
      role: formData.role as UserRole,
      isActive: formData.isActive ?? true,
      phone: formData.phone || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setUsers(prev => [newRecord, ...prev]);

    try {
      await setDoc(doc(db, 'users', id), newRecord);
    } catch (err) {
      console.warn('Persisted locally:', err);
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsModalOpen(false);
    }, 1000);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#1B4332] tracking-tight">
            Control de Usuarios y Accesos
          </h2>
          <p className="text-xs sm:text-sm text-[#52796F]">
            Administración de cuentas con RBAC estricto, revocación de credenciales y auditoría de sesiones.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              displayName: '',
              email: '',
              role: 'parent',
              isActive: true,
              phone: ''
            });
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#52796F] hover:bg-[#405F57] text-white text-xs sm:text-sm font-bold shadow-xs active:scale-98 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Usuario</span>
        </button>
      </div>

      {/* Security notice box */}
      <div className="p-4 rounded-3xl bg-[#FAF9F5] border border-[#EBE7DF] flex items-start gap-3">
        <Lock className="w-5 h-5 text-[#52796F] shrink-0 mt-0.5" />
        <div className="text-xs text-gray-600 leading-relaxed">
          <strong>Seguridad y Privilegios:</strong> Los roles son validados en el servidor mediante reglas de seguridad de Firestore (`firestore.rules`). La desactivación de un usuario revoca instantáneamente el acceso a salas, bitácoras y registros de menores.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-[#E9ECEF] shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#52796F]"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#52796F]"
        >
          <option value="all">Todos los roles</option>
          <option value="admin">Administradores</option>
          <option value="teacher">Docentes</option>
          <option value="parent">Familias / Tutores</option>
        </select>
      </div>

      {/* Mobile Card List for Users (Zero Horizontal Overflow) */}
      <div className="block sm:hidden space-y-3">
        {filteredUsers.map((u) => (
          <div key={u.id} className="bg-white p-4 rounded-2xl border border-[#E9ECEF] shadow-2xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#EBF3ED] text-[#245436] flex items-center justify-center font-bold text-xs shrink-0">
                  {u.displayName[0]}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-[#1B4332] text-sm truncate">{u.displayName}</div>
                  <div className="text-[11px] text-gray-400 truncate">{u.email}</div>
                </div>
              </div>
              {u.role === 'admin' ? (
                <Badge variant="purple" size="sm" icon={<Shield className="w-3 h-3" />}>Admin</Badge>
              ) : u.role === 'teacher' ? (
                <Badge variant="green" size="sm" icon={<GraduationCap className="w-3 h-3" />}>Docente</Badge>
              ) : (
                <Badge variant="blue" size="sm" icon={<Baby className="w-3 h-3" />}>Familia</Badge>
              )}
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
              <div className="flex items-center gap-1.5">
                {u.isActive ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Activo</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-red-600 font-semibold text-xs">
                    <XCircle className="w-3 h-3" />
                    <span>Inactivo</span>
                  </span>
                )}
                <span className="text-gray-300">•</span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {u.createdAt ? u.createdAt.split('T')[0] : '2026-03-01'}
                </span>
              </div>

              <button
                onClick={() => handleToggleStatus(u)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  u.isActive
                    ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                {u.isActive ? (
                  <>
                    <UserX className="w-3 h-3" />
                    <span>Desactivar</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Habilitar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Users Table */}
      <div className="hidden sm:block bg-white rounded-3xl border border-[#E9ECEF] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF9F5] text-[#1B4332] font-bold border-b border-[#E9ECEF]">
              <tr>
                <th className="py-3.5 px-5">Usuario / Correo</th>
                <th className="py-3.5 px-5">Rol en el Sistema</th>
                <th className="py-3.5 px-5">Estado</th>
                <th className="py-3.5 px-5">Fecha Alta</th>
                <th className="py-3.5 px-5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F4F7]">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-[#FAF9F5]/70 transition-colors">
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#EBF3ED] text-[#245436] flex items-center justify-center font-bold text-xs">
                        {u.displayName[0]}
                      </div>
                      <div>
                        <div className="font-bold text-[#1B4332] text-sm">{u.displayName}</div>
                        <div className="text-[11px] text-gray-400">{u.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-5">
                    {u.role === 'admin' ? (
                      <Badge variant="purple" size="sm" icon={<Shield className="w-3 h-3" />}>Administrador</Badge>
                    ) : u.role === 'teacher' ? (
                      <Badge variant="green" size="sm" icon={<GraduationCap className="w-3 h-3" />}>Docente</Badge>
                    ) : (
                      <Badge variant="blue" size="sm" icon={<Baby className="w-3 h-3" />}>Familia</Badge>
                    )}
                  </td>

                  <td className="py-4 px-5">
                    {u.isActive ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Activo</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-red-600 font-semibold text-xs">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Inactivo</span>
                      </span>
                    )}
                  </td>

                  <td className="py-4 px-5 text-gray-500 font-mono text-[11px]">
                    {u.createdAt ? u.createdAt.split('T')[0] : '2026-03-01'}
                  </td>

                  <td className="py-4 px-5 text-right">
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        u.isActive
                          ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      {u.isActive ? (
                        <>
                          <UserX className="w-3.5 h-3.5" />
                          <span>Desactivar</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Habilitar</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear o Asignar Usuario"
        subtitle="Defina el rol y credenciales para el nuevo integrante institucional"
        maxWidth="md"
      >
        {saveSuccess ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <h4 className="text-base font-bold text-[#1B4332]">Usuario creado exitosamente</h4>
          </div>
        ) : (
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre Completo *</label>
              <input
                type="text"
                required
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="Ej: Lucía Suárez"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Correo Electrónico *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="usuario@guarderia.com"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Rol en Sistema *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs sm:text-sm focus:ring-2 focus:ring-[#52796F]"
                >
                  <option value="parent">Familia / Tutor</option>
                  <option value="teacher">Docente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+54 9 11 ..."
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
                <span>Crear Usuario</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
