import React, { useRef, useState } from 'react';
import { X, Printer, Copy, Check, QrCode, FileText, Download, Upload, CheckCircle2, ExternalLink, Calendar, Trash2, Edit3, Image as ImageIcon, Barcode, ShieldCheck } from 'lucide-react';
import { Boleto, Client, PDFAttachment } from '../../types';
import { formatCPF, cleanCPF } from '../../utils/cpf';
import { downloadBoletoFile, downloadDataUrl } from '../../utils/boletoPdfGenerator';

interface BoletoModalProps {
  boleto: Boleto;
  client?: Client;
  onClose: () => void;
  onCopyPix: (key: string) => void;
  onCopyLine?: (line: string) => void;
  onUploadReceipt?: (boletoId: string, receipt: PDFAttachment, markAsPaid?: boolean) => void;
  onRemoveReceipt?: (boletoId: string) => void;
  onUpdateDueDate?: (boletoId: string, newDueDate: string) => void;
  isAdmin?: boolean;
}

export const BoletoModal: React.FC<BoletoModalProps> = ({
  boleto,
  client,
  onClose,
  onCopyPix,
  onUploadReceipt,
  onRemoveReceipt,
  onUpdateDueDate,
  isAdmin = false,
}) => {
  const [copiedPix, setCopiedPix] = React.useState(false);
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const [tempDueDate, setTempDueDate] = useState(boleto.dueDate);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pixCNPJKey = '35.798.372/0001-90';

  const handleCopyPix = () => {
    onCopyPix(pixCNPJKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadReceipt) return;

    if (file.size > 12 * 1024 * 1024) {
      alert('O arquivo de comprovante deve ter no máximo 12MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const receiptAttachment: PDFAttachment = {
        name: file.name,
        size: file.size,
        dataUrl: reader.result as string,
        uploadedAt: new Date().toISOString(),
      };
      onUploadReceipt(boleto.id, receiptAttachment, isAdmin);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDueDate = () => {
    if (onUpdateDueDate && tempDueDate) {
      onUpdateDueDate(boleto.id, tempDueDate);
      setIsEditingDueDate(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(boleto.amount);

  const formattedDueDate = new Date(boleto.dueDate + 'T00:00:00').toLocaleDateString('pt-BR');
  const isCNPJ = client ? cleanCPF(client.cpf).length > 11 : false;
  const docLabel = isCNPJ ? 'CNPJ' : 'CPF';
  const isReceiptImage = boleto.paymentReceipt?.dataUrl?.startsWith('data:image/');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-800 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 text-xs font-bold rounded bg-amber-500 text-slate-950 uppercase tracking-wider">
              Boleto Bancário / PIX
            </span>
            <span className="text-sm font-medium text-slate-300">
              Doc #{boleto.id}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadBoletoFile(boleto, client)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors shadow-sm cursor-pointer"
              title="Baixar Boleto Bancário em PDF"
            >
              <Download className="w-4 h-4" />
              <span>Baixar PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg transition-colors border border-slate-700 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Quick Payment Banner - PIX via CNPJ */}
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 rounded-lg text-emerald-700 shrink-0">
                <QrCode className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-extrabold text-emerald-950 text-base">Pague via PIX (Baixa Rápida)</h4>
                <div className="text-xs text-emerald-800 mt-0.5">
                  Chave PIX CNPJ: <strong className="font-mono text-emerald-950 bg-emerald-200/70 px-1.5 py-0.5 rounded font-extrabold">{pixCNPJKey}</strong>
                </div>
              </div>
            </div>
            <button
              onClick={handleCopyPix}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-md transition-all shrink-0"
            >
              {copiedPix ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
              <span>{copiedPix ? 'Chave CNPJ Copiada!' : 'Copiar Chave PIX (CNPJ)'}</span>
            </button>
          </div>

          {/* Due date editing box (if admin or onUpdateDueDate available) */}
          {onUpdateDueDate && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Data de Vencimento</span>
                  <span className="text-sm font-extrabold text-slate-900">{formattedDueDate}</span>
                </div>
              </div>

              {isEditingDueDate ? (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="date"
                    value={tempDueDate}
                    onChange={(e) => setTempDueDate(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    onClick={handleSaveDueDate}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-sm"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => {
                      setTempDueDate(boleto.dueDate);
                      setIsEditingDueDate(false);
                    }}
                    className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingDueDate(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors shadow-sm"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Alterar Vencimento</span>
                </button>
              )}
            </div>
          )}

          {/* Payment Receipt Upload Box */}
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-200/60 rounded-lg text-amber-800 shrink-0 mt-0.5">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-amber-950 tracking-wider">
                    {isAdmin ? 'Gerenciar Comprovante de Pagamento' : 'Anexar Comprovante de Pagamento'}
                  </h4>
                  <p className="text-xs text-amber-900 mt-0.5">
                    {isAdmin
                      ? 'Insira ou substitua o comprovante de liquidação deste título financeiro.'
                      : 'Após efetuar o pagamento via PIX ou Boleto Bancário, por favor anexe o comprovante (imagem ou PDF).'}
                  </p>
                </div>
              </div>

              {onUploadReceipt && (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,application/pdf"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow transition-all shrink-0"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{boleto.paymentReceipt ? 'Substituir Comprovante' : 'Inserir Comprovante (Imagem/PDF)'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Display attached payment receipt info if present */}
            {boleto.paymentReceipt && (
              <div className="p-3.5 bg-white rounded-xl border border-emerald-300 text-emerald-950 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-emerald-900">Comprovante Anexado: </span>
                      <span className="text-xs text-slate-700 font-semibold">{boleto.paymentReceipt.name}</span>
                      <span className="text-[10px] text-slate-400 block sm:inline sm:ml-2">
                        ({(boleto.paymentReceipt.size / 1024).toFixed(0)} KB em {new Date(boleto.paymentReceipt.uploadedAt).toLocaleDateString('pt-BR')})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        if (boleto.paymentReceipt?.dataUrl) {
                          downloadDataUrl(boleto.paymentReceipt.dataUrl, boleto.paymentReceipt.name || `Comprovante_${boleto.id}`);
                        }
                      }}
                      className="flex-1 sm:flex-none px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar Comprovante</span>
                    </button>

                    {onRemoveReceipt && (
                      <button
                        onClick={() => {
                          if (window.confirm('Deseja realmente remover o comprovante de pagamento deste boleto?')) {
                            onRemoveReceipt(boleto.id);
                          }
                        }}
                        className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg transition-colors cursor-pointer"
                        title="Remover Comprovante"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* If image receipt, show thumbnail preview */}
                {isReceiptImage && (
                  <div className="pt-2 border-t border-emerald-100">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-2">
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                      Pré-visualização da Imagem do Comprovante
                    </span>
                    <div className="max-h-60 max-w-sm rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shadow-inner">
                      <img
                        src={boleto.paymentReceipt.dataUrl}
                        alt="Comprovante de Pagamento"
                        className="w-full h-auto object-contain max-h-60"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Embedded PDF Viewer OR Visual Boleto Slip with Direct Download */}
          {boleto.pdfFile && !boleto.pdfFile.dataUrl.includes('[large_pdf_file_saved_locally]') ? (
            <div className="space-y-3">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-950 text-red-400 border border-red-800 rounded-lg shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{boleto.pdfFile.name}</h4>
                    <p className="text-[11px] text-slate-400">Boleto oficial em formato PDF anexado</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => downloadBoletoFile(boleto, client)}
                    className="flex-1 sm:flex-none px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors shadow flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar PDF</span>
                  </button>
                </div>
              </div>

              {/* Embedded PDF iframe */}
              <div className="w-full h-[500px] bg-slate-100 rounded-xl overflow-hidden border-2 border-slate-300 shadow-inner">
                <iframe
                  src={boleto.pdfFile.dataUrl}
                  className="w-full h-full border-0"
                  title={boleto.pdfFile.name}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Call-to-action download banner */}
              <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-700 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-600/20 border border-red-500/40 rounded-xl text-red-400 shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">Boleto Bancário Pronto para Pagamento</h4>
                    <p className="text-xs text-slate-300">
                      Baixe o PDF oficial ou imprima a via para pagar no seu banco ou aplicativo.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => downloadBoletoFile(boleto, client)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Boleto Oficial (PDF)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir</span>
                  </button>
                </div>
              </div>

              {/* Visual Boleto Slip (Ficha de Compensação Visual) */}
              <div className="p-5 bg-white border-2 border-slate-300 rounded-xl shadow-sm space-y-4 font-sans text-slate-800">
                {/* Bank line header */}
                <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-base text-slate-900 tracking-tight">Banco do Brasil</span>
                    <span className="font-bold text-base px-2 border-x-2 border-slate-800">001-9</span>
                  </div>
                  <div className="font-mono font-bold text-xs sm:text-sm text-slate-900">
                    {boleto.lineDigitable}
                  </div>
                </div>

                {/* Grid details */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Beneficiário</span>
                    <span className="font-bold text-slate-900 block truncate">MAVIE SOLUTION LTDA</span>
                    <span className="text-[11px] text-slate-500">CNPJ: 32.922.555/0001-87</span>
                  </div>

                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Pagador (Sacado)</span>
                    <span className="font-bold text-slate-900 block truncate">{client ? client.name : 'Cliente'}</span>
                    <span className="text-[11px] text-slate-500">{docLabel}: {client ? formatCPF(client.cpf) : '-'}</span>
                  </div>

                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="text-[10px] text-rose-600 font-bold uppercase block">Vencimento</span>
                    <span className="font-black text-rose-700 text-sm">{formattedDueDate}</span>
                    <span className="text-[10px] text-rose-500 block">Aceitar até o vencimento</span>
                  </div>

                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <span className="text-[10px] text-emerald-600 font-bold uppercase block">Valor do Documento</span>
                    <span className="font-black text-emerald-700 text-sm">{formattedAmount}</span>
                    <span className="text-[10px] text-emerald-600 block">Desconto / Mora sob condições</span>
                  </div>
                </div>

                {boleto.description && (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Descrição do Serviço</span>
                    <span className="text-slate-800 font-medium">{boleto.description}</span>
                  </div>
                )}

                {/* Visual barcode representation */}
                <div className="pt-3 border-t border-slate-200 flex flex-col items-center justify-center gap-1.5">
                  <div className="h-10 w-full max-w-md flex items-stretch justify-center gap-[2px] px-2 py-1 bg-white border border-slate-200 rounded">
                    {Array.from({ length: 55 }).map((_, i) => (
                      <div
                        key={i}
                        className={`bg-slate-950 ${i % 3 === 0 ? 'w-1' : i % 5 === 0 ? 'w-1.5' : 'w-0.5'}`}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-[11px] text-slate-500">{boleto.barcode || '34191800070123456789012345678901891230000145000'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
