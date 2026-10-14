import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  PackagePlus,
  DollarSign,
  Camera,
  Image as ImageIcon,
  Trash2,
  Check,
  TrendingUp,
  History,
  Layers,
  Sparkles,
} from 'lucide-react';
import { InventoryItem, PriceHistoryEntry } from '../../types';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (device: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { id?: string }) => void;
  deviceToEdit?: InventoryItem | null;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

const CATEGORY_SUGGESTIONS = [
  'Produto / Equipamento',
  'Rastreador Veicular',
  'Sensor',
  'Bloqueador',
  'Câmera / Dashcam',
  'Chip M2M',
  'Acessório',
  'Outros',
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
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [quantity, setQuantity] = useState<number>(10);
  const [minQuantity, setMinQuantity] = useState<number>(5);
  const [unitCost, setUnitCost] = useState<string>('0');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (deviceToEdit) {
      setName(deviceToEdit.name || '');
      setModel(deviceToEdit.model || '');
      setCategory(deviceToEdit.category || 'Produto / Equipamento');
      setBrand(deviceToEdit.brand || '');
      setQuantity(deviceToEdit.quantity ?? 10);
      setMinQuantity(deviceToEdit.minQuantity ?? 5);
      setUnitCost(deviceToEdit.unitCost ? String(deviceToEdit.unitCost) : '0');
      setDescription(deviceToEdit.description || '');
      setImageUrl(deviceToEdit.imageUrl);
      setShowHistory(false);
    } else {
      setName('');
      setModel('');
      setCategory('Produto / Equipamento');
      setBrand('');
      setQuantity(10);
      setMinQuantity(5);
      setUnitCost('0');
      setDescription('');
      setImageUrl(undefined);
      setShowHistory(false);
    }
  }, [deviceToEdit, isOpen]);

  if (!isOpen) return null;

  // Compress & optimize uploaded photo to base64
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onToast('error', 'Formato Inválido', 'Por favor, selecione uma imagem (PNG, JPG ou WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      onToast('error', 'Arquivo Muito Grande', 'A foto deve ter no máximo 10MB.');
      return;
    }

    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          setImageUrl(compressed);
          onToast('success', 'Foto Adicionada', 'A imagem do dispositivo foi carregada.');
        } else {
          setImageUrl(readerEvent.target?.result as string);
        }
        setIsUploadingPhoto(false);
      };
      img.onerror = () => {
        setIsUploadingPhoto(false);
        onToast('error', 'Erro ao carregar', 'Não foi possível processar a imagem.');
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => {
      setIsUploadingPhoto(false);
      onToast('error', 'Erro ao ler arquivo', 'Falha na leitura da imagem.');
    };
    reader.readAsDataURL(file);

    if (e.target) e.target.value = '';
  };

  const handleRemovePhoto = () => {
    setImageUrl(undefined);
    onToast('info', 'Foto Removida', 'A imagem do equipamento foi removida.');
  };

  // Live calculation of weighted average cost
  const parsedCost = parseFloat(unitCost.replace(',', '.')) || 0;
  const currentQty = Math.max(0, Number(quantity) || 0);

  // If editing an existing item that already has a price history and current cost
  const prevAverage = deviceToEdit?.unitCost || 0;
  const isEditingExisting = !!deviceToEdit;

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

    const now = new Date().toISOString();
    const cleanCategory = category.trim() || 'Produto / Equipamento';

    // Calculate initial or updated weighted average price and append history
    let finalUnitCost = parsedCost > 0 ? parsedCost : undefined;
    let finalPriceHistory: PriceHistoryEntry[] = deviceToEdit?.priceHistory ? [...deviceToEdit.priceHistory] : [];

    if (!deviceToEdit) {
      // New device: initial cost entry
      if (parsedCost > 0 && currentQty > 0) {
        finalPriceHistory = [
          {
            id: `pe-${Date.now()}`,
            date: now,
            quantity: currentQty,
            unitCost: parsedCost,
            totalCost: Number((currentQty * parsedCost).toFixed(2)),
            newAverageCost: parsedCost,
            notes: 'Cadastro inicial de estoque',
          },
        ];
        finalUnitCost = parsedCost;
      }
    } else {
      // Editing existing device: if cost was changed or updated, calculate weighted average and append history
      if (parsedCost > 0 && parsedCost !== deviceToEdit.unitCost) {
        const prevQty = deviceToEdit.quantity || 0;
        let weightedAvg = parsedCost;
        if (prevQty > 0 && deviceToEdit.unitCost) {
          // Weighted average calculation
          weightedAvg = Number(
            ((prevQty * deviceToEdit.unitCost + currentQty * parsedCost) / (prevQty + currentQty || 1)).toFixed(2)
          );
        }

        finalPriceHistory.push({
          id: `pe-${Date.now()}`,
          date: now,
          quantity: currentQty,
          unitCost: parsedCost,
          totalCost: Number((currentQty * parsedCost).toFixed(2)),
          previousAverageCost: deviceToEdit.unitCost,
          newAverageCost: weightedAvg,
          notes: 'Ajuste manual de preço/lote no cadastro',
        });
        finalUnitCost = weightedAvg;
      } else {
        finalUnitCost = deviceToEdit.unitCost;
      }
    }

    onSave({
      ...(deviceToEdit ? { id: deviceToEdit.id } : {}),
      name: name.trim(),
      model: model.trim(),
      category: cleanCategory,
      brand: brand.trim() || 'Mavie Tech',
      quantity: currentQty,
      minQuantity: Math.max(1, Number(minQuantity) || 5),
      unitCost: finalUnitCost,
      priceHistory: finalPriceHistory,
      imageUrl,
      description: description.trim() || undefined,
    });

    onClose();
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/40 rounded-xl text-indigo-400">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                {deviceToEdit ? 'Editar Dispositivo' : 'Cadastrar Novo Dispositivo'}
              </h3>
              <p className="text-xs text-slate-400">
                Configure os dados do equipamento, categoria livre, foto e custo médio ponderado.
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
          {/* Foto do Dispositivo */}
          <div className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-2xl">
            <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-indigo-400" />
              Foto do Dispositivo (Visualização Rápida)
            </label>

            <div className="flex items-center gap-4">
              {imageUrl ? (
                <div className="relative group shrink-0">
                  <img
                    src={imageUrl}
                    alt="Dispositivo"
                    className="w-20 h-20 rounded-xl object-cover border-2 border-indigo-500/50 shadow-md bg-slate-900"
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-500 transition-colors"
                    title="Remover foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-900/60 flex flex-col items-center justify-center text-slate-500 hover:text-indigo-400 cursor-pointer transition-colors shrink-0"
                >
                  <ImageIcon className="w-6 h-6 mb-1" />
                  <span className="text-[9px] font-bold">Sem foto</span>
                </div>
              )}

              <div className="flex-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoSelect}
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{imageUrl ? 'Alterar Foto' : 'Carregar Foto do Dispositivo'}</span>
                </button>
                <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                  Formatos suportados: PNG, JPG ou WEBP. A foto é comprimida automaticamente para carregamento ultrarrápido.
                </p>
              </div>
            </div>
          </div>

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
                placeholder="Ex: Rastreador Veicular 4G"
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

          {/* Categoria Livre (Campo de Texto) com sugestões rápidas */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1">
              Categoria do Dispositivo (Texto Livre) *
            </label>
            <input
              type="text"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Digite qualquer categoria (ex: Produto / Equipamento, Rastreador, Câmera...)"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-500"
            />
            {/* Quick-suggestion chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] text-slate-500 self-center mr-1">Sugestões:</span>
              {CATEGORY_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setCategory(sug)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                    category.toLowerCase() === sug.toLowerCase()
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Marca / Fabricante */}
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

          {/* Quantidades e Custo Unitário com Preço Médio Ponderado */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Quantidade Atual *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-black text-sm focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Unidades em estoque</span>
              </div>

              <div>
                <label className="block text-amber-300 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Estoque Mínimo *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-amber-500/40 rounded-xl text-amber-300 font-black text-sm focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Alerta de reposição</span>
              </div>

              <div>
                <label className="block text-emerald-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                  {deviceToEdit ? 'Preço Médio / Lote (R$)' : 'Custo Unitário Inicial (R$)'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-500">R$</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Cálculo de preço médio</span>
              </div>
            </div>

            {/* Banner de Preço Médio Ponderado */}
            {parsedCost > 0 && (
              <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-300">Preço Médio Ponderado: </span>
                    <span className="text-slate-300">
                      {isEditingExisting && deviceToEdit.unitCost && deviceToEdit.unitCost !== parsedCost
                        ? `Atualizado com base nas entradas registradas`
                        : `Valor unitário: ${formatCurrency(parsedCost)}`}
                    </span>
                  </div>
                </div>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  {formatCurrency(parsedCost)}
                </span>
              </div>
            )}

            {/* Toggle Histórico de Preços se já existirem entradas */}
            {deviceToEdit?.priceHistory && deviceToEdit.priceHistory.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>
                    {showHistory ? 'Ocultar Histórico de Preços' : `Ver Histórico de Preços (${deviceToEdit.priceHistory.length} entradas)`}
                  </span>
                </button>

                {showHistory && (
                  <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {deviceToEdit.priceHistory.map((entry, idx) => (
                      <div
                        key={entry.id || idx}
                        className="p-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between text-[11px]"
                      >
                        <div>
                          <span className="text-slate-400">
                            {new Date(entry.date).toLocaleDateString('pt-BR')} •{' '}
                          </span>
                          <span className="font-bold text-white">{entry.quantity} un.</span>
                          <span className="text-slate-400"> a </span>
                          <span className="font-bold text-emerald-400">{formatCurrency(entry.unitCost)}</span>
                          {entry.notes && <span className="text-slate-500 italic ml-1">({entry.notes})</span>}
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400">Médio: </span>
                          <span className="font-bold font-mono text-indigo-300">{formatCurrency(entry.newAverageCost)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Observações / Especificações */}
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px] mb-1">
              Observações & Especificações Técnicas
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Homologado Anatel, chicote anti-chama incluso..."
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
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
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
