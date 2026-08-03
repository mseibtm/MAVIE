import React, { useRef, useState } from 'react';
import { X, Printer, Copy, Check, QrCode, FileText, Download, Upload, CheckCircle2, ExternalLink, FileCode } from 'lucide-react';
import { Boleto, Client, PDFAttachment } from '../../types';
import { formatCPF } from '../../utils/cpf';

interface BoletoModalProps {
  boleto: Boleto;
  client?: Client;
  onClose: () => void;
  onCopyPix: (key: string) => void;
  onCopyLine: (line: string) => void;
  onUploadReceipt?: (boletoId: string, receipt: PDFAttachment) => void;
}

export const BoletoModal: React.FC<BoletoModalProps> = ({
  boleto,
  client,
  onClose,
  onCopyPix,
  onCopyLine,
  onUploadReceipt,
}) => {
  const [copiedPix, setCopiedPix] = React.useState(false);
  const [copiedLine, setCopiedLine] = React.useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'pdf' | 'digital'>(boleto.pdfFile ? 'pdf' : 'digital');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pixCNPJKey = '32.922.555/0001-87';

  const handleCopyPix = () => {
    onCopyPix(pixCNPJKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const handleCopyLine = () => {
    onCopyLine(boleto.lineDigitable);
    setCopiedLine(true);
    setTimeout(() => setCopiedLine(false), 2000);
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
      onUploadReceipt(boleto.id, receiptAttachment);
    };
    reader.readAsDataURL(file);
  };

  const handlePrint = () => {
    window.print();
  };

  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(boleto.amount);

  const formattedDueDate = new Date(boleto.dueDate + 'T00:00:00').toLocaleDateString('pt-BR');

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
            {boleto.pdfFile && (
              <a
                href={boleto.pdfFile.dataUrl}
                download={boleto.pdfFile.name}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Baixar PDF Anexado</span>
              </a>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg transition-colors border border-slate-700"
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
        <div className="p-6 overflow-y-auto space-y-6">
          {/* View Selection Tabs if PDF is attached */}
          {boleto.pdfFile && (
            <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-200 flex gap-2">
              <button
                type="button"
                onClick={() => setActiveModalTab('pdf')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                  activeModalTab === 'pdf'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Visualizar PDF do Boleto (Anexo Oficial)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('digital')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                  activeModalTab === 'digital'
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>Instruções de Pagamento & PIX</span>
              </button>
            </div>
          )}

          {/* TAB 1: Embedded PDF Viewer */}
          {activeModalTab === 'pdf' && boleto.pdfFile ? (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-white">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-950 text-red-400 border border-red-800 rounded-lg shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{boleto.pdfFile.name}</h4>
                    <p className="text-xs text-slate-400">Documento em PDF emitido no banco e anexado ao portal</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <a
                    href={boleto.pdfFile.dataUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors border border-slate-700 flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Abrir em Nova Aba</span>
                  </a>
                  <a
                    href={boleto.pdfFile.dataUrl}
                    download={boleto.pdfFile.name}
                    className="flex-1 sm:flex-none px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors shadow flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Arquivo PDF</span>
                  </a>
                </div>
              </div>

              {/* Embedded PDF iframe */}
              <div className="w-full h-[600px] bg-slate-100 rounded-xl overflow-hidden border-2 border-slate-300 shadow-inner">
                <iframe
                  src={boleto.pdfFile.dataUrl}
                  className="w-full h-full border-0"
                  title={boleto.pdfFile.name}
                />
              </div>
            </div>
          ) : (
            /* TAB 2 or Default: Digital Summary, PIX & Receipt Upload */
            <div className="space-y-6">
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

          {/* Payment Receipt Upload Box (Required for both Boleto & PIX) */}
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-200/60 rounded-lg text-amber-800 shrink-0 mt-0.5">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-amber-950 tracking-wider">
                    Anexar Comprovante de Pagamento
                  </h4>
                  <p className="text-xs text-amber-900 mt-0.5">
                    Após efetuar o pagamento via PIX ou Boleto Bancário, por favor anexe o comprovante (imagem ou PDF).
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
                    <span>{boleto.paymentReceipt ? 'Substituir Comprovante' : 'Anexar Comprovante (Imagem/PDF)'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Display attached payment receipt info if present */}
            {boleto.paymentReceipt && (
              <div className="p-3 bg-white rounded-lg border border-emerald-300 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-emerald-900">Comprovante Enviado: </span>
                    <span className="text-xs text-slate-700 font-medium">{boleto.paymentReceipt.name}</span>
                    <span className="text-[10px] text-slate-400 block sm:inline sm:ml-2">
                      ({(boleto.paymentReceipt.size / 1024).toFixed(0)} KB em {new Date(boleto.paymentReceipt.uploadedAt).toLocaleDateString('pt-BR')})
                    </span>
                  </div>
                </div>
                <a
                  href={boleto.paymentReceipt.dataUrl}
                  download={boleto.paymentReceipt.name}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar / Visualizar Comprovante</span>
                </a>
              </div>
            )}
          </div>

          {/* Official Layout Representation of Boleto */}
          <div className="border-2 border-slate-800 rounded-lg p-5 font-sans bg-white text-xs space-y-4 shadow-sm">
            {/* Bank Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3 gap-2">
              <div className="flex items-center gap-3">
                <div className="font-black text-xl text-sky-900 tracking-tighter border-r-2 border-slate-800 pr-3">
                  BANCO 341
                </div>
                <div className="font-mono font-bold text-lg text-slate-900">
                  341-7
                </div>
              </div>
              <div className="text-right text-slate-600 font-bold text-xs">
                RECIBO DO SACADO
              </div>
            </div>

            {/* Grid 1 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-800 border border-slate-800 rounded overflow-hidden">
              <div className="bg-white p-2">
                <div className="text-[10px] uppercase font-semibold text-slate-500">Local de Pagamento</div>
                <div className="font-semibold text-slate-900">PAGÁVEL EM QUALQUER BANCO OU CANAL ELETRÔNICO</div>
              </div>
              <div className="bg-white p-2">
                <div className="text-[10px] uppercase font-semibold text-slate-500">Vencimento</div>
                <div className="font-extrabold text-sm text-rose-700">{formattedDueDate}</div>
              </div>
              <div className="bg-white p-2">
                <div className="text-[10px] uppercase font-semibold text-slate-500">Beneficiário</div>
                <div className="font-semibold text-slate-900">Mavie Solution Ltda</div>
              </div>
              <div className="bg-white p-2">
                <div className="text-[10px] uppercase font-semibold text-slate-500">Valor do Documento</div>
                <div className="font-extrabold text-base text-slate-900">{formattedAmount}</div>
              </div>
            </div>

            {/* Grid 2 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-slate-800 border border-slate-800 rounded overflow-hidden">
              <div className="bg-white p-2">
                <div className="text-[10px] uppercase font-semibold text-slate-500">Data do Documento</div>
                <div>{new Date(boleto.createdAt).toLocaleDateString('pt-BR')}</div>
              </div>
              <div className="bg-white p-2">
                <div className="text-[10px] uppercase font-semibold text-slate-500">Nº do Documento</div>
                <div>{boleto.id}</div>
              </div>
              <div className="bg-white p-2">
                <div className="text-[10px] uppercase font-semibold text-slate-500">Espécie Doc.</div>
                <div>DM</div>
              </div>
              <div className="bg-white p-2">
                <div className="text-[10px] uppercase font-semibold text-slate-500">Aceite</div>
                <div>N</div>
              </div>
              <div className="bg-white p-2">
                <div className="text-[10px] uppercase font-semibold text-slate-500">Carteira</div>
                <div>109 / ITAÚ</div>
              </div>
            </div>

            {/* Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-800 border border-slate-800 rounded overflow-hidden">
              <div className="bg-white p-3 md:col-span-2 min-h-[100px]">
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">
                  Instruções (Texto de responsabilidade do beneficiário)
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-mono">
                  • {boleto.description} <br />
                  • NÃO RECEBER APÓS 30 DIAS DO VENCIMENTO.<br />
                  • MULTA DE 2,00% APÓS O VENCIMENTO.<br />
                  • JUROS DE 0,033% AO DIA.
                </p>
              </div>
              <div className="bg-white p-3 space-y-2">
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-500">(-) Desconto / Abatimento</div>
                  <div className="text-right text-slate-400 font-mono">-</div>
                </div>
                <div className="border-t border-slate-200 pt-1">
                  <div className="text-[10px] uppercase font-semibold text-slate-500">(+) Mora / Multa</div>
                  <div className="text-right text-slate-400 font-mono">-</div>
                </div>
                <div className="border-t border-slate-200 pt-1">
                  <div className="text-[10px] uppercase font-bold text-slate-700">(=) Valor Cobrado</div>
                  <div className="text-right font-bold text-slate-900">{formattedAmount}</div>
                </div>
              </div>
            </div>

            {/* Pagador */}
            <div className="border border-slate-800 rounded p-3 bg-slate-50">
              <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Pagador (Sacado)</div>
              <div className="font-bold text-slate-900">{client ? client.name : 'Cliente Registrado'}</div>
              <div className="text-slate-600">
                {client ? `${client.cpf.replace(/\D/g, '').length > 11 ? 'CNPJ' : 'CPF'}: ${formatCPF(client.cpf)}` : 'Não informado'}
              </div>
              {client?.address && <div className="text-slate-500 text-[11px] mt-0.5">{client.address}</div>}
            </div>

            {/* Simulated Barcode graphic */}
            <div className="pt-2 flex flex-col items-center justify-center">
              <div className="h-14 w-full bg-slate-900 flex items-stretch justify-around px-4 rounded overflow-hidden opacity-90">
                {Array.from({ length: 65 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-full ${i % 3 === 0 ? 'w-1 bg-white' : i % 2 === 0 ? 'w-1.5 bg-slate-950' : 'w-0.5 bg-white'}`}
                  />
                ))}
              </div>
              <span className="font-mono text-[10px] text-slate-500 mt-1">{boleto.barcode}</span>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};
