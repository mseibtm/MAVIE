import React, { useState, useEffect } from 'react';
import { X, Landmark, DollarSign, Calendar, CheckCircle2, FileText, Info } from 'lucide-react';
import { MonthlyBalance } from '../../types';

interface AccountBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (balance: MonthlyBalance) => void;
  currentBalanceRecord?: MonthlyBalance | null;
  selectedMonth: string;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const AccountBalanceModal: React.FC<AccountBalanceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentBalanceRecord,
  selectedMonth,
  onToast,
}) => {
  const [bankAccount, setBankAccount] = useState('');
  const [balanceStr, setBalanceStr] = useState('');
  const [month, setMonth] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const targetMonth = selectedMonth !== 'all' ? selectedMonth : new Date().toISOString().substring(0, 7);
    setMonth(targetMonth);

    if (currentBalanceRecord) {
      setBankAccount(currentBalanceRecord.bankAccount || 'Conta Corrente Principal PJ');
      setBalanceStr(
        currentBalanceRecord.currentBalance !== undefined
          ? currentBalanceRecord.currentBalance.toString()
          : currentBalanceRecord.initialBalance.toString()
      );
      setNotes(currentBalanceRecord.notes || '');
    } else {
      setBankAccount('Conta Corrente Principal PJ (Banco Inter / Itaú)');
      setBalanceStr('');
      setNotes('');
    }
  }, [isOpen, currentBalanceRecord, selectedMonth]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedBalance = parseFloat(balanceStr.replace(',', '.'));
    if (isNaN(parsedBalance)) {
      onToast('error', 'Valor Inválido', 'Informe um valor numérico válido para o saldo em conta.');
      return;
    }

    const cleanMonth = month || new Date().toISOString().substring(0, 7);

    const record: MonthlyBalance = {
      id: currentBalanceRecord?.id || `bal-${cleanMonth}`,
      month: cleanMonth,
      bankAccount: bankAccount.trim() || 'Conta Corrente Principal PJ',
      initialBalance: parsedBalance,
      currentBalance: parsedBalance,
      updatedAt: new Date().toISOString(),
      notes: notes.trim() || undefined,
    };

    onSave(record);
    onToast('success', 'Saldo Atualizado', `Saldo de ${cleanMonth} registrado com sucesso.`);
    onClose();
  };

  // Format helper
  const formatMonthLabel = (m: string) => {
    if (!m) return '';
    const [y, mm] = m.split('-');
    const d = new Date(parseInt(y), parseInt(mm) - 1, 1);
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Saldo em Conta Bancária</h3>
              <p className="text-xs text-slate-400">
                Ajuste o saldo do mês para alimentar os cálculos e projeções
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-sky-950/30 border border-sky-800/40 rounded-xl flex items-start gap-2.5 text-xs text-sky-300">
            <Info className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" />
            <span>
              O saldo em conta é utilizado como base inicial para a <strong>Previsão de Saldo Final</strong> do mês, somando as receitas previstas e subtraindo as despesas.
            </span>
          </div>

          {/* Month */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>Mês de Referência *</span>
            </label>
            <input
              type="month"
              required
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors font-medium"
            />
            {month && (
              <p className="text-[11px] text-slate-400 mt-1 capitalize">
                Referência: {formatMonthLabel(month)}
              </p>
            )}
          </div>

          {/* Bank / Account Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-slate-400" />
              <span>Instituição / Nome da Conta</span>
            </label>
            <input
              type="text"
              required
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              placeholder="Ex: Banco Inter PJ, Itaú Empresas, Nubank PJ..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          {/* Balance Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Saldo em Conta Bancária (R$) *</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-mono">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                required
                value={balanceStr}
                onChange={(e) => setBalanceStr(e.target.value)}
                placeholder="0,00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors font-mono font-bold"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Informe o saldo consolidado (pode ser positivo ou negativo).
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Notas / Observações do Extrato (Opcional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Verificado no extrato do dia 24/09"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-lg shadow-sky-900/30 transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar Saldo em Conta</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
