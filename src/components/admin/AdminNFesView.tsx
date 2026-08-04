import React, { useState } from 'react';
import { FileText, Plus, Search, Trash2, Eye, X, Building2 } from 'lucide-react';
import { NotaFiscal, Client, NFStatus, PDFAttachment } from '../../types';
import { generateNFeAccessKey } from '../../utils/cpf';
import { NotaFiscalModal } from '../modals/NotaFiscalModal';
import { PDFUploader } from '../common/PDFUploader';

interface AdminNFesViewProps {
  clients: Client[];
  nfes: NotaFiscal[];
  initialSelectedClientId?: string;
  onAddNFe: (nfe: Omit<NotaFiscal, 'id' | 'createdAt'>) => void;
  onDeleteNFe: (nfeId: string) => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const AdminNFesView: React.FC<AdminNFesViewProps> = ({
  clients,
  nfes,
  initialSelectedClientId = '',
  onAddNFe,
  onDeleteNFe,
  onToast,
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string>(initialSelectedClientId);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingNFe, setViewingNFe] = useState<NotaFiscal | null>(null);

  // Form states
  const [formClientId, setFormClientId] = useState('');
  const [pdfFile, setPdfFile] = useState<PDFAttachment | undefined>(undefined);

  const openNewNFeModal = () => {
    const firstClient = clients[0];
    setFormClientId(firstClient?.id || '');
    setPdfFile(undefined);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formClientId) {
      onToast('error', 'Selecione o Cliente', 'Selecione um cliente para vincular a nota fiscal.');
      return;
    }

    if (!pdfFile) {
      onToast('error', 'Arquivo PDF Obrigatório', 'Faça o upload do arquivo PDF da Nota Fiscal para concluir a inserção.');
      return;
    }

    const targetClient = clients.find(c => c.id === formClientId);
    const nextSeq = (nfes.length + 4895).toString().padStart(9, '0');
    const autoNumber = `000.${nextSeq.slice(3, 6)}.${nextSeq.slice(6, 9)}`;
    const autoIssueDate = new Date().toISOString().split('T')[0];
    const autoAmount = targetClient?.monthlyFee || 1450;
    const autoDescription = pdfFile.fileName ? `Nota Fiscal — ${pdfFile.fileName}` : 'Nota Fiscal de Serviço em PDF';
    const autoAccessKey = generateNFeAccessKey();

    onAddNFe({
      clientId: formClientId,
      number: autoNumber,
      series: '1',
      issueDate: autoIssueDate,
      amount: autoAmount,
      description: autoDescription,
      accessKey: autoAccessKey,
      status: 'issued',
      pdfFile,
    });

    onToast('success', 'Nota Fiscal Inserida!', `Arquivo PDF anexado com sucesso para ${targetClient?.name || 'o cliente'}.`);
    setIsModalOpen(false);
  };

  const handleDelete = (nfeId: string) => {
    if (window.confirm('Tem certeza que deseja cancelar/remover esta Nota Fiscal?')) {
      onDeleteNFe(nfeId);
      onToast('info', 'NF-e Removida', 'A nota fiscal foi removida.');
    }
  };

  const filteredNFes = nfes.filter((nfe) => {
    const matchClient = selectedClientId ? nfe.clientId === selectedClientId : true;
    const client = clients.find(c => c.id === nfe.clientId);
    const matchSearch =
      nfe.number.includes(searchTerm) ||
      nfe.accessKey.includes(searchTerm) ||
      nfe.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client && client.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchClient && matchSearch;
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
            <FileText className="w-4 h-4" />
            <span>Gestão de Notas Fiscais</span>
          </div>
          <h1 className="text-2xl font-black text-white">Notas Fiscais & Anexos PDF (DANFE)</h1>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre notas fiscais eletrônicas de serviço e anexe o arquivo PDF oficial para disponibilizar ao cliente.
          </p>
        </div>

        <button
          onClick={openNewNFeModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Inserir Arquivo NF-e (PDF)</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Filtrar por Cliente
          </label>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Todos os Clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.cpf})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Buscar Nota Fiscal
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Número, Chave de Acesso ou Nome..."
              className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* NF-e List */}
      {filteredNFes.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-300">Nenhuma Nota Fiscal encontrada</h3>
          <p className="text-xs text-slate-500 mt-1">
            Clique no botão acima para adicionar a primeira NF-e com anexo PDF.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNFes.map((nfe) => {
            const client = clients.find((c) => c.id === nfe.clientId);
            const formattedIssueDate = new Date(nfe.issueDate + 'T00:00:00').toLocaleDateString('pt-BR');

            return (
              <div
                key={nfe.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-950 text-amber-300 border border-amber-800 uppercase font-mono">
                        NF-e Nº {nfe.number}
                      </span>
                      {nfe.pdfFile && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-950 text-red-300 border border-red-800 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          PDF Anexado
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">{formattedIssueDate}</span>
                  </div>

                  <div className="text-xs font-bold text-amber-400 mb-1">
                    Cliente: {client ? `${client.name} (${client.cpf})` : 'Cliente'}
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 mt-2">{nfe.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">Valor Total</div>
                    <div className="text-base font-black text-white">{formatCurrency(nfe.amount)}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewingNFe(nfe)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>Visualizar / PDF</span>
                    </button>
                    <button
                      onClick={() => handleDelete(nfe.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Excluir NF-e"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New NF-e Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Cadastrar Nota Fiscal Eletrônica (NF-e)</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                  Cliente Destinatário *
                </label>
                <select
                  value={formClientId}
                  onChange={(e) => setFormClientId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-amber-500"
                  required
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — CPF: {c.cpf}
                    </option>
                  ))}
                </select>
              </div>

              {/* PDF Uploader */}
              <PDFUploader
                currentFile={pdfFile}
                onFileChange={setPdfFile}
                label="Upload do PDF da Nota Fiscal (DANFE Oficial) *"
                onToast={onToast}
              />

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20"
                >
                  Salvar e Anexar NF-e
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DANFE Modal View */}
      {viewingNFe && (
        <NotaFiscalModal
          nfe={viewingNFe}
          client={clients.find(c => c.id === viewingNFe.clientId)}
          onClose={() => setViewingNFe(null)}
          onCopyKey={(key) => {
            navigator.clipboard.writeText(key);
            onToast('success', 'Chave de Acesso Copiada!');
          }}
        />
      )}
    </div>
  );
};
