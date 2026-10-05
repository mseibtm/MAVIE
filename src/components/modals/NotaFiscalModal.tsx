import React, { useMemo } from 'react';
import { X, FileText, Download, AlertCircle } from 'lucide-react';
import { NotaFiscal, Client } from '../../types';

interface NotaFiscalModalProps {
  nfe: NotaFiscal;
  client?: Client;
  onClose: () => void;
  onCopyKey?: (key: string) => void;
}

export const NotaFiscalModal: React.FC<NotaFiscalModalProps> = ({
  nfe,
  onClose,
}) => {
  const fileName = nfe.pdfFile?.name || 'Nota_Fiscal.pdf';
  const dataUrl = nfe.pdfFile?.dataUrl;

  // Generate a Blob URL for reliable iframe rendering and downloading
  const blobUrl = useMemo(() => {
    if (!dataUrl) return null;
    if (dataUrl.includes('[large_')) return null;

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
      console.error('Error generating Blob URL for PDF:', err);
    }
    return dataUrl;
  }, [dataUrl]);

  const handleDownload = () => {
    if (!dataUrl) return;

    try {
      if (blobUrl) {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
    } catch (err) {
      console.error('Download via blobUrl failed:', err);
    }

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Top bar */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">
                {fileName}
              </h3>
              <p className="text-[11px] text-slate-400">
                Arquivo PDF original da Nota Fiscal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {Boolean(dataUrl) && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Baixar PDF</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content - Real PDF viewer ONLY */}
        <div className="flex-1 bg-slate-950 p-4 overflow-hidden flex flex-col">
          {blobUrl ? (
            <iframe
              src={blobUrl}
              className="w-full flex-1 rounded-xl border border-slate-800 bg-white shadow-inner"
              title={fileName}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-4">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-200">
                  {dataUrl ? 'Visualização Integrada Indisponível' : 'Arquivo PDF Não Disponível'}
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  {dataUrl
                    ? 'O navegador não suporta a renderização embutida deste arquivo. Utilize o botão de download para baixá-lo diretamente.'
                    : 'Nenhum documento PDF foi anexado para esta nota fiscal.'}
                </p>
                {Boolean(dataUrl) && (
                  <button
                    onClick={handleDownload}
                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Arquivo PDF ({fileName})</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
