import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Landmark,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  Briefcase,
  Receipt,
  Scale,
  Calendar,
  AlertCircle,
  Plus,
  Edit,
  FileSpreadsheet,
  Info,
  ChevronRight,
  PiggyBank,
  Check,
  Building2,
  Tag,
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
  ReferenceLine,
} from 'recharts';
import { Client, Boleto, SporadicService, Expense, MonthlyBalance } from '../../types';

interface CashflowForecastViewProps {
  clients: Client[];
  boletos: Boleto[];
  sporadicServices: SporadicService[];
  expenses: Expense[];
  monthlyBalances: MonthlyBalance[];
  selectedPeriod: string; // 'all' or 'YYYY-MM'
  onOpenExpenseModal: () => void;
  onOpenBalanceModal: () => void;
  onOpenSporadicModal: () => void;
  formatCurrency: (val: number) => string;
}

export const CashflowForecastView: React.FC<CashflowForecastViewProps> = ({
  clients,
  boletos,
  sporadicServices,
  expenses,
  monthlyBalances,
  selectedPeriod,
  onOpenExpenseModal,
  onOpenBalanceModal,
  onOpenSporadicModal,
  formatCurrency,
}) => {
  const [detailTab, setDetailTab] = useState<'all_entries' | 'monthly_fees' | 'sporadic_entries' | 'expenses_outflow'>('all_entries');

  // Determine current active target month (starts from October 2026)
  const targetMonth = selectedPeriod !== 'all' ? selectedPeriod : '2026-10';

  // Format month name in Portuguese
  const formatMonthTitle = (monthStr: string) => {
    const [y, m] = monthStr.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 1, 1);
    const formatted = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const validClientMap = new Map<string, Client>(clients.map((c) => [c.id, c]));

  // 1. SALDO EM CONTA BANCÁRIA
  // Look for balance strictly for the target month (defaults cleanly to 0 if not registered)
  const currentBalanceRecord = monthlyBalances.find((b) => b.month === targetMonth) || null;

  const currentAccountBalance = currentBalanceRecord
    ? (currentBalanceRecord.currentBalance !== undefined
        ? currentBalanceRecord.currentBalance
        : currentBalanceRecord.initialBalance)
    : 0;

  // 2. RECEITAS DO MÊS (MENSALIDADES + ESPORÁDICOS)
  // Filter boletos by target month
  const targetBoletos = boletos.filter((b) => {
    if (!validClientMap.has(b.clientId)) return false;
    const d = b.dueDate || b.paidAt || b.createdAt;
    return d && d.startsWith(targetMonth);
  });

  const paidBoletos = targetBoletos.filter((b) => b.status === 'paid');
  const pendingBoletos = targetBoletos.filter((b) => b.status === 'pending');
  const overdueBoletos = targetBoletos.filter((b) => b.status === 'overdue');

  const paidBoletosAmount = paidBoletos.reduce((acc, b) => acc + b.amount, 0);
  const pendingBoletosAmount = pendingBoletos.reduce((acc, b) => acc + b.amount, 0);
  const overdueBoletosAmount = overdueBoletos.reduce((acc, b) => acc + b.amount, 0);

  // Total Mensalidades Previstas e Realizadas (com base em boletos emitidos para o mês)
  const totalMensalidadesRealizadas = paidBoletosAmount;
  const totalMensalidadesPrevistasAReceber = pendingBoletosAmount;
  const totalMensalidadesGerais = totalMensalidadesRealizadas + totalMensalidadesPrevistasAReceber;

  // Filter Sporadic Services by target month
  const targetSporadics = sporadicServices.filter((s) => {
    if (!validClientMap.has(s.clientId)) return false;
    const d = s.dueDate || s.date;
    return d && d.startsWith(targetMonth);
  });

  const realizedSporadics = targetSporadics.filter((s) => s.status === 'realized');
  const pendingSporadics = targetSporadics.filter((s) => s.status === 'pending');

  const realizedSporadicAmount = realizedSporadics.reduce((acc, s) => acc + s.amount, 0);
  const pendingSporadicAmount = pendingSporadics.reduce((acc, s) => acc + s.amount, 0);
  const totalSporadicAmount = realizedSporadicAmount + pendingSporadicAmount;

  // Consolidated Revenues
  const totalReceitasRealizadas = totalMensalidadesRealizadas + realizedSporadicAmount;
  const totalPrevisaoEntradasAReceber = totalMensalidadesPrevistasAReceber + pendingSporadicAmount;
  const totalReceitasPrevistasGerais = totalReceitasRealizadas + totalPrevisaoEntradasAReceber;

  // 3. DESPESAS DO MÊS (PAGAS + A PAGAR)
  const targetExpenses = expenses.filter((e) => {
    return e.month === targetMonth || (e.dueDate && e.dueDate.startsWith(targetMonth));
  });

  const paidExpenses = targetExpenses.filter((e) => e.status === 'paid');
  const pendingExpenses = targetExpenses.filter((e) => e.status === 'pending');

  const paidExpensesAmount = paidExpenses.reduce((acc, e) => acc + e.amount, 0);
  const pendingExpensesAmount = pendingExpenses.reduce((acc, e) => acc + e.amount, 0);
  const totalExpensesAmount = paidExpensesAmount + pendingExpensesAmount;

  // 4. RESULTADO LÍQUIDO / DRE OPERACIONAL
  const realizedNetResult = totalReceitasRealizadas - paidExpensesAmount;
  const projectedNetResult = totalReceitasPrevistasGerais - totalExpensesAmount;
  const projectedProfitMargin = totalReceitasPrevistasGerais > 0
    ? ((projectedNetResult / totalReceitasPrevistasGerais) * 100).toFixed(1)
    : '0';

  // 5. SALDO FINAL PROJETADO AO FIM DO MÊS
  // Formula: Saldo Atual em Conta + Entradas Previstas a Receber - Saídas Previstas a Pagar
  const projectedFinalBalance = currentAccountBalance + totalPrevisaoEntradasAReceber - pendingExpensesAmount;

  // Monthly Chart Data (comparative historical and projected)
  const getComparativeChartData = () => {
    // Generate list of periods (last 6 months)
    const periodsList: string[] = [];
    const dateObj = new Date();
    for (let i = 4; i >= 0; i--) {
      const d = new Date(dateObj.getFullYear(), dateObj.getMonth() - i, 1);
      periodsList.push(d.toISOString().substring(0, 7));
    }
    // ensure targetMonth is in list
    if (!periodsList.includes(targetMonth)) {
      periodsList.push(targetMonth);
    }
    periodsList.sort();

    return periodsList.map((p) => {
      const [year, month] = p.split('-');
      const d = new Date(parseInt(year), parseInt(month) - 1, 1);
      const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

      // Boletos paid/pending
      const bPaid = boletos
        .filter((b) => validClientMap.has(b.clientId) && b.status === 'paid' && (b.paidAt || b.dueDate || b.createdAt).startsWith(p))
        .reduce((sum, b) => sum + b.amount, 0);
      const bPending = boletos
        .filter((b) => validClientMap.has(b.clientId) && b.status === 'pending' && (b.dueDate || b.createdAt).startsWith(p))
        .reduce((sum, b) => sum + b.amount, 0);

      // Sporadics
      const sRealized = sporadicServices
        .filter((s) => validClientMap.has(s.clientId) && s.status === 'realized' && (s.dueDate || s.date).startsWith(p))
        .reduce((sum, s) => sum + s.amount, 0);
      const sPending = sporadicServices
        .filter((s) => validClientMap.has(s.clientId) && s.status === 'pending' && (s.dueDate || s.date).startsWith(p))
        .reduce((sum, s) => sum + s.amount, 0);

      // Expenses
      const expPaid = expenses
        .filter((e) => e.status === 'paid' && (e.month === p || e.dueDate.startsWith(p)))
        .reduce((sum, e) => sum + e.amount, 0);
      const expPending = expenses
        .filter((e) => e.status === 'pending' && (e.month === p || e.dueDate.startsWith(p)))
        .reduce((sum, e) => sum + e.amount, 0);

      const totalReceitas = bPaid + bPending + sRealized + sPending;
      const totalDespesas = expPaid + expPending;
      const resultado = totalReceitas - totalDespesas;

      return {
        period: p,
        label: label.toUpperCase(),
        receitasRealizadas: bPaid + sRealized,
        receitasPrevistas: bPending + sPending,
        totalReceitas,
        despesasPagas: expPaid,
        despesasPrevistas: expPending,
        totalDespesas,
        resultado,
      };
    });
  };

  const chartData = getComparativeChartData();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Target Month Indicator Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-400">
                Apuração & DRE Financeiro
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                {targetMonth}
              </span>
            </div>
            <h2 className="text-xl font-black text-white mt-0.5">
              Demonstrativo de Receita x Despesa • {formatMonthTitle(targetMonth)}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Cálculos em tempo real de faturamento, saídas, previsão de entradas (Mensalidades + Esporádicos) e saldo bancário.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
          <button
            onClick={onOpenBalanceModal}
            className="flex-1 md:flex-initial px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-950/40 flex items-center justify-center gap-1.5 transition-all"
          >
            <Landmark className="w-4 h-4" />
            <span>Ajustar Saldo em Conta</span>
          </button>
          <button
            onClick={onOpenExpenseModal}
            className="flex-1 md:flex-initial px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-950/40 flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Lançar Despesa</span>
          </button>
        </div>
      </div>

      {/* TOP 5 METRIC CARDS (SALDO, RECEITAS, DESPESAS, RESULTADO, SALDO PROJETADO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* CARD 1: SALDO ATUAL EM CONTA BANCÁRIA */}
        <div className="bg-slate-900 border border-sky-500/30 hover:border-sky-500/60 rounded-2xl p-5 shadow-lg transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl group-hover:bg-sky-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5" />
              <span>Saldo em Conta</span>
            </span>
            <button
              onClick={onOpenBalanceModal}
              className="p-1 hover:bg-sky-500/20 text-sky-400 rounded-md transition-colors"
              title="Ajustar saldo"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-2xl font-black text-sky-300 font-mono">
            {formatCurrency(currentAccountBalance)}
          </div>
          <div className="text-[10px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2 flex items-center justify-between">
            <span className="truncate max-w-[120px]">{currentBalanceRecord?.bankAccount || 'Conta Bancária'}</span>
            <span className="text-sky-400 font-semibold">{currentBalanceRecord?.month === targetMonth ? 'Atualizado' : 'Base'}</span>
          </div>
        </div>

        {/* CARD 2: RECEITAS TOTAIS DO MÊS */}
        <div className="bg-slate-900 border border-emerald-500/30 hover:border-emerald-500/60 rounded-2xl p-5 shadow-lg transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Receitas do Mês</span>
            </span>
            <div className="p-1 bg-emerald-500/10 text-emerald-400 rounded-md">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {formatCurrency(totalReceitasPrevistasGerais)}
          </div>
          <div className="text-[10px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2 flex items-center justify-between">
            <span>Realizada: <strong className="text-slate-200">{formatCurrency(totalReceitasRealizadas)}</strong></span>
            <span>A Receber: <strong className="text-emerald-400">{formatCurrency(totalPrevisaoEntradasAReceber)}</strong></span>
          </div>
        </div>

        {/* CARD 3: DESPESAS TOTAIS DO MÊS */}
        <div className="bg-slate-900 border border-rose-500/30 hover:border-rose-500/60 rounded-2xl p-5 shadow-lg transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Despesas do Mês</span>
            </span>
            <div className="p-1 bg-rose-500/10 text-rose-400 rounded-md">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono">
            {formatCurrency(totalExpensesAmount)}
          </div>
          <div className="text-[10px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2 flex items-center justify-between">
            <span>Pagas: <strong className="text-slate-200">{formatCurrency(paidExpensesAmount)}</strong></span>
            <span>A Pagar: <strong className="text-amber-400">{formatCurrency(pendingExpensesAmount)}</strong></span>
          </div>
        </div>

        {/* CARD 4: RESULTADO OPERACIONAL DO MÊS (DRE LÍQUIDO) */}
        <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" />
              <span>Resultado Previsto</span>
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              projectedNetResult >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
            }`}>
              {projectedNetResult >= 0 ? 'Superávit' : 'Déficit'}
            </span>
          </div>
          <div className={`text-2xl font-black font-mono ${
            projectedNetResult >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {formatCurrency(projectedNetResult)}
          </div>
          <div className="text-[10px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2 flex items-center justify-between">
            <span>Margem: <strong className="text-white">{projectedProfitMargin}%</strong></span>
            <span>Caixa Real: <strong className="text-slate-200">{formatCurrency(realizedNetResult)}</strong></span>
          </div>
        </div>

        {/* CARD 5: SALDO FINAL PROJETADO */}
        <div className="bg-gradient-to-br from-indigo-950/60 via-slate-900 to-sky-950/40 border-2 border-indigo-500/50 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
              <PiggyBank className="w-3.5 h-3.5 text-indigo-400" />
              <span>Saldo Projetado Fim Mês</span>
            </span>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {formatCurrency(projectedFinalBalance)}
          </div>
          <div className="text-[10px] text-slate-300 mt-2 border-t border-indigo-500/20 pt-2 flex items-center justify-between">
            <span>Saldo Atual + Entradas - Saídas</span>
            <span className="text-indigo-400 font-bold font-mono">
              {projectedFinalBalance >= currentAccountBalance ? '▲' : '▼'} {formatCurrency(Math.abs(projectedFinalBalance - currentAccountBalance))}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION: CONCILIAÇÃO & FÓRMULA MATEMÁTICA TRANSPARENTE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-sky-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Fórmula de Projeção Financeira do Mês ({targetMonth})
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
            <span className="text-slate-400 text-[11px] block">1. Saldo em Conta Base</span>
            <span className="text-base font-black text-sky-400 font-mono block mt-1">
              {formatCurrency(currentAccountBalance)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Saldo bancário informado</span>
          </div>

          <div className="p-3.5 bg-slate-950 border border-emerald-800/40 rounded-xl">
            <span className="text-emerald-400 text-[11px] block flex items-center gap-1">
              <span>+ 2. Previsão de Entradas a Receber</span>
            </span>
            <span className="text-base font-black text-emerald-300 font-mono block mt-1">
              +{formatCurrency(totalPrevisaoEntradasAReceber)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Mensalidades ({formatCurrency(totalMensalidadesPrevistasAReceber)}) + Esporádicos ({formatCurrency(pendingSporadicAmount)})
            </span>
          </div>

          <div className="p-3.5 bg-slate-950 border border-rose-800/40 rounded-xl">
            <span className="text-rose-400 text-[11px] block flex items-center gap-1">
              <span>- 3. Previsão de Despesas a Pagar</span>
            </span>
            <span className="text-base font-black text-rose-300 font-mono block mt-1">
              -{formatCurrency(pendingExpensesAmount)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {pendingExpenses.length} despesa(s) pendente(s) no mês
            </span>
          </div>

          <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/40 rounded-xl">
            <span className="text-indigo-300 text-[11px] block font-bold">= 4. Saldo Final Projetado</span>
            <span className="text-base font-black text-white font-mono block mt-1">
              {formatCurrency(projectedFinalBalance)}
            </span>
            <span className="text-[10px] text-indigo-300/80 block mt-0.5">
              Disponibilidade prevista ao final de {formatMonthTitle(targetMonth)}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION: VISUAL BAR CHART (EVOLUÇÃO MENSAL RECEITAS X DESPESAS X RESULTADO) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <span>Evolução Mensal: Receitas x Despesas x Resultado Líquido</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Comparativo consolidado do histórico e meses vigentes (R$).
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span>Receitas Totais</span>
            </div>
            <div className="flex items-center gap-1.5 ml-2">
              <div className="w-3 h-3 rounded bg-rose-500" />
              <span>Despesas Totais</span>
            </div>
            <div className="flex items-center gap-1.5 ml-2">
              <div className="w-3 h-3 rounded bg-indigo-400" />
              <span>Resultado Líquido</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                }}
                formatter={(val: number) => [formatCurrency(val), '']}
              />
              <ReferenceLine y={0} stroke="#64748b" />
              <Bar dataKey="totalReceitas" name="Receitas Previstas/Realizadas" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="totalDespesas" name="Despesas Pagas/A Pagar" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="resultado" name="Resultado Operacional" fill="#818cf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION: DETALHAMENTO DA PREVISÃO DE ENTRADAS (MENSALIDADES E SERVIÇOS ESPORÁDICOS) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Header & Sub-navigation within entries */}
        <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
              <ArrowUpRight className="w-4 h-4" />
              <span>Discriminação Detalhada de Previsão de Entradas</span>
            </div>
            <h3 className="text-base font-bold text-white">
              Entradas Previstas para {formatMonthTitle(targetMonth)}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Confira individualmente as mensalidades contratuais e os serviços esporádicos programados para o mês.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start md:self-auto overflow-x-auto">
            <button
              onClick={() => setDetailTab('all_entries')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                detailTab === 'all_entries'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Todas Entradas ({targetBoletos.length + targetSporadics.length})
            </button>
            <button
              onClick={() => setDetailTab('monthly_fees')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                detailTab === 'monthly_fees'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Mensalidades ({formatCurrency(totalMensalidadesGerais)})
            </button>
            <button
              onClick={() => setDetailTab('sporadic_entries')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                detailTab === 'sporadic_entries'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Serviços Esporádicos ({formatCurrency(totalSporadicAmount)})
            </button>
            <button
              onClick={() => setDetailTab('expenses_outflow')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                detailTab === 'expenses_outflow'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Saídas / Despesas ({formatCurrency(totalExpensesAmount)})
            </button>
          </div>
        </div>

        {/* SUMMARY STRIP FOR SELECTED DETAIL */}
        <div className="bg-slate-950/60 px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-slate-400">Total Previsto: </span>
              <strong className="text-white font-mono">
                {detailTab === 'expenses_outflow' ? formatCurrency(totalExpensesAmount) : formatCurrency(totalReceitasPrevistasGerais)}
              </strong>
            </div>
            <div>
              <span className="text-slate-400">Efetivado / Quitado: </span>
              <strong className="text-emerald-400 font-mono">
                {detailTab === 'expenses_outflow' ? formatCurrency(paidExpensesAmount) : formatCurrency(totalReceitasRealizadas)}
              </strong>
            </div>
            <div>
              <span className="text-slate-400">Pendente a Realizar: </span>
              <strong className="text-amber-400 font-mono">
                {detailTab === 'expenses_outflow' ? formatCurrency(pendingExpensesAmount) : formatCurrency(totalPrevisaoEntradasAReceber)}
              </strong>
            </div>
          </div>

          {detailTab !== 'expenses_outflow' ? (
            <button
              onClick={onOpenSporadicModal}
              className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Serviço Previsto</span>
            </button>
          ) : (
            <button
              onClick={onOpenExpenseModal}
              className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Despesa</span>
            </button>
          )}
        </div>

        {/* DETAIL TABLES ACCORDING TO detailTab */}
        <div className="overflow-x-auto">
          {detailTab === 'expenses_outflow' ? (
            /* EXPENSES OUTFLOW TABLE */
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-4">Descrição da Despesa</th>
                  <th className="p-4">Categoria</th>
                  <th className="p-4">Vencimento</th>
                  <th className="p-4">Valor (R$)</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {targetExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-850/60 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white">{exp.description}</div>
                      {exp.notes && <div className="text-[11px] text-slate-400 mt-0.5">{exp.notes}</div>}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium capitalize">
                        {exp.category}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-300">{exp.dueDate}</td>
                    <td className="p-4 font-mono font-bold text-rose-400 text-sm">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="p-4">
                      {exp.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Pago ({exp.paymentDate || exp.dueDate})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="w-3.5 h-3.5" />
                          <span>A Pagar</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {targetExpenses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                      Nenhuma despesa cadastrada para este mês. Clique em "Lançar Despesa" para cadastrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            /* REVENUE ENTRANCES TABLE (MENSALIDADES + ESPORÁDICOS) */
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-4">Origem / Entrada</th>
                  <th className="p-4">Cliente Associado</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">Data / Previsão</th>
                  <th className="p-4">Valor (R$)</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {/* 1. Boletos emitidos para o mês */}
                {(detailTab === 'all_entries' || detailTab === 'monthly_fees') &&
                  targetBoletos.map((boleto) => {
                    const client = validClientMap.get(boleto.clientId);
                    return (
                      <tr key={`bol-${boleto.id}`} className="hover:bg-slate-850/60 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-white flex items-center gap-2">
                            <Receipt className="w-3.5 h-3.5 text-sky-400" />
                            <span>{boleto.description || 'Mensalidade Contratual'}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">Boleto #{boleto.id}</span>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-200">{client?.name || 'Cliente'}</div>
                          {client?.company && <div className="text-[10px] text-slate-400">{client.company}</div>}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full bg-sky-950/80 border border-sky-800/60 text-sky-300 text-[10px] font-bold">
                            Mensalidade Boleto
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-300">
                          {boleto.dueDate}
                        </td>
                        <td className="p-4 font-mono font-bold text-emerald-400 text-sm">
                          {formatCurrency(boleto.amount)}
                        </td>
                        <td className="p-4">
                          {boleto.status === 'paid' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Quitado</span>
                            </span>
                          ) : boleto.status === 'overdue' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Vencido</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Clock className="w-3.5 h-3.5" />
                              <span>A Vencer (Previsto)</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                {/* 2. Serviços Esporádicos Previstos e Realizados do mês */}
                {(detailTab === 'all_entries' || detailTab === 'sporadic_entries') &&
                  targetSporadics.map((service) => {
                    const client = validClientMap.get(service.clientId);
                    return (
                      <tr key={`sporadic-${service.id}`} className="hover:bg-slate-850/60 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-white flex items-center gap-2">
                            <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                            <span>{service.description}</span>
                          </div>
                          {service.category && (
                            <span className="text-[10px] text-amber-400/90 font-medium">
                              Categoria: {service.category}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-200">{client?.name || 'Cliente'}</div>
                          {client?.company && <div className="text-[10px] text-slate-400">{client.company}</div>}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-800/60 text-amber-300 text-[10px] font-bold">
                            Serviço Esporádico
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-300">
                          {service.dueDate || service.date}
                        </td>
                        <td className="p-4 font-mono font-bold text-amber-300 text-sm">
                          {formatCurrency(service.amount)}
                        </td>
                        <td className="p-4">
                          {service.status === 'realized' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Realizado / Quitado</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Pendente / Previsto</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                {targetBoletos.length === 0 && targetSporadics.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                      Nenhum boleto ou serviço esporádico registrado para {formatMonthTitle(targetMonth)}. Receitas, resultados e saldo projetado zerados para o início da gestão financeira a partir de outubro.
                    </td>
                  </tr>
                )}

              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
