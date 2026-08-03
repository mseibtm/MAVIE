import React from 'react';
import { X, Printer, Copy, Check, FileText, Download } from 'lucide-react';
import { NotaFiscal, Client } from '../../types';
import { formatCPF } from '../../utils/cpf';

interface NotaFiscalModalProps {
  nfe: NotaFiscal;
  client?: Client;
  onClose: () => void;
  onCopyKey: (key: string) => void;
}

export const NotaFiscalModal: React.FC<NotaFiscalModalProps> = ({
  nfe,
  client,
  onClose,
  onCopyKey,
}) => {
  const [copiedKey, setCopiedKey] = React.useState(false);

  const handleCopyKey = () => {
    onCopyKey(nfe.accessKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(nfe.amount);

  const formattedIssueDate = new Date(nfe.issueDate + 'T00:00:00').toLocaleDateString('pt-BR');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-800 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Top bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 text-xs font-bold rounded bg-sky-500 text-slate-950 uppercase tracking-wider">
              NF-e DANFE
            </span>
            <span className="text-sm font-medium text-slate-300">
              Nota Fiscal Nº {nfe.number}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {nfe.pdfFile && (
              <a
                href={nfe.pdfFile.dataUrl}
                download={nfe.pdfFile.name}
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* PDF Attachment Alert Banner if present */}
          {nfe.pdfFile && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg text-red-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-red-950">Arquivo PDF Oficial da Nota Fiscal</h4>
                  <p className="text-[11px] text-red-700">Documento original enviado: {nfe.pdfFile.name}</p>
                </div>
              </div>
              <a
                href={nfe.pdfFile.dataUrl}
                download={nfe.pdfFile.name}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm shrink-0 flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar PDF</span>
              </a>
            </div>
          )}

          {/* Access Key Copy Box */}
          <div className="p-4 bg-sky-50 rounded-xl border border-sky-200">
            <label className="block text-xs font-bold text-sky-900 uppercase tracking-wider mb-1">
              Chave de Acesso (Consulta Receita Federal / Prefeitura)
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <code className="flex-1 p-2.5 bg-white rounded-lg border border-sky-300 font-mono text-xs font-bold text-slate-900 tracking-wider break-all select-all">
                {nfe.accessKey}
              </code>
              <button
                onClick={handleCopyKey}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors shadow-sm"
              >
                {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey ? 'Chave Copiada!' : 'Copiar Chave'}</span>
              </button>
            </div>
          </div>

          {/* Realistic DANFE / NF-e Layout */}
          <div className="border border-slate-400 rounded-lg p-5 font-sans bg-white text-xs space-y-4 shadow-sm">
            {/* Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-400 pb-4">
              <div>
                <div className="font-extrabold text-sm text-slate-900 uppercase">
                  Mavie Solution Ltda
                </div>
                <div className="text-slate-600 text-[11px] mt-1">
                  CNPJ: 12.345.678/0001-95 | IE: 110.293.847.112<br />
                  Av. das Nações Unidas, 12901 - São Paulo/SP<br />
                  Contato: atendimento@mavie.com.br
                </div>
              </div>

              <div className="border-y md:border-y-0 md:border-x border-slate-300 py-2 md:py-0 md:px-4 text-center flex flex-col justify-center">
                <div className="font-extrabold text-base text-slate-900 uppercase">
                  DANFE
                </div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">
                  Documento Auxiliar da Nota Fiscal Eletrônica
                </div>
                <div className="mt-2 text-xs font-bold text-slate-800">
                  0 - ENTRADA <br /> 1 - SAÍDA [ 1 ]
                </div>
                <div className="font-mono text-xs font-bold mt-1 text-sky-900">
                  Nº {nfe.number} | SÉRIE {nfe.series}
                </div>
              </div>

              <div className="flex flex-col justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500">
                    Controle do Fisco
                  </div>
                  <div className="font-mono text-[10px] break-all bg-slate-100 p-2 rounded border border-slate-200 mt-1 font-semibold text-slate-800">
                    CHAVE DE ACESSO:<br />
                    {nfe.accessKey}
                  </div>
                </div>
                <div className="mt-2 text-right">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                    Status: AUTORIZADA (SEFAZ)
                  </span>
                </div>
              </div>
            </div>

            {/* Tomador do Serviço / Destinatário */}
            <div className="border border-slate-300 rounded p-3 bg-slate-50 space-y-2">
              <div className="text-[10px] uppercase font-extrabold text-slate-600 border-b border-slate-200 pb-1">
                Destinatário / Tomador dos Serviços
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-medium">Nome / Razão Social:</span>
                  <div className="font-bold text-slate-900">{client ? client.name : 'Cliente Não Identificado'}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-medium">CPF / CNPJ:</span>
                  <div className="font-bold text-slate-900">{client ? formatCPF(client.cpf) : 'Não informado'}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-medium">Data de Emissão:</span>
                  <div className="font-bold text-slate-900">{formattedIssueDate}</div>
                </div>
              </div>
              {client?.company && (
                <div className="text-slate-700 text-xs">
                  <span className="font-medium text-slate-500">Empresa:</span> {client.company}
                </div>
              )}
            </div>

            {/* Description of Services */}
            <div className="border border-slate-300 rounded p-3">
              <div className="text-[10px] uppercase font-extrabold text-slate-600 border-b border-slate-200 pb-1 mb-2">
                Descrição dos Serviços Prestados
              </div>
              <p className="text-xs text-slate-800 leading-relaxed font-sans min-h-[60px] whitespace-pre-line">
                {nfe.description}
              </p>
            </div>

            {/* Values Summary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-400 border border-slate-400 rounded overflow-hidden">
              <div className="bg-white p-2">
                <div className="text-[10px] uppercase font-semibold text-slate-500">Base de Cálculo ISS</div>
                <div className="font-semibold text-slate-800">{formattedAmount}</div>
              </div>
              <div className="bg-white p-2">
                <div className="text-[10px] uppercase font-semibold text-slate-500">Aliquota ISS</div>
                <div className="font-semibold text-slate-800">2,00%</div>
              </div>
              <div className="bg-white p-2">
                <div className="text-[10px] uppercase font-semibold text-slate-500">Valor do ISS Retido</div>
                <div className="font-semibold text-slate-800">R$ 0,00</div>
              </div>
              <div className="bg-slate-900 text-white p-2">
                <div className="text-[10px] uppercase font-semibold text-slate-300">Valor Total da Nota</div>
                <div className="font-extrabold text-sm">{formattedAmount}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
