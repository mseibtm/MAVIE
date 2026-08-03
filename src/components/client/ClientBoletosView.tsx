import React, { useState, useRef } from 'react';
import { CreditCard, QrCode, Copy, Check, Eye, AlertTriangle, CheckCircle2, Clock, Calendar, Upload, Download, FileCheck } from 'lucide-react';
import { Boleto, Client, PDFAttachment } from '../../types';
import { BoletoModal } from '../modals/BoletoModal';

interface ClientBoletosViewProps {
  client: Client;
  boletos: Boleto[];
  onUploadReceipt?: (boletoId: string, receipt: PDFAttachment) => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const ClientBoletosView: React.FC<ClientBoletosViewProps> = ({
  client,
  boletos,
  onUploadReceipt,
  onToast,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [selectedBoleto, setSelectedBoleto] = useState<Boleto | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploadingBoletoId, setUploadingBoletoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pixCNPJKey = '32.922.555/0001-87';

  const clientBoletos = boletos.filter((b) => b.clientId === client.id);

  const filteredBoletos = clientBoletos.filter((b) => {
    if (filter === 'all') return true;
    return b.status === filter;
  });

  const pendingTotal = clientBoletos
    .filter((b) => b.status === 'pending')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const overdueTotal = clientBoletos
    .filter((b) => b.status === 'overdue')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const paidTotal = clientBoletos
    .filter((b) => b.status === 'paid')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const handleCopyPix = (customKey?: string) => {
    const keyToCopy = pixCNPJKey;
    navigator.clipboard.writeText(keyToCopy);
    onToast('success', 'Chave PIX (CNPJ) Copiada!', `Chave: ${keyToCopy} - Não se esqueça de anexar o comprovante de pagamento.`);
  };

  const handleCopyLine = (line: string, id: string) => {
    navigator.clipboard.writeText(line);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    onToast('success', 'Código de Barras Copiado!', 'Linha digitável salva na área de transferência.');
  };

  const triggerReceiptUpload = (boletoId: string) => {
    setUploadingBoletoId(boletoId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingBoletoId || !onUploadReceipt) return;

    if (file.size > 12 * 1024 * 1024) {
      onToast('error', 'Arquivo muito grande', 'O comprovante deve ter no máximo 12MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const receipt: PDFAttachment = {
        name: file.name,
        size: file.size,
        dataUrl: reader.result as string,
        uploadedAt: new Date().toISOString(),
      };
      onUploadReceipt(uploadingBoletoId, receipt);
      onToast('success', 'Comprovante Anexado!', `Comprovante (${file.name}) enviado com sucesso para conferência.`);
      
      // Update local state for modal if open
      if (selectedBoleto && selectedBoleto.id === uploadingBoletoId) {
        setSelectedBoleto({
          ...selectedBoleto,
          paymentReceipt: receipt,
        });
      }
      setUploadingBoletoId(null);
    };
    reader.readAsDataURL(file);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Status Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Portal de Autoatendimento</span>
            </div>
            <h1 className="text-2xl font-black text-white">
              Olá, {client.name.split(' ')[0]}!
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              CPF: <span className="font-mono text-slate-300">{client.cpf}</span> | Empresa: {client.company || 'Pessoa Física'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {overdueTotal > 0 ? (
              <div className="px-4 py-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-200 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-rose-300">Atenção ao Vencimento</div>
                  <div className="text-xs font-semibold">Você possui débitos pendentes</div>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-200 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-emerald-300">Situação Financeira</div>
                  <div className="text-xs font-semibold">Nenhuma pendência em atraso</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">A Vencer</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">{formatCurrency(pendingTotal)}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {clientBoletos.filter(b => b.status === 'pending').length} boleto(s) pendente(s)
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Em Atraso</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">{formatCurrency(overdueTotal)}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {clientBoletos.filter(b => b.status === 'overdue').length} boleto(s) vencido(s)
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Quitados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{formatCurrency(paidTotal)}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {clientBoletos.filter(b => b.status === 'paid').length} boleto(s) pago(s)
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-2 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              filter === 'all'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Todos ({clientBoletos.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              filter === 'pending'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            A vencer ({clientBoletos.filter(b => b.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('overdue')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              filter === 'overdue'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Em atraso ({clientBoletos.filter(b => b.status === 'overdue').length})
          </button>
          <button
            onClick={() => setFilter('paid')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              filter === 'paid'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Pagos ({clientBoletos.filter(b => b.status === 'paid').length})
          </button>
        </div>
      </div>

      {/* Boletos List */}
      {filteredBoletos.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
          <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-300">Nenhum boleto encontrado nesta categoria</h3>
          <p className="text-xs text-slate-500 mt-1">Nenhum documento corresponde aos filtros selecionados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBoletos.map((boleto) => {
            const isOverdue = boleto.status === 'overdue';
            const isPaid = boleto.status === 'paid';
            const formattedDueDate = new Date(boleto.dueDate + 'T00:00:00').toLocaleDateString('pt-BR');

            return (
              <div
                key={boleto.id}
                className={`bg-slate-900 border rounded-2xl p-5 sm:p-6 shadow-md transition-all hover:border-slate-700 ${
                  isOverdue
                    ? 'border-rose-900/50 bg-gradient-to-r from-slate-900 via-slate-900 to-rose-950/20'
                    : isPaid
                    ? 'border-emerald-900/30 bg-slate-900/80'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Info Column */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full uppercase tracking-wider ${
                          isPaid
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : isOverdue
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {isPaid ? 'Pago' : isOverdue ? 'Em Atraso' : 'A Vencer'}
                      </span>
                      <span className="text-xs font-mono text-slate-400">Doc: #{boleto.id}</span>
                    </div>

                    <h3 className="text-base font-bold text-white">{boleto.description}</h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-sky-400" />
                        Vencimento: <strong className="text-slate-200">{formattedDueDate}</strong>
                      </span>

                      {isPaid && boleto.paidAt && (
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          Pago em: {new Date(boleto.paidAt).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Value Column */}
                  <div className="text-left lg:text-right shrink-0">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Valor</div>
                    <div className="text-2xl font-black text-white">
                      {formatCurrency(boleto.amount)}
                    </div>
                  </div>
                </div>

                {/* Receipt Status & Action Banner on Card */}
                {boleto.paymentReceipt ? (
                  <div className="mt-4 p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <FileCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-emerald-200">Comprovante Anexado pelo Cliente</div>
                        <div className="text-[11px] text-emerald-400/90 font-medium">
                          {boleto.paymentReceipt.name} ({(boleto.paymentReceipt.size / 1024).toFixed(0)} KB)
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                      <a
                        href={boleto.paymentReceipt.dataUrl}
                        download={boleto.paymentReceipt.name}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar</span>
                      </a>
                      {onUploadReceipt && (
                        <button
                          onClick={() => triggerReceiptUpload(boleto.id)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-lg border border-amber-500/30 transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Alterar</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : !isPaid ? (
                  <div className="mt-3 p-3 bg-amber-950/40 border border-amber-800/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="text-xs text-amber-200">
                      <span className="font-bold">Após efetuar o pagamento (Boleto ou PIX):</span> envie seu comprovante para agilizar a baixa.
                    </div>
                    {onUploadReceipt && (
                      <button
                        onClick={() => triggerReceiptUpload(boleto.id)}
                        className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-amber-500/10"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Anexar Comprovante</span>
                      </button>
                    )}
                  </div>
                ) : null}

                {/* Line digitable & Action Buttons */}
                {!isPaid && (
                  <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex-1 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 flex items-center justify-between gap-2 overflow-hidden">
                      <code className="text-xs font-mono font-bold text-slate-300 truncate">
                        {boleto.lineDigitable}
                      </code>
                      <button
                        onClick={() => handleCopyLine(boleto.lineDigitable, boleto.id)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 shrink-0 transition-colors"
                        title="Copiar Linha Digitável"
                      >
                        {copiedId === boleto.id ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleCopyPix(boleto.pixKey)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Pagar via PIX</span>
                      </button>

                      <button
                        onClick={() => setSelectedBoleto(boleto)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
                      >
                        <Eye className="w-4 h-4 text-sky-400" />
                        <span>Visualizar Boleto</span>
                      </button>
                    </div>
                  </div>
                )}

                {isPaid && (
                  <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={() => setSelectedBoleto(boleto)}
                      className="flex items-center gap-2 text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Ver Comprovante / Via do Boleto</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden file input for uploading payment receipts */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,application/pdf"
        className="hidden"
      />

      {/* Modal for viewing detailed boleto PDF representation */}
      {selectedBoleto && (
        <BoletoModal
          boleto={selectedBoleto}
          client={client}
          onClose={() => setSelectedBoleto(null)}
          onCopyPix={handleCopyPix}
          onCopyLine={(line) => handleCopyLine(line, selectedBoleto.id)}
          onUploadReceipt={onUploadReceipt}
        />
      )}
    </div>
  );
};
