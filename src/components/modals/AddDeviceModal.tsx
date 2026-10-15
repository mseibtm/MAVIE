import React, { useState, useEffect } from 'react';
import { X, PackagePlus, Tag, MapPin, Check } from 'lucide-react';
import { InventoryItem, DeviceCategory } from '../../types';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (device: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { id?: string }) => void;
  deviceToEdit?: InventoryItem | null;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

const CATEGORIES: { value: DeviceCategory; label: string; icon: string }[] = [
  { value: 'produto_equipamento', label: 'Produto / Equipamento', icon: '📦' },
  { value: 'rastreador', label: 'Rastreador Veicular / GPS', icon: '🛰️' },
  { value: 'sensor', label: 'Sensor (Temperatura, Porta, etc.)', icon: '📡' },
  { value: 'bloqueador', label: 'Bloqueador / Relé', icon: '🔒' },
  { value: 'camera', label: 'Câmera Veicular / Dashcam', icon: '📷' },
  { value: 'chip', label: 'Chip M2M / IoT', icon: '💳' },
  { value: 'acessorio', label: 'Acessório / Botão de Pânico', icon: '🔌' },
  { value: 'identificador', label: 'Identificador / RFID / iButton', icon: '🪪' },
  { value: 'outros', label: 'Outros Equipamentos', icon: '📦' },
];

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  deviceToEdit,
  onToast,
}) => {
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [category, setCategory] = useState<DeviceCategory>('produto_equipamento');
  const [brand, setBrand] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState<number | string>(0);
  const [minQuantity, setMinQuantity] = useState<number | string>('');
  const [unitCost, setUnitCost] = useState<string>('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (deviceToEdit) {
      setName(deviceToEdit.name || '');
      setModel(deviceToEdit.model || '');
      setCategory(deviceToEdit.category || 'produto_equipamento');
      setBrand(deviceToEdit.brand || '');
      setSku(deviceToEdit.sku || '');
      setQuantity(deviceToEdit.quantity ?? 0);
      setMinQuantity(deviceToEdit.minQuantity && deviceToEdit.minQuantity > 0 ? deviceToEdit.minQuantity : '');
      setUnitCost(deviceToEdit.unitCost ? String(deviceToEdit.unitCost) : '');
      setLocation(deviceToEdit.location || '');
      setDescription(deviceToEdit.description || '');
    } else {
      setName('');
      setModel('');
      setCategory('produto_equipamento');
      setBrand('');
      setSku('');
      setQuantity(0);
      setMinQuantity('');
      setUnitCost('');
      setLocation('');
      setDescription('');
    }
  }, [deviceToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      onToast('error', 'Nome obrigatório', 'Informe o nome do dispositivo ou produto.');
      return;
    }

    if (!model.trim()) {
      onToast('error', 'Modelo obrigatório', 'Informe o modelo do equipamento.');
      return;
    }

    const parsedQty = Math.max(0, Number(quantity) || 0);
    const parsedMinQty = minQuantity !== '' && !isNaN(Number(minQuantity)) ? Math.max(0, Number(minQuantity)) : 0;
    const parsedCost = unitCost ? parseFloat(unitCost.replace(',', '.')) || 0 : undefined;

    onSave({
      ...(deviceToEdit ? { id: deviceToEdit.id } : {}),
      name: name.trim(),
      model: model.trim(),
      category,
      brand: brand.trim() || undefined,
      sku: sku.trim() || undefined,
      quantity: parsedQty,
      minQuantity: parsedMinQty,
      unitCost: parsedCost && parsedCost > 0 ? parsedCost : undefined,
      location: location.trim() || undefined,
      description: description.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/40 rounded-xl text-indigo-400">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                {deviceToEdit ? 'Editar Dispositivo do Estoque' : 'Cadastrar Item no Estoque'}
              </h3>
              <p className="text-xs text-slate-400">
                Preencha os dados do item para controle de inventário físico.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Nome e Modelo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1">
                Nome do Item *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do produto ou equipamento"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1">
                Modelo *
              </label>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Modelo do equipamento"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600"
              />
            </div>
          </div>

          {/* Categoria e Marca */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1">
                Categoria *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DeviceCategory)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1">
                Marca / Fabricante (Opcional)
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Marca ou fabricante"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600"
              />
            </div>
          </div>

          {/* SKU / Código */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1">
              Código SKU / Identificador (Opcional)
            </label>
            <div className="relative">
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="Código SKU ou identificador interno"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold focus:ring-2 focus:ring-indigo-500 placeholder-slate-600"
              />
              <Tag className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
            </div>
          </div>

          {/* Quantidades e Estoque Mínimo Opcional */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1">
                Quantidade em Estoque *
              </label>
              <input
                type="number"
                min="0"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-black text-sm focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Unidades físicas disponíveis</span>
            </div>

            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1">
                Estoque Mínimo (Opcional)
              </label>
              <input
                type="number"
                min="0"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Sem mínimo"
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium text-sm focus:ring-2 focus:ring-indigo-500 placeholder-slate-600"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Alerta opcional de baixo estoque</span>
            </div>

            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1">
                Custo Unitário (R$)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500 placeholder-slate-600"
                />
                <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-500">R$</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Valor de aquisição</span>
            </div>
          </div>

          {/* Localização Física */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1">
              Localização Física no Almoxarifado (Opcional)
            </label>
            <div className="relative">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Localização física no almoxarifado ou gaveta"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-indigo-500 placeholder-slate-600"
              />
              <MapPin className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
            </div>
          </div>

          {/* Descrição / Notas */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1">
              Observações & Especificações Técnicas (Opcional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Observações adicionais sobre o item (opcional)"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-indigo-500 placeholder-slate-600 resize-none"
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
              className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{deviceToEdit ? 'Salvar Alterações' : 'Cadastrar Item'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
