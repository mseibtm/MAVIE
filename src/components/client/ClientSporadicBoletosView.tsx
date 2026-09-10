import React, { useState, useRef } from 'react';
import {
  Briefcase,
  QrCode,
  Copy,
  Check,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  Upload,
  Download,
  FileCheck,
  FileText,
  DollarSign,
  Tag,
  HelpCircle,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { Client, SporadicService, PDFAttachment } from '../../types';
import { downloadSporadicServicePDF, downloadDataUrl } from '../../utils/boletoPdfGenerator';

interface ClientSporadicBoletosViewProps {
  client: Client;
  sporadicServices: SporadicService[];
  onUploadReceipt?: (serviceId: string, receipt: PDFAttachment) => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const ClientSporadicBoletosView: React.FC<ClientSporadicBoletosViewProps> = ({
  client,
  sporadicServices,
  onUploadReceipt,
  onToast,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'realized'>('all');
  const [selectedService, setSelectedService] = useState<SporadicService | null>(null);
  const [viewingAttachment, setViewingAttachment] = useState<{ title: string; attachment: PDFAttachment } | null>(null);
  const [uploadingServiceId, setUploadingServiceId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pixCNPJKey = '32.922.555/0001-87';

  // Filter only services belonging to this client
  const clientServices = sporadicServices.filter((s) => s.clientId === client.id);

  const filteredServices = clientServices.filter((s) => {
    if (filter === 'all') return true;
    return s.status === filter;
  });

  const pendingServices = clientServices.filter((s) => s.status === 'pending');
  const realizedServices = clientServices.filter((s) => s.status === 'realized');

  const pendingTotal = pendingServices.reduce((acc, curr) => acc + curr.amount, 0);
  const realizedTotal = realizedServices.reduce((acc, curr) => acc + curr.amount, 0);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixCNPJKey);
    onToast('success', 'Chave PIX (CNPJ) Copiada!', `Chave: ${pixCNPJKey} - Anexe o comprovante após a transferência.`);
  };

  const triggerReceiptUpload = (serviceId: string) => {
    setUploadingServiceId(serviceId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingServiceId || !onUploadReceipt) return;

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
      onUploadReceipt(uploadingServiceId, receipt);
      onToast('success', 'Comprovante Enviado!', `Comprovante (${file.name}) salvo com sucesso para conferência.`);

      if (selectedService && selectedService.id === uploadingServiceId) {
        setSelectedService({
          ...selectedService,
          paymentReceipt: receipt,
        });
      }
      setUploadingServiceId(null);
    };
    reader.readAsDataURL(file);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input for uploading receipts */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
              <Briefcase className="w-4 h-4" />
              <span>Boletos de Serviços Esporádicos</span>
            </div>
            <h1 className="text-2xl font-black text-white">
              Serviços Esporádicos & Cobranças Avulsas
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Acompanhe lançamentos avulsos, baixe o PDF do boleto bancário correspondente e envie seu comprovante de pagamento.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyPix}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/30 transition-all shadow-sm active:scale-95"
              title="Copiar Chave PIX da Mavie Solution"
            >
              <QrCode className="w-4 h-4 text-amber-400" />
              <span>Pagar via PIX (CNPJ)</span>
            </button>
          </div>
        </div>

        {/* Status Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Total de Serviços Avulsos
            </div>
            <div className="text-2xl font-black text-white">{clientServices.length}</div>
            <div className="text-[10px] text-slate-500 mt-1">Lançamentos registrados</div>
          </div>

          <div className="bg-slate-950/70 border border-amber-500/20 rounded-xl p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center justify-between">
              <span>Pendente (A Pagar)</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400">
              {formatCurrency(pendingTotal)}
            </div>
            <div className="text-[10px] text-amber-300/70 mt-1">
              {pendingServices.length} serviço(s) aguardando quitação
            </div>
          </div>

          <div className="bg-slate-950/70 border border-emerald-500/20 rounded-xl p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-1 flex items-center justify-between">
              <span>Quitado / Realizado</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400">
              {formatCurrency(realizedTotal)}
            </div>
            <div className="text-[10px] text-emerald-300/70 mt-1">
              {realizedServices.length} serviço(s) pagos
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
              filter === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            Todos ({clientServices.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
              filter === 'pending'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            Pendentes ({pendingServices.length})
          </button>
          <button
            onClick={() => setFilter('realized')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
              filter === 'realized'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            Quitados ({realizedServices.length})
          </button>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Exibindo <span className="text-white font-bold">{filteredServices.length}</span> registro(s)
        </div>
      </div>

      {/* List of Sporadic Boletos */}
      <div className="space-y-4">
        {filteredServices.map((service) => {
          const isPending = service.status === 'pending';
          const hasPdf = Boolean(service.pdfFile?.dataUrl);
          const hasReceipt = Boolean(service.paymentReceipt?.dataUrl);

          return (
            <div
              key={service.id}
              className={`bg-slate-900 border rounded-2xl p-5 shadow-lg transition-all ${
                isPending
                  ? 'border-slate-800 hover:border-amber-500/50'
                  : 'border-slate-800/80 hover:border-emerald-500/40'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Info Block */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-800 border border-slate-700 text-amber-300">
                      {service.category || 'Serviço Avulso'}
                    </span>

                    {isPending ? (
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-800/80 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Pendente de Pagamento</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800/80 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Realizado / Quitado</span>
                      </span>
                    )}

                    <span className="text-[11px] text-slate-500 font-mono">
                      #{service.id}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white leading-snug">
                    {service.description}
                  </h3>

                  {service.notes && (
                    <p className="text-xs text-slate-400 italic bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 max-w-2xl">
                      {service.notes}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Data do Lançamento: </span>
                      <strong className="text-slate-200">{formatDate(service.date)}</strong>
                    </div>

                    {service.dueDate && (
                      <div className="flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Vencimento do Boleto: </span>
                        <strong className="text-amber-300">{formatDate(service.dueDate)}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Amount and Main Actions */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between lg:justify-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                  <div className="text-left lg:text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Valor do Serviço
                    </span>
                    <div className="text-2xl font-black font-mono text-amber-400">
                      {formatCurrency(service.amount)}
                    </div>
                  </div>

                  {/* Actions Buttons Group */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* View/Download Boleto PDF */}
                    {hasPdf ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setViewingAttachment({
                              title: `Boleto - ${service.description}`,
                              attachment: service.pdfFile!,
                            })
                          }
                          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold text-xs rounded-xl border border-sky-500/30 transition-colors shadow-sm cursor-pointer"
                          title="Visualizar o boleto bancário anexado"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Boleto</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadSporadicServicePDF(service, client, onToast)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-red-600/20 active:scale-95 cursor-pointer"
                          title="Baixar Boleto Oficial em PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar PDF</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => downloadSporadicServicePDF(service, client, onToast)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
                        title="Gerar e Baixar Boleto Bancário em PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar Boleto (PDF)</span>
                      </button>
                    )}

                    {/* Upload / View Payment Receipt */}
                    {hasReceipt ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            setViewingAttachment({
                              title: `Comprovante de Pagamento - ${service.description}`,
                              attachment: service.paymentReceipt!,
                            })
                          }
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 font-bold text-xs rounded-xl border border-emerald-700/60 transition-colors shadow-sm"
                          title="Ver comprovante de pagamento enviado"
                        >
                          <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Comprovante Enviado</span>
                        </button>
                        <button
                          onClick={() => triggerReceiptUpload(service.id)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 rounded-xl border border-slate-700 transition-colors"
                          title="Substituir Comprovante de Pagamento"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => triggerReceiptUpload(service.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Subir Comprovante</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Receipt info footer if present */}
              {hasReceipt && (
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      Comprovante enviado: <strong className="text-slate-200">{service.paymentReceipt!.name}</strong> (
                      {formatFileSize(service.paymentReceipt!.size)})
                    </span>
                  </div>
                  <span className="text-slate-500">
                    Enviado em: {new Date(service.paymentReceipt!.uploadedAt).toLocaleString('pt-BR')}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {filteredServices.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Nenhum serviço esporádico encontrado</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Quando novos serviços esporádicos (consultorias, adaptações ou atendimentos avulsos) forem gerados pela administração, seus respectivos boletos e opções de upload aparecerão aqui.
            </p>
          </div>
        )}
      </div>

      {/* PDF / Attachment Viewer Modal */}
      {viewingAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="p-2 bg-sky-950/80 border border-sky-800/80 rounded-xl text-sky-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <h3 className="text-sm font-bold text-white truncate">{viewingAttachment.title}</h3>
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    {viewingAttachment.attachment.name} ({formatFileSize(viewingAttachment.attachment.size)})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    downloadDataUrl(
                      viewingAttachment.attachment.dataUrl,
                      viewingAttachment.attachment.name
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold text-xs rounded-xl transition-colors border border-slate-700 cursor-pointer"
                  title="Baixar anexo"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar</span>
                </button>
                <button
                  onClick={() => setViewingAttachment(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content / Preview */}
            <div className="flex-1 bg-slate-950 p-2 overflow-hidden flex items-center justify-center">
              {viewingAttachment.attachment.dataUrl.startsWith('data:image/') ? (
                <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                  <img
                    src={viewingAttachment.attachment.dataUrl}
                    alt={viewingAttachment.attachment.name}
                    className="max-h-full max-w-full object-contain rounded-lg shadow-lg border border-slate-800"
                  />
                </div>
              ) : (
                <iframe
                  src={viewingAttachment.attachment.dataUrl}
                  title={viewingAttachment.attachment.name}
                  className="w-full h-full rounded-lg border border-slate-800 bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
