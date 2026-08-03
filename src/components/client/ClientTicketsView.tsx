import React, { useState } from 'react';
import { Ticket, Plus, MessageSquare, Clock, Send, CheckCircle2, AlertCircle, X, Shield } from 'lucide-react';
import { SupportTicket, Client, TicketCategory, TicketPriority } from '../../types';

interface ClientTicketsViewProps {
  client: Client;
  tickets: SupportTicket[];
  onAddTicket: (ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'messages'> & { initialMessage: string }) => void;
  onAddMessage: (ticketId: string, message: string, senderType: 'client' | 'admin', senderName: string) => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const ClientTicketsView: React.FC<ClientTicketsViewProps> = ({
  client,
  tickets,
  onAddTicket,
  onAddMessage,
  onToast,
}) => {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);

  // New ticket form state
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('financial');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [message, setMessage] = useState('');

  // Reply message state
  const [replyText, setReplyText] = useState('');

  const clientTickets = tickets.filter((t) => t.clientId === client.id);

  const selectedTicket = clientTickets.find((t) => t.id === selectedTicketId) || null;

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      onToast('error', 'Campos obrigatórios', 'Preencha o assunto e a mensagem do chamado.');
      return;
    }

    onAddTicket({
      clientId: client.id,
      subject: subject.trim(),
      category,
      priority,
      status: 'open',
      initialMessage: message.trim(),
    });

    setSubject('');
    setMessage('');
    setIsNewTicketModalOpen(false);
    onToast('success', 'Chamado Aberto com Sucesso!', 'Nossa equipe responderá em breve.');
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    onAddMessage(selectedTicket.id, replyText.trim(), 'client', client.name);
    setReplyText('');
    onToast('success', 'Resposta enviada', 'Mensagem adicionada ao chamado.');
  };

  const categoryLabels: Record<TicketCategory, string> = {
    financial: 'Financeiro / Boletos',
    nfe: 'Notas Fiscais',
    technical: 'Suporte Técnico',
    general: 'Dúvidas Gerais',
  };

  const statusBadges: Record<string, { label: string; bg: string; text: string }> = {
    open: { label: 'Aberto', bg: 'bg-amber-950', text: 'text-amber-300 border-amber-800' },
    in_progress: { label: 'Em Atendimento', bg: 'bg-sky-950', text: 'text-sky-300 border-sky-800' },
    resolved: { label: 'Resolvido', bg: 'bg-emerald-950', text: 'text-emerald-300 border-emerald-800' },
    closed: { label: 'Fechado', bg: 'bg-slate-950', text: 'text-slate-400 border-slate-800' },
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 mb-1">
            <Ticket className="w-4 h-4" />
            <span>Central de Atendimento</span>
          </div>
          <h1 className="text-2xl font-black text-white">Chamados de Suporte</h1>
          <p className="text-xs text-slate-400 mt-1">
            Abra chamados para solicitar 2ª via, alteração de vencimento ou tirar dúvidas.
          </p>
        </div>

        <button
          onClick={() => setIsNewTicketModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Abrir Novo Chamado</span>
        </button>
      </div>

      {/* Grid: Tickets List + Active Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List Column */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Seus Chamados ({clientTickets.length})
          </h3>

          {clientTickets.length === 0 ? (
            <div className="text-center py-8 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <Ticket className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-400">Nenhum chamado aberto</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Clique em "Abrir Novo Chamado" para falar com o suporte.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {clientTickets.map((tkt) => {
                const isSelected = selectedTicketId === tkt.id;
                const statusInfo = statusBadges[tkt.status] || statusBadges.open;

                return (
                  <button
                    key={tkt.id}
                    onClick={() => setSelectedTicketId(tkt.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-slate-800 border-sky-500 shadow-md ring-1 ring-sky-500/50'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full border ${statusInfo.bg} ${statusInfo.text}`}>
                        {statusInfo.label}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(tkt.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white line-clamp-1">{tkt.subject}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-sky-400 shrink-0" />
                      <span>{tkt.messages.length} mensagem(ns)</span>
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Ticket Conversation Timeline */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col h-[560px] overflow-hidden">
              {/* Ticket Header */}
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">#{selectedTicket.id}</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-300">
                      {categoryLabels[selectedTicket.category]}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-1">{selectedTicket.subject}</h3>
                </div>

                <div className="text-right">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${statusBadges[selectedTicket.status].bg} ${statusBadges[selectedTicket.status].text}`}>
                    {statusBadges[selectedTicket.status].label}
                  </span>
                </div>
              </div>

              {/* Chat Timeline */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-900/60">
                {selectedTicket.messages.map((msg) => {
                  const isAdmin = msg.senderType === 'admin';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400">
                        {isAdmin && <Shield className="w-3 h-3 text-indigo-400" />}
                        <span className="font-semibold">{msg.senderName}</span>
                        <span>•</span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div
                        className={`max-w-lg p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isAdmin
                            ? 'bg-indigo-950/80 border border-indigo-800/60 text-indigo-100 rounded-tl-none'
                            : 'bg-sky-600 text-white rounded-tr-none font-medium'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Input Form */}
              {selectedTicket.status !== 'closed' ? (
                <form onSubmit={handleSendReply} className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Escreva sua resposta..."
                    className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0"
                  >
                    <span>Enviar</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <div className="p-3 bg-slate-950 text-center text-xs text-slate-500 border-t border-slate-800">
                  Este chamado foi encerrado pelo suporte.
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl h-[560px] flex flex-col items-center justify-center p-8 text-center">
              <MessageSquare className="w-12 h-12 text-slate-700 mb-3" />
              <h4 className="text-sm font-bold text-slate-300">Nenhum chamado selecionado</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Selecione um chamado da lista ao lado para ver o histórico de conversas ou responder.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {isNewTicketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">Abrir Novo Chamado de Suporte</h3>
              </div>
              <button
                onClick={() => setIsNewTicketModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                  Assunto do Chamado
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex: Prorrogação de vencimento / Dúvida em Nota Fiscal"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium placeholder-slate-500 focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Categoria
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TicketCategory)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="financial">Financeiro / Boletos</option>
                    <option value="nfe">Notas Fiscais</option>
                    <option value="technical">Suporte Técnico</option>
                    <option value="general">Dúvidas Gerais</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Prioridade
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TicketPriority)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta / Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                  Mensagem Detalhada
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Descreva a sua solicitação detalhadamente..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium placeholder-slate-500 focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewTicketModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl shadow-lg shadow-sky-500/20"
                >
                  Confirmar Abertura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
