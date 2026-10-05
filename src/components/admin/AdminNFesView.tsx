import React, { useState } from 'react';
import { FileText, Plus, Search, Trash2, Eye, Download, X } from 'lucide-react';
import { NotaFiscal, Client, PDFAttachment } from '../../types';
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

    if (!pdfFile || !pdfFile.dataUrl) {
      onToast('error', 'Arquivo PDF Obrigatório', 'Faça o upload do arquivo PDF da Nota Fiscal para concluir a inserção.');
      return;
    }

    const targetClient = clients.find(c => c.id === formClientId);
    const fileName = pdfFile.fileName || pdfFile.name || 'Nota_Fiscal.pdf';

    onAddNFe({
      clientId: formClientId,
      number: fileName,
      series: '1',
      issueDate: new Date().toISOString().split('T')[0],
      amount: 0,
      description: fileName,
      accessKey: '',
      status: 'issued',
      pdfFile: {
        ...pdfFile,
        name: fileName,
      },
    });

    onToast('success', 'Nota Fiscal Inserida!', `Arquivo PDF anexado com sucesso para ${targetClient?.name || 'o cliente'}.`);
    setIsModalOpen(false);
  };

  const handleDelete = (nfeId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este arquivo de Nota Fiscal?')) {
      onDeleteNFe(nfeId);
      onToast('info', 'NF-e Removida', 'A nota fiscal foi removida.');
    }
  };

  const handleDownloadPDF = (pdfFile?: PDFAttachment) => {
    if (!pdfFile || !pdfFile.dataUrl) {
      onToast('error', 'Arquivo não disponível', 'O documento PDF não foi encontrado.');
      return;
    }

    const fileName = pdfFile.name || 'Nota_Fiscal.pdf';

    try {
      if (pdfFile.dataUrl.startsWith('data:')) {
        const parts = pdfFile.dataUrl.split(',');
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
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
          onToast('success', 'Download iniciado', `Baixando ${fileName}`);
          return;
        }
      }
    } catch (err) {
      console.error('Blob download failed:', err);
    }

    const a = document.createElement('a');
    a.href = pdfFile.dataUrl;
    a.download = fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onToast('success', 'Download iniciado', `Baixando ${fileName}`);
  };

  // Only display notes that actually have a PDF uploaded
  const filteredNFes = nfes
    .filter((nfe) => Boolean(nfe.pdfFile?.dataUrl))
    .filter((nfe) => {
      const matchClient = selectedClientId ? nfe.clientId === selectedClientId : true;
      const client = clients.find(c => c.id === nfe.clientId);
      const fileName = nfe.pdfFile?.name || '';
      const matchSearch =
        fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client && client.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (client && client.cpf.includes(searchTerm));

      return matchClient && matchSearch;
    });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
            <FileText className="w-4 h-4" />
            <span>Gestão de Notas Fiscais</span>
          </div>
          <h1 className="text-2xl font-black text-white">Notas Fiscais em PDF</h1>
          <p className="text-xs text-slate-400 mt-1">
            Faça o upload dos arquivos PDF oficiais das Notas Fiscais para disponibilizar ao cliente para visualização e download.
          </p>
        </div>

        <button
          onClick={openNewNFeModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Inserir Nota Fiscal (PDF)</span>
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
            Buscar por Arquivo ou Cliente
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nome do arquivo ou cliente..."
              className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* NF-e List */}
      {filteredNFes.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-300">Nenhum arquivo PDF de Nota Fiscal encontrado</h3>
          <p className="text-xs text-slate-500 mt-1">
            Clique no botão acima para anexar o primeiro arquivo PDF de Nota Fiscal.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNFes.map((nfe) => {
            const client = clients.find((c) => c.id === nfe.clientId);
            const fileName = nfe.pdfFile?.name || 'Nota_Fiscal.pdf';

            return (
              <div
                key={nfe.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-red-950 text-red-300 border border-red-800 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      PDF Anexado
                    </span>
                  </div>

                  <div className="text-xs font-bold text-amber-400 mb-1">
                    Cliente: {client ? `${client.name} (${client.cpf})` : 'Cliente'}
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3 mt-2">
                    <div className="p-2 bg-red-500/10 text-red-400 rounded-lg shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate" title={fileName}>
                        {fileName}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Documento PDF Oficial da Nota Fiscal
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewingNFe(nfe)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 text-xs font-bold rounded-xl transition-all active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Visualizar PDF</span>
                    </button>

                    <button
                      onClick={() => handleDownloadPDF(nfe.pdfFile)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar PDF</span>
                    </button>
                  </div>

                  <button
                    onClick={() => handleDelete(nfe.id)}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors"
                    title="Excluir NF-e"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
                <h3 className="text-base font-bold text-white">Inserir Arquivo PDF da Nota Fiscal</h3>
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
                label="Upload do PDF da Nota Fiscal Oficial *"
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
                  Salvar e Anexar PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Real PDF Viewer Modal */}
      {viewingNFe && (
        <NotaFiscalModal
          nfe={viewingNFe}
          client={clients.find(c => c.id === viewingNFe.clientId)}
          onClose={() => setViewingNFe(null)}
        />
      )}
    </div>
  );
};
