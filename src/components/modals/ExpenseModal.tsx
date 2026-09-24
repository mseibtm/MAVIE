import React, { useState, useEffect, useRef } from 'react';
import { X, DollarSign, Calendar, Tag, FileText, Upload, Trash2, CheckCircle2, Clock, AlertCircle, Eye, CreditCard } from 'lucide-react';
import { Expense, ExpenseCategory, PDFAttachment } from '../../types';
import { processReceiptFile, downloadDataUrl } from '../../utils/boletoPdfGenerator';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Omit<Expense, 'id' | 'createdAt'>, existingId?: string) => void;
  initialExpense?: Expense | null;
  defaultMonth?: string;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

const CATEGORIES: { id: ExpenseCategory; label: string; iconColor: string }[] = [
  { id: 'infrastructure', label: 'Infraestrutura & Nuvem', iconColor: 'text-sky-400' },
  { id: 'software', label: 'Softwares & Ferramentas', iconColor: 'text-indigo-400' },
  { id: 'salary', label: 'Salários & Pró-labore', iconColor: 'text-purple-400' },
  { id: 'taxes', label: 'Impostos & Tributos', iconColor: 'text-red-400' },
  { id: 'marketing', label: 'Marketing & Vendas', iconColor: 'text-amber-400' },
  { id: 'office', label: 'Escritório, Luz & Internet', iconColor: 'text-teal-400' },
  { id: 'accounting', label: 'Contabilidade & Jurídico', iconColor: 'text-emerald-400' },
  { id: 'services', label: 'Serviços Terceirizados', iconColor: 'text-blue-400' },
  { id: 'other', label: 'Outras Despesas', iconColor: 'text-slate-400' },
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialExpense,
  defaultMonth,
  onToast,
}) => {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory | string>('software');
  const [amountStr, setAmountStr] = useState('');
  const [month, setMonth] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<'pending' | 'paid'>('pending');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'boleto' | 'transfer' | 'card' | 'cash'>('pix');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState<PDFAttachment | undefined>(undefined);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (initialExpense) {
      setDescription(initialExpense.description);
      setCategory(initialExpense.category);
      setAmountStr(initialExpense.amount.toString());
      setMonth(initialExpense.month);
      setDueDate(initialExpense.dueDate);
      setStatus(initialExpense.status);
      setPaymentDate(initialExpense.paymentDate || '');
      setPaymentMethod(initialExpense.paymentMethod || 'pix');
      setNotes(initialExpense.notes || '');
      setReceipt(initialExpense.receipt);
    } else {
      const now = new Date();
      const currentMonth = defaultMonth && defaultMonth !== 'all'
        ? defaultMonth
        : now.toISOString().substring(0, 7);
      const todayStr = now.toISOString().substring(0, 10);

      setDescription('');
      setCategory('software');
      setAmountStr('');
      setMonth(currentMonth);
      setDueDate(todayStr);
      setStatus('pending');
      setPaymentDate('');
      setPaymentMethod('pix');
      setNotes('');
      setReceipt(undefined);
    }
  }, [isOpen, initialExpense, defaultMonth]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      onToast('error', 'Arquivo Muito Grande', 'O comprovante deve ter no máximo 12MB.');
      return;
    }

    try {
      setIsProcessingFile(true);
      onToast('info', 'Processando comprovante...', 'Comprimindo arquivo para otimização.');
      const attachment = await processReceiptFile(file);
      setReceipt(attachment);
      onToast('success', 'Comprovante Anexado', `${file.name} anexado com sucesso.`);
    } catch (err) {
      console.error(err);
      onToast('error', 'Falha ao processar arquivo', 'Não foi possível carregar o anexo.');
    } finally {
      setIsProcessingFile(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanDesc = description.trim();
    if (!cleanDesc) {
      onToast('error', 'Campo Obrigatório', 'Informe a descrição da despesa.');
      return;
    }

    const parsedAmount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      onToast('error', 'Valor Inválido', 'Informe um valor maior que R$ 0,00.');
      return;
    }

    if (!dueDate) {
      onToast('error', 'Data Obrigatória', 'Informe a data de vencimento da despesa.');
      return;
    }

    const cleanMonth = month.trim() || dueDate.substring(0, 7);

    onSave(
      {
        description: cleanDesc,
        category,
        amount: parsedAmount,
        dueDate,
        paymentDate: status === 'paid' ? (paymentDate || dueDate) : undefined,
        status,
        month: cleanMonth,
        paymentMethod,
        notes: notes.trim() || undefined,
        receipt,
      },
      initialExpense?.id
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {initialExpense ? 'Editar Despesa' : 'Lançar Nova Despesa'}
              </h3>
              <p className="text-xs text-slate-400">
                Cadastre saídas e pagamentos previstos ou efetuados para o mês
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
          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Descrição da Despesa *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Servidores AWS, Assessoria Contábil, Licença Slack, DAS..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          {/* Category & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>Categoria *</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-rose-400" />
                <span>Valor (R$) *</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0,00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors font-mono"
              />
            </div>
          </div>

          {/* Month & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Mês de Competência *</span>
              </label>
              <input
                type="month"
                required
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  if (!dueDate || dueDate.substring(0, 7) !== e.target.value) {
                    setDueDate(`${e.target.value}-15`);
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Data de Vencimento *</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  if (!month && e.target.value) {
                    setMonth(e.target.value.substring(0, 7));
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>
          </div>

          {/* Status & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Status da Despesa
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('pending')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    status === 'pending'
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>A Pagar</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatus('paid');
                    if (!paymentDate) {
                      setPaymentDate(dueDate || new Date().toISOString().substring(0, 10));
                    }
                  }}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    status === 'paid'
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Pago</span>
                </button>
              </div>
            </div>

            {status === 'paid' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Data de Pagamento Efetivo</span>
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  <span>Forma de Pagamento</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors"
                >
                  <option value="pix">PIX</option>
                  <option value="boleto">Boleto Bancário</option>
                  <option value="transfer">Transferência / TED</option>
                  <option value="card">Cartão de Crédito PJ</option>
                  <option value="cash">Dinheiro / Outro</option>
                </select>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Observações / Detalhes (Opcional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Pagamento programado via débito automático, código da fatura..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors resize-none"
            />
          </div>

          {/* Attachment / Receipt */}
          <div className="pt-1">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-slate-400" />
                <span>Comprovante / Recibo da Despesa</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">PDF ou Imagem (Máx 12MB)</span>
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf,image/png,image/jpeg,image/webp"
              onChange={handleFileUpload}
              className="hidden"
            />

            {receipt ? (
              <div className="flex items-center justify-between p-3 bg-slate-950 border border-emerald-500/30 rounded-xl">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{receipt.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {(receipt.size / 1024).toFixed(0)} KB • Anexado em {receipt.uploadedAt.substring(0, 10)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => downloadDataUrl(receipt.dataUrl, receipt.name)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    title="Baixar comprovante"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceipt(undefined)}
                    className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10 transition-colors"
                    title="Remover anexo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={isProcessingFile}
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 p-3 bg-slate-950 border border-dashed border-slate-700 hover:border-slate-500 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-all disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{isProcessingFile ? 'Processando arquivo...' : 'Anexar Comprovante ou Fatura'}</span>
              </button>
            )}
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
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-900/30 transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{initialExpense ? 'Salvar Alterações' : 'Lançar Despesa'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
