import React, { useState } from 'react';
import { CreditCard, Plus, Search, CheckCircle2, Clock, AlertTriangle, Trash2, Edit3, X, QrCode, Eye, FileText } from 'lucide-react';
import { Boleto, Client, BoletoStatus, PDFAttachment } from '../../types';
import { generateDigitableLine, generateRandomBarcode } from '../../utils/cpf';
import { BoletoModal } from '../modals/BoletoModal';
import { PDFUploader } from '../common/PDFUploader';

interface AdminBoletosViewProps {
  clients: Client[];
  boletos: Boleto[];
  initialSelectedClientId?: string;
  onAddBoleto: (boleto: Omit<Boleto, 'id' | 'createdAt'>) => void;
  onUpdateBoletoStatus: (boletoId: string, status: BoletoStatus) => void;
  onDeleteBoleto: (boletoId: string) => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const AdminBoletosView: React.FC<AdminBoletosViewProps> = ({
  clients,
  boletos,
  initialSelectedClientId = '',
  onAddBoleto,
  onUpdateBoletoStatus,
  onDeleteBoleto,
  onToast,
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string>(initialSelectedClientId);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingBoleto, setViewingBoleto] = useState<Boleto | null>(null);

  // Form states for adding boleto
  const [formClientId, setFormClientId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<BoletoStatus>('pending');
  const [customLine, setCustomLine] = useState('');
  const [pdfFile, setPdfFile] = useState<PDFAttachment | undefined>(undefined);

  const openNewBoletoModal = () => {
    const initialClient = clients.find(c => c.id === selectedClientId) || clients[0];
    const initialId = initialClient?.id || '';
    setFormClientId(initialId);
    setDescription('Serviços Prestados - Ref. Mês Vigente');
    setAmount(initialClient?.monthlyFee ? String(initialClient.monthlyFee) : '0.00');
    // Default due date: +10 days
    const nextTenDays = new Date();
    nextTenDays.setDate(nextTenDays.getDate() + 10);
    setDueDate(nextTenDays.toISOString().split('T')[0]);
    setStatus('pending');
    setCustomLine(generateDigitableLine());
    setPdfFile(undefined);
    setIsModalOpen(true);
  };

  const handleGenerateLine = () => {
    setCustomLine(generateDigitableLine());
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

    const targetClient = clients.find(c => c.id === formClientId);
    onToast('success', 'Boleto Emitido!', `Boleto adicionado com sucesso para ${targetClient?.name || 'Cliente'}.`);
    setIsModalOpen(false);
  };

  const handleDelete = (boletoId: string) => {
    if (window.confirm('Tem certeza que deseja remover este boleto?')) {
      onDeleteBoleto(boletoId);
      onToast('info', 'Boleto Excluído', 'O documento foi removido do portal.');
    }
  };

  const filteredBoletos = boletos.filter((b) => {
    const matchClient = selectedClientId ? b.clientId === selectedClientId : true;
    const matchStatus = statusFilter === 'all' ? true : b.status === statusFilter;
    const client = clients.find(c => c.id === b.clientId);
    const matchSearch =
      b.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.id.includes(searchTerm) ||
      (client && client.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client && client.cpf.includes(searchTerm));

    return matchClient && matchStatus && matchSearch;
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
            <CreditCard className="w-4 h-4" />
            <span>Gestão de Títulos</span>
          </div>
          <h1 className="text-2xl font-black text-white">Boletos & Anexos PDF</h1>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre títulos de cobrança, faça o upload dos arquivos em PDF e acompanhe a quitação dos clientes.
          </p>
        </div>

        <button
          onClick={openNewBoletoModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Emitir Novo Boleto</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
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
            const formattedDueDate = new Date(boleto.dueDate + 'T00:00:00').toLocaleDateString('pt-BR');

            return (
              <div
                key={boleto.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-slate-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-slate-400">#{boleto.id}</span>
                    <span className="text-xs font-bold text-amber-400">
                      Cliente: {client ? `${client.name} (${client.cpf})` : 'Cliente'}
                    </span>
                    {boleto.pdfFile && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-950 text-red-300 border border-red-800 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        PDF Anexado
                      </span>
                    )}
                    {boleto.paymentReceipt && (
                      <a
                        href={boleto.paymentReceipt.dataUrl}
                        download={boleto.paymentReceipt.name}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 hover:bg-emerald-900 transition-colors"
                        title="Comprovante de pagamento enviado pelo cliente"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Comprovante de Pagamento Anexado</span>
                      </a>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-white">{boleto.description}</h4>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <span>Vencimento: <strong className="text-slate-200">{formattedDueDate}</strong></span>
                    <span>Valor: <strong className="text-white font-bold">{formatCurrency(boleto.amount)}</strong></span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                  {/* Status Dropdown */}
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase mb-0.5">Status:</span>
                    <select
                      value={boleto.status}
                      onChange={(e) => {
                        const newStatus = e.target.value as BoletoStatus;
                        onUpdateBoletoStatus(boleto.id, newStatus);
                        const statusLabel = newStatus === 'pending' ? 'A vencer' : newStatus === 'paid' ? 'Pago' : 'Em atraso';
                        onToast('success', 'Status Atualizado', `Boleto #${boleto.id} alterado para "${statusLabel}".`);
                      }}
                      className={`px-3 py-1.5 text-xs font-extrabold rounded-xl border focus:outline-none cursor-pointer transition-all ${
                        boleto.status === 'paid'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                          : boleto.status === 'overdue'
                          ? 'bg-rose-950 text-rose-300 border-rose-800 hover:bg-rose-900'
                          : 'bg-amber-950 text-amber-300 border-amber-800 hover:bg-amber-900'
                      }`}
                    >
                      <option value="pending" className="bg-slate-900 text-amber-300">A vencer</option>
                      <option value="paid" className="bg-slate-900 text-emerald-300">Pago</option>
                      <option value="overdue" className="bg-slate-900 text-rose-300">Em atraso</option>
                    </select>
                  </div>

                  <button
                    onClick={() => setViewingBoleto(boleto)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>Visualizar / PDF</span>
                  </button>

                  <button
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
                    const selected = clients.find(c => c.id === e.target.value);
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
                label="Upload do Arquivo em PDF do Boleto (Opcional)"
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
          client={clients.find(c => c.id === viewingBoleto.clientId)}
          onClose={() => setViewingBoleto(null)}
          onCopyPix={(pixKey) => {
            navigator.clipboard.writeText(pixKey);
            onToast('success', 'Chave PIX Copiada!');
          }}
          onCopyLine={(line) => {
            navigator.clipboard.writeText(line);
            onToast('success', 'Código de Barras Copiado!');
          }}
        />
      )}
    </div>
  );
};
