import React, { useState } from 'react';
import { Ticket, MessageSquare, Send, CheckCircle2, Shield, User, Filter, AlertCircle } from 'lucide-react';
import { SupportTicket, Client, TicketStatus } from '../../types';

interface AdminTicketsViewProps {
  clients: Client[];
  tickets: SupportTicket[];
  onAddMessage: (ticketId: string, message: string, senderType: 'client' | 'admin', senderName: string) => void;
  onUpdateTicketStatus: (ticketId: string, status: TicketStatus) => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const AdminTicketsView: React.FC<AdminTicketsViewProps> = ({
  clients,
  tickets,
  onAddMessage,
  onUpdateTicketStatus,
  onToast,
}) => {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [replyText, setReplyText] = useState('');

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter === 'all') return true;
    return t.status === statusFilter;
  });

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || null;
  const selectedClient = selectedTicket ? clients.find((c) => c.id === selectedTicket.clientId) : null;

  const handleSendAdminReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    onAddMessage(selectedTicket.id, replyText.trim(), 'admin', 'Suporte Técnico');

    // Automatically transition to 'in_progress' if currently open
    if (selectedTicket.status === 'open') {
      onUpdateTicketStatus(selectedTicket.id, 'in_progress');
    }

    setReplyText('');
    onToast('success', 'Resposta Enviada', 'Sua mensagem foi enviada ao cliente no portal.');
  };

  const statusBadges: Record<TicketStatus, { label: string; bg: string; text: string }> = {
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
            <span>Fila de Atendimento ao Cliente</span>
          </div>
          <h1 className="text-2xl font-black text-white">Gestão de Chamados de Suporte</h1>
          <p className="text-xs text-slate-400 mt-1">
            Responda às solicitações de clientes referente a boletos, notas fiscais e dúvidas gerais.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-400">Filtrar:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">Todos os Chamados ({tickets.length})</option>
            <option value="open">Abertos ({tickets.filter(t => t.status === 'open').length})</option>
            <option value="in_progress">Em Atendimento ({tickets.filter(t => t.status === 'in_progress').length})</option>
            <option value="resolved">Resolvidos ({tickets.filter(t => t.status === 'resolved').length})</option>
          </select>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Chamados ({filteredTickets.length})
          </h3>

          {filteredTickets.length === 0 ? (
            <div className="text-center py-8 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <Ticket className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-400">Nenhum chamado no filtro</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTickets.map((tkt) => {
                const isSelected = selectedTicketId === tkt.id;
                const client = clients.find((c) => c.id === tkt.clientId);
                const statusInfo = statusBadges[tkt.status];

                return (
                  <button
                    key={tkt.id}
                    onClick={() => setSelectedTicketId(tkt.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-slate-800 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${statusInfo.bg} ${statusInfo.text}`}>
                        {statusInfo.label}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(tkt.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-white line-clamp-1">{tkt.subject}</div>
                    <div className="text-[11px] text-sky-400 font-medium mt-1 truncate">
                      {client ? `${client.name} (${client.cpf})` : 'Cliente'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Ticket Conversation & Status Controls */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col h-[560px] overflow-hidden">
              {/* Header with status changer */}
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">#{selectedTicket.id}</span>
                    <span className="text-xs font-bold text-sky-400">
                      Cliente: {selectedClient ? `${selectedClient.name} (${selectedClient.cpf})` : 'Cliente'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-0.5">{selectedTicket.subject}</h3>
                </div>

                {/* Status selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Status:</span>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => {
                      const newSt = e.target.value as TicketStatus;
                      onUpdateTicketStatus(selectedTicket.id, newSt);
                      onToast('success', 'Status Alterado', `Chamado #${selectedTicket.id} alterado.`);
                    }}
                    className="px-3 py-1 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="open">Aberto</option>
                    <option value="in_progress">Em Atendimento</option>
                    <option value="resolved">Resolvido</option>
                    <option value="closed">Fechado</option>
                  </select>
                </div>
              </div>

              {/* Chat Timeline */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-900/60">
                {selectedTicket.messages.map((msg) => {
                  const isAdmin = msg.senderType === 'admin';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400">
                        {isAdmin ? <Shield className="w-3 h-3 text-indigo-400" /> : <User className="w-3 h-3 text-sky-400" />}
                        <span className="font-semibold">{msg.senderName}</span>
                        <span>•</span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div
                        className={`max-w-lg p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isAdmin
                            ? 'bg-indigo-600 text-white rounded-tr-none font-medium'
                            : 'bg-slate-800 border border-slate-700 text-slate-100 rounded-tl-none'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Admin Reply Form */}
              <form onSubmit={handleSendAdminReply} className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Responder como Atendimento / Gestor..."
                  className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0"
                >
                  <span>Enviar Resposta</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl h-[560px] flex flex-col items-center justify-center p-8 text-center">
              <MessageSquare className="w-12 h-12 text-slate-700 mb-3" />
              <h4 className="text-sm font-bold text-slate-300">Nenhum chamado selecionado</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Selecione um chamado da lista para responder ou atualizar o status.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
