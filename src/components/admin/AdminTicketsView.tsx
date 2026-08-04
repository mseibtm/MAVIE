import React, { useState } from 'react';
import {
  Ticket,
  MessageSquare,
  Send,
  CheckCircle2,
  Shield,
  User,
  Filter,
  AlertCircle,
  MessageCircle,
  PieChart as PieChartIcon,
  Check,
  X,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { SupportTicket, Client, TicketStatus } from '../../types';
import { COMPANY_WHATSAPP_NUMBER, CLOSURE_REASONS, ClosureReason } from '../../constants';

interface AdminTicketsViewProps {
  clients: Client[];
  tickets: SupportTicket[];
  onAddMessage: (ticketId: string, message: string, senderType: 'client' | 'admin', senderName: string) => void;
  onUpdateTicketStatus: (ticketId: string, status: TicketStatus) => void;
  onCloseTicket: (
    ticketId: string,
    closureData: {
      reason: string;
      comment: string;
      whatsappScreenshot?: string;
      closedBy: string;
      status: TicketStatus;
    }
  ) => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const AdminTicketsView: React.FC<AdminTicketsViewProps> = ({
  clients,
  tickets,
  onAddMessage,
  onUpdateTicketStatus,
  onCloseTicket,
  onToast,
}) => {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [replyText, setReplyText] = useState('');
  const [showStats, setShowStats] = useState(true);

  // Close ticket modal state
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closureReason, setClosureReason] = useState<string>('boleto_segunda_via');
  const [closureComment, setClosureComment] = useState('');
  const [closureStatus, setClosureStatus] = useState<TicketStatus>('resolved');
  const [screenshotBase64, setScreenshotBase64] = useState<string>('');
  const [activeImagePreview, setActiveImagePreview] = useState<string | null>(null);

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter === 'all') return true;
    return t.status === statusFilter;
  });

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || null;
  const selectedClient = selectedTicket ? clients.find((c) => c.id === selectedTicket.clientId) : null;

  // Calculate closure reason statistics for the Pie Chart
  const calculateReasonStats = () => {
    const reasonCounts: Record<string, number> = {};

    tickets.forEach((t) => {
      // Priority to explicit closureReason, or fallback to ticket category mapping
      let key = t.closureReason;
      if (!key) {
        if (t.category === 'financial') key = 'boleto_segunda_via';
        else if (t.category === 'nfe') key = 'duvida_nfe';
        else if (t.category === 'technical') key = 'suporte_tecnico';
        else key = 'outros';
      }

      reasonCounts[key] = (reasonCounts[key] || 0) + 1;
    });

    const total = tickets.length || 1;

    return CLOSURE_REASONS.map((r) => {
      const count = reasonCounts[r.id] || 0;
      const percentage = ((count / total) * 100).toFixed(1);
      return {
        id: r.id,
        name: r.label,
        value: count,
        percentage: Number(percentage),
        color: r.color,
      };
    }).filter((item) => item.value > 0);
  };

  const chartData = calculateReasonStats();
  const totalTickets = tickets.length;

  const handleSendAdminReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    onAddMessage(selectedTicket.id, replyText.trim(), 'admin', 'Suporte Técnico');

    if (selectedTicket.status === 'open') {
      onUpdateTicketStatus(selectedTicket.id, 'in_progress');
    }

    setReplyText('');
    onToast('success', 'Resposta Enviada', 'Sua mensagem foi enviada ao cliente no portal.');
  };

  const openWhatsAppForClient = (tkt: SupportTicket) => {
    const client = clients.find((c) => c.id === tkt.clientId);
    const clientPhone = client?.phone ? client.phone.replace(/\D/g, '') : '';
    const phoneToUse = clientPhone.length >= 10 ? (clientPhone.startsWith('55') ? clientPhone : `55${clientPhone}`) : COMPANY_WHATSAPP_NUMBER;

    const msgText = `Olá ${client?.name || ''}, referente ao seu Chamado #${tkt.id} (${tkt.subject}) no Portal Mavie Solution:`;
    const waUrl = `https://wa.me/${phoneToUse}?text=${encodeURIComponent(msgText)}`;
    window.open(waUrl, '_blank');
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        onToast('error', 'Arquivo muito grande', 'A imagem deve ter no máximo 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmCloseTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    if (!closureComment.trim()) {
      onToast('error', 'Comentário Obrigatório', 'Por favor, insira o resumo/motivo do atendimento.');
      return;
    }

    onCloseTicket(selectedTicket.id, {
      reason: closureReason,
      comment: closureComment.trim(),
      whatsappScreenshot: screenshotBase64 || undefined,
      closedBy: 'Atendente / Operador',
      status: closureStatus,
    });

    setIsCloseModalOpen(false);
    setClosureComment('');
    setScreenshotBase64('');
    onToast('success', 'Atendimento Encerrado!', `O chamado #${selectedTicket.id} foi finalizado com registro de prontuário.`);
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
            Atenda no WhatsApp, registre o motivo do chamado, insira o print da conversa e acompanhe os indicadores em %.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowStats(!showStats)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-300 font-bold text-xs rounded-xl transition-colors flex items-center gap-2"
          >
            <PieChartIcon className="w-4 h-4 text-sky-400" />
            <span>{showStats ? 'Ocultar Gráfico' : 'Gráfico de Motivos (%)'}</span>
            {showStats ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-400">Filtrar:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:ring-2 focus:ring-sky-500"
            >
              <option value="all">Todos os Chamados ({tickets.length})</option>
              <option value="open">Abertos ({tickets.filter((t) => t.status === 'open').length})</option>
              <option value="in_progress">Em Atendimento ({tickets.filter((t) => t.status === 'in_progress').length})</option>
              <option value="resolved">Resolvidos ({tickets.filter((t) => t.status === 'resolved').length})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pie Chart Analysis Section (% de Motivos de Atendimento) */}
      {showStats && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-bold text-white">Indicadores de Atendimento - Distribuição dos Motivos (%)</h2>
            </div>
            <span className="text-xs font-mono text-slate-400">Total: {totalTickets} chamado(s)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Pie Chart Component */}
            <div className="md:col-span-5 h-[200px] flex items-center justify-center">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-950 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                              <p className="font-bold text-white">{data.name}</p>
                              <p className="text-sky-300 font-extrabold">
                                {data.value} chamado(s) ({data.percentage}%)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-slate-500 font-medium">Sem dados de atendimentos registrados</div>
              )}
            </div>

            {/* Legend Breakdown Grid */}
            <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CLOSURE_REASONS.map((r) => {
                const stat = chartData.find((d) => d.id === r.id);
                const count = stat ? stat.value : 0;
                const percentage = stat ? stat.percentage : 0;

                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl"
                  >
                    <div className="flex items-center gap-2 overflow-hidden mr-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                      <span className="text-xs text-slate-300 font-medium truncate">{r.label}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-white">{percentage}%</span>
                      <span className="text-[10px] text-slate-500 block font-mono">({count})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List Column */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Fila de Chamados ({filteredTickets.length})
          </h3>

          {filteredTickets.length === 0 ? (
            <div className="text-center py-8 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <Ticket className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-400">Nenhum chamado neste filtro</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
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
                    <div className="text-[11px] text-sky-400 font-medium mt-1 truncate flex items-center justify-between">
                      <span>{client ? client.name : 'Cliente'}</span>
                      {tkt.whatsappScreenshot && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/60 flex items-center gap-0.5">
                          <ImageIcon className="w-3 h-3" />
                          <span>Print</span>
                        </span>
                      )}
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
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col h-[580px] overflow-hidden">
              {/* Header with WhatsApp & Encerrar Buttons */}
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

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => openWhatsAppForClient(selectedTicket)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0"
                    title="Conversar com este cliente no WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => {
                      setClosureComment(selectedTicket.closureComment || '');
                      setClosureReason(selectedTicket.closureReason || 'boleto_segunda_via');
                      setScreenshotBase64(selectedTicket.whatsappScreenshot || '');
                      setIsCloseModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Encerrar Atendimento</span>
                  </button>

                  <select
                    value={selectedTicket.status}
                    onChange={(e) => {
                      const newSt = e.target.value as TicketStatus;
                      onUpdateTicketStatus(selectedTicket.id, newSt);
                      onToast('success', 'Status Alterado', `Chamado #${selectedTicket.id} alterado.`);
                    }}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="open">Aberto</option>
                    <option value="in_progress">Em Atendimento</option>
                    <option value="resolved">Resolvido</option>
                    <option value="closed">Fechado</option>
                  </select>
                </div>
              </div>

              {/* Closure Details Banner (if already resolved or closed) */}
              {(selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') && (
                <div className="p-3.5 bg-slate-950/90 border-b border-emerald-900/40 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold uppercase tracking-wider text-[11px]">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Atendimento Concluído pelo Operador</span>
                    </div>
                    {selectedTicket.closedAt && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(selectedTicket.closedAt).toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>

                  {selectedTicket.closureReason && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-medium">Motivo:</span>
                      <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-800/80 text-emerald-300 text-[11px] font-bold rounded-md">
                        {CLOSURE_REASONS.find((r) => r.id === selectedTicket.closureReason)?.label || selectedTicket.closureReason}
                      </span>
                    </div>
                  )}

                  {selectedTicket.closureComment && (
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-slate-200">
                      <strong className="text-slate-400 block mb-0.5 text-[11px]">Parecer / Resumo do Operador:</strong>
                      {selectedTicket.closureComment}
                    </div>
                  )}

                  {selectedTicket.whatsappScreenshot && (
                    <div className="pt-1">
                      <span className="text-slate-400 font-medium block mb-1 text-[11px] flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Print da Conversa do WhatsApp:</span>
                      </span>
                      <button
                        onClick={() => setActiveImagePreview(selectedTicket.whatsappScreenshot || null)}
                        className="group relative inline-block border border-slate-700 rounded-xl overflow-hidden hover:border-emerald-500 transition-all shadow-md bg-slate-900"
                      >
                        <img
                          src={selectedTicket.whatsappScreenshot}
                          alt="Print WhatsApp"
                          className="h-20 w-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-emerald-300 font-bold text-[10px] gap-1">
                          <ExternalLink className="w-3 h-3" />
                          <span>Ampliar</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}

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
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl h-[580px] flex flex-col items-center justify-center p-8 text-center">
              <MessageSquare className="w-12 h-12 text-slate-700 mb-3" />
              <h4 className="text-sm font-bold text-slate-300">Nenhum chamado selecionado</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Selecione um chamado da lista ao lado para responder, conversar no WhatsApp ou encerrar com parecer.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Encerrar Atendimento Modal */}
      {isCloseModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Encerrar Atendimento (#{selectedTicket.id})</h3>
              </div>
              <button
                onClick={() => setIsCloseModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCloseTicket} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                  Motivo do Atendimento / Categoria
                </label>
                <select
                  value={closureReason}
                  onChange={(e) => setClosureReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  {CLOSURE_REASONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                  Parecer / Resumo do Atendimento no WhatsApp
                </label>
                <textarea
                  rows={3}
                  value={closureComment}
                  onChange={(e) => setClosureComment(e.target.value)}
                  placeholder="Descreva o que foi acordado ou resolvido na conversa do WhatsApp..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium placeholder-slate-500 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                  Print / Comprovante da Conversa do WhatsApp (Opcional)
                </label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotChange}
                    className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-sky-300 hover:file:bg-slate-700 cursor-pointer"
                  />
                  {screenshotBase64 && (
                    <div className="relative inline-block mt-2 border border-emerald-500/50 rounded-xl overflow-hidden bg-slate-950 p-1">
                      <img
                        src={screenshotBase64}
                        alt="Preview screenshot"
                        className="h-28 w-auto rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setScreenshotBase64('')}
                        className="absolute top-2 right-2 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-500 shadow-md"
                        title="Remover imagem"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                  Status Final do Chamado
                </label>
                <select
                  value={closureStatus}
                  onChange={(e) => setClosureStatus(e.target.value as TicketStatus)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="resolved">Resolvido</option>
                  <option value="closed">Fechado</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCloseModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Finalizar Atendimento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {activeImagePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setActiveImagePreview(null)}
              className="absolute -top-12 right-0 p-2 text-slate-300 hover:text-white bg-slate-800/80 rounded-full hover:bg-slate-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={activeImagePreview}
              alt="Print de WhatsApp em alta definição"
              className="max-h-[80vh] w-auto max-w-full rounded-2xl border border-slate-700 shadow-2xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
