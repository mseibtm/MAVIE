import React, { useState, useEffect } from 'react';
import { X, ArrowDownRight, ArrowUpRight, AlertTriangle, Check, User, Wrench, FileText, Package, AlertCircle } from 'lucide-react';
import { InventoryItem, StockMovement, Client, MovementType } from '../../types';

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  clients: Client[];
  selectedItem?: InventoryItem | null;
  initialType?: MovementType;
  onConfirmMovement: (movement: Omit<StockMovement, 'id' | 'timestamp'>) => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

const EXIT_REASONS = [
  'Instalação em Cliente',
  'Venda de Equipamento',
  'Substituição / Manutenção',
  'Defeito / RMA para Fabricante',
  'Isca / Locação Temporária',
  'Ajuste de Inventário (Perda/Avaria)',
  'Outro Motivo',
];

const ENTRY_REASONS = [
  'Compra de Fornecedor / Novo Lote',
  'Devolução de Cliente',
  'Retirada de Veículo Desativado',
  'Retorno de Manutenção / RMA',
  'Ajuste de Inventário (Contagem Física)',
  'Outro Motivo',
];

export const StockMovementModal: React.FC<StockMovementModalProps> = ({
  isOpen,
  onClose,
  items,
  clients,
  selectedItem,
  initialType = 'exit',
  onConfirmMovement,
  onToast,
}) => {
  const [movementType, setMovementType] = useState<MovementType>(initialType);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCostStr, setUnitCostStr] = useState<string>('');
  const [reason, setReason] = useState<string>('Instalação em Cliente');
  const [customReason, setCustomReason] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [technician, setTechnician] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    setMovementType(initialType);
    let target = selectedItem;
    if (selectedItem) {
      setSelectedItemId(selectedItem.id);
    } else if (items.length > 0) {
      setSelectedItemId(items[0].id);
      target = items[0];
    }
    setQuantity(1);
    setUnitCostStr(target?.unitCost ? String(target.unitCost) : '');
    setReason(initialType === 'exit' ? 'Instalação em Cliente' : 'Compra de Fornecedor / Novo Lote');
    setCustomReason('');
    setSelectedClientId('');
    setTechnician('Técnico Rodrigo Ramos');
    setNotes('');
  }, [isOpen, selectedItem, initialType, items]);

  if (!isOpen) return null;

  const currentItem = items.find((i) => i.id === selectedItemId) || selectedItem;
  const currentStock = currentItem ? currentItem.quantity : 0;
  const currentAvgCost = currentItem?.unitCost || 0;

  // Real-time calculation of remaining or new stock
  const isExit = movementType === 'exit';
  const remainingStock = isExit ? currentStock - quantity : currentStock + quantity;
  const isOverQuantity = isExit && quantity > currentStock;

  const entryUnitCost = parseFloat(unitCostStr.replace(',', '.')) || 0;
  const newWeightedAvgCost = entryUnitCost > 0
    ? (currentStock <= 0 ? entryUnitCost : Number(((currentStock * currentAvgCost + quantity * entryUnitCost) / (currentStock + quantity)).toFixed(2)))
    : currentAvgCost;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleQuickQuantity = (val: number) => {
    if (isExit && val > currentStock) {
      setQuantity(Math.max(1, currentStock));
    } else {
      setQuantity(val);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentItem) {
      onToast('error', 'Selecione um dispositivo', 'Nenhum dispositivo selecionado para movimentação.');
      return;
    }

    if (quantity <= 0) {
      onToast('error', 'Quantidade inválida', 'Informe uma quantidade superior a zero.');
      return;
    }

    if (isExit && quantity > currentStock) {
      onToast('error', 'Estoque Insuficiente', `O estoque atual é de apenas ${currentStock} unidade(s). Não é possível baixar ${quantity}.`);
      return;
    }

    const finalReason = reason === 'Outro Motivo' && customReason.trim() ? customReason.trim() : reason;
    const client = clients.find((c) => c.id === selectedClientId);

    onConfirmMovement({
      itemId: currentItem.id,
      itemName: currentItem.name,
      type: movementType,
      quantity,
      unitCost: !isExit && entryUnitCost > 0 ? entryUnitCost : undefined,
      totalCost: !isExit && entryUnitCost > 0 ? Number((quantity * entryUnitCost).toFixed(2)) : undefined,
      previousQuantity: currentStock,
      newQuantity: remainingStock,
      reason: finalReason,
      clientId: client ? client.id : undefined,
      clientName: client ? `${client.name}${client.company ? ` (${client.company})` : ''}` : undefined,
      technician: technician.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div
          className={`px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 ${
            isExit ? 'bg-gradient-to-r from-rose-950/60 to-slate-950' : 'bg-gradient-to-r from-emerald-950/60 to-slate-950'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                isExit
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
              }`}
            >
              {isExit ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                {isExit ? 'Dar Baixa de Volume (Saída de Estoque)' : 'Adicionar Volume (Entrada de Estoque)'}
              </h3>
              <p className="text-xs text-slate-400">
                {isExit
                  ? 'Retire equipamentos para instalação, venda ou manutenção.'
                  : 'Acrescente novas unidades adquiridas ou devolvidas.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs: Baixa vs Entrada */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setMovementType('exit');
              setReason('Instalação em Cliente');
            }}
            className={`flex-1 py-2 text-xs font-black rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              movementType === 'exit'
                ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-900/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>Dar Baixa (Saída)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMovementType('entry');
              setReason('Compra de Fornecedor / Novo Lote');
            }}
            className={`flex-1 py-2 text-xs font-black rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              movementType === 'entry'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Adicionar Volume (Entrada)</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Seletor do Dispositivo */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1">
              Dispositivo / Equipamento *
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => {
                setSelectedItemId(e.target.value);
                setQuantity(1);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold focus:ring-2 focus:ring-indigo-500"
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.model}) - Estoque Atual: {item.quantity} un - [{item.sku}]
                </option>
              ))}
            </select>
          </div>

          {/* Card Resumo do Item Selecionado e Saldo Restante */}
          {currentItem && (
            <div
              className={`p-4 rounded-xl border ${
                isExit
                  ? isOverQuantity
                    ? 'bg-rose-950/40 border-rose-600'
                    : 'bg-slate-950 border-slate-800'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-white text-xs">{currentItem.name}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-800 px-2 py-0.5 rounded">
                  {currentItem.sku}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Estoque Atual</span>
                  <span className="text-base font-black font-mono text-white">{currentStock} un</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    {isExit ? 'Qtd. a Baixar' : 'Qtd. a Adicionar'}
                  </span>
                  <span className={`text-base font-black font-mono ${isExit ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {isExit ? `-${quantity}` : `+${quantity}`} un
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Saldo Final</span>
                  <span
                    className={`text-base font-black font-mono ${
                      isOverQuantity
                        ? 'text-rose-500 underline font-black animate-pulse'
                        : remainingStock <= currentItem.minQuantity
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {remainingStock} un
                  </span>
                </div>
              </div>

              {isOverQuantity && (
                <div className="mt-2.5 p-2 bg-rose-950/80 border border-rose-700 rounded-lg text-rose-300 text-[11px] font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Atenção: A quantidade de baixa excede o total em estoque disponível ({currentStock} un)!</span>
                </div>
              )}
            </div>
          )}

          {/* Quantidade a Movimentar com Stepper e Atalhos */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                {isExit ? 'Quantidade a Dar Baixa *' : 'Quantidade a Adicionar *'}
              </label>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400">Atalhos:</span>
                {[1, 2, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleQuickQuantity(num)}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded cursor-pointer"
                  >
                    +{num}
                  </button>
                ))}
                {isExit && currentStock > 0 && (
                  <button
                    type="button"
                    onClick={() => setQuantity(currentStock)}
                    className="px-2 py-0.5 bg-rose-950 text-rose-300 hover:bg-rose-900 text-[10px] font-bold rounded cursor-pointer"
                  >
                    Tudo ({currentStock})
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-lg flex items-center justify-center cursor-pointer transition-colors"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max={isExit ? currentStock || 1 : 9999}
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className="flex-1 px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-center text-white font-black text-lg focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  if (isExit && quantity >= currentStock) {
                    onToast('info', 'Limite atingido', `Estoque máximo disponível é de ${currentStock} unidades.`);
                  } else {
                    setQuantity((prev) => prev + 1);
                  }
                }}
                className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-lg flex items-center justify-center cursor-pointer transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Custo Unitário da Entrada e Preço Médio Ponderado */}
          {!isExit && (
            <div className="p-3.5 bg-slate-950/80 border border-emerald-900/50 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-emerald-400 font-bold uppercase tracking-wider text-[10px]">
                  Custo Unitário Desta Entrada (R$)
                </label>
                <span className="text-[10px] text-slate-400">
                  Preço médio atual: <strong className="text-white font-mono">{formatCurrency(currentAvgCost)}</strong>
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={unitCostStr}
                  onChange={(e) => setUnitCostStr(e.target.value)}
                  placeholder={currentAvgCost > 0 ? String(currentAvgCost) : '0,00'}
                  className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 placeholder-slate-600"
                />
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">R$</span>
              </div>

              {entryUnitCost > 0 && (
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/40 rounded-lg text-[11px] space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>Total do Lote ({quantity} un. x {formatCurrency(entryUnitCost)}):</span>
                    <span className="font-bold text-white">{formatCurrency(quantity * entryUnitCost)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-300 font-bold pt-1 border-t border-emerald-900/40">
                    <span>Novo Preço Médio Ponderado Calculado:</span>
                    <span className="font-mono text-xs text-emerald-400">{formatCurrency(newWeightedAvgCost)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Motivo da Movimentação */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1">
              Motivo da {isExit ? 'Baixa' : 'Entrada'} *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-semibold focus:ring-2 focus:ring-indigo-500"
            >
              {(isExit ? EXIT_REASONS : ENTRY_REASONS).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {reason === 'Outro Motivo' && (
            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1">
                Especifique o Motivo Personalizado *
              </label>
              <input
                type="text"
                required
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Descreva o motivo da movimentação..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Vínculo opcional com Cliente (especialmente útil em Baixa para instalação) */}
          {isExit && (
            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1">
                Vincular a um Cliente (Opcional - Rastreamento)
              </label>
              <div className="relative">
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Nenhum cliente (Uso interno / Geral)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `- ${c.company}` : ''} ({c.cpf})
                    </option>
                  ))}
                </select>
                <User className="w-4 h-4 text-slate-500 absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Técnico / Responsável */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1">
              Técnico / Responsável pela Retirada
            </label>
            <div className="relative">
              <input
                type="text"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                placeholder="Ex: Rodrigo Ramos, Mateus Lima, Felipe..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-indigo-500"
              />
              <Wrench className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
            </div>
          </div>

          {/* Observações / Notas */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1">
              Observações Adicionais (Veículo, Placa, Chamado, etc.)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Equipamento instalado no caminhão placa BRA-2E19, ordem de serviço #4912..."
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-indigo-500 placeholder-slate-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isOverQuantity}
              className={`px-5 py-2 font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                isExit
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40 disabled:opacity-50 disabled:cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {isExit ? `Confirmar Baixa (${quantity} un)` : `Confirmar Entrada (+${quantity} un)`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
