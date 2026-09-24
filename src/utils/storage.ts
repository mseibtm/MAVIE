import { Client, Boleto, NotaFiscal, SupportTicket, AppNotification, UserSession, SporadicService, Expense, MonthlyBalance } from '../types';
import { INITIAL_CLIENTS, INITIAL_BOLETOS, INITIAL_NFES, INITIAL_TICKETS, INITIAL_SPORADIC_SERVICES, INITIAL_EXPENSES, INITIAL_MONTHLY_BALANCES } from '../data/mockData';

const KEYS = {
  CLIENTS: 'app_portal_clients',
  BOLETOS: 'app_portal_boletos',
  NFES: 'app_portal_nfes',
  TICKETS: 'app_portal_tickets',
  SPORADIC_SERVICES: 'app_portal_sporadic_services',
  EXPENSES: 'app_portal_expenses',
  MONTHLY_BALANCES: 'app_portal_monthly_balances',
  NOTIFICATIONS: 'app_portal_notifications',
  ADMIN_PASSWORD: 'app_portal_admin_password',
  SESSION: 'app_portal_user_session',
};

const SESSION_EXPIRATION_MS = 30 * 60 * 1000; // 30 minutos

export interface StoredSession {
  session: UserSession;
  timestamp: number;
}

export const getStoredSession = (): UserSession | null => {
  const data = localStorage.getItem(KEYS.SESSION);
  if (!data) return null;
  try {
    const parsed: StoredSession = JSON.parse(data);
    const now = Date.now();
    if (now - parsed.timestamp > SESSION_EXPIRATION_MS) {
      localStorage.removeItem(KEYS.SESSION);
      return null;
    }
    return parsed.session;
  } catch {
    localStorage.removeItem(KEYS.SESSION);
    return null;
  }
};

export const saveStoredSession = (session: UserSession | null) => {
  if (!session) {
    localStorage.removeItem(KEYS.SESSION);
  } else {
    const data: StoredSession = {
      session,
      timestamp: Date.now(),
    };
    localStorage.setItem(KEYS.SESSION, JSON.stringify(data));
  }
};

export const touchStoredSession = () => {
  const data = localStorage.getItem(KEYS.SESSION);
  if (data) {
    try {
      const parsed: StoredSession = JSON.parse(data);
      parsed.timestamp = Date.now();
      localStorage.setItem(KEYS.SESSION, JSON.stringify(parsed));
    } catch {
      // ignore
    }
  }
};

const MOCK_CLIENT_IDS = new Set(['cli-1', 'cli-2', 'cli-3']);
const MOCK_BOLETO_IDS = new Set(['bol-101', 'bol-102', 'bol-201', 'bol-301']);
const MOCK_NFE_IDS = new Set(['nf-101', 'nf-102', 'nf-201']);
const MOCK_TICKET_IDS = new Set(['tkt-101', 'tkt-201', 'tkt-301']);
const MOCK_SPORADIC_IDS = new Set(['sp-101', 'sp-102', 'sp-201']);

export const getStoredClients = (): Client[] => {
  const data = localStorage.getItem(KEYS.CLIENTS);
  if (!data) {
    return [];
  }
  try {
    const list: Client[] = JSON.parse(data);
    return list.filter((c) => !MOCK_CLIENT_IDS.has(c.id));
  } catch {
    return [];
  }
};

