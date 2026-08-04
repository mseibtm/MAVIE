import React, { useState } from 'react';
import { X, Lock, KeyRound, Eye, EyeOff, UserCheck, AlertCircle } from 'lucide-react';
import { Client } from '../../types';

interface EditClientPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onSavePassword: (newPassword: string) => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const EditClientPasswordModal: React.FC<EditClientPasswordModalProps> = ({
  isOpen,
  onClose,
  client,
  onSavePassword,
  onToast,
}) => {
  const [currentInput, setCurrentInput] = useState('');
  const [newInput, setNewInput] = useState('');
  const [confirmInput, setConfirmInput] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const expectedCurrent = (client.password || '123').trim();
    if (currentInput.trim() !== expectedCurrent) {
      setErrorMsg('Senha atual incorreta. Digite sua senha pessoal de acesso atual.');
      return;
    }

    if (!newInput.trim() || newInput.trim().length < 3) {
      setErrorMsg('A nova senha deve possuir no mínimo 3 caracteres.');
      return;
    }

    if (newInput !== confirmInput) {
      setErrorMsg('A confirmação da nova senha não confere.');
      return;
    }

    onSavePassword(newInput.trim());
    onToast(
      'success',
      'Senha de Acesso Alterada com Sucesso!',
      'Sua nova senha foi atualizada no sistema e já está ativa.'
    );

    setCurrentInput('');
    setNewInput('');
    setConfirmInput('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Trocar Senha de Acesso
              </h3>
              <p className="text-[11px] text-zinc-400">
                Cliente: {client.name} ({client.cpf})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Current Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">
              Senha Atual *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder="Digite sua senha atual"
                className="w-full pl-9 pr-10 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-white"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">
              Nova Senha *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showNew ? 'text' : 'password'}
                value={newInput}
                onChange={(e) => setNewInput(e.target.value)}
                placeholder="Crie sua nova senha pessoal"
                className="w-full pl-9 pr-10 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-white"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1">
              Confirmar Nova Senha *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <UserCheck className="w-4 h-4" />
              </div>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full pl-9 pr-10 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-white"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all"
            >
              Atualizar Senha
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
