import { Boleto, Client, AppNotification, UserSession } from '../types';
import { getStoredNotifications, saveStoredNotifications, saveStoredBoletos } from './storage';
import { saveNotificationToFirestore, deleteNotificationFromFirestore, saveBoletoToFirestore } from '../lib/firestoreSync';

/**
 * Request permission for Browser Push Notifications
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Este navegador não suporta Notificações Push.');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Erro ao solicitar permissão de notificação:', err);
    return 'denied';
  }
}

/**
 * Send browser native Push Notification
 */
export function sendNativePush(title: string, body: string, tag?: string) {
  if (!('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'default') {
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') {
        try {
          new Notification(title, {
            body,
            tag: tag || `mavie-notif-${Date.now()}`,
            requireInteraction: false,
          });
        } catch (e) {
          console.warn('Erro ao criar notificação nativa:', e);
        }
      }
    });
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  try {
    const options: NotificationOptions = {
      body,
      tag: tag || `mavie-notif-${Date.now()}`,
      requireInteraction: false,
    };
    new Notification(title, options);
  } catch (e) {
    console.warn('Erro ao enviar notificação push nativa:', e);
  }
}

/**
 * Trigger notification when a new boleto is registered.
 * Strictly guarantees that browser push notifications are NOT sent to other clients.
 */
export function notifyNewBoletoCreated(
  boleto: Boleto,
  client?: Client,
  currentSession?: UserSession | null
): AppNotification {
  const clientName = client?.name || 'Cliente';
  const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(boleto.amount);
  
  const [year, month, day] = boleto.dueDate.split('-');
  const formattedDueDate = `${day}/${month}/${year}`;

  const title = 'Novo Boleto Cadastrado';
  const body = `Boleto #${boleto.id} para ${clientName} no valor de ${formattedAmount} com vencimento em ${formattedDueDate}.`;

  // Strict push notification delivery: ONLY send native push to:
  // 1. Admin who created the boleto
  // 2. The specific client this boleto belongs to (if currently logged in)
  // NEVER send push to visitors on login page or to other clients!
  const isAuthorizedClient = currentSession?.role === 'client' && currentSession.client?.id === boleto.clientId;
  const isAuthorizedAdmin = currentSession?.role === 'admin';

  if (isAuthorizedClient || isAuthorizedAdmin) {
    const pushBody = isAuthorizedClient
      ? `Novo boleto #${boleto.id} no valor de ${formattedAmount} com vencimento em ${formattedDueDate}.`
      : body;
    sendNativePush(`Mavie Solution - ${title}`, pushBody, `boleto-create-${boleto.id}`);
  }

  // 2. Create in-app notification record with explicit clientId scope
  const newNotif: AppNotification = {
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title,
    body,
    type: 'boleto_created',
    boletoId: boleto.id,
    clientId: boleto.clientId,
    targetRole: 'all',
    read: false,
    timestamp: new Date().toISOString(),
  };

  const current = getStoredNotifications();
  const updated = [newNotif, ...current];
  saveStoredNotifications(updated);
  saveNotificationToFirestore(newNotif);

  return newNotif;
}

/**
 * Clean up notifications that belong to deleted clients or deleted boletos,
 * and fix any misaligned clientId references to ensure total client isolation.
 */
export function cleanupOrphanNotifications(
  notifications: AppNotification[],
  clients: Client[],
  boletos: Boleto[]
): AppNotification[] {
  // CRITICAL SAFETY GUARD: If clients have not loaded into state yet, do NOT delete any notifications!
  if (!clients || clients.length === 0) {
    return notifications;
  }

  const validClientIds = new Set(clients.map((c) => c.id));
  const boletoMap = new Map(boletos.map((b) => [b.id, b]));

  const orphanIds: string[] = [];
  const cleaned: AppNotification[] = [];

  for (const n of notifications) {
    // If notification has a boletoId, guarantee its clientId matches the actual boleto's clientId
    if (n.boletoId) {
      const boleto = boletoMap.get(n.boletoId);
      if (!boleto) {
        // Boleto was deleted, purge notification
        orphanIds.push(n.id);
        continue;
      }
      if (n.clientId !== boleto.clientId) {
        // Fix misaligned clientId
        n.clientId = boleto.clientId;
        saveNotificationToFirestore(n);
      }
    }

    // If notification has a clientId, check if client still exists
    if (n.clientId && !validClientIds.has(n.clientId)) {
      orphanIds.push(n.id);
      continue;
    }

    cleaned.push(n);
  }

  if (orphanIds.length > 0) {
    saveStoredNotifications(cleaned);
    orphanIds.forEach((id) => deleteNotificationFromFirestore(id));
  }

  return cleaned;
}

/**
 * Check boletos for due dates (today or overdue) and trigger notifications.
 * CRITICAL ISOLATION:
 * Browser push notifications are strictly filtered so that clients NEVER receive alerts
 * belonging to other clients.
 */
