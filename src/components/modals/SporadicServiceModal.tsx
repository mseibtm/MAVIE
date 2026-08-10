import React, { useState, useEffect } from 'react';
import { X, Briefcase, Plus } from 'lucide-react';
import { Client, SporadicService } from '../../types';

interface SporadicServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  initialClientId?: string;
  onAddSporadicService: (service: Omit<SporadicService, 'id' | 'createdAt'>) => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const SporadicServiceModal: React.FC<SporadicServiceModalProps> = ({
  isOpen,
  onClose,
  clients,
  initialClientId = '',
  onAddSporadicService,
  onToast,
}) => {
  const [newClientId, setNewClientId] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('Serviço Avulso');
  const [newAmount, setNewAmount] = useState<string>('');
  const [newDate, setNewDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [newStatus, setNewStatus] = useState<'realized' | 'pending'>('pending');
  const [newNotes, setNewNotes] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const defaultId = initialClientId || (clients.length > 0 ? clients[0].id : '');
      setNewClientId(defaultId);
      setNewDescription('');
      setNewCategory('Serviço Avulso');
      setNewAmount('');
      setNewDate(new Date().toISOString().split('T')[0]);
      setNewStatus('pending');
      setNewNotes('');
    }
  }, [isOpen, initialClientId, clients]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newClientId) {
      onToast('error', 'Cliente Obrigatório', 'Selecione o cliente contratante.');
      return;
    }

    if (!newDescription.trim()) {
      onToast('error', 'Descrição Obrigatória', 'Informe a descrição do serviço esporádico.');
      return;
    }

    const val = parseFloat(newAmount.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      onToast('error', 'Valor Inválido', 'Insira um valor numérico positivo para o serviço.');
      return;
    }

    onAddSporadicService({
      clientId: newClientId,
      description: newDescription.trim(),
      category: newCategory,
      amount: val,
      date: newDate,
      status: newStatus,
      notes: newNotes.trim() || undefined,
    });

    onToast('success', 'Serviço Registrado!', 'O lançamento do serviço esporádico foi adicionado com sucesso.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Novo Lançamento de Serviço Esporádico</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Client Selection */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              Cliente Contratante *
            </label>
            <select
              value={newClientId}
              onChange={(e) => setNewClientId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-amber-500"
              required
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.cpf})
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              Descrição do Serviço Avulso *
            </label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Ex: Consultoria de Módulo, Suporte Presencial, Serviço Elétrico..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium placeholder-slate-600 focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          {/* Category & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                Categoria
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-amber-500"
              >
                <option value="Serviço Avulso">Serviço Avulso</option>
                <option value="Consultoria">Consultoria</option>
                <option value="Treinamento">Treinamento</option>
                <option value="Suporte Técnico">Suporte Técnico</option>
                <option value="Desenvolvimento">Desenvolvimento</option>
                <option value="Serviço Elétrico">Serviço Elétrico</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                Valor do Serviço (R$) *
              </label>
              <input
                type="text"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="1500,00"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          {/* Date & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                Data da Execução/Fatura *
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                Status do Pagamento
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as 'realized' | 'pending')}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-amber-500"
              >
                <option value="pending">Pendente (Aguardando acerto)</option>
                <option value="realized">Realizado (Pago / Quitado)</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              Observações / Detalhes (Opcional)
            </label>
            <textarea
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              rows={2}
              placeholder="Informações adicionais do atendimento..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium placeholder-slate-600 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Serviço Esporádico</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
