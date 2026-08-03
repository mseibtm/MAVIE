import { Boleto, Client, AppNotification } from '../types';
import { getStoredNotifications, saveStoredNotifications } from './storage';
import { saveNotificationToFirestore } from '../lib/firestoreSync';

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
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  try {
    const options: NotificationOptions = {
      body,
      tag: tag || `mavie-notif-${Date.now()}`,
      badge: '/vite.svg',
      icon: '/vite.svg',
      requireInteraction: false,
    };
    new Notification(title, options);
  } catch (e) {
    console.error('Erro ao enviar notificação push nativa:', e);
  }
}

/**
 * Trigger notification when a new boleto is registered
 */
export function notifyNewBoletoCreated(
  boleto: Boleto,
  client?: Client
): AppNotification {
  const clientName = client?.name || 'Cliente';
  const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(boleto.amount);
  
  const [year, month, day] = boleto.dueDate.split('-');
  const formattedDueDate = `${day}/${month}/${year}`;

  const title = 'Novo Boleto Cadastrado';
  const body = `Boleto #${boleto.id} para ${clientName} no valor de ${formattedAmount} com vencimento em ${formattedDueDate}.`;

  // 1. Send native browser push notification
  sendNativePush(`Mavie Solution - ${title}`, body, `boleto-create-${boleto.id}`);

  // 2. Create in-app notification record
  const newNotif: AppNotification = {
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title,
    body,
    type: 'boleto_created',
    boletoId: boleto.id,
    clientId: boleto.clientId,
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
 * Check boletos for due dates (today or overdue) and trigger notifications
 */
export function checkAndNotifyDueBoletos(
  boletos: Boleto[],
  clients: Client[]
): AppNotification[] {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const existingNotifications = getStoredNotifications();
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const newlyCreatedNotifications: AppNotification[] = [];

  boletos.forEach((boleto) => {
    // Only check unpaid boletos
    if (boleto.status === 'paid') return;

    const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(boleto.amount);
    const clientName = clientMap.get(boleto.clientId) || 'Cliente';
    const [bYear, bMonth, bDay] = boleto.dueDate.split('-');
    const formattedDueDate = `${bDay}/${bMonth}/${bYear}`;

    const isDueToday = boleto.dueDate === todayStr;
    const isOverdue = boleto.dueDate < todayStr;

    if (isDueToday) {
      // Check if we already notified for this boleto today
      const alreadyNotifiedToday = existingNotifications.some(
        (n) => n.boletoId === boleto.id && n.type === 'due_date' && n.timestamp.startsWith(todayStr)
      );

      if (!alreadyNotifiedToday) {
        const title = 'Boleto Vence Hoje!';
        const body = `Atenção: O boleto #${boleto.id} (${clientName}) no valor de ${formattedAmount} vence hoje (${formattedDueDate}).`;

        sendNativePush(`Mavie Solution - ${title}`, body, `boleto-due-${boleto.id}-${todayStr}`);

        const notif: AppNotification = {
          id: `notif-due-${boleto.id}-${Date.now()}`,
          title,
          body,
          type: 'due_date',
          boletoId: boleto.id,
          clientId: boleto.clientId,
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

        sendNativePush(`Mavie Solution - ${title}`, body, `boleto-overdue-${boleto.id}-${todayStr}`);

        const notif: AppNotification = {
          id: `notif-overdue-${boleto.id}-${Date.now()}`,
          title,
          body,
          type: 'overdue',
          boletoId: boleto.id,
          clientId: boleto.clientId,
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
