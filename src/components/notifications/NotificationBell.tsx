import React, { useState, useRef, useEffect } from 'react';
import { Bell, BellRing, CheckCircle2, AlertTriangle, Calendar, Trash2, CheckCheck, ShieldAlert, Sparkles } from 'lucide-react';
import { AppNotification, UserSession } from '../../types';

interface NotificationBellProps {
  notifications: AppNotification[];
  session: UserSession | null;
  pushPermission: NotificationPermission;
  onRequestPushPermission: () => void;
  onSendTestNotification?: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications,
  session,
  pushPermission,
  onRequestPushPermission,
  onSendTestNotification,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Filter notifications relevant strictly to current user for privacy
  const userNotifications = notifications.filter((n) => {
    if (!session) return false;
    if (session.role === 'admin') return true;
    if (session.role === 'client' && session.client) {
      // Strictly only notifications assigned to THIS client ID
      return n.clientId === session.client.id;
    }
    return false;
  });

  const unreadCount = userNotifications.filter((n) => !n.read).length;

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
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

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      {/* Bell Button with Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-amber-500"
        title="Notificações e Avisos de Boletos"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-4 h-4 text-amber-400 animate-bounce" />
        ) : (
          <Bell className="w-4 h-4" />
        )}

        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-rose-600 text-white font-extrabold text-[10px] rounded-full ring-2 ring-slate-950 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-top-2 duration-150">
          
          {/* Header */}
          <div className="p-3.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-black uppercase text-white tracking-wider">
                Notificações de Boletos
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                  {unreadCount} {unreadCount === 1 ? 'nova' : 'novas'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllAsRead}
                  className="p-1 text-slate-400 hover:text-amber-400 rounded transition-colors"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              {userNotifications.length > 0 && (
                <button
                  onClick={onClearAll}
                  className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors"
                  title="Limpar histórico de notificações"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Browser Push Permission & Quick Test Action Banner */}
          <div className="p-3 bg-amber-950/40 border-b border-amber-800/40 flex flex-col gap-2">
            {pushPermission !== 'granted' ? (
              <>
                <div className="flex items-start gap-2 text-xs text-amber-200">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Receba <strong>Alertas Push do Navegador</strong> na criação de novos boletos e na data de vencimento.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onRequestPushPermission}
                    className="flex-1 py-1.5 px-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Ativar Alertas Push</span>
                  </button>
                  {onSendTestNotification && (
                    <button
                      onClick={onSendTestNotification}
                      className="py-1.5 px-2.5 bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-bold text-[11px] rounded-lg transition-colors border border-amber-500/30"
                      title="Testar notificação"
                    >
                      Testar
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Alertas Push Ativos</span>
                </div>
                {onSendTestNotification && (
                  <button
                    onClick={onSendTestNotification}
                    className="py-1 px-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[11px] rounded-lg transition-colors border border-amber-500/30 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Disparar Notificação de Teste</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto divide-y divide-zinc-900 flex-1 min-h-[160px] max-h-[380px]">
            {userNotifications.length === 0 ? (
              <div className="py-12 px-4 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-slate-700" />
                <p className="text-xs font-semibold">Nenhuma notificação recente.</p>
                <p className="text-[11px] text-slate-600">
                  Você receberá alertas quando novos boletos forem gerados ou estiverem perto do vencimento.
                </p>
              </div>
            ) : (
              userNotifications.map((notif) => {
                const isDueDate = notif.type === 'due_date';
                const isOverdue = notif.type === 'overdue';
                const isCreated = notif.type === 'boleto_created';

                return (
                  <div
                    key={notif.id}
                    onClick={() => !notif.read && onMarkAsRead(notif.id)}
                    className={`p-3.5 transition-all flex items-start gap-3 cursor-pointer ${
                      notif.read
                        ? 'bg-zinc-950/80 text-zinc-400 opacity-80 hover:bg-zinc-900/60'
                        : 'bg-zinc-900/90 text-white hover:bg-zinc-800/80 border-l-2 border-amber-400'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {isOverdue ? (
                        <div className="p-1.5 bg-rose-950/80 border border-rose-800 rounded-lg text-rose-400">
                          <ShieldAlert className="w-4 h-4" />
                        </div>
                      ) : isDueDate ? (
                        <div className="p-1.5 bg-amber-950/80 border border-amber-800 rounded-lg text-amber-400">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="p-1.5 bg-emerald-950/80 border border-emerald-800 rounded-lg text-emerald-400">
                          <Calendar className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={`text-xs font-bold truncate ${notif.read ? 'text-zinc-300' : 'text-white'}`}>
                          {notif.title}
                        </h4>
                        <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                          {formatTimestamp(notif.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                        {session?.role === 'client' && session.client
                          ? notif.body
                              .replace(`para ${session.client.name}`, 'para você')
                              .replace(`(${session.client.name})`, '')
                          : notif.body}
                      </p>
                    </div>

                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-2" title="Não lida" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-zinc-900 border-t border-zinc-800 text-center">
            <span className="text-[10px] text-zinc-500">
              Notificações de boleto e vencimentos via Mavie Solution
            </span>
          </div>

        </div>
      )}
    </div>
  );
};
