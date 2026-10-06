import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CheckCheck, 
  Clock, 
  MapPin, 
  BookOpen, 
  FileText, 
  AlertCircle, 
  ChevronRight,
  Radio
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import { InternalNotification } from '../../types';

export const NotificationDropdown: React.FC = () => {
  const { userProfile, role } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InternalNotification[]>([]);
  const [filterUnread, setFilterUnread] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeUserId = userProfile?.id || 'current-user';

  // Suscripción en tiempo real a Firestore onSnapshot
  useEffect(() => {
    const unsub = notificationService.subscribeToNotifications(
      {
        userId: activeUserId,
        role: role || undefined,
        roomIds: userProfile?.assignedRoomIds || [],
        childIds: userProfile?.linkedChildIds || ['child-mateo'],
        familyId: userProfile?.familyId
      },
      (list) => {
        setNotifications(list);
      }
    );

    return () => {
      unsub();
    };
  }, [activeUserId, role, userProfile?.assignedRoomIds, userProfile?.linkedChildIds, userProfile?.familyId]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter(
    (n) => !n.readByUserIds || !n.readByUserIds.includes(activeUserId)
  ).length;

  const displayedNotifications = filterUnread
    ? notifications.filter((n) => !n.readByUserIds || !n.readByUserIds.includes(activeUserId))
    : notifications;

  const handleMarkAsRead = async (notif: InternalNotification) => {
    await notificationService.markAsRead(notif.id, activeUserId);
    if (notif.url) {
      setIsOpen(false);
      navigate(notif.url);
    }
  };

  const handleMarkAllAsRead = async () => {
    await notificationService.markAllAsRead(activeUserId, notifications);
  };

  const getNotificationIcon = (n: InternalNotification) => {
    switch (n.type) {
      case 'attendance':
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
        );
      case 'activity':
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
        );
      case 'summary':
        return (
          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </div>
        );
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Recién';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Hace ${diffHours} h`;
      return new Date(isoString).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón Campana con Badge en tiempo real */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-gray-600 hover:text-[#1B4332] hover:bg-[#F2F8F4] border border-[#E9ECEF] active:scale-95 transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs"
        title="Centro de notificaciones en tiempo real"
        aria-label="Notificaciones"
      >
        <Bell className="w-4 h-4 transition-transform group-hover:scale-110" />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-white font-black text-[10px] leading-none shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown de Notificaciones */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-200/90 z-50 overflow-hidden animate-fade-in font-['Plus_Jakarta_Sans',sans-serif]">
          {/* Header */}
          <div className="p-3.5 bg-[#FAF9F5] border-b border-gray-200/80 flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-[#1B4332]">
                  Novedades de Guardia y Sala
                </h3>
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded-full border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                  <span>En vivo</span>
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Sincronización instantánea con Firestore
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#52796F] hover:text-[#1B4332] hover:underline cursor-pointer transition-colors"
                title="Marcar todas como leídas"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Leídas</span>
              </button>
            )}
          </div>

          {/* Filtro rápido */}
          <div className="px-3.5 py-2 bg-white border-b border-gray-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFilterUnread(false)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  !filterUnread ? 'bg-[#1B4332] text-white shadow-2xs' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                Todas ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterUnread(true)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  filterUnread ? 'bg-[#1B4332] text-white shadow-2xs' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                No leídas ({unreadCount})
              </button>
            </div>

            <span className="text-[10px] text-gray-400 font-medium">
              Firestore Realtime
            </span>
          </div>

          {/* Lista de Notificaciones */}
          <div className="max-h-88 overflow-y-auto divide-y divide-gray-100">
            {displayedNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-semibold text-gray-500">
                  {filterUnread ? 'No tenés alertas pendientes' : 'Sin notificaciones registradas'}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Las asistencias y registros pedagógicos aparecerán aquí en vivo.
                </p>
              </div>
            ) : (
              displayedNotifications.map((notif) => {
                const isUnread = !notif.readByUserIds || !notif.readByUserIds.includes(activeUserId);

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleMarkAsRead(notif)}
                    className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer group ${
                      isUnread ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    {/* Icono según categoría */}
                    {getNotificationIcon(notif)}

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-xs font-bold leading-tight truncate ${
                          isUnread ? 'text-[#1B4332]' : 'text-gray-700'
                        }`}>
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium shrink-0">
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>

                      <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                        {notif.targetChildName && (
                          <span className="font-semibold text-[#52796F]">
                            👶 {notif.targetChildName}
                          </span>
                        )}
                        {notif.targetRoomName && (
                          <span className="truncate">
                            🏫 {notif.targetRoomName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Indicador no leído o flecha */}
                    <div className="shrink-0 pt-1">
                      {isUnread ? (
                        <span className="block w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-emerald-200" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-[#FAF9F5] border-t border-gray-100 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/familia');
              }}
              className="text-[11px] font-bold text-[#1B4332] hover:text-[#52796F] hover:underline cursor-pointer"
            >
              Ver bitácora y asistencias completas en el Portal →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
