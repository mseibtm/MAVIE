import React, { useState } from 'react';
import { TrendingUp, DollarSign, AlertTriangle, CheckCircle2, Clock, Users, ArrowUpRight, PlusCircle, RefreshCw, BarChart2, ShieldAlert } from 'lucide-react';
import { Client, Boleto } from '../../types';

interface AdminFinancialViewProps {
  clients: Client[];
  boletos: Boleto[];
  onAddBoleto: (boleto: Omit<Boleto, 'id' | 'createdAt'>) => void;
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const AdminFinancialView: React.FC<AdminFinancialViewProps> = ({
  clients,
  boletos,
  onAddBoleto,
  onToast,
}) => {
  const [filterPeriod, setFilterPeriod] = useState<'current' | 'all'>('current');

  // Active clients
  const activeClients = clients.filter(c => c.status === 'active');
  
  // Total Recurrent Revenue (MRR)
  const mrr = activeClients.reduce((acc, c) => acc + (c.monthlyFee || 0), 0);
  const arr = mrr * 12;

  // Realized / Paid Revenue
  const totalPaid = boletos
    .filter(b => b.status === 'paid')
    .reduce((acc, b) => acc + b.amount, 0);

  // Pending Revenue
  const totalPending = boletos
    .filter(b => b.status === 'pending')
    .reduce((acc, b) => acc + b.amount, 0);

  // Overdue Revenue (Inadimplência)
  const overdueBoletos = boletos.filter(b => b.status === 'overdue');
  const totalOverdue = overdueBoletos.reduce((acc, b) => acc + b.amount, 0);

  // Total expected revenue from current boletos
  const totalBoletoValue = totalPaid + totalPending + totalOverdue;
  const defaultRate = totalBoletoValue > 0 ? (totalOverdue / totalBoletoValue) * 100 : 0;

  // Average revenue per client (ARPU)
  const arpu = activeClients.length > 0 ? mrr / activeClients.length : 0;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Auto batch generation of boletos for current month
  const handleBatchGenerateBoletos = () => {
    let generatedCount = 0;
    const currentMonthYear = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const dueDate = new Date();
    dueDate.setDate(15); // Default due on 15th
    const dueDateStr = dueDate.toISOString().split('T')[0];

    activeClients.forEach((client) => {
      // Check if client already has a pending boleto for this month
      const hasBoleto = boletos.some(b => b.clientId === client.id && b.status === 'pending');
      if (!hasBoleto && client.monthlyFee > 0) {
        onAddBoleto({
          clientId: client.id,
          description: `Mensalidade Contratada Mavie Solution — ${currentMonthYear}`,
          amount: client.monthlyFee,
          dueDate: dueDateStr,
          status: 'pending',
          lineDigitable: '34191.80007 01234.567890 12345.678901 8 91230000' + Math.floor(client.monthlyFee * 100),
          pixKey: `00020126580014br.gov.bcb.pix0136${Math.random().toString(36).substring(2)}5204000053039865407${client.monthlyFee}5802BR5915MAVIE SOLUTION6009SAO PAULO`,
          barcode: '3419180007012345678901234567890189123' + Math.floor(client.monthlyFee * 100),
        });
        generatedCount++;
      }
    });

    if (generatedCount > 0) {
      onToast('success', 'Lote de Boletos Gerado!', `${generatedCount} novos boletos recorrentes foram criados para os clientes ativos.`);
    } else {
      onToast('info', 'Boletos em dia', 'Todos os clientes ativos já possuem boletos pendentes emitidos.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Previsão & DRE Financeiro</span>
          </div>
          <h1 className="text-2xl font-black text-white">Previsão de Faturamento & Inadimplência</h1>
          <p className="text-xs text-slate-400 mt-1">
            Métricas de receita recorrente mensal (MRR), faturamento realizado, boletos em aberto e taxa de inadimplência.
          </p>
        </div>

        <button
          onClick={handleBatchGenerateBoletos}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Emitir Boletos Recorrentes (Lote)</span>
        </button>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Previsão Mensal (MRR)</span>
            <div className="p-2 bg-emerald-950 border border-emerald-800 rounded-xl text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{formatCurrency(mrr)}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Soma de mensalidades ativas</span>
            <span className="font-bold text-emerald-400">{activeClients.length} clientes</span>
          </div>
        </div>

        {/* ARR (Previsão Anual) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-sky-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Previsão Anual (ARR)</span>
            <div className="p-2 bg-sky-950 border border-sky-800 rounded-xl text-sky-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{formatCurrency(arr)}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Projeção em 12 meses
          </div>
        </div>

        {/* Faturamento Realizado (Recebido) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Faturamento Realizado</span>
            <div className="p-2 bg-emerald-950 border border-emerald-800 rounded-xl text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">{formatCurrency(totalPaid)}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Boletos quitados e confirmados
          </div>
        </div>

        {/* Inadimplência */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Inadimplência (Vencidos)</span>
            <div className="p-2 bg-rose-950 border border-rose-800 rounded-xl text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-400">{formatCurrency(totalOverdue)}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{overdueBoletos.length} boleto(s) em atraso</span>
            <span className="font-mono font-bold text-rose-400">{defaultRate.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Visual Revenue Performance Bar Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Composição do Faturamento Mensal</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Total Emitido: <strong className="text-white">{formatCurrency(totalBoletoValue)}</strong>
          </span>
        </div>

        {/* Stacked Progress Bar */}
        <div className="space-y-2">
          <div className="w-full h-5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
            {totalBoletoValue > 0 ? (
              <>
                <div
                  style={{ width: `${(totalPaid / totalBoletoValue) * 100}%` }}
                  className="bg-emerald-500 h-full transition-all"
                  title={`Recebido: ${formatCurrency(totalPaid)}`}
                />
                <div
                  style={{ width: `${(totalPending / totalBoletoValue) * 100}%` }}
                  className="bg-amber-500 h-full transition-all"
                  title={`A Vencer: ${formatCurrency(totalPending)}`}
                />
                <div
                  style={{ width: `${(totalOverdue / totalBoletoValue) * 100}%` }}
                  className="bg-rose-500 h-full transition-all"
                  title={`Inadimplente: ${formatCurrency(totalOverdue)}`}
                />
              </>
            ) : (
              <div className="w-full h-full bg-slate-800 text-slate-500 text-[10px] flex items-center justify-center">
                Nenhum boleto registrado
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs pt-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shrink-0"></span>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Pago / Recebido</span>
                <span className="font-bold text-white">{formatCurrency(totalPaid)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shrink-0"></span>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">A Vencer (Pendente)</span>
                <span className="font-bold text-white">{formatCurrency(totalPending)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shrink-0"></span>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Inadimplente</span>
                <span className="font-bold text-rose-400">{formatCurrency(totalOverdue)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Client Financial Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Relatório Individual por Cliente</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Status de pagamentos e histórico financeiro de cada contrato ativo.
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-950 px-3 py-1 rounded-xl border border-emerald-800">
            Ticket Médio: {formatCurrency(arpu)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-4">Cliente / Razão Social</th>
                <th className="p-4">CPF</th>
                <th className="p-4">Mensalidade Contratada</th>
                <th className="p-4">Status Boletos</th>
                <th className="p-4">Situação Financeira</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {clients.map((client) => {
                const clientBoletos = boletos.filter(b => b.clientId === client.id);
                const hasOverdue = clientBoletos.some(b => b.status === 'overdue');
                const hasPending = clientBoletos.some(b => b.status === 'pending');
                const hasPaid = clientBoletos.some(b => b.status === 'paid');

                return (
                  <tr key={client.id} className="hover:bg-slate-850/60 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white">{client.name}</div>
                      {client.company && (
                        <div className="text-[11px] text-slate-400">{client.company}</div>
                      )}
                    </td>

                    <td className="p-4 font-mono text-slate-300 font-semibold">
                      {client.cpf}
                    </td>

                    <td className="p-4 font-mono font-black text-amber-400 text-sm">
                      {formatCurrency(client.monthlyFee || 0)}
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {clientBoletos.length === 0 ? (
                          <span className="text-slate-500 italic">Nenhum boleto</span>
                        ) : (
                          clientBoletos.map(b => (
                            <span
                              key={b.id}
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-md font-mono ${
                                b.status === 'paid'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : b.status === 'pending'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-rose-950 text-rose-300 border border-rose-800'
                              }`}
                              title={`Vencimento: ${b.dueDate}`}
                            >
                              {b.status === 'paid' ? 'Pago' : b.status === 'pending' ? 'Pendente' : 'Vencido'}
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    <td className="p-4">
                      {hasOverdue ? (
                        <span className="px-2.5 py-1 text-[10px] font-bold rounded-xl bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1 w-fit">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                          Inadimplente (Pendências)
                        </span>
                      ) : hasPending ? (
                        <span className="px-2.5 py-1 text-[10px] font-bold rounded-xl bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1 w-fit">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          Aguardando Pagamento
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-[10px] font-bold rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Em dia (Sem pendências)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