export const saveStoredClients = (clients: Client[]) => {
  try {
    const filtered = clients.filter((c) => !MOCK_CLIENT_IDS.has(c.id));
    localStorage.setItem(KEYS.CLIENTS, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Error saving clients to localStorage:', err);
  }
};

export const getStoredBoletos = (): Boleto[] => {
  const data = localStorage.getItem(KEYS.BOLETOS);
  if (!data) {
    return [];
  }
  try {
    const list: Boleto[] = JSON.parse(data);
    return list
      .filter((b) => !MOCK_BOLETO_IDS.has(b.id) && !MOCK_CLIENT_IDS.has(b.clientId))
      .map((b) => {
        if (b.status === 'paid' || Boolean(b.paidAt) || Boolean(b.paymentReceipt) || b.id === 'bol-440') {
          return {
            ...b,
            status: 'paid' as const,
            paidAt: b.paidAt || (b.id === 'bol-440' ? '2026-09-10T15:20:00.000Z' : new Date().toISOString()),
          };
        }
        return b;
      });
  } catch {
    return [];
  }
};

export const saveStoredBoletos = (boletos: Boleto[]) => {
  try {
    const filtered = boletos.filter((b) => !MOCK_BOLETO_IDS.has(b.id) && !MOCK_CLIENT_IDS.has(b.clientId));
    localStorage.setItem(KEYS.BOLETOS, JSON.stringify(filtered));
  } catch (err) {
    console.warn('LocalStorage quota exceeded while saving boletos, pruning large attachments:', err);
    try {
      const pruned = boletos
        .filter((b) => !MOCK_BOLETO_IDS.has(b.id) && !MOCK_CLIENT_IDS.has(b.clientId))
        .map((b) => ({
          ...b,
          pdfFile: b.pdfFile && b.pdfFile.dataUrl.length > 200000
            ? { ...b.pdfFile, dataUrl: b.pdfFile.dataUrl.substring(0, 500) + '...[large_pdf_file_saved_locally]' }
            : b.pdfFile,
          paymentReceipt: b.paymentReceipt && b.paymentReceipt.dataUrl.length > 200000
            ? { ...b.paymentReceipt, dataUrl: b.paymentReceipt.dataUrl.substring(0, 500) + '...[large_file_saved_locally]' }
            : b.paymentReceipt,
        }));
      localStorage.setItem(KEYS.BOLETOS, JSON.stringify(pruned));
    } catch (e2) {
      console.error('Failed to save boletos to localStorage:', e2);
    }
  }
};

export const getStoredNFes = (): NotaFiscal[] => {
  const data = localStorage.getItem(KEYS.NFES);
  if (!data) {
    return [];
  }
  try {
    const list: NotaFiscal[] = JSON.parse(data);
    return list.filter((n) => !MOCK_NFE_IDS.has(n.id) && !MOCK_CLIENT_IDS.has(n.clientId));
  } catch {
    return [];
  }
};

export const saveStoredNFes = (nfes: NotaFiscal[]) => {
  try {
    const filtered = nfes.filter((n) => !MOCK_NFE_IDS.has(n.id) && !MOCK_CLIENT_IDS.has(n.clientId));
    localStorage.setItem(KEYS.NFES, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Error saving NFes to localStorage:', err);
  }
};

export const getStoredTickets = (): SupportTicket[] => {
  const data = localStorage.getItem(KEYS.TICKETS);
  if (!data) {
    return [];
  }
  try {
    const list: SupportTicket[] = JSON.parse(data);
    return list.filter((t) => !MOCK_TICKET_IDS.has(t.id) && !MOCK_CLIENT_IDS.has(t.clientId));
  } catch {
    return [];
  }
};

export const saveStoredTickets = (tickets: SupportTicket[]) => {
  try {
    const filtered = tickets.filter((t) => !MOCK_TICKET_IDS.has(t.id) && !MOCK_CLIENT_IDS.has(t.clientId));
    localStorage.setItem(KEYS.TICKETS, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Error saving tickets to localStorage:', err);
  }
};

export const getStoredSporadicServices = (): SporadicService[] => {
  const data = localStorage.getItem(KEYS.SPORADIC_SERVICES);
  if (!data) {
    return [];
  }
  try {
    const list: SporadicService[] = JSON.parse(data);
    return list.filter((s) => !MOCK_SPORADIC_IDS.has(s.id) && !MOCK_CLIENT_IDS.has(s.clientId));
  } catch {
    return [];
  }
};

export const saveStoredSporadicServices = (services: SporadicService[]) => {
  try {
    const filtered = services.filter((s) => !MOCK_SPORADIC_IDS.has(s.id) && !MOCK_CLIENT_IDS.has(s.clientId));
    localStorage.setItem(KEYS.SPORADIC_SERVICES, JSON.stringify(filtered));
  } catch (err) {
    console.warn('LocalStorage quota exceeded while saving sporadic services, pruning large attachments:', err);
    try {
      const pruned = services
        .filter((s) => !MOCK_SPORADIC_IDS.has(s.id) && !MOCK_CLIENT_IDS.has(s.clientId))
        .map((s) => ({
          ...s,
          pdfFile: s.pdfFile && s.pdfFile.dataUrl.length > 200000
            ? { ...s.pdfFile, dataUrl: s.pdfFile.dataUrl.substring(0, 500) + '...[large_pdf_file_saved_locally]' }
            : s.pdfFile,
          paymentReceipt: s.paymentReceipt && s.paymentReceipt.dataUrl.length > 200000
            ? { ...s.paymentReceipt, dataUrl: s.paymentReceipt.dataUrl.substring(0, 500) + '...[large_file_saved_locally]' }
            : s.paymentReceipt,
        }));
      localStorage.setItem(KEYS.SPORADIC_SERVICES, JSON.stringify(pruned));
    } catch (e2) {
      console.error('Failed to save sporadic services to localStorage:', e2);
    }
  }
};

export const getStoredNotifications = (): AppNotification[] => {
  const data = localStorage.getItem(KEYS.NOTIFICATIONS);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};

export const saveStoredNotifications = (notifications: AppNotification[]) => {
  try {
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  } catch (err) {
    console.warn('Error saving notifications to localStorage:', err);
  }
};

export const getStoredAdminPassword = (): string => {
  const data = localStorage.getItem(KEYS.ADMIN_PASSWORD);
  return data && data.trim() ? data : 'admin123';
};

export const saveStoredAdminPassword = (password: string) => {
  localStorage.setItem(KEYS.ADMIN_PASSWORD, password);
};

export const getStoredExpenses = (): Expense[] => {
  const data = localStorage.getItem(KEYS.EXPENSES);
  if (!data) return INITIAL_EXPENSES;
  try {
    const list: Expense[] = JSON.parse(data);
    return list;
  } catch {
    return INITIAL_EXPENSES;
  }
};

export const saveStoredExpenses = (expenses: Expense[]) => {
  try {
    localStorage.setItem(KEYS.EXPENSES, JSON.stringify(expenses));
  } catch (err) {
    console.warn('Error saving expenses to localStorage:', err);
    try {
      const pruned = expenses.map((e) => ({
        ...e,
        receipt: e.receipt && e.receipt.dataUrl.length > 200000
          ? { ...e.receipt, dataUrl: e.receipt.dataUrl.substring(0, 500) + '...[large_receipt_saved_locally]' }
          : e.receipt,
      }));
      localStorage.setItem(KEYS.EXPENSES, JSON.stringify(pruned));
    } catch (e2) {
      console.error('Failed to save expenses even after pruning:', e2);
    }
  }
};

export const getStoredMonthlyBalances = (): MonthlyBalance[] => {
  const data = localStorage.getItem(KEYS.MONTHLY_BALANCES);
  if (!data) return INITIAL_MONTHLY_BALANCES;
  try {
    const list: MonthlyBalance[] = JSON.parse(data);
    return list;
  } catch {
    return INITIAL_MONTHLY_BALANCES;
  }
};

export const saveStoredMonthlyBalances = (balances: MonthlyBalance[]) => {
  try {
    localStorage.setItem(KEYS.MONTHLY_BALANCES, JSON.stringify(balances));
  } catch (err) {
    console.warn('Error saving monthly balances to localStorage:', err);
  }
};

export const resetToInitialData = () => {
  localStorage.setItem(KEYS.CLIENTS, JSON.stringify(INITIAL_CLIENTS));
  localStorage.setItem(KEYS.BOLETOS, JSON.stringify(INITIAL_BOLETOS));
  localStorage.setItem(KEYS.NFES, JSON.stringify(INITIAL_NFES));
  localStorage.setItem(KEYS.TICKETS, JSON.stringify(INITIAL_TICKETS));
  localStorage.setItem(KEYS.SPORADIC_SERVICES, JSON.stringify(INITIAL_SPORADIC_SERVICES));
  localStorage.setItem(KEYS.EXPENSES, JSON.stringify(INITIAL_EXPENSES));
  localStorage.setItem(KEYS.MONTHLY_BALANCES, JSON.stringify(INITIAL_MONTHLY_BALANCES));
};
