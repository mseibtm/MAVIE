export type Role = 'client' | 'admin';

export interface PDFAttachment {
  name: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
}

export interface Client {
  id: string;
  name: string;
  cpf: string;
  email: string;
  phone: string;
  company?: string;
  address?: string;
  notes?: string;
  monthlyFee: number; // Mensalidade recorrente em R$
  password?: string;   // Senha de acesso individual LGPD
  status: 'active' | 'inactive';
  createdAt: string;
}

export type BoletoStatus = 'pending' | 'paid' | 'overdue';

export interface Boleto {
  id: string;
  clientId: string;
  description: string;
  amount: number;
  dueDate: string;
  status: BoletoStatus;
  lineDigitable: string;
  pixKey: string;
  barcode: string;
  pdfFile?: PDFAttachment;
  paymentReceipt?: PDFAttachment;
  paidAt?: string;
  createdAt: string;
}

export type NFStatus = 'issued' | 'cancelled';

export interface NotaFiscal {
  id: string;
  clientId: string;
  number: string;
  series: string;
  issueDate: string;
  amount: number;
  description: string;
  accessKey: string;
  status: NFStatus;
  pdfFile?: PDFAttachment;
  createdAt: string;
}

export type TicketCategory = 'financial' | 'technical' | 'nfe' | 'general';
export type TicketPriority = 'low' | 'medium' | 'high';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface TicketMessage {
  id: string;
  senderType: 'client' | 'admin';
  senderName: string;
  message: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  clientId: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
  // Campos de encerramento de atendimento e WhatsApp
  closureReason?: string;
  closureComment?: string;
  whatsappScreenshot?: string;
  closedAt?: string;
  closedBy?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'boleto_created' | 'due_date' | 'overdue' | 'system';
  boletoId?: string;
  clientId?: string;
  read: boolean;
  timestamp: string;
}

export interface UserSession {
  role: Role;
  client?: Client;
}
