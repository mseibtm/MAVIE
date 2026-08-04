import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  PlusCircle,
  BarChart2,
  ShieldAlert,
  Calendar,
  Filter,
  Trash2,
  Layers,
  Briefcase,
  X,
  Plus,
  Check,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Client, Boleto, SporadicService } from '../../types';

interface AdminFinancialViewProps {
  clients: Client[];
  boletos: Boleto[];
  sporadicServices: SporadicService[];
  onAddBoleto: (boleto: Omit<Boleto, 'id' | 'createdAt'>) => void;
  onAddSporadicService: (service: Omit<SporadicService, 'id' | 'createdAt'>) => void;
  onUpdateSporadicStatus: (id: string, status: 'realized' | 'pending') => void;
  onDeleteSporadicService: (id: string) => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const AdminFinancialView: React.FC<AdminFinancialViewProps> = ({
  clients,
  boletos,
  sporadicServices = [],
  onAddBoleto,
  onAddSporadicService,
  onUpdateSporadicStatus,
  onDeleteSporadicService,
  onToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'realized' | 'mrr' | 'sporadic'>('realized');

  // Month / Period Filter state
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all'); // 'all' or 'YYYY-MM'

  // Modal State for New Sporadic Service
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClientId, setNewClientId] = useState(clients[0]?.id || '');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('Consultoria');
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().substring(0, 10));
  const [newStatus, setNewStatus] = useState<'realized' | 'pending'>('realized');
  const [newNotes, setNewNotes] = useState('');

  // Format BRL
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Active Clients & MRR
  const activeClients = clients.filter((c) => c.status === 'active');
  const mrr = activeClients.reduce((acc, c) => acc + (c.monthlyFee || 0), 0);
  const arr = mrr * 12;

  // Available Month Filter Options (built dynamically from Boletos + Sporadic dates)
  const getAvailablePeriods = () => {
    const periodsSet = new Set<string>();

    boletos.forEach((b) => {
      const d = b.paidAt || b.dueDate || b.createdAt;
      if (d) periodsSet.add(d.substring(0, 7));
    });

    sporadicServices.forEach((s) => {
      if (s.date) periodsSet.add(s.date.substring(0, 7));
    });

    // Ensure current month is present
    const nowMonth = new Date().toISOString().substring(0, 7);
    periodsSet.add(nowMonth);

    const sorted = Array.from(periodsSet).sort().reverse();

    return sorted.map((p) => {
      const [year, month] = p.split('-');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
      const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return {
        value: p,
        label: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      };
    });
  };

  const periodOptions = getAvailablePeriods();

  // Filter Boletos and Sporadic Services by Selected Period
  const filteredBoletos = boletos.filter((b) => {
    if (selectedPeriod === 'all') return true;
    const d = b.paidAt || b.dueDate || b.createdAt;
    return d && d.startsWith(selectedPeriod);
  });

  const filteredSporadicServices = sporadicServices.filter((s) => {
    if (selectedPeriod === 'all') return true;
    return s.date && s.date.startsWith(selectedPeriod);
  });

  // Realized Revenues Calculations
  const realizedBoletosAmount = filteredBoletos
    .filter((b) => b.status === 'paid')
    .reduce((acc, b) => acc + b.amount, 0);

  const realizedSporadicAmount = filteredSporadicServices
    .filter((s) => s.status === 'realized')
    .reduce((acc, s) => acc + s.amount, 0);

  // TOTAL FATURAMENTO REALIZADO (Soma das mensalidades quitadas + serviços esporádicos realizados)
  const totalFaturamentoRealizado = realizedBoletosAmount + realizedSporadicAmount;

  // Pending Revenues Calculations
  const pendingBoletosAmount = filteredBoletos
    .filter((b) => b.status === 'pending')
    .reduce((acc, b) => acc + b.amount, 0);

  const pendingSporadicAmount = filteredSporadicServices
    .filter((s) => s.status === 'pending')
    .reduce((acc, s) => acc + s.amount, 0);

  const totalPendingAmount = pendingBoletosAmount + pendingSporadicAmount;

  // Overdue Boletos
  const overdueBoletos = filteredBoletos.filter((b) => b.status === 'overdue');
  const totalOverdueAmount = overdueBoletos.reduce((acc, b) => acc + b.amount, 0);

  // Total Expected
  const totalExpectedPeriod = totalFaturamentoRealizado + totalPendingAmount + totalOverdueAmount;

  // Average revenue per client (ARPU)
  const arpu = activeClients.length > 0 ? mrr / activeClients.length : 0;

