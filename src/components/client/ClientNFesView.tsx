import React, { useState, useMemo } from 'react';
import { FileText, Download, Eye, Home, ArrowLeft, Calendar, Filter, RotateCcw, Search } from 'lucide-react';
import { NotaFiscal, Client } from '../../types';
import { NotaFiscalModal } from '../modals/NotaFiscalModal';

interface ClientNFesViewProps {
  client: Client;
  nfes: NotaFiscal[];
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
  onNavigateHome?: () => void;
}

const formatMonthYear = (monthStr: string) => {
  if (!monthStr || !monthStr.includes('-')) return monthStr;
  const [year, month] = monthStr.split('-');
  const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  const formatted = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

export const ClientNFesView: React.FC<ClientNFesViewProps> = ({
  client,
  nfes,
  onToast,
  onNavigateHome,
}) => {
  const [selectedNfe, setSelectedNfe] = useState<NotaFiscal | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Real NF-es for this client that have an uploaded PDF
  const clientNFes = useMemo(() => {
    return nfes.filter((n) => n.clientId === client.id && Boolean(n.pdfFile?.dataUrl));
  }, [nfes, client.id]);

  // Extract available months for this client
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    clientNFes.forEach((n) => {
      const d = n.issueDate || n.createdAt;
      if (d && d.length >= 7) {
        set.add(d.substring(0, 7));
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [clientNFes]);

  // Filtered by selected month and search term
  const filteredNFes = useMemo(() => {
    return clientNFes.filter((nfe) => {
      // Month filter
      if (selectedMonth && selectedMonth !== 'all') {
        const d = nfe.issueDate || nfe.createdAt || '';
        if (!d.startsWith(selectedMonth)) {
          return false;
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const fileName = (nfe.pdfFile?.name || '').toLowerCase();
        if (!fileName.includes(term)) {
          return false;
        }
      }

      return true;
    });
  }, [clientNFes, selectedMonth, searchTerm]);

  // Group by month (newest first)
  const groupedByMonth = useMemo(() => {
    const groups: { [monthKey: string]: NotaFiscal[] } = {};
    filteredNFes.forEach((nfe) => {
      const rawDate = nfe.issueDate || nfe.createdAt || '';
      const monthKey = rawDate.length >= 7 ? rawDate.substring(0, 7) : 'Outros';
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(nfe);
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return sortedKeys.map((key) => ({
      monthKey: key,
      label: key === 'Outros' ? 'Outras Datas' : formatMonthYear(key),
      nfes: groups[key],
    }));
  }, [filteredNFes]);

  const hasActiveFilters = Boolean((selectedMonth && selectedMonth !== 'all') || searchTerm);

  const handleResetFilters = () => {
    setSelectedMonth('all');
    setSearchTerm('');
  };

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
            Baixe ou visualize os arquivos em PDF oficiais das suas Notas Fiscais, divididos por mês.
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

      {/* Filters Bar: Month Filter and Search */}
      {clientNFes.length > 0 && (
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Filter className="w-4 h-4 text-sky-400" />
              <span>Filtrar por Mês ou Arquivo</span>
            </div>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition-colors font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar Filtros</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Month Filter */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                <span>Mês de Referência</span>
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">Todos os Meses</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthYear(m)}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Search className="w-3 h-3 text-slate-500" />
                <span>Buscar por Nome do Arquivo</span>
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ex: 29.pdf..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400">
            Mostrando <strong className="text-white">{filteredNFes.length}</strong> {filteredNFes.length === 1 ? 'nota fiscal' : 'notas fiscais'}
            {selectedMonth !== 'all' && <span> em <strong className="text-sky-400">{formatMonthYear(selectedMonth)}</strong></span>}
          </div>
        </div>
      )}

      {/* List of NFes Divided by Month */}
      {groupedByMonth.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-300">
            {hasActiveFilters ? 'Nenhuma Nota Fiscal encontrada para os filtros selecionados' : 'Nenhum arquivo PDF de Nota Fiscal disponível'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {hasActiveFilters
              ? 'Tente selecionar outro mês ou limpar os filtros de pesquisa.'
              : 'Assim que a administração disponibilizar o arquivo PDF da sua nota fiscal, ele aparecerá aqui.'}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={handleResetFilters}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar Filtros</span>
            </button>
          ) : (
            onNavigateHome && (
              <button
                onClick={onNavigateHome}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar para o Início</span>
              </button>
            )
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByMonth.map((group) => (
            <div
              key={group.monthKey}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4"
            >
              {/* Month Section Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-xl">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-white">
                      {group.label}
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Notas fiscais disponibilizadas neste mês
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-sky-300 border border-slate-700">
                  {group.nfes.length} {group.nfes.length === 1 ? 'nota fiscal' : 'notas fiscais'}
                </span>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.nfes.map((nfe) => {
                  const fileName = nfe.pdfFile?.name || 'Nota_Fiscal.pdf';

                  return (
                    <div
                      key={nfe.id}
                      className="bg-slate-950 border border-slate-800 hover:border-sky-500/50 rounded-xl p-4 shadow-sm transition-all flex flex-col justify-between space-y-3"
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
            </div>
          ))}
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
