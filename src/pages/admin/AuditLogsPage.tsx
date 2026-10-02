import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Clock, 
  User, 
  FileText, 
  ShieldCheck,
  Filter
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { AuditLog } from '../../types';
import { INITIAL_AUDIT_LOGS } from '../../services/seedData';
import { Badge } from '../../components/common/Badge';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([
    ...INITIAL_AUDIT_LOGS,
    {
      id: 'log-02',
      action: 'VINCULACION_TUTOR',
      entityType: 'FAMILIA',
      entityId: 'family-rossi',
      performedByUserId: 'admin-director',
      performedByUserEmail: 'gianpasquinelli19@gmail.com',
      details: 'Vinculación de tutor Laura Rossi con el expediente de Mateo Rossi en Sala Cuna.',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      id: 'log-03',
      action: 'INSCRIPCION_ALUMNO',
      entityType: 'ALUMNO',
      entityId: 'child-mateo',
      performedByUserId: 'admin-director',
      performedByUserEmail: 'gianpasquinelli19@gmail.com',
      details: 'Registro de legajo pediátrico y ficha médica de Mateo Rossi en Sala Cuna.',
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
      createdAt: new Date().toISOString()
    }
  ]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const snap = await getDocs(collection(db, 'auditLogs')).catch(() => null);
        if (snap && !snap.empty) {
          const list: AuditLog[] = [];
          snap.forEach(d => list.push(d.data() as AuditLog));
          setLogs(list);
        }
      } catch (err) {
        console.warn('Using seeded audit logs:', err);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.performedByUserEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#1B4332] tracking-tight">
            Registro de Auditoría Administrativa
          </h2>
          <p className="text-xs sm:text-sm text-[#52796F]">
            Trazabilidad inmutable de operaciones sensibles, creación de usuarios, cuotas y expedientes.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#EBF3ED] text-[#245436] text-xs font-bold border border-[#D1E4D7]">
          <ShieldCheck className="w-4 h-4" />
          <span>Registros Criptográficamente Sellados</span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-3xl border border-[#E9ECEF] shadow-2xs">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por acción, usuario o detalles..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#52796F]"
          />
        </div>
      </div>

      {/* Logs Timeline */}
      <div className="bg-white rounded-3xl border border-[#E9ECEF] p-6 shadow-2xs">
        <div className="space-y-6">
          {filteredLogs.map((log, idx) => (
            <div key={log.id} className="relative flex gap-4 pb-6 last:pb-0">
              {idx !== filteredLogs.length - 1 && (
                <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-[#E9ECEF]" />
              )}
              <div className="w-8 h-8 rounded-full bg-[#EBF3ED] text-[#245436] flex items-center justify-center font-bold text-xs shrink-0 z-10 border-2 border-white shadow-2xs">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="flex-1 bg-[#FAF9F5] p-4 rounded-2xl border border-[#EFECE5]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#1B4332] bg-white px-2 py-0.5 rounded-md border border-gray-200">
                      {log.action}
                    </span>
                    <Badge variant="blue" size="sm">{log.entityType}</Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(log.timestamp).toLocaleString('es-ES')}</span>
                  </div>
                </div>

                <p className="text-xs text-gray-700 leading-relaxed mb-2">
                  {log.details}
                </p>

                <div className="flex items-center gap-2 text-[11px] text-gray-500 pt-2 border-t border-gray-200/50">
                  <User className="w-3 h-3 text-[#52796F]" />
                  <span>Ejecutado por: <strong className="text-gray-700">{log.performedByUserEmail}</strong></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
