export const COMPANY_WHATSAPP_NUMBER = '5549988876236';
export const COMPANY_WHATSAPP_FORMATTED = '+55 49 98887-6236';

export const CLOSURE_REASONS = [
  { id: 'boleto_segunda_via', label: 'Emissão de 2ª Via de Boleto', color: '#0EA5E9' }, // Sky
  { id: 'prorrogacao_vencimento', label: 'Prorrogação de Vencimento', color: '#F59E0B' }, // Amber
  { id: 'duvida_nfe', label: 'Dúvidas em Nota Fiscal (NF-e)', color: '#8B5CF6' }, // Purple
  { id: 'alteracao_cadastral', label: 'Alteração Cadastral / Senha', color: '#10B981' }, // Emerald
  { id: 'negociacao_financeira', label: 'Acordo / Negociação Financeira', color: '#EC4899' }, // Pink
  { id: 'suporte_tecnico', label: 'Suporte Técnico do Portal', color: '#6366F1' }, // Indigo
  { id: 'outros', label: 'Outros Assuntos', color: '#64748B' }, // Slate
] as const;

export type ClosureReason = typeof CLOSURE_REASONS[number]['id'];