  // Monthly breakdown for Recharts Bar Chart
  const getMonthlyChartData = () => {
    const monthlyMap: Record<
      string,
      { period: string; label: string; mensalidades: number; esporadicos: number; total: number }
    > = {};

    // Populate last 6 months or all periods
    periodOptions.slice(0, 8).forEach((p) => {
      monthlyMap[p.value] = {
        period: p.value,
        label: p.label.split(' de ')[0], // short month
        mensalidades: 0,
        esporadicos: 0,
        total: 0,
      };
    });

    boletos.forEach((b) => {
      if (b.status === 'paid') {
        const p = (b.paidAt || b.dueDate || b.createdAt).substring(0, 7);
        if (monthlyMap[p]) {
          monthlyMap[p].mensalidades += b.amount;
          monthlyMap[p].total += b.amount;
        }
      }
    });

    sporadicServices.forEach((s) => {
      if (s.status === 'realized') {
        const p = s.date.substring(0, 7);
        if (monthlyMap[p]) {
          monthlyMap[p].esporadicos += s.amount;
          monthlyMap[p].total += s.amount;
        }
      }
    });

    return Object.values(monthlyMap).reverse();
  };

  const chartData = getMonthlyChartData();

  // Create Sporadic Service submit
  const handleCreateSporadicService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientId || !newDescription.trim() || !newAmount) {
      onToast('error', 'Campos Obrigatórios', 'Preencha o cliente, a descrição e o valor do serviço.');
      return;
    }

    const val = parseFloat(newAmount.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      onToast('error', 'Valor Inválido', 'Insira um valor numérico positivo.');
      return;
    }

    onAddSporadicService({
      clientId: newClientId,
      description: newDescription.trim(),
      category: newCategory,
      amount: val,
      date: newDate,
      status: newStatus,
      notes: newNotes.trim() || undefined,
    });

    onToast('success', 'Serviço Registrado', 'O lançamento do serviço esporádico foi adicionado ao faturamento.');
    setIsModalOpen(false);
    setNewDescription('');
    setNewAmount('');
    setNewNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Gestão Financeira & Faturamento Realizado</span>
          </div>
          <h1 className="text-2xl font-black text-white">DRE, Serv. Esporádicos & Faturamento Realizado</h1>
          <p className="text-xs text-slate-400 mt-1">
            Acompanhe a soma total do faturamento realizado (Mensalidades + Serviços Esporádicos), com filtros por mês ou todo o período.
          </p>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveSubTab('realized')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${
              activeSubTab === 'realized'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>Faturamento Realizado</span>
          </button>

          <button
            onClick={() => setActiveSubTab('sporadic')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${
              activeSubTab === 'sporadic'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Briefcase className="w-4 h-4 text-amber-300" />
            <span>Serviços Esporádicos ({sporadicServices.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('mrr')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${
              activeSubTab === 'mrr'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-sky-300" />
            <span>Mensalidades (MRR)</span>
          </button>
        </div>
      </div>

      {/* Period Filter Selector Toolbar (Available on Realized and Sporadic tabs) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-950 border border-emerald-800/80 rounded-xl text-emerald-400">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-300 block">Filtrar Período de Apuração:</span>
            <span className="text-[11px] text-slate-400">Selecione um mês específico ou visualize todo o período.</span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-emerald-400 focus:ring-2 focus:ring-emerald-500 shadow-inner"
          >
            <option value="all">🗓️ Todo o Período (Visão Geral Global)</option>
            {periodOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                📅 {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-1.5 shrink-0 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Serviço Esporádico</span>
          </button>
        </div>
      </div>

      {/* TAB 1: FATURAMENTO REALIZADO (SOMA DE MENSALIDADES + SERVIÇOS ESPORÁDICOS) */}
      {activeSubTab === 'realized' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Main KPI Cards for Realized Revenue */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Realized (Soma Total) */}
            <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-2xl p-5 shadow-lg bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  Faturamento Realizado Total
                </span>
                <div className="p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-emerald-400">
                {formatCurrency(totalFaturamentoRealizado)}
              </div>
              <div className="text-[11px] text-slate-300 mt-2 flex items-center justify-between border-t border-slate-800/80 pt-2">
                <span>Mensalidades + Serviços</span>
                <span className="font-bold text-white font-mono">
                  {selectedPeriod === 'all'
                    ? 'Todo o Período'
                    : periodOptions.find((p) => p.value === selectedPeriod)?.label || selectedPeriod}
                </span>
              </div>
            </div>

            {/* Mensalidades Quitadas (Boletos Paid) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-sky-500/40 transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                  Mensalidades Quitadas
                </span>
                <div className="p-2 bg-sky-950 border border-sky-800 rounded-xl text-sky-400">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-white">{formatCurrency(realizedBoletosAmount)}</div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Boletos confirmados</span>
                <span className="font-bold text-sky-400">
                  {totalFaturamentoRealizado > 0
                    ? ((realizedBoletosAmount / totalFaturamentoRealizado) * 100).toFixed(1) + '%'
                    : '0%'}
                </span>
              </div>
            </div>

            {/* Serviços Esporádicos Realizados */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-amber-500/40 transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Serviços Esporádicos
                </span>
                <div className="p-2 bg-amber-950 border border-amber-800 rounded-xl text-amber-400">
                  <Briefcase className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-400">
                {formatCurrency(realizedSporadicAmount)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Trabalhos avulsos quitados</span>
                <span className="font-bold text-amber-400">
                  {totalFaturamentoRealizado > 0
                    ? ((realizedSporadicAmount / totalFaturamentoRealizado) * 100).toFixed(1) + '%'
                    : '0%'}
                </span>
              </div>
            </div>

            {/* A Vencer / Pendente no Período */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pendente / A Receber
                </span>
                <div className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-200">{formatCurrency(totalPendingAmount)}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                Boletos e serviços não quitados
              </div>
            </div>
          </div>

          {/* Recharts Bar Chart: Mensalidades vs Serviços Esporádicos */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Composição do Faturamento Realizado (Mensalidades x Serviços Esporádicos)
                </h3>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950 px-3 py-1 rounded-xl border border-emerald-800">
                Total Realizado: {formatCurrency(totalFaturamentoRealizado)}
              </span>
            </div>

            <div className="h-[280px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(v) => `R$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-950 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5">
                            <p className="font-bold text-white border-b border-slate-800 pb-1">
                              {data.label} ({data.period})
                            </p>
                            <p className="text-sky-300 font-semibold flex items-center justify-between gap-4">
                              <span>Mensalidades:</span>
                              <strong className="font-mono">{formatCurrency(data.mensalidades)}</strong>
                            </p>
                            <p className="text-amber-400 font-semibold flex items-center justify-between gap-4">
                              <span>Serv. Esporádicos:</span>
                              <strong className="font-mono">{formatCurrency(data.esporadicos)}</strong>
                            </p>
                            <div className="border-t border-slate-800 pt-1 font-black text-emerald-400 flex items-center justify-between gap-4">
                              <span>Total Realizado:</span>
                              <strong className="font-mono">{formatCurrency(data.total)}</strong>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }} />
                  <Bar dataKey="mensalidades" name="Mensalidades Quitadas" fill="#0284c7" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="esporadicos" name="Serviços Esporádicos Realizados" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Unified Statement Table (Boletos Quitados + Serviços Esporádicos) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  <span>Extrato de Lançamentos Realizados ({selectedPeriod === 'all' ? 'Todo o Período' : selectedPeriod})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Lista detalhada de mensalidades recebidas e receitas de serviços esporádicos quitados.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-300 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                Itens Realizados: {filteredBoletos.filter((b) => b.status === 'paid').length + filteredSporadicServices.filter((s) => s.status === 'realized').length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-4">Tipo de Receita</th>
                    <th className="p-4">Data do Realizado</th>
                    <th className="p-4">Cliente / Razão Social</th>
                    <th className="p-4">Descrição do Lançamento</th>
                    <th className="p-4 text-right">Valor Quitado (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {/* Paid Boletos */}
                  {filteredBoletos
                    .filter((b) => b.status === 'paid')
                    .map((b) => {
                      const client = clients.find((c) => c.id === b.clientId);
                      return (
                        <tr key={`b-${b.id}`} className="hover:bg-slate-850/60 transition-colors">
                          <td className="p-4">
                            <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-sky-950 text-sky-300 border border-sky-800 flex items-center gap-1 w-fit">
                              <Receipt className="w-3 h-3 text-sky-400" />
                              Mensalidade Recorrente
                            </span>
                          </td>
                          <td className="p-4 font-mono text-slate-300">
                            {b.paidAt
                              ? new Date(b.paidAt).toLocaleDateString('pt-BR')
                              : new Date(b.dueDate).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-white">{client?.name || 'Cliente'}</div>
                            <div className="text-[10px] font-mono text-slate-400">{client?.cpf}</div>
                          </td>
                          <td className="p-4 text-slate-300">{b.description}</td>
                          <td className="p-4 text-right font-mono font-black text-emerald-400 text-sm">
                            {formatCurrency(b.amount)}
                          </td>
                        </tr>
                      );
                    })}

                  {/* Realized Sporadic Services */}
                  {filteredSporadicServices
                    .filter((s) => s.status === 'realized')
                    .map((s) => {
                      const client = clients.find((c) => c.id === s.clientId);
                      return (
                        <tr key={`s-${s.id}`} className="hover:bg-slate-850/60 transition-colors">
                          <td className="p-4">
                            <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1 w-fit">
                              <Briefcase className="w-3 h-3 text-amber-400" />
                              Serviço Esporádico
                            </span>
                          </td>
                          <td className="p-4 font-mono text-slate-300">
                            {new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-white">{client?.name || 'Cliente'}</div>
                            <div className="text-[10px] font-mono text-slate-400">{client?.cpf}</div>
                          </td>
                          <td className="p-4 text-slate-300">
                            <div className="font-semibold text-white">{s.description}</div>
                            {s.category && (
                              <span className="text-[10px] text-amber-400/90 italic">Categoria: {s.category}</span>
                            )}
                          </td>
                          <td className="p-4 text-right font-mono font-black text-emerald-400 text-sm">
                            {formatCurrency(s.amount)}
                          </td>
                        </tr>
                      );
                    })}

                  {filteredBoletos.filter((b) => b.status === 'paid').length === 0 &&
                    filteredSporadicServices.filter((s) => s.status === 'realized').length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                          Nenhum faturamento realizado registrado no período selecionado.
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SERVIÇOS ESPORÁDICOS (LANÇAMENTOS AVULSOS) */}
      {activeSubTab === 'sporadic' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Action & KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block mb-1">
                Total Realizado em Serviços Avulsos
              </span>
              <div className="text-2xl font-black text-amber-400">
                {formatCurrency(realizedSporadicAmount)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Serviços com status "Realizado"</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Total Pendente em Serviços Avulsos
              </span>
              <div className="text-2xl font-black text-slate-200">
                {formatCurrency(pendingSporadicAmount)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Serviços aguardando acerto</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Cadastrar Novo Serviço Esporádico
              </span>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-2 w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Fazer Lançamento Avulso</span>
              </button>
            </div>
          </div>

          {/* Table of Sporadic Services */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-amber-400" />
                  <span>Tabela de Lançamentos de Serviços Esporádicos</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consultorias, suportes especiais, adaptações e outros trabalhos não recorrentes.
                </p>
              </div>

              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950 px-3 py-1 rounded-xl border border-amber-800">
                {filteredSporadicServices.length} Lançamento(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-4">Data</th>
                    <th className="p-4">Cliente / Contratante</th>
                    <th className="p-4">Categoria</th>
                    <th className="p-4">Descrição do Serviço</th>
                    <th className="p-4">Valor (R$)</th>
                    <th className="p-4">Situação</th>
                    <th className="p-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredSporadicServices.map((s) => {
                    const client = clients.find((c) => c.id === s.clientId);

                    return (
                      <tr key={s.id} className="hover:bg-slate-850/60 transition-colors">
                        <td className="p-4 font-mono text-slate-300 font-semibold">
                          {new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </td>

                        <td className="p-4">
                          <div className="font-bold text-white">{client?.name || 'Cliente'}</div>
                          <div className="text-[10px] font-mono text-slate-400">{client?.cpf}</div>
                        </td>

                        <td className="p-4">
                          <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-amber-300 font-semibold text-[11px] rounded-md">
                            {s.category || 'Geral'}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="font-bold text-white">{s.description}</div>
                          {s.notes && <div className="text-[11px] text-slate-400 italic">{s.notes}</div>}
                        </td>

                        <td className="p-4 font-mono font-black text-amber-400 text-sm">
                          {formatCurrency(s.amount)}
                        </td>

                        <td className="p-4">
                          <button
                            onClick={() =>
                              onUpdateSporadicStatus(s.id, s.status === 'realized' ? 'pending' : 'realized')
                            }
                            className={`px-3 py-1 text-[11px] font-bold rounded-xl border transition-all flex items-center gap-1.5 ${
                              s.status === 'realized'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                            }`}
                            title="Clique para alternar o status do lançamento"
                          >
                            {s.status === 'realized' ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Realizado (Pago)</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                                <span>Pendente</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="p-4 text-center">
                          <button
                            onClick={() => {
                              if (window.confirm(`Deseja excluir este lançamento esporádico (${s.description})?`)) {
                                onDeleteSporadicService(s.id);
                                onToast('info', 'Lançamento Removido', 'O registro foi excluído do financeiro.');
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors"
                            title="Excluir Lançamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredSporadicServices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                        Nenhum serviço esporádico cadastrado no período selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MENSALIDADES (MRR) & PREVISÃO */}
      {activeSubTab === 'mrr' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                Previsão Mensal (MRR)
              </span>
              <div className="text-2xl font-black text-white">{formatCurrency(mrr)}</div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Mensalidades dos contratos</span>
                <span className="font-bold text-emerald-400">{activeClients.length} clientes</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 block mb-1">
                Previsão Anual (ARR)
              </span>
              <div className="text-2xl font-black text-white">{formatCurrency(arr)}</div>
              <div className="text-[11px] text-slate-400 mt-1">Projeção em 12 meses de mensalidades</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                Ticket Médio (ARPU)
              </span>
              <div className="text-2xl font-black text-emerald-400">{formatCurrency(arpu)}</div>
              <div className="text-[11px] text-slate-400 mt-1">Média por cliente contratado</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 block mb-1">
                Inadimplência em Boletos
              </span>
              <div className="text-2xl font-black text-rose-400">{formatCurrency(totalOverdueAmount)}</div>
              <div className="text-[11px] text-slate-400 mt-1">{overdueBoletos.length} boleto(s) em atraso</div>
            </div>
          </div>

          {/* Client Table for MRR */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Relatório Individual de Contratos Recorrentes</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Mensalidades ativas e histórico de pagamento de boletos por cliente.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-4">Cliente / Razão Social</th>
                    <th className="p-4">CPF</th>
                    <th className="p-4">Mensalidade Contratada</th>
                    <th className="p-4">Status Boletos</th>
                    <th className="p-4">Situação Financeira</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {clients.map((client) => {
                    const clientBoletos = boletos.filter((b) => b.clientId === client.id);
                    const hasOverdue = clientBoletos.some((b) => b.status === 'overdue');
                    const hasPending = clientBoletos.some((b) => b.status === 'pending');

                    return (
                      <tr key={client.id} className="hover:bg-slate-850/60 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-white">{client.name}</div>
                          {client.company && <div className="text-[11px] text-slate-400">{client.company}</div>}
                        </td>

                        <td className="p-4 font-mono text-slate-300 font-semibold">{client.cpf}</td>

                        <td className="p-4 font-mono font-black text-amber-400 text-sm">
                          {formatCurrency(client.monthlyFee || 0)}
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {clientBoletos.length === 0 ? (
                              <span className="text-slate-500 italic">Nenhum boleto</span>
                            ) : (
                              clientBoletos.map((b) => (
                                <span
                                  key={b.id}
                                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md font-mono ${
                                    b.status === 'paid'
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                      : b.status === 'pending'
                                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                                  }`}
                                  title={`Vencimento: ${b.dueDate}`}
                                >
                                  {b.status === 'paid' ? 'Pago' : b.status === 'pending' ? 'Pendente' : 'Vencido'}
                                </span>
                              ))
                            )}
                          </div>
                        </td>

                        <td className="p-4">
                          {hasOverdue ? (
                            <span className="px-2.5 py-1 text-[10px] font-bold rounded-xl bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1 w-fit">
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                              Inadimplente (Pendências)
                            </span>
                          ) : hasPending ? (
                            <span className="px-2.5 py-1 text-[10px] font-bold rounded-xl bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1 w-fit">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              Aguardando Pagamento
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-[10px] font-bold rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              Em dia (Sem pendências)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Registering a New Sporadic Service */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Novo Lançamento de Serviço Esporádico</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSporadicService} className="space-y-4 text-xs">
              {/* Client Selection */}
              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                  Cliente Contratante *
                </label>
                <select
                  value={newClientId}
                  onChange={(e) => setNewClientId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-amber-500"
                  required
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.cpf})
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                  Descrição do Serviço Avulso *
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Ex: Consultoria de Módulo, Suporte Presencial, etc."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium placeholder-slate-600 focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              {/* Category & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Categoria
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Consultoria">Consultoria</option>
                    <option value="Treinamento">Treinamento</option>
                    <option value="Suporte Técnico">Suporte Técnico</option>
                    <option value="Desenvolvimento">Desenvolvimento</option>
                    <option value="Serviço Elétrico">Serviço Elétrico</option>
                    <option value="Serviço Avulso">Serviço Avulso</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Valor do Serviço (R$) *
                  </label>
                  <input
                    type="text"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="1500,00"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Date & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Data da Execução/Fatura *
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Status do Pagamento
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as 'realized' | 'pending')}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="realized">Realizado (Pago / Faturado)</option>
                    <option value="pending">Pendente (A Receber)</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                  Observações Internas (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Anotações de faturamento..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium placeholder-slate-600 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Lançamento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
