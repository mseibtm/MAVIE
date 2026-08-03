import React, { useState } from 'react';
import { FileText, Copy, Check, Eye, Download, Search, Building2, Calendar } from 'lucide-react';
import { NotaFiscal, Client } from '../../types';
import { NotaFiscalModal } from '../modals/NotaFiscalModal';

interface ClientNFesViewProps {
  client: Client;
  nfes: NotaFiscal[];
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const ClientNFesView: React.FC<ClientNFesViewProps> = ({
  client,
  nfes,
  onToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNFe, setSelectedNFe] = useState<NotaFiscal | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const clientNFes = nfes.filter((n) => n.clientId === client.id);

  const filteredNFes = clientNFes.filter((nfe) => {
    const matchSearch =
      nfe.number.includes(searchTerm) ||
      nfe.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nfe.accessKey.includes(searchTerm);
    return matchSearch;
  });

  const handleCopyKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
    onToast('success', 'Chave de Acesso Copiada!', 'Chave NFe salva na área de transferência.');
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 mb-1">
            <FileText className="w-4 h-4" />
            <span>Documentos Fiscais Eletrônicos</span>
          </div>
          <h1 className="text-2xl font-black text-white">Notas Fiscais (NF-e)</h1>
          <p className="text-xs text-slate-400 mt-1">
            Consulte e baixe suas notas fiscais de serviços prestados em formato oficial.
          </p>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por número ou serviço..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* List of NFes */}
      {filteredNFes.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-300">Nenhuma Nota Fiscal emitida</h3>
          <p className="text-xs text-slate-500 mt-1">
            {searchTerm
              ? 'Nenhum resultado para a busca efetuada.'
              : 'Você ainda não possui documentos fiscais gerados nesta conta.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNFes.map((nfe) => {
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

                  <div className="mt-3 p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Chave de Acesso</div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <code className="text-[11px] font-mono font-bold text-slate-300 truncate">
                        {nfe.accessKey}
                      </code>
                      <button
                        onClick={() => handleCopyKey(nfe.accessKey, nfe.id)}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors shrink-0"
                        title="Copiar Chave de Acesso"
                      >
                        {copiedKey === nfe.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">Valor Total</div>
                    <div className="text-lg font-black text-white">{formatCurrency(nfe.amount)}</div>
                  </div>

                  <button
                    onClick={() => setSelectedNFe(nfe)}
                    className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
                  >
                    <Eye className="w-4 h-4 text-sky-400" />
                    <span>Visualizar DANFE</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal View for DANFE */}
      {selectedNFe && (
        <NotaFiscalModal
          nfe={selectedNFe}
          client={client}
          onClose={() => setSelectedNFe(null)}
          onCopyKey={(key) => handleCopyKey(key, selectedNFe.id)}
        />
      )}
    </div>
  );
};
