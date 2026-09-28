import { Client, Boleto, NotaFiscal, SupportTicket, AppNotification, UserSession, SporadicService, Expense, MonthlyBalance, PDFAttachment } from '../types';
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
export const MOCK_SPORADIC_IDS = new Set(['sp-1', 'sp-2', 'sp-3', 'sp-101', 'sp-102', 'sp-201']);
export const MOCK_EXPENSE_IDS = new Set(['exp-1', 'exp-2', 'exp-3', 'exp-4', 'exp-5']);
export const MOCK_BALANCE_IDS = new Set(['bal-2026-09', 'bal-2026-08']);

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

export const sanitizeAttachment = (att?: PDFAttachment): PDFAttachment | undefined => {
  if (!att) return undefined;
  if (!att.dataUrl || att.dataUrl.length <= 1500) return att;
  return {
    ...att,
    dataUrl: att.dataUrl.substring(0, 100) + '...[large_file_saved_locally]',
    isLargeFile: true,
  };
};

const sanitizeBoleto = (b: Boleto): Boleto => ({
  ...b,
  pdfFile: sanitizeAttachment(b.pdfFile),
  paymentReceipt: sanitizeAttachment(b.paymentReceipt),
});

const sanitizeSporadic = (s: SporadicService): SporadicService => ({
  ...s,
  pdfFile: sanitizeAttachment(s.pdfFile),
  paymentReceipt: sanitizeAttachment(s.paymentReceipt),
});

const sanitizeNfe = (n: NotaFiscal): NotaFiscal => ({
  ...n,
  pdfFile: sanitizeAttachment(n.pdfFile),
});

const sanitizeExpense = (e: Expense): Expense => ({
  ...e,
  receipt: sanitizeAttachment(e.receipt),
});

function safeSetItem<T>(key: string, items: T[], sanitizeFn?: (item: T) => T) {
  try {
    const dataToSave = sanitizeFn ? items.map(sanitizeFn) : items;
    localStorage.setItem(key, JSON.stringify(dataToSave));
  } catch {
    try {
      // Aggressive pruning: strip dataUrl from attachments completely to fit in quota
      const stripped = items.map((item: any) => {
        if (item && typeof item === 'object') {
          const copy = { ...item };
          if (copy.pdfFile) copy.pdfFile = { ...copy.pdfFile, dataUrl: '' };
          if (copy.paymentReceipt) copy.paymentReceipt = { ...copy.paymentReceipt, dataUrl: '' };
          if (copy.receipt) copy.receipt = { ...copy.receipt, dataUrl: '' };
          return copy;
        }
        return item;
      });
      localStorage.setItem(key, JSON.stringify(stripped));
    } catch {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }
  }
}

export const cleanupLocalStorageQuota = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const keysToCheck = [KEYS.BOLETOS, KEYS.SPORADIC_SERVICES, KEYS.NFES, KEYS.EXPENSES];
    for (const key of keysToCheck) {
      const raw = localStorage.getItem(key);
      if (raw && (raw.length > 100000 || raw.includes('data:application/pdf') || raw.includes('data:image/'))) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const sanitized = parsed.map((item: any) => {
              if (item && typeof item === 'object') {
                const copy = { ...item };
                if (copy.pdfFile) copy.pdfFile = sanitizeAttachment(copy.pdfFile);
                if (copy.paymentReceipt) copy.paymentReceipt = sanitizeAttachment(copy.paymentReceipt);
                if (copy.receipt) copy.receipt = sanitizeAttachment(copy.receipt);
                return copy;
              }
              return item;
            });
            localStorage.setItem(key, JSON.stringify(sanitized));
          }
        } catch {
          localStorage.removeItem(key);
        }
      }
    }
  } catch {
    // ignore
  }
};

// Immediately execute cleanup to free up quota
cleanupLocalStorageQuota();

export const saveStoredClients = (clients: Client[]) => {
  const filtered = clients.filter((c) => !MOCK_CLIENT_IDS.has(c.id));
  safeSetItem(KEYS.CLIENTS, filtered);
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
  const filtered = boletos.filter((b) => !MOCK_BOLETO_IDS.has(b.id) && !MOCK_CLIENT_IDS.has(b.clientId));
  safeSetItem(KEYS.BOLETOS, filtered, sanitizeBoleto);
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
  const filtered = nfes.filter((n) => !MOCK_NFE_IDS.has(n.id) && !MOCK_CLIENT_IDS.has(n.clientId));
  safeSetItem(KEYS.NFES, filtered, sanitizeNfe);
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
  const filtered = tickets.filter((t) => !MOCK_TICKET_IDS.has(t.id) && !MOCK_CLIENT_IDS.has(t.clientId));
  safeSetItem(KEYS.TICKETS, filtered);
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
  const filtered = services.filter((s) => !MOCK_SPORADIC_IDS.has(s.id) && !MOCK_CLIENT_IDS.has(s.clientId));
  safeSetItem(KEYS.SPORADIC_SERVICES, filtered, sanitizeSporadic);
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
  safeSetItem(KEYS.NOTIFICATIONS, notifications);
};

export const getStoredAdminPassword = (): string => {
  const data = localStorage.getItem(KEYS.ADMIN_PASSWORD);
  return data && data.trim() ? data : 'admin123';
};

export const saveStoredAdminPassword = (password: string) => {
  try {
    localStorage.setItem(KEYS.ADMIN_PASSWORD, password);
  } catch {
    // ignore
  }
};

export const getStoredExpenses = (): Expense[] => {
  const data = localStorage.getItem(KEYS.EXPENSES);
  if (!data) return [];
  try {
    const list: Expense[] = JSON.parse(data);
    return list.filter((e) => !MOCK_EXPENSE_IDS.has(e.id));
  } catch {
    return [];
  }
};

export const saveStoredExpenses = (expenses: Expense[]) => {
  const filtered = expenses.filter((e) => !MOCK_EXPENSE_IDS.has(e.id));
  safeSetItem(KEYS.EXPENSES, filtered, sanitizeExpense);
};

export const getStoredMonthlyBalances = (): MonthlyBalance[] => {
  const data = localStorage.getItem(KEYS.MONTHLY_BALANCES);
  if (!data) return [];
  try {
    const list: MonthlyBalance[] = JSON.parse(data);
    return list.filter((b) => !MOCK_BALANCE_IDS.has(b.id));
  } catch {
    return [];
  }
};

export const saveStoredMonthlyBalances = (balances: MonthlyBalance[]) => {
  const filtered = balances.filter((b) => !MOCK_BALANCE_IDS.has(b.id));
  safeSetItem(KEYS.MONTHLY_BALANCES, filtered);
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
