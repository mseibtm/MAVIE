import { Client, Boleto, NotaFiscal, SupportTicket, AppNotification, UserSession } from '../types';
import { INITIAL_CLIENTS, INITIAL_BOLETOS, INITIAL_NFES, INITIAL_TICKETS } from '../data/mockData';

const KEYS = {
  CLIENTS: 'app_portal_clients',
  BOLETOS: 'app_portal_boletos',
  NFES: 'app_portal_nfes',
  TICKETS: 'app_portal_tickets',
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

export const getStoredClients = (): Client[] => {
  const data = localStorage.getItem(KEYS.CLIENTS);
  if (!data) {
    localStorage.setItem(KEYS.CLIENTS, JSON.stringify(INITIAL_CLIENTS));
    return INITIAL_CLIENTS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_CLIENTS;
  }
};

export const saveStoredClients = (clients: Client[]) => {
  localStorage.setItem(KEYS.CLIENTS, JSON.stringify(clients));
};

export const getStoredBoletos = (): Boleto[] => {
  const data = localStorage.getItem(KEYS.BOLETOS);
  if (!data) {
    localStorage.setItem(KEYS.BOLETOS, JSON.stringify(INITIAL_BOLETOS));
    return INITIAL_BOLETOS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_BOLETOS;
  }
};

export const saveStoredBoletos = (boletos: Boleto[]) => {
  localStorage.setItem(KEYS.BOLETOS, JSON.stringify(boletos));
};

export const getStoredNFes = (): NotaFiscal[] => {
  const data = localStorage.getItem(KEYS.NFES);
  if (!data) {
    localStorage.setItem(KEYS.NFES, JSON.stringify(INITIAL_NFES));
    return INITIAL_NFES;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_NFES;
  }
};

export const saveStoredNFes = (nfes: NotaFiscal[]) => {
  localStorage.setItem(KEYS.NFES, JSON.stringify(nfes));
};

export const getStoredTickets = (): SupportTicket[] => {
  const data = localStorage.getItem(KEYS.TICKETS);
  if (!data) {
    localStorage.setItem(KEYS.TICKETS, JSON.stringify(INITIAL_TICKETS));
    return INITIAL_TICKETS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_TICKETS;
  }
};

export const saveStoredTickets = (tickets: SupportTicket[]) => {
  localStorage.setItem(KEYS.TICKETS, JSON.stringify(tickets));
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
  localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));
};

export const getStoredAdminPassword = (): string => {
  const data = localStorage.getItem(KEYS.ADMIN_PASSWORD);
  return data && data.trim() ? data : 'admin123';
};

export const saveStoredAdminPassword = (password: string) => {
  localStorage.setItem(KEYS.ADMIN_PASSWORD, password);
};

export const resetToInitialData = () => {
  localStorage.setItem(KEYS.CLIENTS, JSON.stringify(INITIAL_CLIENTS));
  localStorage.setItem(KEYS.BOLETOS, JSON.stringify(INITIAL_BOLETOS));
  localStorage.setItem(KEYS.NFES, JSON.stringify(INITIAL_NFES));
  localStorage.setItem(KEYS.TICKETS, JSON.stringify(INITIAL_TICKETS));
};
