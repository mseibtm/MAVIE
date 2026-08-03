import React, { useRef } from 'react';
import { Upload, FileText, Trash2, Download, Eye, CheckCircle2 } from 'lucide-react';
import { PDFAttachment } from '../../types';

interface PDFUploaderProps {
  currentFile?: PDFAttachment;
  onFileChange: (file: PDFAttachment | null) => void;
  label?: string;
  onToast?: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const PDFUploader: React.FC<PDFUploaderProps> = ({
  currentFile,
  onFileChange,
  label = 'Upload de Arquivo PDF (Boleto / Nota Fiscal)',
  onToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      if (onToast) onToast('error', 'Arquivo muito grande', 'O limite por documento é de 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const pdfAttachment: PDFAttachment = {
        name: file.name,
        size: file.size,
        dataUrl,
        uploadedAt: new Date().toISOString(),
      };
      onFileChange(pdfAttachment);
      if (onToast) onToast('success', 'PDF Anexado', `Arquivo ${file.name} carregado com sucesso.`);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    onFileChange(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onToast) onToast('info', 'Anexo removido', 'O arquivo PDF foi desconectado deste registro.');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
        {label}
      </label>

      {currentFile ? (
        <div className="p-3.5 bg-slate-950 border border-slate-700 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800/80 text-red-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                <span>{currentFile.name}</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                {formatFileSize(currentFile.size)} • Anexado em{' '}
                {new Date(currentFile.uploadedAt).toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={currentFile.dataUrl}
              download={currentFile.name}
              target="_blank"
              rel="noreferrer"
              className="p-2 text-sky-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              title="Baixar PDF"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={handleRemove}
              className="p-2 text-rose-400 hover:text-rose-300 bg-slate-800 hover:bg-rose-950 rounded-lg transition-colors"
              title="Remover Anexo"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 hover:border-amber-500/70 bg-slate-950/70 hover:bg-slate-900 rounded-xl p-4 text-center cursor-pointer transition-all group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="mx-auto w-10 h-10 rounded-xl bg-slate-800 group-hover:bg-amber-500/10 flex items-center justify-center text-slate-400 group-hover:text-amber-400 mb-2 transition-colors">
            <Upload className="w-5 h-5" />
          </div>
          <div className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition-colors">
            Clique para selecionar o PDF (ou arraste aqui)
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Formatos aceitos: PDF ou imagem até 10MB. O cliente poderá baixar a versão oficial no portal.
          </p>
        </div>
      )}
    </div>
  );
};
