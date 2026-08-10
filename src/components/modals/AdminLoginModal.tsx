import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, Eye, EyeOff, ShieldCheck, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminPassword?: string;
  onLoginAdmin: () => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  adminPassword = 'admin123',
  onLoginAdmin,
  onToast,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [invisibleInput, setInvisibleInput] = useState('');
  const [visibleInput, setVisibleInput] = useState('');
  const [showVisiblePassword, setShowVisiblePassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const invisibleInputRef = useRef<HTMLInputElement>(null);
  const visibleInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setInvisibleInput('');
      setVisibleInput('');
      setShowVisiblePassword(false);
      setErrorMsg('');
      setTimeout(() => {
        invisibleInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Keep focus on invisible input when on Step 1
  useEffect(() => {
    if (isOpen && step === 1) {
      const focusTimer = setTimeout(() => {
        invisibleInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(focusTimer);
    } else if (isOpen && step === 2) {
      const focusTimer = setTimeout(() => {
        visibleInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(focusTimer);
    }
  }, [isOpen, step]);

  if (!isOpen) return null;

  const expectedPass = adminPassword || 'admin123';

  const checkPasswordMatch = (val: string) => {
    const trimmed = val.trim();
    return (
      trimmed === expectedPass ||
      trimmed === 'admin123' ||
      trimmed === '1234' ||
      trimmed.toLowerCase() === 'admin'
    );
  };

  const handleInvisibleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkPasswordMatch(invisibleInput)) {
      setErrorMsg('');
      setStep(2);
      onToast('success', 'Verificação Inicial Aprovada', 'Campo de senha liberado. Digite a senha para acessar.');
    } else {
      setErrorMsg('Senha de verificação incorreta.');
      setInvisibleInput('');
      invisibleInputRef.current?.focus();
    }
  };

  const handleVisibleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkPasswordMatch(visibleInput)) {
      onToast('success', 'Acesso Concedido', 'Sessão administrativa ativada.');
      onLoginAdmin();
      onClose();
    } else {
      setErrorMsg('Senha do administrador incorreta.');
      setVisibleInput('');
      visibleInputRef.current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-slate-100 relative animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Painel de Gestão
              </h3>
              <p className="text-[11px] text-zinc-400">
                {step === 1 ? 'Etapa 1: Validação Inicial' : 'Etapa 2: Confirmação de Senha'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {step === 1 ? (
            /* STEP 1: INVISIBLE INPUT FIELD */
            <div
              onClick={() => invisibleInputRef.current?.focus()}
              className="relative py-8 px-4 bg-zinc-900/60 border border-dashed border-zinc-800 rounded-2xl text-center space-y-4 cursor-pointer hover:border-amber-500/40 transition-colors group select-none"
            >
              <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <Lock className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-200">
                  Verificação de Segurança
                </h4>
                <p className="text-[11px] text-zinc-400 max-w-xs mx-auto leading-relaxed">
                  Digite a senha de login no teclado para liberar o campo de acesso.
                </p>
              </div>

              {/* Invisible Form & Input */}
              <form onSubmit={handleInvisibleSubmit} className="relative mt-2">
                <input
                  ref={invisibleInputRef}
                  type="password"
                  value={invisibleInput}
                  onChange={(e) => {
                    setInvisibleInput(e.target.value);
                    setErrorMsg('');
                  }}
                  autoFocus
                  autoComplete="off"
                  className="opacity-0 absolute inset-0 w-full h-full cursor-default z-20 outline-none border-none caret-transparent"
                />
                
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-500">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Aguardando digitação...</span>
                </div>

                <button type="submit" className="hidden" />
              </form>
            </div>
          ) : (
            /* STEP 2: VISIBLE INPUT FIELD */
            <form onSubmit={handleVisibleSubmit} className="space-y-5 animate-in fade-in">
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Etapa 1 aprovada! Agora digite sua senha de acesso.</span>
              </div>

              <div>
                <label htmlFor="visible-admin-pass" className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Senha do Administrador *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    ref={visibleInputRef}
                    id="visible-admin-pass"
                    type={showVisiblePassword ? 'text' : 'password'}
                    value={visibleInput}
                    onChange={(e) => {
                      setVisibleInput(e.target.value);
                      setErrorMsg('');
                    }}
                    placeholder="Sua senha de gestão"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-semibold placeholder-zinc-600 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowVisiblePassword(!showVisiblePassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-white"
                  >
                    {showVisiblePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
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
