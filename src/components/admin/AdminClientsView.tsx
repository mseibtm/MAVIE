import React, { useState } from 'react';
import { Users, UserPlus, Search, Edit2, Trash2, CreditCard, FileText, Phone, Mail, Building, MapPin, X, Lock, DollarSign, TrendingUp, Key } from 'lucide-react';
import { Client } from '../../types';
import { formatCPF, cleanCPF, validateCPF } from '../../utils/cpf';

interface AdminClientsViewProps {
  clients: Client[];
  onAddClient: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (clientId: string) => void;
  onNavigateToBoletos: (clientId: string) => void;
  onNavigateToNFes: (clientId: string) => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const AdminClientsView: React.FC<AdminClientsViewProps> = ({
  clients,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  onNavigateToBoletos,
  onNavigateToNFes,
  onToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(true);
  const [monthlyFee, setMonthlyFee] = useState('0.00');
  const [password, setPassword] = useState('123');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const openAddModal = () => {
    setEditingClient(null);
    setName('');
    setCpf('');
    setEmail('');
    setPhone('');
    setCompany('');
    setAddress('');
    setNotes('');
    setIsRecurring(true);
    setMonthlyFee('0.00');
    setPassword('123');
    setStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setCpf(formatCPF(client.cpf));
    setEmail(client.email);
    setPhone(client.phone);
    setCompany(client.company || '');
    setAddress(client.address || '');
    setNotes(client.notes || '');
    const clientIsRecurring = client.isRecurring !== false && (client.monthlyFee || 0) > 0;
    setIsRecurring(clientIsRecurring);
    setMonthlyFee((client.monthlyFee || 0).toString());
    setPassword(client.password || '123');
    setStatus(client.status);
    setIsModalOpen(true);
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const rawCpf = cleanCPF(cpf);
    if (rawCpf.length !== 11 && rawCpf.length !== 14) {
      onToast('error', 'Documento Inválido', 'O CPF deve possuir 11 dígitos ou o CNPJ deve possuir 14 dígitos.');
      return;
    }

    if (!validateCPF(cpf)) {
      onToast('error', 'Documento Inválido', 'O número de CPF ou CNPJ informado não é um documento válido.');
      return;
    }

    const numericFee = isRecurring ? parseFloat(monthlyFee.replace(',', '.')) : 0;
    if (isRecurring && (isNaN(numericFee) || numericFee < 0)) {
      onToast('error', 'Mensalidade Inválida', 'Informe um valor numérico válido para a mensalidade recorrente.');
      return;
    }

    // Check duplicate CPF/CNPJ if creating new
    if (!editingClient) {
      const exists = clients.some(c => cleanCPF(c.cpf) === rawCpf);
      if (exists) {
        onToast('error', 'CPF/CNPJ já cadastrado', 'Já existe um cliente registrado com este CPF ou CNPJ.');
        return;
      }

      onAddClient({
        name: name.trim(),
        cpf: formatCPF(cpf),
        email: email.trim(),
        phone: phone.trim(),
        company: company.trim(),
        address: address.trim(),
        notes: notes.trim(),
        monthlyFee: numericFee,
        isRecurring,
        password: password.trim() || '123',
        status,
      });
      onToast(
        'success',
        'Cliente Cadastrado!',
        isRecurring
          ? `${name} foi cadastrado como recorrente (MRR R$ ${numericFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`
          : `${name} foi cadastrado como cliente avulso (não recorrente).`
      );
    } else {
      onUpdateClient({
        ...editingClient,
        name: name.trim(),
        cpf: formatCPF(cpf),
        email: email.trim(),
        phone: phone.trim(),
        company: company.trim(),
        address: address.trim(),
        notes: notes.trim(),
        monthlyFee: numericFee,
        isRecurring,
        password: password.trim() || '123',
        status,
      });
      onToast('success', 'Cliente Atualizado!', 'Dados cadastrais e modalidade de recorrência salvos.');
    }

    setIsModalOpen(false);
  };

  const handleDelete = (clientId: string, clientName: string) => {
    if (window.confirm(`Tem certeza que deseja remover o cliente "${clientName}" e seus acessos?`)) {
      onDeleteClient(clientId);
      onToast('info', 'Cliente Removido', `${clientName} foi excluído do sistema.`);
    }
  };

  const filteredClients = clients.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      cleanCPF(c.cpf).includes(cleanCPF(term)) ||
      c.cpf.includes(term) ||
      (c.company && c.company.toLowerCase().includes(term)) ||
      c.email.toLowerCase().includes(term)
    );
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const activeClients = clients.filter(c => c.status === 'active');
  const recurringClients = clients.filter(c => c.isRecurring !== false && (c.monthlyFee || 0) > 0);
  const recurringActiveClients = activeClients.filter(c => c.isRecurring !== false && (c.monthlyFee || 0) > 0);
  const nonRecurringClients = clients.filter(c => c.isRecurring === false || (c.monthlyFee || 0) === 0);
  const totalContractedMRR = recurringActiveClients.reduce((sum, c) => sum + (c.monthlyFee || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Bar Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
            <Users className="w-4 h-4" />
            <span>Gestão & Cadastro de Clientes</span>
          </div>
          <h1 className="text-2xl font-black text-white">Clientes Efetivos & Mensalidades</h1>
          <p className="text-xs text-slate-400 mt-1">
            Defina mensalidade contratada, dados cadastrais e controle de clientes recorrentes (MRR) ou avulsos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Nome, CPF ou CNPJ..."
              className="pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all shrink-0 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* Quick Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Total de Clientes
          </div>
          <div className="text-2xl font-black text-white">{clients.length}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {activeClients.length} ativos no portal
          </p>
        </div>

        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-sm">
          <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Recorrência Contratada (MRR)
          </div>
          <div className="text-2xl font-black text-emerald-400">{formatCurrency(totalContractedMRR)}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {recurringActiveClients.length} cliente(s) recorrente(s) ativos
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">
            Clientes Mensalistas
          </div>
          <div className="text-2xl font-black text-white">{recurringClients.length}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Com mensalidade fixa contratada
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wider mb-1">
            Clientes Avulsos (Sem MRR)
          </div>
          <div className="text-2xl font-black text-white">{nonRecurringClients.length}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Cobrança por demanda / esporádica
          </p>
        </div>
      </div>

      {/* Clients Cards Grid */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-300">Nenhum cliente cadastrado</h3>
          <p className="text-xs text-slate-500 mt-1">
            {searchTerm ? 'Tente buscar com outro termo.' : 'Clique no botão acima para incluir um novo cliente.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const isClientRecurring = client.isRecurring !== false && (client.monthlyFee || 0) > 0;

            return (
              <div
                key={client.id}
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-slate-950 text-amber-300 border border-slate-800 uppercase tracking-wider font-mono">
                        CPF/CNPJ: {client.cpf}
                      </span>
                      {isClientRecurring ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          Recorrente
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                          Avulso
                        </span>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                        client.status === 'active'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {client.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white">{client.name}</h3>
                  {client.company && (
                    <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                      <Building className="w-3.5 h-3.5 text-slate-500" />
                      <span>{client.company}</span>
                    </p>
                  )}

                  {/* Monthly Fee Box - ONLY DISPLAY FOR RECURRING CLIENTS */}
                  {isClientRecurring ? (
                    <div className="mt-3 p-3 bg-amber-950/30 border border-amber-500/20 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Mensalidade Contratada
                        </div>
                        <div className="text-sm font-black text-white mt-0.5">
                          {formatCurrency(client.monthlyFee || 0)} <span className="text-[10px] font-normal text-slate-400">/ mês</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                          <Key className="w-3 h-3 text-slate-500" />
                          Senha: <span className="text-slate-200 font-bold">{client.password || '123'}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Contrato / Cobrança
                        </div>
                        <div className="text-xs font-semibold text-slate-300 mt-0.5">
                          Cliente Avulso (Sem Mensalidade Fixa)
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                          <Key className="w-3 h-3 text-slate-500" />
                          Senha: <span className="text-slate-200 font-bold">{client.password || '123'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                    {client.address && (
                      <div className="flex items-start gap-2 text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 text-[11px]">{client.address}</span>
                      </div>
                    )}
                  </div>
                </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(client)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/30 transition-colors"
                    title="Editar dados cadastrais (E-mail, Telefone, Endereço, Mensalidade)"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Editar Dados</span>
                  </button>
                  <button
                    onClick={() => onNavigateToBoletos(client.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-sky-400" />
                    <span>Boletos</span>
                  </button>
                  <button
                    onClick={() => onNavigateToNFes(client.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                    <span>NFs</span>
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => handleDelete(client.id, client.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                    title="Excluir Cliente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  {editingClient ? 'Editar Cliente & Valor' : 'Cadastrar Cliente Efetivo'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Carlos Silva"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                    CPF ou CNPJ (Login do Cliente) *
                  </label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={handleCpfChange}
                    placeholder="000.000.000-00 ou 00.000.000/0001-00"
                    maxLength={18}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Tipo de Contrato: Recorrente vs Não Recorrente */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                  Tipo de Contrato / Faturamento *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRecurring(true);
                      if (monthlyFee === '0' || monthlyFee === '0.00' || !monthlyFee) {
                        setMonthlyFee('150.00');
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      isRecurring
                        ? 'bg-amber-500/15 border-amber-500/60 text-white shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                      isRecurring ? 'border-amber-400 bg-amber-400' : 'border-slate-600'
                    }`}>
                      {isRecurring && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">Cliente Recorrente (MRR)</div>
                      <div className="text-[10px] text-slate-400">Contrato com mensalidade fixa mensal</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsRecurring(false);
                      setMonthlyFee('0.00');
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      !isRecurring
                        ? 'bg-sky-500/15 border-sky-500/60 text-white shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                      !isRecurring ? 'border-sky-400 bg-sky-400' : 'border-slate-600'
                    }`}>
                      {!isRecurring && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">Cliente Avulso (Sem MRR)</div>
                      <div className="text-[10px] text-slate-400">Sem mensalidade, cobra sob demanda</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Mensalidade & Senha Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-amber-950/20 border border-amber-500/20 rounded-xl">
                {isRecurring ? (
                  <div>
                    <label className="block text-amber-300 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      Valor da Mensalidade (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={monthlyFee}
                      onChange={(e) => setMonthlyFee(e.target.value)}
                      placeholder="Ex: 150.00"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/40 rounded-xl text-white font-mono font-black text-sm focus:ring-2 focus:ring-amber-500"
                      required={isRecurring}
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Soma no valor de recorrência contratado</span>
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                      <span>Mensalidade / MRR</span>
                    </label>
                    <div className="px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-400 text-xs italic font-medium">
                      Sem mensalidade (Cliente Avulso)
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Não computado no MRR</span>
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    Senha do Cliente (LGPD) *
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="123"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold text-sm focus:ring-2 focus:ring-amber-500"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Acesso individual do cliente</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                    E-mail *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cliente@email.com"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                  Empresa / Razão Social (Opcional)
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Nome da empresa do cliente"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                  Endereço Completo (Opcional)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, Número, Bairro - Cidade/UF"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                  Observações Internas (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anotações internas sobre o contrato, vigência ou detalhes do cliente..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                  Status do Cliente
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-amber-500"
                >
                  <option value="active">Ativo (Acesso Liberado)</option>
                  <option value="inactive">Inativo (Bloqueado)</option>
                </select>
              </div>

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
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
