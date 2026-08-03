import React from 'react';
import { Users, CreditCard, FileText, Ticket, TrendingUp, AlertTriangle, Plus, ShieldCheck, ArrowRight, DollarSign, PieChart, KeyRound } from 'lucide-react';
import { Client, Boleto, NotaFiscal, SupportTicket } from '../../types';

interface AdminDashboardProps {
  clients: Client[];
  boletos: Boleto[];
  nfes: NotaFiscal[];
  tickets: SupportTicket[];
  onNavigate: (tab: string) => void;
  onOpenEditAdminPassword?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  clients,
  boletos,
  nfes,
  tickets,
  onNavigate,
  onOpenEditAdminPassword,
}) => {
  const activeClients = clients.filter(c => c.status === 'active');
  const pendingBoletos = boletos.filter(b => b.status === 'pending');
  const overdueBoletos = boletos.filter(b => b.status === 'overdue');
  const paidBoletos = boletos.filter(b => b.status === 'paid');
  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress');

  const mrr = activeClients.reduce((acc, c) => acc + (c.monthlyFee || 0), 0);
  const overdueAmount = overdueBoletos.reduce((acc, c) => acc + c.amount, 0);
  const paidAmount = paidBoletos.reduce((acc, c) => acc + c.amount, 0);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/20 rounded-2xl border border-amber-500/30 text-amber-400">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-0.5">
                Painel Administrativo Mavie Solution
              </div>
              <h1 className="text-2xl font-black text-white">Visão Geral da Operação</h1>
              <p className="text-xs text-slate-300 mt-1">
                Controle de clientes efetivos, mensalidades, boletos com PDF, notas fiscais e chamados de suporte.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate('clients')}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Cliente (CPF)</span>
            </button>
            <button
              onClick={() => onNavigate('admin-financial')}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Menu Financeiro</span>
            </button>
            {onOpenEditAdminPassword && (
              <button
                onClick={onOpenEditAdminPassword}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/30 transition-colors"
                title="Alterar Senha do Administrador"
              >
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Alterar Senha</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('clients')}
          className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Clientes Efetivos</span>
            <Users className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-black text-white">{clients.length}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            {activeClients.length} contrato(s) ativos
          </div>
        </div>

        <div
          onClick={() => onNavigate('admin-financial')}
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Previsão Mensal (MRR)</span>
            <TrendingUp className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-black text-emerald-400">{formatCurrency(mrr)}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            Receita recorrente contratada
          </div>
        </div>

        <div
          onClick={() => onNavigate('admin-financial')}
          className="bg-slate-900 border border-slate-800 hover:border-rose-500/50 rounded-2xl p-5 shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Inadimplência (Atraso)</span>
            <AlertTriangle className="w-5 h-5 text-rose-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-black text-rose-400">{formatCurrency(overdueAmount)}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            {overdueBoletos.length} boleto(s) vencido(s)
          </div>
        </div>

        <div
          onClick={() => onNavigate('admin-tickets')}
          className="bg-slate-900 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-5 shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Chamados Abertos</span>
            <Ticket className="w-5 h-5 text-sky-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-black text-sky-400">{openTickets.length}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            Aguardando resposta da equipe
          </div>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Clients List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Clientes Efetivos Cadastrados</span>
            </h3>
            <button
              onClick={() => onNavigate('clients')}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {clients.slice(0, 4).map((c) => (
              <div
                key={c.id}
                className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-white">{c.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    CPF: {c.cpf} • Mensalidade: <strong className="text-amber-400">{formatCurrency(c.monthlyFee || 0)}</strong>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {c.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Tickets List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Ticket className="w-4 h-4 text-sky-400" />
              <span>Chamados Pendentes de Atendimento</span>
            </h3>
            <button
              onClick={() => onNavigate('admin-tickets')}
              className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
            >
              Atender todos <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {openTickets.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">Nenhum chamado pendente no momento.</p>
          ) : (
            <div className="space-y-2">
              {openTickets.slice(0, 4).map((t) => {
                const client = clients.find(c => c.id === t.clientId);
                return (
                  <div
                    key={t.id}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white line-clamp-1">{t.subject}</div>
                      <div className="text-[11px] text-slate-400">
                        {client?.name || 'Cliente'} • {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-950 text-amber-300 border border-amber-800">
                      Pendente
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
