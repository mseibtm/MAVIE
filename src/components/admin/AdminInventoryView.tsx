import React, { useState } from 'react';
import {
  Boxes,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Filter,
  AlertTriangle,
  PackageCheck,
  PackageX,
  History,
  LayoutGrid,
  List,
  MapPin,
  Tag,
  DollarSign,
  Edit2,
  Trash2,
  TrendingDown,
  TrendingUp,
  Clock,
  User,
  Wrench,
  CheckCircle2,
  ChevronRight,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { InventoryItem, StockMovement, Client, DeviceCategory } from '../../types';
import { AddDeviceModal } from '../modals/AddDeviceModal';
import { StockMovementModal } from '../modals/StockMovementModal';

interface AdminInventoryViewProps {
  inventoryItems: InventoryItem[];
  stockMovements: StockMovement[];
  clients: Client[];
  onAddDevice: (device: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { id?: string }) => void;
  onUpdateDevice: (device: InventoryItem) => void;
  onDeleteDevice: (deviceId: string) => void;
  onStockMovement: (movement: Omit<StockMovement, 'id' | 'timestamp'>) => void;
  onClearAllInventory?: () => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

const CATEGORY_LABELS: Record<DeviceCategory, { label: string; icon: string; color: string }> = {
  produto_equipamento: { label: 'Automação', icon: '📦', color: 'from-blue-600/20 to-cyan-500/20 border-cyan-500/40 text-cyan-400' },
  rastreador: { label: 'Elétrica', icon: '🛰️', color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/40 text-blue-400' },
  sensor: { label: 'Eletrônicos', icon: '📡', color: 'from-teal-500/20 to-emerald-500/20 border-teal-500/40 text-teal-400' },
  bloqueador: { label: 'Bloqueador / Relé', icon: '🔒', color: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-400' },
  camera: { label: 'Câmera / Dashcam', icon: '📷', color: 'from-purple-500/20 to-pink-500/20 border-purple-500/40 text-purple-400' },
  chip: { label: 'Chip M2M IoT', icon: '💳', color: 'from-sky-500/20 to-cyan-500/20 border-sky-500/40 text-sky-400' },
  acessorio: { label: 'Acessório', icon: '🔌', color: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/40 text-yellow-400' },
  identificador: { label: 'Identificador RFID', icon: '🪪', color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-400' },
  outros: { label: 'Outros', icon: '📦', color: 'from-slate-500/20 to-zinc-500/20 border-slate-500/40 text-slate-400' },
};

export const AdminInventoryView: React.FC<AdminInventoryViewProps> = ({
  inventoryItems,
  stockMovements,
  clients,
  onAddDevice,
  onUpdateDevice,
  onDeleteDevice,
  onStockMovement,
  onClearAllInventory,
  onToast,
}) => {
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  // Modal states
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<InventoryItem | null>(null);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementTargetItem, setMovementTargetItem] = useState<InventoryItem | null>(null);
  const [movementType, setMovementType] = useState<'entry' | 'exit'>('exit');
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Currency Formatter
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // KPIs
  const totalUnits = inventoryItems.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalModels = inventoryItems.length;
  const lowStockItems = inventoryItems.filter(
    (i) => (i.minQuantity || 0) > 0 && i.quantity > 0 && i.quantity <= (i.minQuantity || 0)
  );
  const outOfStockItems = inventoryItems.filter((i) => i.quantity === 0);
  const totalStockValue = inventoryItems.reduce(
    (acc, curr) => acc + curr.quantity * (curr.unitCost || 0),
    0
  );

  const totalExitsLast30Days = stockMovements.filter((m) => m.type === 'exit').reduce((acc, m) => acc + m.quantity, 0);
  const totalEntriesLast30Days = stockMovements.filter((m) => m.type === 'entry').reduce((acc, m) => acc + m.quantity, 0);

  // Filtered devices
  const filteredItems = inventoryItems.filter((item) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      item.name.toLowerCase().includes(q) ||
      item.model.toLowerCase().includes(q) ||
      (item.sku && item.sku.toLowerCase().includes(q)) ||
      (item.brand && item.brand.toLowerCase().includes(q)) ||
      (item.location && item.location.toLowerCase().includes(q));

    const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;

    let matchStatus = true;
    const minQ = item.minQuantity || 0;
    if (selectedStatus === 'available') {
      matchStatus = item.quantity > 0 && (minQ === 0 || item.quantity > minQ);
    } else if (selectedStatus === 'low_stock') {
      matchStatus = minQ > 0 && item.quantity > 0 && item.quantity <= minQ;
    } else if (selectedStatus === 'out_of_stock') {
      matchStatus = item.quantity === 0;
    }

    return matchSearch && matchCategory && matchStatus;
  });

  const openExitModal = (item?: InventoryItem) => {
    if (inventoryItems.length === 0) {
      onToast('info', 'Estoque Vazio', 'Cadastre ao menos um dispositivo antes de realizar baixa de volume.');
      return;
    }
    setMovementTargetItem(item || null);
    setMovementType('exit');
    setIsMovementModalOpen(true);
  };

  const openEntryModal = (item?: InventoryItem) => {
    if (inventoryItems.length === 0) {
      onToast('info', 'Estoque Vazio', 'Cadastre ao menos um dispositivo antes de adicionar volume de estoque.');
      return;
    }
    setMovementTargetItem(item || null);
    setMovementType('entry');
    setIsMovementModalOpen(true);
  };

  const handleEditDevice = (item: InventoryItem) => {
    setEditingDevice(item);
    setIsAddDeviceModalOpen(true);
  };

  const handleDeleteDevice = (id: string) => {
    onDeleteDevice(id);
    setDeleteConfirmId(null);
    onToast('info', 'Dispositivo Excluído', 'O item foi removido do inventário.');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 mb-1">
            <Boxes className="w-4 h-4" />
            <span>Almoxarifado & Equipamentos Telemáticos</span>
          </div>
          <h1 className="text-2xl font-black text-white">Controle de Estoque</h1>
          <p className="text-xs text-slate-400 mt-1">
            Visualização dos dispositivos físicos, controle de saldo, alerta de estoque mínimo e baixa de volumes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsHistoryDrawerOpen(true)}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Ver auditoria de entradas e baixas"
          >
            <History className="w-4 h-4 text-indigo-400" />
            <span>Histórico ({stockMovements.length})</span>
          </button>

          <button
            onClick={() => openEntryModal()}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 font-bold text-xs rounded-xl border border-emerald-700/80 transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Registrar entrada de novo lote ou devolução"
          >
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            <span>+ Entrada de Volume</span>
          </button>

          <button
            onClick={() => openExitModal()}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 font-bold text-xs rounded-xl border border-rose-700/80 transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Dar baixa de volume de equipamentos para instalação, venda ou avaria"
          >
            <ArrowDownRight className="w-4 h-4 text-rose-400" />
            <span>- Dar Baixa de Volume</span>
          </button>

          {inventoryItems.length > 0 && onClearAllInventory && (
            <button
              onClick={() => setIsClearConfirmOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-rose-950/70 text-slate-400 hover:text-rose-300 font-bold text-xs rounded-xl border border-slate-700 hover:border-rose-700/60 transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Limpar todos os itens do estoque"
            >
              <Trash2 className="w-4 h-4 text-slate-500 hover:text-rose-400" />
              <span>Limpar Estoque</span>
            </button>
          )}

          <button
            onClick={() => {
              setEditingDevice(null);
              setIsAddDeviceModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all shrink-0 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Adicionar Manualmente</span>
          </button>
        </div>
      </div>

      {/* 5 KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Unidades */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm transition-all hover:border-indigo-500/40">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5" />
              <span>Total em Estoque</span>
            </span>
            <span className="px-2 py-0.5 text-[10px] font-extrabold bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full">
              {totalModels} modelos
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-white">
            {totalUnits} <span className="text-sm font-semibold text-slate-400">unidades</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Patrimônio estimado:</span>
            <span className="text-emerald-400 font-bold">{formatCurrency(totalStockValue)}</span>
          </p>
        </div>

        {/* Card 2: Modelos Ativos */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm transition-all hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Variedades / SKUs</span>
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-sky-400">
            {totalModels} <span className="text-sm font-semibold text-slate-400">cadastros</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Rastreadores, sensores e módulos
          </p>
        </div>

        {/* Card 3: Baixo Estoque */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'low_stock' ? 'all' : 'low_stock')}
          className={`bg-slate-900 border rounded-2xl p-4 shadow-sm transition-all cursor-pointer ${
            lowStockItems.length > 0
              ? 'border-amber-500/50 hover:border-amber-400 bg-gradient-to-br from-slate-900 to-amber-950/20'
              : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Baixo Estoque</span>
            </span>
            {lowStockItems.length > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-950 text-amber-300 border border-amber-800 rounded-full animate-pulse">
                Atenção
              </span>
            )}
          </div>
          <div className="text-2xl font-black font-mono text-amber-400">
            {lowStockItems.length} <span className="text-sm font-semibold text-slate-400">item(ns)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {lowStockItems.length > 0 ? 'Abaixo do limite mínimo' : 'Nenhum item em nível crítico'}
          </p>
        </div>

        {/* Card 4: Esgotados */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'out_of_stock' ? 'all' : 'out_of_stock')}
          className={`bg-slate-900 border rounded-2xl p-4 shadow-sm transition-all cursor-pointer ${
            outOfStockItems.length > 0
              ? 'border-rose-500/60 hover:border-rose-400 bg-gradient-to-br from-slate-900 to-rose-950/30'
              : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <PackageX className="w-3.5 h-3.5" />
              <span>Esgotados</span>
            </span>
            {outOfStockItems.length > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-extrabold bg-rose-950 text-rose-300 border border-rose-800 rounded-full">
                Zerado
              </span>
            )}
          </div>
          <div className="text-2xl font-black font-mono text-rose-400">
            {outOfStockItems.length} <span className="text-sm font-semibold text-slate-400">item(ns)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {outOfStockItems.length > 0 ? 'Necessita reposição urgente' : 'Estoque 100% abastecido'}
          </p>
        </div>

        {/* Card 5: Baixas Realizadas */}
        <div
          onClick={() => setIsHistoryDrawerOpen(true)}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              <span>Baixas / Saídas</span>
            </span>
            <span className="text-[10px] text-slate-500 group-hover:text-indigo-400 transition-colors">
              Ver log &rarr;
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-white">
            {totalExitsLast30Days} <span className="text-sm font-semibold text-slate-400">baixados</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Entradas registradas:</span>
            <span className="text-emerald-400 font-bold">+{totalEntriesLast30Days} un</span>
          </p>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por dispositivo, modelo, marca, SKU ou prateleira..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-medium text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 self-start md:self-auto shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white shadow-sm font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grade Visual</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white shadow-sm font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Tabela</span>
            </button>
          </div>
        </div>

        {/* Category Pills & Status Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              Todos ({inventoryItems.length})
            </button>
            {Object.entries(CATEGORY_LABELS).map(([catKey, catInfo]) => {
              const count = inventoryItems.filter((i) => i.category === catKey).length;
              if (count === 0 && selectedCategory !== catKey) return null;
              return (
                <button
                  key={catKey}
                  onClick={() => setSelectedCategory(catKey)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                    selectedCategory === catKey
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-850'
                  }`}
                >
                  <span>{catInfo.icon}</span>
                  <span>{catInfo.label}</span>
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Status selector */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todos os Status</option>
              <option value="available">Em Estoque Normal</option>
              <option value="low_stock">⚠️ Baixo Estoque</option>
              <option value="out_of_stock">❌ Esgotados</option>
            </select>
          </div>
        </div>
      </div>

      {/* ITEMS LISTING (GRID OR TABLE) */}
      {inventoryItems.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/90 border border-slate-800 rounded-3xl p-8 max-w-2xl mx-auto shadow-2xl">
          <div className="w-16 h-16 mx-auto mb-4 bg-indigo-950/70 border border-indigo-800/70 rounded-2xl flex items-center justify-center text-indigo-400 shadow-inner">
            <Boxes className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-white">Estoque Limpo e Vazio</h3>
          <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
            Nenhum dispositivo físico cadastrado no estoque no momento.
            Você pode cadastrar novos equipamentos manualmente clicando no botão abaixo.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                setEditingDevice(null);
                setIsAddDeviceModalOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Adicionar Manualmente</span>
            </button>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <Boxes className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-300">Nenhum dispositivo encontrado</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Nenhum equipamento corresponde aos filtros aplicados. Tente limpar os filtros ou cadastre um novo dispositivo.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
              setSelectedStatus('all');
            }}
            className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            Limpar Filtros
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* VISUAL GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const cat = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.outros;
            const minQ = item.minQuantity || 0;
            const isOutOfStock = item.quantity === 0;
            const isLowStock = minQ > 0 && item.quantity > 0 && item.quantity <= minQ;
            const isHealthy = item.quantity > 0 && (minQ === 0 || item.quantity > minQ);

            // Health percentage (relationship between current and min threshold)
            const healthPercent = minQ > 0
              ? Math.min(100, Math.round((item.quantity / Math.max(1, minQ * 2)) * 100))
              : item.quantity > 0 ? 100 : 0;

            return (
              <div
                key={item.id}
                className={`bg-slate-900 border rounded-2xl p-5 shadow-md flex flex-col justify-between transition-all hover:shadow-lg ${
                  isOutOfStock
                    ? 'border-rose-800/80 bg-gradient-to-br from-slate-900 via-rose-950/20 to-slate-900 shadow-rose-950/20 hover:border-rose-600'
                    : isLowStock
                    ? 'border-amber-500/50 bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900 shadow-amber-950/20 hover:border-amber-400'
                    : 'border-slate-800 hover:border-indigo-500/40'
                }`}
              >
                <div>
                  {/* Top Header Badge Row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border flex items-center gap-1.5 ${cat.color}`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </span>

                    {/* Stock status indicator */}
                    {isOutOfStock ? (
                      <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-rose-950 text-rose-300 border border-rose-800 animate-pulse">
                        ESGOTADO
                      </span>
                    ) : isLowStock ? (
                      <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-950 text-amber-300 border border-amber-800 animate-pulse flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span>BAIXO ESTOQUE</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>EM ESTOQUE</span>
                      </span>
                    )}
                  </div>

                  {/* Device Name and Model */}
                  <h3 className="font-extrabold text-white text-sm line-clamp-2 leading-snug">
                    {item.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    {item.brand && <span className="font-bold text-slate-300">{item.brand} &bull;</span>}
                    <span className="font-mono text-indigo-400 font-bold">{item.model}</span>
                  </div>

                  {/* Large Quantity Counter & Visual Gauge */}
                  <div className="my-4 p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Saldo Físico
                      </span>
                      {item.minQuantity && item.minQuantity > 0 ? (
                        <span className="text-[11px] font-mono text-slate-400">
                          Mínimo: <strong className="text-amber-400 font-bold">{item.minQuantity} un</strong>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-medium">Sem estoque mínimo</span>
                      )}
                    </div>

                    <div className="flex items-baseline justify-between gap-2">
                      <div
                        className={`text-3xl font-black font-mono tracking-tight ${
                          isOutOfStock
                            ? 'text-rose-500'
                            : isLowStock
                            ? 'text-amber-400'
                            : 'text-white'
                        }`}
                      >
                        {item.quantity}{' '}
                        <span className="text-xs font-semibold text-slate-500 font-sans">unidades</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2.5">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          isOutOfStock
                            ? 'bg-rose-600'
                            : isLowStock
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.max(4, healthPercent)}%` }}
                      />
                    </div>
                  </div>

                  {/* Meta Details: SKU, Location, Cost */}
                  <div className="space-y-1.5 text-[11px] text-slate-400 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Tag className="w-3 h-3" /> SKU:
                      </span>
                      <span className="font-mono font-bold text-slate-300">{item.sku}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-500">
                        <MapPin className="w-3 h-3" /> Local:
                      </span>
                      <span className="font-medium text-slate-300 truncate max-w-[150px]">
                        {item.location || 'Estoque Central'}
                      </span>
                    </div>

                    {item.unitCost && item.unitCost > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-slate-500">
                          <DollarSign className="w-3 h-3" /> Custo Unit.:
                        </span>
                        <span className="font-semibold text-emerald-400">
                          {formatCurrency(item.unitCost)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions (Dar Baixa / Entrada / Editar) */}
                <div className="pt-4 mt-4 border-t border-slate-800 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={item.quantity === 0}
                      onClick={() => openExitModal(item)}
                      className={`px-3 py-2 font-black text-xs rounded-xl border flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                        item.quantity === 0
                          ? 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed'
                          : 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border-rose-800/80 active:scale-95 cursor-pointer hover:border-rose-600'
                      }`}
                      title={item.quantity === 0 ? 'Dispositivo esgotado' : 'Dar baixa de volume deste equipamento'}
                    >
                      <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                      <span>Dar Baixa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openEntryModal(item)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer hover:border-emerald-600/60"
                      title="Adicionar novas unidades ao estoque"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>+ Volume</span>
                    </button>
                  </div>

                  {/* Secondary edit / delete icons */}
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleEditDevice(item)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      title="Editar cadastro do dispositivo"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Excluir dispositivo do estoque"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISUAL TABLE VIEW */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-4">Dispositivo / Modelo</th>
                  <th className="p-4">Categoria</th>
                  <th className="p-4">SKU / Identificador</th>
                  <th className="p-4">Localização</th>
                  <th className="p-4 text-center">Estoque Atual</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4">Custo Unit.</th>
                  <th className="p-4 text-right">Ações de Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredItems.map((item) => {
                  const cat = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.outros;
                  const isOutOfStock = item.quantity === 0;
                  const isLowStock = item.quantity > 0 && item.quantity <= item.minQuantity;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isOutOfStock
                          ? 'bg-rose-950/20 hover:bg-rose-950/35 border-l-2 border-rose-500'
                          : isLowStock
                          ? 'bg-amber-950/20 hover:bg-amber-950/30 border-l-2 border-amber-500'
                          : 'hover:bg-slate-850/60'
                      }`}
                    >
                      <td className="p-4">
                        <div className="font-bold text-white text-xs">{item.name}</div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          {item.brand} &bull; <span className="font-mono text-indigo-400">{item.model}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-950 border border-slate-800 text-slate-300">
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-300">{item.sku}</td>
                      <td className="p-4 text-slate-400">{item.location || 'Geral'}</td>
                      <td className="p-4 text-center">
                        <div
                          className={`text-base font-black font-mono ${
                            isOutOfStock
                              ? 'text-rose-500'
                              : isLowStock
                              ? 'text-amber-400'
                              : 'text-white'
                          }`}
                        >
                          {item.quantity} un
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {item.minQuantity && item.minQuantity > 0 ? `Mín: ${item.minQuantity}` : 'Sem mínimo'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {isOutOfStock ? (
                          <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                            Esgotado
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-amber-950 text-amber-300 border border-amber-800 animate-pulse">
                            Baixo Estoque
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                            Normal
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-semibold text-emerald-400">
                        {item.unitCost ? formatCurrency(item.unitCost) : '-'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={item.quantity === 0}
                            onClick={() => openExitModal(item)}
                            className={`px-2.5 py-1 text-xs font-black rounded-lg border flex items-center gap-1 ${
                              item.quantity === 0
                                ? 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed'
                                : 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border-rose-800 cursor-pointer'
                            }`}
                            title="Dar Baixa de Volume"
                          >
                            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                            <span>Baixa</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openEntryModal(item)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                            title="Adicionar Volume"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Entrada</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEditDevice(item)}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT DEVICE */}
      <AddDeviceModal
        isOpen={isAddDeviceModalOpen}
        onClose={() => {
          setIsAddDeviceModalOpen(false);
          setEditingDevice(null);
        }}
        deviceToEdit={editingDevice}
        onSave={(deviceData) => {
          if (editingDevice) {
            onUpdateDevice({
              ...editingDevice,
              ...deviceData,
              status:
                deviceData.quantity === 0
                  ? 'out_of_stock'
                  : deviceData.quantity <= deviceData.minQuantity
                  ? 'low_stock'
                  : 'available',
              updatedAt: new Date().toISOString(),
            });
            onToast('success', 'Dispositivo Atualizado', `${deviceData.name} foi atualizado no estoque.`);
          } else {
            onAddDevice(deviceData);
            onToast('success', 'Dispositivo Cadastrado', `${deviceData.name} cadastrado com sucesso.`);
          }
        }}
        onToast={onToast}
      />

      {/* MODAL: STOCK MOVEMENT (DAR BAIXA / ENTRADA) */}
      <StockMovementModal
        isOpen={isMovementModalOpen}
        onClose={() => {
          setIsMovementModalOpen(false);
          setMovementTargetItem(null);
        }}
        items={inventoryItems}
        clients={clients}
        selectedItem={movementTargetItem}
        initialType={movementType}
        onConfirmMovement={(movement) => {
          onStockMovement(movement);
          if (movement.type === 'exit') {
            onToast(
              'success',
              'Baixa de Estoque Realizada!',
              `Baixa de ${movement.quantity} unidade(s) de ${movement.itemName} realizada com sucesso. Saldo restante: ${movement.newQuantity} un.`
            );
          } else {
            onToast(
              'success',
              'Entrada de Estoque Realizada!',
              `Entrada de ${movement.quantity} unidade(s) de ${movement.itemName} adicionada com sucesso. Saldo atualizado: ${movement.newQuantity} un.`
            );
          }
        }}
        onToast={onToast}
      />

      {/* DRAWER / MODAL: AUDITORIA E HISTÓRICO DE MOVIMENTAÇÕES */}
      {isHistoryDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-100">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/40 rounded-xl text-indigo-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Histórico de Movimentações de Estoque
                  </h3>
                  <p className="text-xs text-slate-400">
                    Registro de auditoria com todas as baixas e entradas de equipamentos.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {stockMovements.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Nenhuma movimentação registrada até o momento.
                </div>
              ) : (
                stockMovements.map((mov) => {
                  const isExit = mov.type === 'exit';
                  const dateFormatted = new Date(mov.timestamp).toLocaleString('pt-BR');

                  return (
                    <div
                      key={mov.id}
                      className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
                        isExit
                          ? 'bg-slate-950/70 border-rose-950/60 hover:border-rose-800'
                          : 'bg-slate-950/70 border-emerald-950/60 hover:border-emerald-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg border shrink-0 mt-0.5 ${
                            isExit
                              ? 'bg-rose-950 text-rose-400 border-rose-800'
                              : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          }`}
                        >
                          {isExit ? (
                            <ArrowDownRight className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                                isExit
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              }`}
                            >
                              {isExit ? 'Baixa (Saída)' : 'Entrada (+ Volume)'}
                            </span>
                            <span className="font-extrabold text-white text-sm">
                              {mov.itemName}
                            </span>
                          </div>

                          <div className="text-slate-300 font-semibold mt-1">
                            Motivo: <strong className="text-amber-400">{mov.reason}</strong>
                          </div>

                          {mov.clientName && (
                            <div className="text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <User className="w-3 h-3 text-slate-500" />
                              <span>Cliente Vinculado: <strong className="text-slate-200">{mov.clientName}</strong></span>
                            </div>
                          )}

                          {mov.technician && (
                            <div className="text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <Wrench className="w-3 h-3 text-slate-500" />
                              <span>Responsável: <strong className="text-slate-300">{mov.technician}</strong></span>
                            </div>
                          )}

                          {mov.notes && (
                            <p className="text-slate-400 text-[11px] italic mt-1 bg-slate-900/60 p-1.5 rounded border border-slate-800">
                              "{mov.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Quantity & Timestamp */}
                      <div className="text-left md:text-right shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-800">
                        <div
                          className={`text-xl font-black font-mono ${
                            isExit ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {isExit ? `-${mov.quantity}` : `+${mov.quantity}`} un
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Saldo: {mov.previousQuantity} &rarr; <strong>{mov.newQuantity} un</strong>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center md:justify-end gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          <span>{dateFormatted}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Fechar Histórico
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Excluir Dispositivo?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Esta ação removerá o equipamento do catálogo de estoque. Tem certeza?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteDevice(deleteConfirmId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-900/30 cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM CLEAR ALL INVENTORY MODAL */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-rose-800/60 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-950/80 border border-rose-800/80 rounded-xl text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Limpar Todo o Estoque?</h3>
                <p className="text-xs text-rose-300">Esta ação apagará todos os dispositivos cadastrados</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Tem certeza de que deseja limpar todos os itens do estoque? Todos os dispositivos físicos e seus saldos serão removidos do almoxarifado.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsClearConfirmOpen(false);
                  if (onClearAllInventory) {
                    onClearAllInventory();
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                Sim, Limpar Estoque
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
