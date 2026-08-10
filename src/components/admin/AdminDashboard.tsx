import React from 'react';
import {
  Users,
  CreditCard,
  FileText,
  Ticket,
  TrendingUp,
  AlertTriangle,
  Plus,
  ShieldCheck,
  ArrowRight,
  DollarSign,
  PieChart as PieIcon,
  KeyRound,
  Briefcase,
  Clock,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Client, Boleto, NotaFiscal, SupportTicket, SporadicService } from '../../types';

interface AdminDashboardProps {
  clients: Client[];
  boletos: Boleto[];
  nfes: NotaFiscal[];
  tickets: SupportTicket[];
  sporadicServices?: SporadicService[];
  onNavigate: (tab: string) => void;
  onOpenEditAdminPassword?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  clients,
  boletos,
  nfes,
  tickets,
  sporadicServices = [],
  onNavigate,
  onOpenEditAdminPassword,
}) => {
  const activeClients = clients.filter((c) => c.status === 'active');
  
  // Boletos Breakdown
  const pendingBoletos = boletos.filter((b) => b.status === 'pending');
  const overdueBoletos = boletos.filter((b) => b.status === 'overdue');
  const paidBoletos = boletos.filter((b) => b.status === 'paid');
  const openBoletos = [...pendingBoletos, ...overdueBoletos];

  const pendingBoletosAmount = pendingBoletos.reduce((acc, b) => acc + b.amount, 0);
  const overdueBoletosAmount = overdueBoletos.reduce((acc, b) => acc + b.amount, 0);
  const totalBoletosAbertoVal = pendingBoletosAmount + overdueBoletosAmount;
  const paidBoletosAmount = paidBoletos.reduce((acc, b) => acc + b.amount, 0);

  // Tickets Breakdown
  const ticketsOpen = tickets.filter((t) => t.status === 'open');
  const ticketsInProgress = tickets.filter((t) => t.status === 'in_progress');
  const ticketsResolved = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed');
  const openTickets = [...ticketsOpen, ...ticketsInProgress];

  // Sporadic Services Breakdown
  const pendingSporadic = sporadicServices.filter((s) => s.status === 'pending');
  const realizedSporadic = sporadicServices.filter((s) => s.status === 'realized');
  const pendingSporadicAmount = pendingSporadic.reduce((acc, s) => acc + s.amount, 0);
  const realizedSporadicAmount = realizedSporadic.reduce((acc, s) => acc + s.amount, 0);
  const totalSporadicAmount = pendingSporadicAmount + realizedSporadicAmount;

  // Formatting helpers
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Chart Data for Boletos Pie
  const boletosChartData = [
    { name: 'A vencer', value: pendingBoletos.length, amount: pendingBoletosAmount, color: '#f59e0b' },
    { name: 'Em atraso', value: overdueBoletos.length, amount: overdueBoletosAmount, color: '#f43f5e' },
    { name: 'Quitados', value: paidBoletos.length, amount: paidBoletosAmount, color: '#10b981' },
  ].filter((item) => item.value > 0);

  // Chart Data for Tickets Pie
  const ticketsChartData = [
    { name: 'Abertos', value: ticketsOpen.length, color: '#f59e0b' },
    { name: 'Em Atendimento', value: ticketsInProgress.length, color: '#38bdf8' },
    { name: 'Resolvidos/Fechados', value: ticketsResolved.length, color: '#10b981' },
  ].filter((item) => item.value > 0);

  // Chart Data for Sporadic Services Pie
  const sporadicChartData = [
    { name: 'Pendentes', value: pendingSporadic.length, amount: pendingSporadicAmount, color: '#f59e0b' },
    { name: 'Realizados', value: realizedSporadic.length, amount: realizedSporadicAmount, color: '#10b981' },
  ].filter((item) => item.value > 0);

  // Unified Demand Comparison Bar Chart
  const overviewDemandsChartData = [
    {
      categoria: 'Boletos em Aberto',
      quantidade: openBoletos.length,
      valor: totalBoletosAbertoVal,
      cor: '#f59e0b',
    },
    {
      categoria: 'Tickets Pendentes',
      quantidade: openTickets.length,
      valor: openTickets.length * 250, // Indicative operational value
      cor: '#38bdf8',
    },
    {
      categoria: 'Serviços Esporádicos',
      quantidade: sporadicServices.length,
      valor: totalSporadicAmount,
      cor: '#10b981',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Compact Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-2.5 px-2">
          <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-white">
              Painel de Gestão & Resumo de Operações
            </h2>
            <p className="text-[11px] text-slate-400">
              Visão consolidada de pendências, boletos, chamados e serviços esporádicos.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('clients')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/10 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
          <button
            onClick={() => onNavigate('admin-boletos')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-xl border border-amber-500/30 transition-all active:scale-95"
          >
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span>Emitir Boleto</span>
          </button>
          <button
            onClick={() => onNavigate('admin-financial')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/10 transition-all active:scale-95"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Menu Financeiro</span>
          </button>
          {onOpenEditAdminPassword && (
            <button
              onClick={onOpenEditAdminPassword}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-colors"
              title="Alterar Senha do Administrador"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Senha Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* TOP SUMMARY CARDS WITH RECHARTS VISUALIZATIONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* CARD 1: BOLETOS EM ABERTO */}
        <div
          onClick={() => onNavigate('admin-boletos')}
          className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 shadow-lg cursor-pointer transition-all hover:shadow-amber-500/5 group flex flex-col justify-between space-y-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-amber-400 font-extrabold text-xs uppercase tracking-wider mb-1">
                <CreditCard className="w-4 h-4" />
                <span>Boletos em Aberto</span>
              </div>
              <div className="text-2xl font-black text-white group-hover:text-amber-400 transition-colors">
                {formatCurrency(totalBoletosAbertoVal)}
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                {openBoletos.length} boleto(s) pendente(s) de pagamento
              </p>
            </div>
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
          </div>

          {/* Recharts Mini Pie / Donut Chart */}
          <div className="h-28 w-full bg-slate-950/60 rounded-xl p-2 border border-slate-800/80 flex items-center justify-between">
            <div className="w-1/2 h-full">
              {boletosChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={boletosChartData}
                      innerRadius={18}
                      outerRadius={34}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {boletosChartData.map((entry, index) => (
                        <Cell key={`cell-bol-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [`${val} boleto(s)`, 'Quantidade']}
                      contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[10px] text-slate-500 italic">
                  Sem boletos
                </div>
              )}
            </div>

            <div className="w-1/2 text-[11px] space-y-1 pl-2 border-l border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> A vencer:
                </span>
                <strong className="text-amber-400 font-mono">{pendingBoletos.length}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Em atraso:
                </span>
                <strong className="text-rose-400 font-mono">{overdueBoletos.length}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Pagos:
                </span>
                <strong className="text-emerald-400 font-mono">{paidBoletos.length}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
            <span>Ver listagem completa</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CARD 2: TICKETS PENDENTES */}
        <div
          onClick={() => onNavigate('admin-tickets')}
          className="bg-slate-900 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-5 shadow-lg cursor-pointer transition-all hover:shadow-sky-500/5 group flex flex-col justify-between space-y-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-sky-400 font-extrabold text-xs uppercase tracking-wider mb-1">
                <Ticket className="w-4 h-4" />
                <span>Tickets Pendentes</span>
              </div>
              <div className="text-2xl font-black text-white group-hover:text-sky-400 transition-colors">
                {openTickets.length} <span className="text-sm font-semibold text-slate-400">chamado(s)</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Aguardando atendimento ou resposta técnica
              </p>
            </div>
            <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Recharts Mini Pie Chart */}
          <div className="h-28 w-full bg-slate-950/60 rounded-xl p-2 border border-slate-800/80 flex items-center justify-between">
            <div className="w-1/2 h-full">
              {ticketsChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ticketsChartData}
                      innerRadius={18}
                      outerRadius={34}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {ticketsChartData.map((entry, index) => (
                        <Cell key={`cell-tkt-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [`${val} chamado(s)`, 'Quantidade']}
                      contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[10px] text-slate-500 italic">
                  Sem chamados
                </div>
              )}
            </div>

            <div className="w-1/2 text-[11px] space-y-1 pl-2 border-l border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Abertos:
                </span>
                <strong className="text-amber-400 font-mono">{ticketsOpen.length}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" /> Em Atend.:
                </span>
                <strong className="text-sky-400 font-mono">{ticketsInProgress.length}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Concluídos:
                </span>
                <strong className="text-emerald-400 font-mono">{ticketsResolved.length}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
            <span>Atender chamados</span>
            <ArrowRight className="w-3.5 h-3.5 text-sky-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CARD 3: NOVAS SOLICITAÇÕES DE SERVIÇOS ESPORÁDICOS */}
        <div
          onClick={() => onNavigate('admin-financial')}
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 shadow-lg cursor-pointer transition-all hover:shadow-emerald-500/5 group flex flex-col justify-between space-y-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold text-xs uppercase tracking-wider mb-1">
                <Briefcase className="w-4 h-4" />
                <span>Serviços Esporádicos</span>
              </div>
              <div className="text-2xl font-black text-white group-hover:text-emerald-400 transition-colors">
                {formatCurrency(totalSporadicAmount)}
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                {sporadicServices.length} solicitação(ões) avulsa(s)
              </p>
            </div>
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          {/* Recharts Mini Bar / Pie Chart */}
          <div className="h-28 w-full bg-slate-950/60 rounded-xl p-2 border border-slate-800/80 flex items-center justify-between">
            <div className="w-1/2 h-full">
              {sporadicChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sporadicChartData}
                      innerRadius={18}
                      outerRadius={34}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {sporadicChartData.map((entry, index) => (
                        <Cell key={`cell-spo-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [`${val} serviço(s)`, 'Quantidade']}
                      contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[10px] text-slate-500 italic">
                  Sem lançamentos
                </div>
              )}
            </div>

            <div className="w-1/2 text-[11px] space-y-1.5 pl-2 border-l border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px]">Pendentes:</span>
                <strong className="text-amber-400 font-mono text-xs">
                  {pendingSporadic.length} ({formatCurrency(pendingSporadicAmount)})
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Realizados:</span>
                <strong className="text-emerald-400 font-mono text-xs">
                  {realizedSporadic.length} ({formatCurrency(realizedSporadicAmount)})
                </strong>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
            <span>Gerenciar no menu financeiro</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

      </div>

      {/* RECHARTS CHART: DEMANDAS OPERACIONAIS & FINANCEIRAS COMPARAÇÃO */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-extrabold text-white">
                Comparativo de Demandas Operacionais & Financeiras
              </h3>
              <p className="text-[11px] text-slate-400">
                Visualização gráfica integrada via Recharts dos volumes de boletos, chamados e atendimentos esporádicos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" /> Boletos: <strong className="text-white">{openBoletos.length}</strong>
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2.5 h-2.5 rounded bg-sky-400 inline-block" /> Tickets: <strong className="text-white">{openTickets.length}</strong>
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> Esporádicos: <strong className="text-white">{sporadicServices.length}</strong>
            </span>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={overviewDemandsChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="categoria" stroke="#a1a1aa" fontSize={11} tickLine={false} />
              <YAxis yAxisId="left" orientation="left" stroke="#a1a1aa" fontSize={11} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" stroke="#71717a" fontSize={10} tickFormatter={(val) => `R$ ${val}`} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                formatter={(value: any, name: any) => {
                  if (name === 'Volume/Quantidade') return [`${value} registro(s)`, name];
                  return [formatCurrency(Number(value)), 'Valor Estimado (R$)'];
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar yAxisId="left" dataKey="quantidade" name="Volume/Quantidade" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              <Bar yAxisId="right" dataKey="valor" name="Valor Total (R$)" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Access Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Clients List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Clientes Efetivos Cadastrados ({clients.length})</span>
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
              <span>Chamados Pendentes de Atendimento ({openTickets.length})</span>
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
                const client = clients.find((c) => c.id === t.clientId);
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