export function checkAndNotifyDueBoletos(
  boletos: Boleto[],
  clients: Client[],
  currentSession?: UserSession | null
): AppNotification[] {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const rawNotifications = getStoredNotifications();
  // Filter out any orphans first
  const existingNotifications = cleanupOrphanNotifications(rawNotifications, clients, boletos);

  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const validClientIds = new Set(clients.map((c) => c.id));
  const newlyCreatedNotifications: AppNotification[] = [];

  boletos.forEach((boleto) => {
    // Only check unpaid boletos for valid existing clients
    if (boleto.status === 'paid' || !validClientIds.has(boleto.clientId)) return;

    const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(boleto.amount);
    const clientName = clientMap.get(boleto.clientId) || 'Cliente';
    const [bYear, bMonth, bDay] = boleto.dueDate.split('-');
    const formattedDueDate = `${bDay}/${bMonth}/${bYear}`;

    const isDueToday = boleto.dueDate === todayStr;
    const isOverdue = boleto.dueDate < todayStr;

    // Push Notification Isolation Guard:
    // Browser push notification is ONLY permitted if:
    // 1. Current user is Admin
    // 2. Current user is the client who owns this boleto
    // Strictly forbidden when another client is logged in or user is on login screen
    const canSendPushToUser =
      currentSession?.role === 'admin' ||
      (currentSession?.role === 'client' && currentSession.client?.id === boleto.clientId);

    if (isDueToday) {
      // Check if we already notified for this boleto today
      const alreadyNotifiedToday = existingNotifications.some(
        (n) => n.boletoId === boleto.id && n.type === 'due_date' && n.timestamp.startsWith(todayStr)
      );

      if (!alreadyNotifiedToday) {
        const title = 'Boleto Vence Hoje!';
        const body = `Atenção: O boleto #${boleto.id} (${clientName}) no valor de ${formattedAmount} vence hoje (${formattedDueDate}).`;

        if (canSendPushToUser) {
          const pushBody = currentSession?.role === 'client'
            ? `Atenção: Seu boleto #${boleto.id} no valor de ${formattedAmount} vence hoje (${formattedDueDate}).`
            : body;
          sendNativePush(`Mavie Solution - ${title}`, pushBody, `boleto-due-${boleto.id}-${todayStr}`);
        }

        const notif: AppNotification = {
          id: `notif-due-${boleto.id}-${Date.now()}`,
          title,
          body,
          type: 'due_date',
          boletoId: boleto.id,
          clientId: boleto.clientId,
          targetRole: 'all',
          read: false,
          timestamp: new Date().toISOString(),
        };
        newlyCreatedNotifications.push(notif);
        saveNotificationToFirestore(notif);
      }
    } else if (isOverdue) {
      // Check if notified for overdue today
      const alreadyNotifiedOverdue = existingNotifications.some(
        (n) => n.boletoId === boleto.id && n.type === 'overdue' && n.timestamp.startsWith(todayStr)
      );

      if (!alreadyNotifiedOverdue) {
        const title = 'Boleto Em Atraso';
        const body = `Aviso: O boleto #${boleto.id} (${clientName}) de ${formattedAmount} venceu em ${formattedDueDate} e consta pendente.`;

        if (canSendPushToUser) {
          const pushBody = currentSession?.role === 'client'
            ? `Aviso: Seu boleto #${boleto.id} de ${formattedAmount} venceu em ${formattedDueDate} e consta pendente.`
            : body;
          sendNativePush(`Mavie Solution - ${title}`, pushBody, `boleto-overdue-${boleto.id}-${todayStr}`);
        }

        const notif: AppNotification = {
          id: `notif-overdue-${boleto.id}-${Date.now()}`,
          title,
          body,
          type: 'overdue',
          boletoId: boleto.id,
          clientId: boleto.clientId,
          targetRole: 'all',
          read: false,
          timestamp: new Date().toISOString(),
        };
        newlyCreatedNotifications.push(notif);
        saveNotificationToFirestore(notif);
      }
    }
  });

  if (newlyCreatedNotifications.length > 0) {
    const updated = [...newlyCreatedNotifications, ...existingNotifications];
    saveStoredNotifications(updated);
    return updated;
  }

  return existingNotifications;
}

/**
 * Automatically sync boleto statuses based on due date:
 * - If status is not 'paid' and dueDate < todayStr -> status becomes 'overdue'
 * - If status is 'overdue' and dueDate >= todayStr -> status becomes 'pending'
 */
export function syncBoletoStatuses(boletos: Boleto[]): { updatedBoletos: Boleto[]; changedBoletos: Boleto[] } {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const changedBoletos: Boleto[] = [];
  const updatedBoletos = boletos.map((b) => {
    if (b.status === 'paid') return b;

    if (b.dueDate < todayStr && b.status !== 'overdue') {
      const updated = { ...b, status: 'overdue' as const };
      changedBoletos.push(updated);
      return updated;
    }

    if (b.dueDate >= todayStr && b.status === 'overdue') {
      const updated = { ...b, status: 'pending' as const };
      changedBoletos.push(updated);
      return updated;
    }

    return b;
  });

  return { updatedBoletos, changedBoletos };
}

/**
 * Sync boleto statuses and persist changes to local storage & Firestore if needed
 */
export function syncAndSaveBoletoStatuses(boletos: Boleto[]): Boleto[] {
  const { updatedBoletos, changedBoletos } = syncBoletoStatuses(boletos);
  if (changedBoletos.length > 0) {
    saveStoredBoletos(updatedBoletos);
    changedBoletos.forEach((b) => saveBoletoToFirestore(b));
  }
  return updatedBoletos;
}
