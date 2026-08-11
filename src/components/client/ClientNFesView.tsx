import React, { useState } from 'react';
import { FileText, Download, Calendar, Home, ArrowLeft, AlertCircle, Eye, X, ExternalLink } from 'lucide-react';
import { NotaFiscal, Client } from '../../types';

interface ClientNFesViewProps {
  client: Client;
  nfes: NotaFiscal[];
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
  onNavigateHome?: () => void;
}

export const ClientNFesView: React.FC<ClientNFesViewProps> = ({
  client,
  nfes,
  onToast,
  onNavigateHome,
}) => {
  const [selectedNfe, setSelectedNfe] = useState<NotaFiscal | null>(null);
  const clientNFes = nfes.filter((n) => n.clientId === client.id);

  // Helper to generate a Blob URL for reliable iframe preview or download
  const getBlobUrlFromDataUrl = (dataUrl?: string): string | null => {
    if (!dataUrl) return null;
    if (dataUrl.includes('[large_pdf_file_saved_locally]')) return null;

    try {
      if (dataUrl.startsWith('data:')) {
        const parts = dataUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/pdf';
        const base64Data = parts[1];
        if (base64Data) {
          const binary = atob(base64Data);
          const array = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            array[i] = binary.charCodeAt(i);
          }
          const blob = new Blob([array], { type: mime });
          return URL.createObjectURL(blob);
        }
      }
    } catch (err) {
      console.error('Error creating Blob URL:', err);
    }
    return dataUrl;
  };

  // Robust download handler
  const handleDownloadPDF = (pdfDataUrl?: string, fileName?: string) => {
    if (!pdfDataUrl) {
      onToast('error', 'Arquivo não disponível', 'O documento PDF da nota fiscal não foi anexado.');
      return;
    }

    if (pdfDataUrl.includes('[large_pdf_file_saved_locally]')) {
      onToast('error', 'Documento Expirado', 'Por favor, entre em contato com o suporte para receber a 2ª via desta nota.');
      return;
    }

    const title = fileName || 'Nota_Fiscal.pdf';

    try {
      if (pdfDataUrl.startsWith('data:')) {
        const parts = pdfDataUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/pdf';
        const base64Data = parts[1];
        const binary = atob(base64Data);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          array[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([array], { type: mime });
        const blobUrl = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = title;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        onToast('success', 'Download iniciado', `Baixando ${title}`);
        return;
      }
    } catch (err) {
      console.error('Blob download failed, trying direct link fallback:', err);
    }

    // Fallback direct link
    const a = document.createElement('a');
    a.href = pdfDataUrl;
    a.download = title;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onToast('success', 'Download iniciado', `Baixando ${title}`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner with Return/Exit Button */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 mb-1">
            <FileText className="w-4 h-4" />
            <span>Documentos Fiscais</span>
          </div>
          <h1 className="text-2xl font-black text-white">Notas Fiscais (NF-e)</h1>
          <p className="text-xs text-slate-400 mt-1">
            Visualize ou faça o download em PDF das suas Notas Fiscais.
          </p>
        </div>

        {onNavigateHome && (
          <button
            onClick={onNavigateHome}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-xl border border-slate-700 shadow-md transition-all active:scale-95 shrink-0"
          >
            <Home className="w-4 h-4" />
            <span>Voltar ao Início</span>
          </button>
        )}
      </div>

      {/* List of NFes */}
      {clientNFes.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-300">Nenhuma Nota Fiscal disponível</h3>
          <p className="text-xs text-slate-500 mt-1">
            Você ainda não possui documentos fiscais gerados nesta conta.
          </p>
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para o Início</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clientNFes.map((nfe) => {
            const formattedIssueDate = new Date(nfe.issueDate + 'T00:00:00').toLocaleDateString('pt-BR');
            const hasPdf = Boolean(nfe.pdfFile?.dataUrl);

            return (
              <div
                key={nfe.id}
                className="bg-slate-900 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-5 shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-sky-950 text-sky-300 border border-sky-800 uppercase tracking-wider">
                      Nota Fiscal
                    </span>
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {formattedIssueDate}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white line-clamp-2 mt-2">
                    {nfe.description}
                  </h3>
                </div>

                {/* Actions: View and Download */}
                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-2">
                  {hasPdf ? (
                    <>
                      <button
                        onClick={() => setSelectedNfe(nfe)}
                        className="flex items-center justify-center gap-2 w-full sm:w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
                      >
                        <Eye className="w-4 h-4 text-sky-400" />
                        <span>Visualizar Nota</span>
                      </button>

                      <button
                        onClick={() => handleDownloadPDF(nfe.pdfFile?.dataUrl, nfe.pdfFile?.name)}
                        className="flex items-center justify-center gap-2 w-full sm:w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                      >
                        <Download className="w-4 h-4" />
                        <span>Baixar PDF</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center justify-center gap-2 w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-500">
                      <AlertCircle className="w-4 h-4 text-amber-500/70" />
                      <span>Arquivo PDF não disponível</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PREVIEW MODAL */}
      {selectedNfe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <h3 className="text-sm font-black text-white truncate">
                    Visualização da Nota Fiscal
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">
                    {selectedNfe.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDownloadPDF(selectedNfe.pdfFile?.dataUrl, selectedNfe.pdfFile?.name)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Baixar PDF</span>
                </button>

                <button
                  onClick={() => setSelectedNfe(null)}
                  className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content - PDF Viewer */}
            <div className="p-4 flex-1 bg-slate-950 overflow-y-auto min-h-[60vh] flex flex-col">
              {(() => {
                const blobUrl = getBlobUrlFromDataUrl(selectedNfe.pdfFile?.dataUrl);
                if (blobUrl) {
                  return (
                    <iframe
                      src={blobUrl}
                      className="w-full flex-1 min-h-[65vh] rounded-xl border border-slate-800 bg-white"
                      title="Visualização do PDF da Nota Fiscal"
                    />
                  );
                }
                return (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
                    <AlertCircle className="w-12 h-12 text-amber-400" />
                    <p className="text-sm font-semibold text-slate-300">
                      Não foi possível carregar a pré-visualização integrada.
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Você pode realizar o download do arquivo PDF diretamente pelo botão acima.
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
