import React from 'react';
import { ShieldCheck, User, LogOut, FileText, Ticket, CreditCard, LayoutDashboard, RefreshCw, TrendingUp, KeyRound } from 'lucide-react';
import { UserSession, AppNotification } from '../types';
import { MavieLogo } from './MavieLogo';
import { NotificationBell } from './notifications/NotificationBell';

interface HeaderProps {
  session: UserSession | null;
  onLogout: () => void;
  onOpenAdminLogin: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onResetData?: () => void;
  onOpenEditAdminPassword?: () => void;
  onOpenEditClientPassword?: () => void;
  notifications?: AppNotification[];
  pushPermission?: NotificationPermission;
  onRequestPushPermission?: () => void;
  onSendTestNotification?: () => void;
  onMarkNotificationAsRead?: (id: string) => void;
  onMarkAllNotificationsAsRead?: () => void;
  onClearAllNotifications?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  onLogout,
  onOpenAdminLogin,
  activeTab,
  onTabChange,
  onResetData,
  onOpenEditAdminPassword,
  onOpenEditClientPassword,
  notifications = [],
  pushPermission = 'default',
  onRequestPushPermission = () => {},
  onSendTestNotification,
  onMarkNotificationAsRead = () => {},
  onMarkAllNotificationsAsRead = () => {},
  onClearAllNotifications = () => {},
}) => {
  return (
    <header className="bg-black/95 backdrop-blur-md text-white sticky top-0 z-40 shadow-2xl border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo Component */}
          <div 
            onClick={() => session && onTabChange(session.role === 'admin' ? 'dashboard' : 'boletos')} 
            className="cursor-pointer flex items-center gap-3 py-1"
          >
            <MavieLogo size="md" showSubtitle={true} layout="horizontal" />
          </div>

          {/* Navigation Links depending on session */}
          {session && (
            <div className="hidden lg:flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800/80">
              {session.role === 'client' ? (
                <>
                  <button
                    onClick={() => onTabChange('boletos')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === 'boletos'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Boletos & Pagamentos</span>
                  </button>
                  <button
                    onClick={() => onTabChange('nfes')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === 'nfes'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Notas Fiscais</span>
                  </button>
                  <button
                    onClick={() => onTabChange('tickets')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === 'tickets'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    <span>Chamados de Suporte</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onTabChange('dashboard')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === 'dashboard'
                        ? 'bg-indigo-600 text-white shadow-sm font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Dashboard</span>
                  </button>
                  <button
                    onClick={() => onTabChange('clients')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === 'clients'
                        ? 'bg-indigo-600 text-white shadow-sm font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Clientes</span>
                  </button>
                  <button
                    onClick={() => onTabChange('admin-financial')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === 'admin-financial'
                        ? 'bg-emerald-600 text-white shadow-sm font-bold ring-1 ring-emerald-400/50'
                        : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Financeiro & Previsão</span>
                  </button>
                  <button
                    onClick={() => onTabChange('admin-boletos')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === 'admin-boletos'
                        ? 'bg-indigo-600 text-white shadow-sm font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Boletos</span>
                  </button>
                  <button
                    onClick={() => onTabChange('admin-nfes')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === 'admin-nfes'
                        ? 'bg-indigo-600 text-white shadow-sm font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Notas Fiscais</span>
                  </button>
                  <button
                    onClick={() => onTabChange('admin-tickets')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === 'admin-tickets'
                        ? 'bg-indigo-600 text-white shadow-sm font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    <span>Atendimento</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* User Status Badge & Actions */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <NotificationBell
              notifications={notifications}
              session={session}
              pushPermission={pushPermission}
              onRequestPushPermission={onRequestPushPermission}
              onSendTestNotification={onSendTestNotification}
              onMarkAsRead={onMarkNotificationAsRead}
              onMarkAllAsRead={onMarkAllNotificationsAsRead}
              onClearAll={onClearAllNotifications}
            />

            {session ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs">
                  {session.role === 'client' ? (
                    <>
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-semibold text-slate-100 max-w-[140px] truncate">
                        {session.client?.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-bold text-amber-300 uppercase tracking-wide">
                        Gestor (Admin)
                      </span>
                    </>
                  )}
                </div>

                {session.role === 'admin' && onOpenEditAdminPassword && (
                  <button
                    onClick={onOpenEditAdminPassword}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg transition-colors border border-amber-500/30"
                    title="Alterar Senha do Administrador"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden md:inline">Alterar Senha</span>
                  </button>
                )}

                {session.role === 'client' && onOpenEditClientPassword && (
                  <button
                    onClick={onOpenEditClientPassword}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg transition-colors border border-amber-500/30"
                    title="Trocar Senha de Acesso"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden md:inline">Trocar Senha</span>
                  </button>
                )}

                {session.role === 'client' && (
                  <button
                    onClick={onOpenAdminLogin}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors shadow-sm"
                    title="Acessar Painel de Gestão"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Painel de Gestão</span>
                  </button>
                )}

                <button
                  onClick={onLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-rose-950 hover:text-rose-200 text-slate-300 rounded-lg transition-colors border border-slate-700"
                  title="Sair da Conta"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAdminLogin}
                className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-all shadow-sm"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Painel de Gestão</span>
              </button>
            )}

            {onResetData && (
              <button
                onClick={onResetData}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                title="Restaurar Banco de Dados da Empresa"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Submenu */}
        {session && (
          <div className="flex lg:hidden overflow-x-auto py-2 gap-1 border-t border-slate-800">
            {session.role === 'client' ? (
              <>
                <button
                  onClick={() => onTabChange('boletos')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap ${
                    activeTab === 'boletos' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
                  }`}
                >
                  Boletos
                </button>
                <button
                  onClick={() => onTabChange('nfes')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap ${
                    activeTab === 'nfes' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
                  }`}
                >
                  Notas Fiscais
                </button>
                <button
                  onClick={() => onTabChange('tickets')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap ${
                    activeTab === 'tickets' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
                  }`}
                >
                  Suporte
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onTabChange('dashboard')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap ${
                    activeTab === 'dashboard' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => onTabChange('clients')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap ${
                    activeTab === 'clients' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  Clientes
                </button>
                <button
                  onClick={() => onTabChange('admin-financial')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap ${
                    activeTab === 'admin-financial' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-400'
                  }`}
                >
                  Financeiro & Previsão
                </button>
                <button
                  onClick={() => onTabChange('admin-boletos')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap ${
                    activeTab === 'admin-boletos' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  Boletos
                </button>
                <button
                  onClick={() => onTabChange('admin-nfes')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap ${
                    activeTab === 'admin-nfes' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  Notas Fiscais
                </button>
                <button
                  onClick={() => onTabChange('admin-tickets')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap ${
                    activeTab === 'admin-tickets' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  Atendimento
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
