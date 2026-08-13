import React, { useState, useRef } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  Edit3,
  X,
  QrCode,
  Eye,
  FileText,
  Briefcase,
  Calendar,
  Upload,
  Download,
  FileCheck,
  Image as ImageIcon,
  Check,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Boleto, Client, BoletoStatus, PDFAttachment, SporadicService } from '../../types';
import { generateDigitableLine, generateRandomBarcode } from '../../utils/cpf';
import { BoletoModal } from '../modals/BoletoModal';
import { SporadicServiceModal } from '../modals/SporadicServiceModal';
import { PDFUploader } from '../common/PDFUploader';

interface AdminBoletosViewProps {
  clients: Client[];
  boletos: Boleto[];
  initialSelectedClientId?: string;
  onAddBoleto: (boleto: Omit<Boleto, 'id' | 'createdAt'>) => void;
  onAddSporadicService?: (service: Omit<SporadicService, 'id' | 'createdAt'>) => void;
  onUpdateBoletoStatus: (boletoId: string, status: BoletoStatus) => void;
  onUpdateBoletoDueDate?: (boletoId: string, newDueDate: string) => void;
  onUploadReceipt?: (boletoId: string, receipt: PDFAttachment, markAsPaid?: boolean) => void;
  onRemoveReceipt?: (boletoId: string) => void;
  onDeleteBoleto: (boletoId: string) => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const AdminBoletosView: React.FC<AdminBoletosViewProps> = ({
  clients,
  boletos,
  initialSelectedClientId = '',
  onAddBoleto,
  onAddSporadicService,
  onUpdateBoletoStatus,
  onUpdateBoletoDueDate,
  onUploadReceipt,
  onRemoveReceipt,
  onDeleteBoleto,
  onToast,
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string>(initialSelectedClientId);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [issueDateFilter, setIssueDateFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSporadicModalOpen, setIsSporadicModalOpen] = useState(false);
  const [viewingBoleto, setViewingBoleto] = useState<Boleto | null>(null);

  // Due Date Edit Modal State
  const [editingDueDateBoleto, setEditingDueDateBoleto] = useState<Boleto | null>(null);
  const [newDueDateValue, setNewDueDateValue] = useState('');

  // Receipt Management Modal State
  const [receiptModalBoleto, setReceiptModalBoleto] = useState<Boleto | null>(null);
  const [uploadedReceiptFile, setUploadedReceiptFile] = useState<PDFAttachment | null>(null);
  const [receiptAutoMarkPaid, setReceiptAutoMarkPaid] = useState(true);
  const [isReplacingReceipt, setIsReplacingReceipt] = useState(false);
  const receiptFileInputRef = useRef<HTMLInputElement>(null);

  // Form states for adding boleto
  const [formClientId, setFormClientId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<BoletoStatus>('pending');
  const [customLine, setCustomLine] = useState('');
  const [pdfFile, setPdfFile] = useState<PDFAttachment | undefined>(undefined);

  const openNewBoletoModal = () => {
    const initialClient = clients.find((c) => c.id === selectedClientId) || clients[0];
    const initialId = initialClient?.id || '';
    setFormClientId(initialId);
    setDescription('Serviços Prestados - Ref. Mês Vigente');
    setAmount(initialClient?.monthlyFee ? String(initialClient.monthlyFee) : '0.00');

    // Default due date: Day 10 of current/next month
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();
    if (now.getDate() > 10) {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }
    const monthStr = String(month + 1).padStart(2, '0');
    setDueDate(`${year}-${monthStr}-10`);
    setStatus('pending');
    setCustomLine(generateDigitableLine());
    setPdfFile(undefined);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numericAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      onToast('error', 'Valor Inválido', 'Informe um valor numérico positivo para o boleto.');
      return;
    }

    if (!formClientId) {
      onToast('error', 'Selecione o Cliente', 'Selecione um cliente cadastrado.');
      return;
    }

    if (!pdfFile) {
      onToast('error', 'Upload de PDF Obrigatório', 'Você deve realizar o upload do arquivo PDF do boleto gerado no seu banco.');
      return;
    }

    const pixKeyCNPJ = '32.922.555/0001-87';

    onAddBoleto({
      clientId: formClientId,
      description: description.trim(),
      amount: numericAmount,
      dueDate,
      status,
      lineDigitable: customLine || generateDigitableLine(),
      pixKey: pixKeyCNPJ,
      barcode: generateRandomBarcode(),
      pdfFile,
      paidAt: status === 'paid' ? new Date().toISOString() : undefined,
    });

    const targetClient = clients.find((c) => c.id === formClientId);
    onToast('success', 'Boleto Emitido!', `Boleto adicionado com sucesso para ${targetClient?.name || 'Cliente'}.`);
    setIsModalOpen(false);
  };

  const handleDelete = (boletoId: string) => {
    if (window.confirm('Tem certeza que deseja remover este boleto?')) {
      onDeleteBoleto(boletoId);
      onToast('info', 'Boleto Excluído', 'O documento foi removido do portal.');
    }
  };

  // Due Date Edit Handlers
  const handleOpenDueDateModal = (boleto: Boleto) => {
    setEditingDueDateBoleto(boleto);
    setNewDueDateValue(boleto.dueDate);
  };

  const handleApplyDatePreset = (daysToAdd: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysToAdd);
    const y = target.getFullYear();
    const m = String(target.getMonth() + 1).padStart(2, '0');
    const d = String(target.getDate()).padStart(2, '0');
    setNewDueDateValue(`${y}-${m}-${d}`);
  };

  const handleApplyNextMonth10th = () => {
    const now = new Date();
    let y = now.getFullYear();
    let m = now.getMonth() + 1; // next month (0-indexed base + 1)
    if (m > 11) {
      m = 0;
      y += 1;
    }
    const monthStr = String(m + 1).padStart(2, '0');
    setNewDueDateValue(`${y}-${monthStr}-10`);
  };

  const handleSaveDueDate = () => {
    if (!editingDueDateBoleto || !newDueDateValue) return;

    if (onUpdateBoletoDueDate) {
      onUpdateBoletoDueDate(editingDueDateBoleto.id, newDueDateValue);
    }
    setEditingDueDateBoleto(null);
  };

  // Receipt Modal Handlers
  const handleOpenReceiptModal = (boleto: Boleto) => {
    setReceiptModalBoleto(boleto);
    setUploadedReceiptFile(null);
    setIsReplacingReceipt(false);
    setReceiptAutoMarkPaid(boleto.status !== 'paid');
  };

  const handleReceiptFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      onToast('error', 'Arquivo muito grande', 'O comprovante deve ter no máximo 12MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedReceiptFile({
        name: file.name,
        size: file.size,
        dataUrl: reader.result as string,
        uploadedAt: new Date().toISOString(),
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveReceipt = () => {
    if (!receiptModalBoleto || !uploadedReceiptFile) return;

    if (onUploadReceipt) {
      onUploadReceipt(receiptModalBoleto.id, uploadedReceiptFile, receiptAutoMarkPaid);
      onToast(
        'success',
        'Comprovante Salvo!',
        `Comprovante inserido no boleto #${receiptModalBoleto.id}${receiptAutoMarkPaid ? ' e status atualizado para Pago' : ''}.`
      );
    }
    setReceiptModalBoleto(null);
    setUploadedReceiptFile(null);
  };

  const handleRemoveReceipt = () => {
    if (!receiptModalBoleto) return;
    if (window.confirm('Deseja realmente remover o comprovante de pagamento deste boleto?')) {
      if (onRemoveReceipt) {
        onRemoveReceipt(receiptModalBoleto.id);
      }
      setReceiptModalBoleto(null);
    }
  };

  const filteredBoletos = boletos.filter((b) => {
    const matchClient = selectedClientId ? b.clientId === selectedClientId : true;
    const matchStatus = statusFilter === 'all' ? true : b.status === statusFilter;
    const matchIssueDate = issueDateFilter ? b.createdAt.startsWith(issueDateFilter) : true;
    const client = clients.find((c) => c.id === b.clientId);
    const matchSearch =
      b.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.id.includes(searchTerm) ||
      (client && client.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client && client.cpf.includes(searchTerm));

    return matchClient && matchStatus && matchIssueDate && matchSearch;
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const todayStr = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })();

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
            <CreditCard className="w-4 h-4" />
            <span>Gestão de Títulos</span>
          </div>
          <h1 className="text-2xl font-black text-white">Boletos & Comprovantes</h1>
          <p className="text-xs text-slate-400 mt-1">
            Emita boletos, altere datas de vencimento, insira comprovantes de pagamento e acompanhe as baixas financeiras.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onAddSporadicService && (
            <button
              onClick={() => setIsSporadicModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-xl border border-amber-500/30 transition-all shadow-sm active:scale-95"
            >
              <Briefcase className="w-4 h-4 text-amber-400" />
              <span>Novo Serviço Esporádico</span>
            </button>
          )}

          <button
            onClick={openNewBoletoModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Emitir Novo Boleto</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Filtrar por Cliente
          </label>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Todos os Clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.cpf})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Status Financeiro
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">Todos os Status</option>
            <option value="pending">A vencer</option>
            <option value="paid">Pago</option>
            <option value="overdue">Em atraso</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Data de Emissão
          </label>
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={issueDateFilter}
              onChange={(e) => setIssueDateFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:ring-2 focus:ring-amber-500"
            />
            {issueDateFilter && (
              <button
                type="button"
                onClick={() => setIssueDateFilter('')}
                className="px-2 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 shrink-0"
                title="Limpar Data"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Buscar por Palavra-Chave
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Descrição, Código ou Nome..."
              className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Boletos List */}
      {filteredBoletos.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
          <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-300">Nenhum boleto encontrado</h3>
          <p className="text-xs text-slate-500 mt-1">
            Ajuste os filtros de busca ou clique em "Emitir Novo Boleto" para adicionar.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBoletos.map((boleto) => {
            const client = clients.find((c) => c.id === boleto.clientId);
            const [bYear, bMonth, bDay] = boleto.dueDate.split('-');
            const formattedDueDate = `${bDay}/${bMonth}/${bYear}`;
            const isDueOverdue = boleto.status === 'overdue' || (boleto.status !== 'paid' && boleto.dueDate < todayStr);

            return (
              <div
                key={boleto.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-slate-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-slate-400 font-bold">#{boleto.id}</span>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={boleto.status}
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.7, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                        className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border flex items-center gap-1 ${
                          boleto.status === 'paid'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : boleto.status === 'overdue'
                            ? 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse'
                            : 'bg-amber-950 text-amber-300 border-amber-800'
                        }`}
                      >
                        {boleto.status === 'paid' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                        {boleto.status === 'overdue' && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                        {boleto.status === 'pending' && <Clock className="w-3 h-3 text-amber-400" />}
                        <span>
                          {boleto.status === 'paid' ? 'Pago' : boleto.status === 'overdue' ? 'Em atraso' : 'A vencer'}
                        </span>
                      </motion.span>
                    </AnimatePresence>

                    <span className="text-xs font-bold text-amber-400">
                      Cliente: {client ? `${client.name} (${client.cpf})` : 'Cliente'}
                    </span>

                    {boleto.pdfFile && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-950 text-red-300 border border-red-800 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        PDF Anexado
                      </span>
                    )}

                    {/* Receipt Status Badge / Action */}
                    {boleto.paymentReceipt ? (
                      <button
                        type="button"
                        onClick={() => handleOpenReceiptModal(boleto)}
                        className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/80 hover:bg-emerald-900 flex items-center gap-1 transition-colors shadow-sm"
                        title="Clique para visualizar, baixar ou gerenciar comprovante"
                      >
                        <FileCheck className="w-3 h-3 text-emerald-400" />
                        <span>Comprovante Anexado</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenReceiptModal(boleto)}
                        className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 hover:border-emerald-500/40 hover:text-emerald-300 transition-colors"
                        title="Inserir comprovante de pagamento"
                      >
                        <Upload className="w-3 h-3 text-emerald-400" />
                        <span>Inserir Comprovante</span>
                      </button>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-white">{boleto.description}</h4>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <span>
                      Emissão:{' '}
                      <strong className="text-amber-300 font-semibold">
                        {new Date(boleto.createdAt).toLocaleDateString('pt-BR')}
                      </strong>
                    </span>

                    {/* Due date with interactive edit button */}
                    <span className="inline-flex items-center gap-1.5">
                      Vencimento:{' '}
                      <strong
                        className={`font-bold ${
                          isDueOverdue ? 'text-rose-400' : 'text-slate-200'
                        }`}
                      >
                        {formattedDueDate}
                      </strong>
                      <button
                        type="button"
                        onClick={() => handleOpenDueDateModal(boleto)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg transition-all"
                        title="Alterar Data de Vencimento"
                      >
                        <Calendar className="w-3 h-3 text-amber-400" />
                        <span>Alterar Vencimento</span>
                      </button>
                    </span>

                    <span>
                      Valor: <strong className="text-white font-bold">{formatCurrency(boleto.amount)}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                  {/* Status Dropdown */}
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase mb-0.5">Status:</span>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={boleto.status}
                        initial={{ scale: 0.85, opacity: 0, y: -4 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.85, opacity: 0, y: 4 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      >
                        <select
                          value={boleto.status}
                          onChange={(e) => {
                            const newStatus = e.target.value as BoletoStatus;
                            onUpdateBoletoStatus(boleto.id, newStatus);
                            const statusLabel =
                              newStatus === 'pending' ? 'A vencer' : newStatus === 'paid' ? 'Pago' : 'Em atraso';
                            onToast('success', 'Status Atualizado', `Boleto #${boleto.id} alterado para "${statusLabel}".`);
                          }}
                          className={`px-3 py-1.5 text-xs font-extrabold rounded-xl border focus:outline-none cursor-pointer transition-all shadow-sm ${
                            boleto.status === 'paid'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800 hover:bg-emerald-900 ring-1 ring-emerald-500/30'
                              : boleto.status === 'overdue'
                              ? 'bg-rose-950 text-rose-300 border-rose-800 hover:bg-rose-900 ring-1 ring-rose-500/30'
                              : 'bg-amber-950 text-amber-300 border-amber-800 hover:bg-amber-900 ring-1 ring-amber-500/30'
                          }`}
                        >
                          <option value="pending" className="bg-slate-900 text-amber-300">
                            A vencer
                          </option>
                          <option value="paid" className="bg-slate-900 text-emerald-300">
                            Pago
                          </option>
                          <option value="overdue" className="bg-slate-900 text-rose-300">
                            Em atraso
                          </option>
                        </select>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Receipt button */}
                  <button
                    type="button"
                    onClick={() => handleOpenReceiptModal(boleto)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors shadow-sm ${
                      boleto.paymentReceipt
                        ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-700/60'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                    title={boleto.paymentReceipt ? 'Gerenciar Comprovante' : 'Inserir Comprovante de Pagamento'}
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{boleto.paymentReceipt ? 'Comprovante' : 'Inserir Comprovante'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewingBoleto(boleto)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>Visualizar / PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(boleto.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Excluir Boleto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Editing Due Date */}
      {editingDueDateBoleto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Alterar Data de Vencimento</h3>
                  <span className="text-xs text-slate-400">Boleto #{editingDueDateBoleto.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDueDateBoleto(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Boleto details summary */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Cliente:</span>
                  <span className="font-bold text-white">
                    {clients.find((c) => c.id === editingDueDateBoleto.clientId)?.name || 'Cliente'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Valor:</span>
                  <span className="font-bold text-emerald-400">
                    {formatCurrency(editingDueDateBoleto.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vencimento Atual:</span>
                  <span className="font-bold text-amber-300">
                    {(() => {
                      const [y, m, d] = editingDueDateBoleto.dueDate.split('-');
                      return `${d}/${m}/${y}`;
                    })()}
                  </span>
                </div>
              </div>

              {/* Date Input */}
              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                  Selecione a Nova Data de Vencimento *
                </label>
                <input
                  type="date"
                  value={newDueDateValue}
                  onChange={(e) => setNewDueDateValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-sm focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              {/* Presets */}
              <div>
                <span className="block text-slate-400 font-semibold mb-2">Atalhos rápidos:</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyDatePreset(0)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-center transition-colors border border-slate-700"
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyDatePreset(5)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-center transition-colors border border-slate-700"
                  >
                    +5 dias
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyDatePreset(10)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-center transition-colors border border-slate-700"
                  >
                    +10 dias
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyDatePreset(15)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-center transition-colors border border-slate-700"
                  >
                    +15 dias
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyDatePreset(30)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-center transition-colors border border-slate-700"
                  >
                    +30 dias
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyNextMonth10th}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold rounded-lg text-center transition-colors border border-slate-700"
                  >
                    Dia 10 Próx. Mês
                  </button>
                </div>
              </div>

              {/* Status Simulation Preview */}
              {newDueDateValue && (
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] space-y-1">
                  <span className="text-slate-400 block font-semibold">Previsão do Status:</span>
                  {editingDueDateBoleto.status === 'paid' ? (
                    <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Permanecerá "Pago" (título já liquidado)</span>
                    </div>
                  ) : newDueDateValue < todayStr ? (
                    <div className="text-rose-400 font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Status será recalculado para "Em atraso"</span>
                    </div>
                  ) : (
                    <div className="text-amber-400 font-bold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Status será recalculado para "A vencer"</span>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingDueDateBoleto(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveDueDate}
                  disabled={!newDueDateValue}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  Salvar Novo Vencimento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Inserting & Managing Payment Receipts */}
      {receiptModalBoleto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Comprovante de Pagamento</h3>
                  <span className="text-xs text-slate-400">Boleto #{receiptModalBoleto.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReceiptModalBoleto(null);
                  setUploadedReceiptFile(null);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Summary */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Cliente:</span>
                  <span className="font-bold text-white">
                    {clients.find((c) => c.id === receiptModalBoleto.clientId)?.name || 'Cliente'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Valor:</span>
                  <span className="font-bold text-emerald-400">
                    {formatCurrency(receiptModalBoleto.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Atual:</span>
                  <span className="font-bold text-amber-300">
                    {receiptModalBoleto.status === 'paid'
                      ? 'Pago'
                      : receiptModalBoleto.status === 'overdue'
                      ? 'Em atraso'
                      : 'A vencer'}
                  </span>
                </div>
              </div>

              {/* Existing Attached Receipt Details */}
              {receiptModalBoleto.paymentReceipt && !isReplacingReceipt && (
                <div className="p-4 bg-emerald-950/40 border border-emerald-700/60 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-emerald-300 block">Comprovante Atual Anexado</span>
                      <span className="text-xs text-slate-300 font-semibold">
                        {receiptModalBoleto.paymentReceipt.name}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        ({(receiptModalBoleto.paymentReceipt.size / 1024).toFixed(0)} KB em{' '}
                        {new Date(receiptModalBoleto.paymentReceipt.uploadedAt).toLocaleDateString('pt-BR')})
                      </span>
                    </div>
                  </div>

                  {/* Thumbnail if image */}
                  {receiptModalBoleto.paymentReceipt.dataUrl?.startsWith('data:image/') && (
                    <div className="max-h-48 rounded-lg overflow-hidden border border-slate-700 bg-black/40 flex items-center justify-center">
                      <img
                        src={receiptModalBoleto.paymentReceipt.dataUrl}
                        alt="Comprovante"
                        className="max-h-48 w-auto object-contain"
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-800/40">
                    <a
                      href={receiptModalBoleto.paymentReceipt.dataUrl}
                      download={receiptModalBoleto.paymentReceipt.name}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg text-center flex items-center justify-center gap-1.5 transition-colors shadow"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar / Abrir Arquivo</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => setIsReplacingReceipt(true)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-lg transition-colors border border-slate-700"
                    >
                      Substituir
                    </button>

                    <button
                      type="button"
                      onClick={handleRemoveReceipt}
                      className="p-2 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded-lg transition-colors border border-rose-800"
                      title="Excluir comprovante"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Input for New Receipt (or when replacing) */}
              {(!receiptModalBoleto.paymentReceipt || isReplacingReceipt) && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                      {isReplacingReceipt ? 'Selecione o Novo Arquivo de Comprovante *' : 'Upload do Comprovante (Imagem ou PDF) *'}
                    </label>
                    <input
                      type="file"
                      ref={receiptFileInputRef}
                      onChange={handleReceiptFileSelect}
                      accept="image/*,application/pdf"
                      className="hidden"
                    />

                    <div
                      onClick={() => receiptFileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-xl p-5 text-center cursor-pointer bg-slate-950/60 hover:bg-slate-950 transition-all space-y-2"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-white block">Clique para selecionar ou arraste o arquivo</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Formatos aceitos: PDF, PNG, JPG, JPEG (Máx: 12MB)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Selected File Feedback */}
                  {uploadedReceiptFile && (
                    <div className="p-3 bg-emerald-950/30 border border-emerald-600/50 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="font-bold text-white text-xs">{uploadedReceiptFile.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {(uploadedReceiptFile.size / 1024).toFixed(0)} KB
                        </span>
                      </div>

                      {uploadedReceiptFile.dataUrl.startsWith('data:image/') && (
                        <div className="max-h-36 rounded-lg overflow-hidden border border-slate-800 bg-black/50 flex items-center justify-center">
                          <img
                            src={uploadedReceiptFile.dataUrl}
                            alt="Preview do comprovante"
                            className="max-h-36 w-auto object-contain"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Option to automatically mark as PAID */}
                  <label className="flex items-start gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={receiptAutoMarkPaid}
                      onChange={(e) => setReceiptAutoMarkPaid(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-white block text-xs">
                        Marcar este boleto como PAGO automaticamente
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Registra a quitação e liquidação do título com a data/hora atual.
                      </span>
                    </div>
                  </label>

                  <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                    {isReplacingReceipt && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsReplacingReceipt(false);
                          setUploadedReceiptFile(null);
                        }}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                      >
                        Voltar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setReceiptModalBoleto(null);
                        setUploadedReceiptFile(null);
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveReceipt}
                      disabled={!uploadedReceiptFile}
                      className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                    >
                      Salvar Comprovante
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Boleto Modal with PDF Uploader */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Emitir Novo Boleto Bancário</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                  Selecione o Cliente Destinatário *
                </label>
                <select
                  value={formClientId}
                  onChange={(e) => {
                    setFormClientId(e.target.value);
                    const selected = clients.find((c) => c.id === e.target.value);
                    if (selected && selected.monthlyFee) {
                      setAmount(selected.monthlyFee.toString());
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-amber-500"
                  required
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — CPF: {c.cpf} {c.monthlyFee ? `(Mensalidade: R$ ${c.monthlyFee})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                  Descrição dos Serviços / Cobrança *
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Mensalidade Serviços Cloud - Agosto/2026"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Valor R$ *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1450.00"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Data de Vencimento *
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Upload PDF File */}
              <PDFUploader
                currentFile={pdfFile}
                onFileChange={setPdfFile}
                label="Upload do Arquivo em PDF do Boleto (Obrigatório) *"
                onToast={onToast}
              />

              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                  Status Inicial
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as BoletoStatus)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-amber-500"
                >
                  <option value="pending">A vencer</option>
                  <option value="paid">Pago</option>
                  <option value="overdue">Em atraso</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20"
                >
                  Salvar Boleto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal View for Boleto */}
      {viewingBoleto && (
        <BoletoModal
          boleto={viewingBoleto}
          client={clients.find((c) => c.id === viewingBoleto.clientId)}
          onClose={() => setViewingBoleto(null)}
          onCopyPix={(pixKey) => {
            navigator.clipboard.writeText(pixKey);
            onToast('success', 'Chave PIX Copiada!');
          }}
          onCopyLine={(line) => {
            navigator.clipboard.writeText(line);
            onToast('success', 'Código de Barras Copiado!');
          }}
          onUploadReceipt={onUploadReceipt}
          onRemoveReceipt={onRemoveReceipt}
          onUpdateDueDate={onUpdateBoletoDueDate}
          isAdmin={true}
        />
      )}

      {/* Modal for Sporadic Service */}
      {onAddSporadicService && (
        <SporadicServiceModal
          isOpen={isSporadicModalOpen}
          onClose={() => setIsSporadicModalOpen(false)}
          clients={clients}
          initialClientId={selectedClientId}
          onAddSporadicService={onAddSporadicService}
          onToast={onToast}
        />
      )}
    </div>
  );
};
