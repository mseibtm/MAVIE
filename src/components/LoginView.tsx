import React, { useState } from 'react';
import { User, ArrowRight, Lock, AlertCircle, Eye, EyeOff, ShieldAlert, MessageCircle } from 'lucide-react';
import { Client } from '../types';
import { formatCPF, cleanCPF } from '../utils/cpf';
import { MavieLogo } from './MavieLogo';
import { COMPANY_WHATSAPP_NUMBER, COMPANY_WHATSAPP_FORMATTED } from '../constants';

interface LoginViewProps {
  clients: Client[];
  onLoginClient: (client: Client) => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  clients,
  onLoginClient,
  onToast,
}) => {
  const [cpfInput, setCpfInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
        </div>
      </div>
    </div>
  );
};
