import React from 'react';
import { FileText, Download, Calendar, Home, ArrowLeft, AlertCircle } from 'lucide-react';
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
  const clientNFes = nfes.filter((n) => n.clientId === client.id);

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
            Faça o download direto do arquivo PDF da sua nota fiscal.
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

            return (
              <div
                key={nfe.id}
                className="bg-slate-900 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-5 shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-sky-950 text-sky-300 border border-sky-800 uppercase tracking-wider">
                      NF-e Nº {nfe.number}
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

                {/* PDF Download Action */}
                <div className="pt-3 border-t border-slate-800">
                  {nfe.pdfFile?.dataUrl ? (
                    <a
                      href={nfe.pdfFile.dataUrl}
                      download={nfe.pdfFile.name || `Nota_Fiscal_${nfe.number}.pdf`}
                      onClick={() => onToast('success', 'Download iniciado', `Baixando ${nfe.pdfFile?.name || 'nota fiscal'}.`)}
                      className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-98"
                    >
                      <Download className="w-4 h-4" />
                      <span>Baixar Nota Fiscal (PDF)</span>
                    </a>
                  ) : (
                    <div className="flex items-center justify-center gap-2 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-500">
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
    </div>
  );
};
