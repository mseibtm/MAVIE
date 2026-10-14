import React, { useState, useEffect } from 'react';
import { X, PackagePlus, Tag, Layers, MapPin, DollarSign, AlertCircle, Sparkles, Check } from 'lucide-react';
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
  const [category, setCategory] = useState<DeviceCategory>('rastreador');
  const [brand, setBrand] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState<number>(10);
  const [minQuantity, setMinQuantity] = useState<number>(5);
  const [unitCost, setUnitCost] = useState<string>('0');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (deviceToEdit) {
      setName(deviceToEdit.name);
      setModel(deviceToEdit.model);
      setCategory(deviceToEdit.category);
      setBrand(deviceToEdit.brand);
      setSku(deviceToEdit.sku);
      setQuantity(deviceToEdit.quantity);
      setMinQuantity(deviceToEdit.minQuantity);
      setUnitCost(deviceToEdit.unitCost ? String(deviceToEdit.unitCost) : '0');
      setLocation(deviceToEdit.location || '');
      setDescription(deviceToEdit.description || '');
    } else {
      setName('');
      setModel('');
      setCategory('rastreador');
      setBrand('Teltonika');
      setSku('');
      setQuantity(10);
      setMinQuantity(5);
      setUnitCost('0');
      setLocation('Prateleira A - Caixa 01');
      setDescription('');
    }
  }, [deviceToEdit, isOpen]);

  if (!isOpen) return null;

  const generateAutoSku = () => {
    const catPrefix = category.substring(0, 3).toUpperCase();
    const brandPrefix = (brand.substring(0, 3) || 'MAV').toUpperCase();
    const randomCode = Math.floor(100 + Math.random() * 900);
    const newSku = `${catPrefix}-${brandPrefix}-${randomCode}`;
    setSku(newSku);
    onToast('info', 'SKU Gerado', `Código ${newSku} gerado automaticamente.`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      onToast('error', 'Nome obrigatório', 'Informe o nome do dispositivo.');
      return;
    }

    if (!model.trim()) {
      onToast('error', 'Modelo obrigatório', 'Informe o modelo do equipamento.');
      return;
    }

    const finalSku = sku.trim() || `DEV-${Math.floor(1000 + Math.random() * 9000)}`;
    const parsedCost = parseFloat(unitCost.replace(',', '.')) || 0;

    onSave({
      ...(deviceToEdit ? { id: deviceToEdit.id } : {}),
      name: name.trim(),
      model: model.trim(),
      category,
      brand: brand.trim() || 'Mavie Tech',
      sku: finalSku,
      quantity: Math.max(0, Number(quantity) || 0),
      minQuantity: Math.max(1, Number(minQuantity) || 5),
      unitCost: parsedCost > 0 ? parsedCost : undefined,
      location: location.trim() || 'Estoque Geral',
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
                {deviceToEdit ? 'Editar Dispositivo do Estoque' : 'Cadastrar Novo Dispositivo no Estoque'}
              </h3>
              <p className="text-xs text-slate-400">
                Preencha os dados do equipamento para controle visual de volume e alertas.
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
                Nome do Dispositivo *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Rastreador Veicular 4G Teltonika"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1">
                Modelo do Equipamento *
              </label>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Ex: FMC130 / ST310U"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-500"
              />
            </div>
          </div>

          {/* Categoria e Marca */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1">
                Categoria do Dispositivo *
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
                Marca / Fabricante
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Ex: Teltonika, Suntech, Queclink, Mavie"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-500"
              />
            </div>
          </div>

          {/* SKU / Código */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                Código SKU / Identificador Interno
              </label>
              <button
                type="button"
                onClick={generateAutoSku}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Gerar SKU Automático</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="Ex: RAST-TEL-4G-01"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
              />
              <Tag className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
            </div>
          </div>

          {/* Quantidades e Estoque Mínimo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1">
                Quantidade Atual em Estoque *
              </label>
              <input
                type="number"
                min="0"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-black text-sm focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Unidades físicas disponíveis</span>
            </div>

            <div>
              <label className="block text-amber-300 font-bold uppercase tracking-wider text-[10px] mb-1">
                Estoque Mínimo de Alerta *
              </label>
              <input
                type="number"
                min="1"
                required
                value={minQuantity}
                onChange={(e) => setMinQuantity(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-slate-900 border border-amber-500/40 rounded-xl text-amber-300 font-black text-sm focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Dispara aviso visual</span>
            </div>

            <div>
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1">
                Custo Unitário Estimado (R$)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500"
                />
                <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-500">R$</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Valor de aquisição</span>
            </div>
          </div>

          {/* Localização Física */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1">
              Localização Física no Almoxarifado / Estoque
            </label>
            <div className="relative">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Prateleira B - Caixa 03 / Armário Seguro"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
              />
              <MapPin className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
            </div>
          </div>

          {/* Descrição / Notas */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1">
              Observações & Especificações Técnicas
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Homologado Anatel, chicote anti-chama incluso, compatível com telemetria CAN..."
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
              className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{deviceToEdit ? 'Salvar Alterações' : 'Cadastrar Dispositivo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
