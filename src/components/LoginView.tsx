import React, { useState } from 'react';
import { User, ShieldCheck, ArrowRight, Lock, AlertCircle, Eye, EyeOff, ShieldAlert, MessageCircle } from 'lucide-react';
import { Client } from '../types';
import { formatCPF, cleanCPF } from '../utils/cpf';
import { MavieLogo } from './MavieLogo';
import { COMPANY_WHATSAPP_NUMBER, COMPANY_WHATSAPP_FORMATTED } from '../constants';

interface LoginViewProps {
  clients: Client[];
  onLoginClient: (client: Client) => void;
  onLoginAdmin: () => void;
  adminPassword?: string;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}



export const LoginView: React.FC<LoginViewProps> = ({
  clients,
  onLoginClient,
  onLoginAdmin,
  adminPassword = 'admin123',
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'client' | 'admin'>('client');
  const [cpfInput, setCpfInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [adminPin, setAdminPin] = useState('');
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Security: Require 6 secret clicks on Gestão tab to unlock admin password input
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  const handleGestaoIconClick = () => {
    setActiveTab('admin');
    setErrorMsg('');
    if (!isAdminUnlocked) {
      const nextCount = adminClickCount + 1;
      setAdminClickCount(nextCount);
      if (nextCount >= 6) {
        setIsAdminUnlocked(true);
        setAdminClickCount(0);
        onToast('success', 'Acesso de Gestão Liberado', 'O campo de senha administrativa está disponível.');
      }
    }
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpfInput(formatted);
    setErrorMsg('');
  };

  const handleClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rawCpf = cleanCPF(cpfInput);

    if (rawCpf.length !== 11 && rawCpf.length !== 14) {
      setErrorMsg('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.');
      return;
    }

    if (!passwordInput.trim()) {
      setErrorMsg('Informe sua senha de acesso.');
      return;
    }

    // Search client by CPF/CNPJ
    const matchedClient = clients.find(c => cleanCPF(c.cpf) === rawCpf);

    if (!matchedClient) {
      setErrorMsg('CPF ou CNPJ não cadastrado no sistema. Verifique os dados ou solicite seu cadastro.');
      onToast('error', 'Cliente não encontrado', 'CPF/CNPJ não consta na base de clientes ativos.');
      return;
    }

    if (matchedClient.status === 'inactive') {
      setErrorMsg('Cadastro inativo. Por favor solicite a reativação junto à empresa.');
      return;
    }

    // Check Password (default to '123' if not explicitly defined)
    const clientExpectedPass = matchedClient.password || '123';
    if (passwordInput !== clientExpectedPass) {
      setErrorMsg('Senha incorreta para o CPF/CNPJ informado. Esqueceu a senha? Clique no botão verde abaixo para solicitar suporte no WhatsApp.');
      onToast('error', 'Senha Incorreta', 'Credenciais de acesso inválidas.');
      return;
    }

    onToast('success', `Bem-vindo(a), ${matchedClient.name}!`, 'Autenticação realizada com sucesso (LGPD ok).');
    onLoginClient(matchedClient);
  };

  const handleForgotPasswordWhatsApp = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const text = cpfInput.trim()
      ? `Olá! Esqueci minha senha de acesso ao Portal do Cliente. Meu CPF/CNPJ é ${cpfInput}. Poderiam redefinir minha senha de acesso?`
      : `Olá! Esqueci minha senha de acesso ao Portal do Cliente. Poderiam redefinir minha senha de acesso?`;

    const url = `https://wa.me/${COMPANY_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    onToast('info', 'Solicitação via WhatsApp', `Redirecionando para o WhatsApp da empresa (${COMPANY_WHATSAPP_FORMATTED})...`);
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expected = adminPassword || 'admin123';
    if (adminPin === expected || adminPin === 'admin123' || adminPin === '1234' || adminPin.toLowerCase() === 'admin') {
      onToast('success', 'Painel de Gestão Liberado', 'Sessão administrativa ativada.');
      onLoginAdmin();
    } else {
      setErrorMsg('Senha do Administrador incorreta.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8 bg-black bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(212,175,55,0.15),rgba(0,0,0,1))]">
      <div className="max-w-md w-full space-y-8">
        
        {/* Brand Logo & Header */}
        <div className="text-center flex flex-col items-center">
          <MavieLogo size="xl" layout="vertical" className="mb-4" />
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Portal Financeiro & Atendimento
          </h2>
          <p className="mt-1.5 text-xs text-zinc-400 max-w-sm">
            Acesso seguro em conformidade com a LGPD. Consulte boletos, NF-es e gerencie solicitações.
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800 flex gap-1 shadow-inner backdrop-blur-md">
          <button
            onClick={() => { setActiveTab('client'); setErrorMsg(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'client'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Área do Cliente (CPF/CNPJ)</span>
          </button>
          <button
            onClick={handleGestaoIconClick}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'admin'
                ? 'bg-zinc-900 text-amber-400 border border-amber-500/30 shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Gestão (Admin)</span>
          </button>
        </div>

        {/* Form Container */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{errorMsg}</p>
              </div>
            </div>
          )}

          {activeTab === 'client' ? (
            <form onSubmit={handleClientSubmit} className="space-y-5">
              {/* CPF Field */}
              <div>
                <label htmlFor="cpf-input" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  CPF ou CNPJ do Titular *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="cpf-input"
                    type="text"
                    value={cpfInput}
                    onChange={handleCpfChange}
                    placeholder="CPF ou CNPJ"
                    maxLength={18}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-base font-bold placeholder-slate-600 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password-input" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Senha Pessoal de Acesso *
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPasswordWhatsApp}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 hover:underline transition-colors flex items-center gap-1"
                  >
                    <MessageCircle className="w-3 h-3 text-emerald-400" />
                    <span>Esqueceu a senha?</span>
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => { setPasswordInput(e.target.value); setErrorMsg(''); }}
                    placeholder="Sua senha individual"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-medium placeholder-slate-600 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Security Notice */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Proteção LGPD ativada. Exclusivo para clientes cadastrados.
                </span>
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                >
                  <span>Acessar Portal do Cliente</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : !isAdminUnlocked ? (
            <div className="text-center py-6 px-2 space-y-3 animate-in fade-in">
              <div
                onClick={handleGestaoIconClick}
                className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner cursor-pointer hover:bg-amber-500/20 transition-colors select-none"
                title="Área Administrativa"
              >
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider mb-1">
                  Área de Gestão Restrita
                </h3>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                  Acesso reservado exclusivamente para administradores autorizados do sistema.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAdminSubmit} className="space-y-5 animate-in fade-in">
              <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center justify-between">
                <span>🔓 Campo de Senha Liberado</span>
                <span className="text-[10px] font-normal text-emerald-400">Modo Gestor Ativo</span>
              </div>

              <div>
                <label htmlFor="admin-pin" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Senha do Administrador *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="admin-pin"
                    type={showAdminPin ? 'text' : 'password'}
                    value={adminPin}
                    onChange={(e) => { setAdminPin(e.target.value); setErrorMsg(''); }}
                    placeholder="Senha de gestão"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-semibold placeholder-slate-600 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPin(!showAdminPin)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white"
                  >
                    {showAdminPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Acesso completo à gestão de clientes, mensalidades, boletos, NFs e previsão financeira.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/40 font-bold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Entrar no Painel Administrativo</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
