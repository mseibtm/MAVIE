import React, { useState } from 'react';
import { FileText, Download, Eye, Home, ArrowLeft } from 'lucide-react';
import { NotaFiscal, Client } from '../../types';
import { NotaFiscalModal } from '../modals/NotaFiscalModal';

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

  // Display only real documents that have an uploaded PDF
  const clientNFes = nfes.filter((n) => n.clientId === client.id && Boolean(n.pdfFile?.dataUrl));

  // Robust download handler for uploaded PDF
  const handleDownloadPDF = (pdfDataUrl?: string, fileName?: string) => {
    if (!pdfDataUrl) {
      onToast('error', 'Arquivo não disponível', 'O documento PDF da nota fiscal não foi anexado.');
      return;
    }

    const title = fileName || 'Nota_Fiscal.pdf';

    try {
      if (pdfDataUrl.startsWith('data:')) {
        const parts = pdfDataUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/pdf';
        const base64Data = parts[1];
        if (base64Data) {
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
      }
    } catch (err) {
      console.error('Blob download failed, trying direct link fallback:', err);
    }

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
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 mb-1">
            <FileText className="w-4 h-4" />
            <span>Documentos Fiscais</span>
          </div>
          <h1 className="text-2xl font-black text-white">Notas Fiscais (PDF)</h1>
          <p className="text-xs text-slate-400 mt-1">
            Baixe ou visualize os arquivos em PDF oficiais das suas Notas Fiscais.
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
          <h3 className="text-base font-bold text-slate-300">Nenhum arquivo PDF de Nota Fiscal disponível</h3>
          <p className="text-xs text-slate-500 mt-1">
            Assim que a nota fiscal for disponibilizada pela administração, o arquivo PDF aparecerá aqui para visualização e download.
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
            const fileName = nfe.pdfFile?.name || 'Nota_Fiscal.pdf';

            return (
              <div
                key={nfe.id}
                className="bg-slate-900 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-5 shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-white truncate" title={fileName}>
                      {fileName}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Arquivo PDF Oficial da Nota Fiscal
                    </p>
                  </div>
                </div>

                {/* Only options: Visualizar PDF or Baixar PDF */}
                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-2">
                  <button
                    onClick={() => setSelectedNfe(nfe)}
                    className="flex items-center justify-center gap-2 w-full sm:w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
                  >
                    <Eye className="w-4 h-4 text-sky-400" />
                    <span>Visualizar PDF</span>
                  </button>

                  <button
                    onClick={() => handleDownloadPDF(nfe.pdfFile?.dataUrl, nfe.pdfFile?.name)}
                    className="flex items-center justify-center gap-2 w-full sm:w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar PDF</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULL PDF PREVIEW MODAL */}
      {selectedNfe && (
        <NotaFiscalModal
          nfe={selectedNfe}
          client={client}
          onClose={() => setSelectedNfe(null)}
        />
      )}
    </div>
  );
};
