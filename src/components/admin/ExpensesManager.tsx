import React, { useState } from 'react';
import {
  DollarSign,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  Trash2,
  Edit,
  Upload,
  Eye,
  Download,
  Landmark,
  Search,
  Tag,
  AlertCircle,
  FileText,
  CreditCard,
  Building,
} from 'lucide-react';
import { Expense, MonthlyBalance, PDFAttachment } from '../../types';
import { downloadDataUrl } from '../../utils/boletoPdfGenerator';

interface ExpensesManagerProps {
  expenses: Expense[];
  monthlyBalances: MonthlyBalance[];
  selectedPeriod: string; // 'all' or 'YYYY-MM'
  onAddExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onUpdateExpense: (id: string, fields: Partial<Expense>) => void;
  onDeleteExpense: (id: string) => void;
  onOpenBalanceModal: () => void;
  onViewAttachment: (title: string, attachment: PDFAttachment) => void;
  formatCurrency: (val: number) => string;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  infrastructure: { label: 'Infraestrutura & Nuvem', color: 'text-sky-400 bg-sky-950/60 border-sky-800/60' },
  software: { label: 'Softwares & Ferramentas', color: 'text-indigo-400 bg-indigo-950/60 border-indigo-800/60' },
  salary: { label: 'Salários & Pró-labore', color: 'text-purple-400 bg-purple-950/60 border-purple-800/60' },
  taxes: { label: 'Impostos & Tributos', color: 'text-red-400 bg-red-950/60 border-red-800/60' },
  marketing: { label: 'Marketing & Vendas', color: 'text-amber-400 bg-amber-950/60 border-amber-800/60' },
  office: { label: 'Escritório & Telecom', color: 'text-teal-400 bg-teal-950/60 border-teal-800/60' },
  accounting: { label: 'Contabilidade & Jurídico', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60' },
  services: { label: 'Serviços Terceirizados', color: 'text-blue-400 bg-blue-950/60 border-blue-800/60' },
  other: { label: 'Outras Despesas', color: 'text-slate-300 bg-slate-800 border-slate-700' },
};

export const ExpensesManager: React.FC<ExpensesManagerProps> = ({
  expenses,
  monthlyBalances,
  selectedPeriod,
  onAddExpense,
  onEditExpense,
  onUpdateExpense,
  onDeleteExpense,
  onOpenBalanceModal,
  onViewAttachment,
  formatCurrency,
  onToast,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Target Month
  const currentMonthKey = new Date().toISOString().substring(0, 7);
  const targetMonth = selectedPeriod !== 'all' ? selectedPeriod : currentMonthKey;

  // Account balance for the target month
  const targetMonthBalanceRecord = monthlyBalances.find((b) => b.month === targetMonth);
  const currentBalanceRecord = targetMonthBalanceRecord || (monthlyBalances.length > 0 ? monthlyBalances[0] : null);
  const currentAccountBalance = currentBalanceRecord
    ? (currentBalanceRecord.currentBalance !== undefined
        ? currentBalanceRecord.currentBalance
        : currentBalanceRecord.initialBalance)
    : 0;

  // Filter expenses by selected period, category, status and search
  const periodExpenses = expenses.filter((e) => {
    if (selectedPeriod === 'all') return true;
    return e.month === selectedPeriod || (e.dueDate && e.dueDate.startsWith(selectedPeriod));
  });

  const filteredExpenses = periodExpenses.filter((e) => {
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchDesc = e.description.toLowerCase().includes(q);
      const matchNotes = e.notes?.toLowerCase().includes(q);
      const matchCategory = e.category.toLowerCase().includes(q);
      if (!matchDesc && !matchNotes && !matchCategory) return false;
    }
    return true;
  });

  // Calculate totals
  const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
  const paidExpenses = periodExpenses.filter((e) => e.status === 'paid');
  const pendingExpenses = periodExpenses.filter((e) => e.status === 'pending');

  const totalPaid = paidExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPending = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleTogglePaid = (expense: Expense) => {
    const nextStatus = expense.status === 'paid' ? 'pending' : 'paid';
    const nowStr = new Date().toISOString().substring(0, 10);
    onUpdateExpense(expense.id, {
      status: nextStatus,
      paymentDate: nextStatus === 'paid' ? (expense.paymentDate || nowStr) : undefined,
    });
    onToast(
      'success',
      nextStatus === 'paid' ? 'Despesa Marcada como Paga' : 'Despesa Marcada como A Pagar',
      `"${expense.description}" agora está com status ${nextStatus === 'paid' ? 'Pago' : 'Pendente'}.`
    );
  };

  const handleDeleteWithConfirm = (expense: Expense) => {
    if (window.confirm(`Deseja realmente excluir a despesa "${expense.description}" no valor de ${formatCurrency(expense.amount)}?`)) {
      onDeleteExpense(expense.id);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Quick Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 mb-1">
            <DollarSign className="w-4 h-4" />
            <span>Gestão de Despesas Operacionais & Saídas</span>
          </div>
          <h2 className="text-xl font-black text-white">
            Lançamento de Despesas Mês a Mês & Saldo Bancário
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre pagamentos a fornecedores, salários, servidores e tributos para compor o fluxo de caixa.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
          <button
            onClick={onOpenBalanceModal}
            className="flex-1 md:flex-initial px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-950/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Landmark className="w-4 h-4" />
            <span>Saldo em Conta Bancária</span>
          </button>
          <button
            onClick={onAddExpense}
            className="flex-1 md:flex-initial px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-950/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Lançar Nova Despesa</span>
          </button>
        </div>
      </div>

      {/* 4 SUMMARY CARDS (SALDO, TOTAL DESPESAS, PAGAS, A PAGAR) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo em Conta */}
        <div className="bg-slate-900 border border-sky-500/30 rounded-2xl p-5 shadow-sm hover:border-sky-500/60 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5" />
              <span>Saldo em Conta ({targetMonth})</span>
            </span>
            <button
              onClick={onOpenBalanceModal}
              className="p-1 hover:bg-sky-500/20 text-sky-400 rounded-md transition-colors cursor-pointer"
              title="Ajustar saldo bancário"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {formatCurrency(currentAccountBalance)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span className="truncate max-w-[150px]">{currentBalanceRecord?.bankAccount || 'Conta Bancária'}</span>
            <span className="text-sky-400 font-semibold">{currentBalanceRecord?.month === targetMonth ? 'Conciliado' : 'Base'}</span>
          </div>
        </div>

        {/* Total de Despesas do Período */}
        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-5 shadow-sm hover:border-rose-500/60 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Total de Despesas</span>
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              {periodExpenses.length} lançamentos
            </span>
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono">
            {formatCurrency(totalExpenses)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {selectedPeriod === 'all' ? 'Todo o período registrado' : `Mês de competência ${targetMonth}`}
          </div>
        </div>

        {/* Despesas Pagas */}
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-sm hover:border-emerald-500/60 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Despesas Pagas</span>
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {paidExpenses.length} quitadas
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {formatCurrency(totalPaid)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {totalExpenses > 0 ? ((totalPaid / totalExpenses) * 100).toFixed(0) + '% do total liquidado' : 'Nenhuma despesa'}
          </div>
        </div>

        {/* Despesas Pendentes (A Pagar) */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-sm hover:border-amber-500/60 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>A Pagar (Pendentes)</span>
            </span>
            <span className="text-xs font-mono font-bold text-amber-400">
              {pendingExpenses.length} pendentes
            </span>
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {formatCurrency(totalPending)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Saídas futuras previstas no fluxo de caixa
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar despesa por descrição, notas ou categoria..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-rose-500 transition-colors"
          >
            <option value="all">Todas as Categorias</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-rose-500 transition-colors"
          >
            <option value="all">Todos os Status</option>
            <option value="pending">⏳ A Pagar (Pendentes)</option>
            <option value="paid">✅ Pagas (Quitadas)</option>
          </select>

          <button
            onClick={onAddExpense}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Lançar</span>
          </button>
        </div>
      </div>

      {/* EXPENSES TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-4">Descrição da Despesa</th>
                <th className="p-4">Categoria</th>
                <th className="p-4">Mês Competência</th>
                <th className="p-4">Vencimento</th>
                <th className="p-4">Valor (R$)</th>
                <th className="p-4">Status</th>
                <th className="p-4">Comprovante</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredExpenses.map((expense) => {
                const catInfo = CATEGORY_LABELS[expense.category] || CATEGORY_LABELS['other'];

                return (
                  <tr key={expense.id} className="hover:bg-slate-850/60 transition-colors">
                    {/* Description & Notes */}
                    <td className="p-4 max-w-xs">
                      <div className="font-bold text-white text-sm">{expense.description}</div>
                      {expense.notes && (
                        <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{expense.notes}</div>
                      )}
                      {expense.paymentMethod && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 mt-0.5 capitalize">
                          <CreditCard className="w-3 h-3" />
                          <span>{expense.paymentMethod}</span>
                        </span>
                      )}
                    </td>

                    {/* Category */}
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${catInfo.color}`}>
                        <Tag className="w-3 h-3" />
                        <span>{catInfo.label}</span>
                      </span>
                    </td>

                    {/* Competence Month */}
                    <td className="p-4 font-mono font-medium text-slate-300">
                      {expense.month}
                    </td>

                    {/* Due Date & Payment Date */}
                    <td className="p-4">
                      <div className="font-mono text-slate-200">{expense.dueDate}</div>
                      {expense.status === 'paid' && expense.paymentDate && (
                        <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                          Pago em: {expense.paymentDate}
                        </div>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="p-4 font-mono font-black text-rose-400 text-sm">
                      {formatCurrency(expense.amount)}
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <button
                        onClick={() => handleTogglePaid(expense)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer active:scale-95 ${
                          expense.status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                        }`}
                        title="Clique para alternar entre Pago e A Pagar"
                      >
                        {expense.status === 'paid' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Pago</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            <span>A Pagar</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Receipt */}
                    <td className="p-4">
                      {expense.receipt ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onViewAttachment(`Recibo - ${expense.description}`, expense.receipt!)}
                            className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer"
                            title="Visualizar comprovante"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => downloadDataUrl(expense.receipt!.dataUrl, expense.receipt!.name)}
                            className="p-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="Baixar arquivo"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onEditExpense(expense)}
                          className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Anexar</span>
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditExpense(expense)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Editar despesa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteWithConfirm(expense)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Excluir despesa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-500">
                    <DollarSign className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-400">Nenhuma despesa encontrada</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                        ? 'Tente ajustar os filtros ou termo de busca.'
                        : 'Clique em "Lançar Nova Despesa" para cadastrar os pagamentos deste mês.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
