import React, { useState, useEffect } from 'react';
import { UserSession, Client, Boleto, NotaFiscal, SupportTicket, BoletoStatus, TicketStatus, PDFAttachment, AppNotification, SporadicService } from './types';
import {
  getStoredClients, saveStoredClients,
  getStoredBoletos, saveStoredBoletos,
  getStoredNFes, saveStoredNFes,
  getStoredTickets, saveStoredTickets,
  getStoredSporadicServices, saveStoredSporadicServices,
  getStoredNotifications, saveStoredNotifications,
  getStoredAdminPassword, saveStoredAdminPassword,
  getStoredSession, saveStoredSession, touchStoredSession,
  resetToInitialData
} from './utils/storage';
import {
  requestPushPermission,
  notifyNewBoletoCreated,
  checkAndNotifyDueBoletos,
  cleanupOrphanNotifications,
  sendNativePush,
  syncAndSaveBoletoStatuses
} from './utils/notificationService';
import {
  seedFirestoreIfEmpty,
  subscribeClients,
  subscribeBoletos,
  subscribeNFes,
  subscribeTickets,
  subscribeSporadicServices,
  subscribeNotifications,
  subscribeAdminPassword,
  saveClientToFirestore,
  deleteClientFromFirestore,
  saveBoletoToFirestore,
  deleteBoletoFromFirestore,
  saveNFeToFirestore,
  deleteNFeFromFirestore,
  saveTicketToFirestore,
  deleteTicketFromFirestore,
  saveSporadicServiceToFirestore,
  deleteSporadicServiceFromFirestore,
  saveNotificationToFirestore,
  deleteNotificationFromFirestore,
  saveAdminPasswordToFirestore
} from './lib/firestoreSync';

import { ToastContainer, ToastMessage } from './components/Toast';
import { Header } from './components/Header';
import { LoginView } from './components/LoginView';
import { EditAdminPasswordModal } from './components/modals/EditAdminPasswordModal';
import { EditClientPasswordModal } from './components/modals/EditClientPasswordModal';
import { AdminLoginModal } from './components/modals/AdminLoginModal';

// Client components
import { ClientBoletosView } from './components/client/ClientBoletosView';
import { ClientSporadicBoletosView } from './components/client/ClientSporadicBoletosView';
import { ClientNFesView } from './components/client/ClientNFesView';
import { ClientTicketsView } from './components/client/ClientTicketsView';

// Admin components
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminClientsView } from './components/admin/AdminClientsView';
import { AdminFinancialView } from './components/admin/AdminFinancialView';
import { AdminBoletosView } from './components/admin/AdminBoletosView';
import { AdminNFesView } from './components/admin/AdminNFesView';
import { AdminTicketsView } from './components/admin/AdminTicketsView';

export default function App() {
  const [session, setSession] = useState<UserSession | null>(() => getStoredSession());
  const [activeTab, setActiveTab] = useState<string>(() => {
    const initSess = getStoredSession();
    return initSess?.role === 'admin' ? 'dashboard' : 'boletos';
  });

  // State collections
  const [clients, setClients] = useState<Client[]>([]);
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [nfes, setNfes] = useState<NotaFiscal[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [sporadicServices, setSporadicServices] = useState<SporadicService[]>([]);

  // Notifications & Push Permission state
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  // Navigation filter helper
  const [adminClientFilter, setAdminClientFilter] = useState<string>('');

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Password Modals state
  const [adminPassword, setAdminPassword] = useState<string>('admin123');
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState<boolean>(false);
  const [isEditAdminPasswordModalOpen, setIsEditAdminPasswordModalOpen] = useState<boolean>(false);
  const [isEditClientPasswordModalOpen, setIsEditClientPasswordModalOpen] = useState<boolean>(false);

  // Keep session alive and check 30-min expiration
  useEffect(() => {
    if (!session) return;
    touchStoredSession();

    const interval = setInterval(() => {
      const activeSession = getStoredSession();
      if (!activeSession) {
        setSession(null);
        addToast('info', 'Sessão Expirada', 'Sua sessão de 30 minutos expirou. Por favor, faça login novamente.');
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [session]);

  // Keep client session data in sync with latest client records
  useEffect(() => {
    if (session?.role === 'client' && session.client && clients.length > 0) {
      const updatedClient = clients.find((c) => c.id === session.client?.id);
      if (updatedClient && JSON.stringify(updatedClient) !== JSON.stringify(session.client)) {
        const updatedSession: UserSession = { ...session, client: updatedClient };
        setSession(updatedSession);
        saveStoredSession(updatedSession);
      }
    }
  }, [clients, session]);

  // Load stored data on mount & subscribe to Firestore
  useEffect(() => {
    // 1. Initial local load
    const loadedClients = getStoredClients();
    const loadedBoletos = getStoredBoletos();
    const syncedBoletos = syncAndSaveBoletoStatuses(loadedBoletos);
    setClients(loadedClients);
    setBoletos(syncedBoletos);
    setNfes(getStoredNFes());
    setTickets(getStoredTickets());
    setSporadicServices(getStoredSporadicServices());
    setAdminPassword(getStoredAdminPassword());
    
    // Check due dates and load notifications
    const updatedNotifs = checkAndNotifyDueBoletos(syncedBoletos, loadedClients);
    setNotifications(updatedNotifs);

    // Periodic sync timer for boleto due dates
    const dateCheckTimer = setInterval(() => {
      setBoletos((prev) => syncAndSaveBoletoStatuses(prev));
    }, 30000);

    // 2. Seed Firestore if empty, then listen to realtime updates
    seedFirestoreIfEmpty().then(() => {
      const unsubClients = subscribeClients((cl) => {
        setClients(cl);
        saveStoredClients(cl);

        if (cl && cl.length > 0) {
          const validIds = new Set(cl.map((c) => c.id));
          setBoletos((prev) => {
            const orphans = prev.filter(
              (b) =>
                !validIds.has(b.clientId) ||
                b.id === 'bol-101' ||
                b.id === 'bol-102' ||
                b.id === 'bol-201' ||
                b.id === 'bol-301'
            );
            if (orphans.length > 0) {
              orphans.forEach((b) => deleteBoletoFromFirestore(b.id));
              const validBoletos = prev.filter(
                (b) =>
                  validIds.has(b.clientId) &&
                  b.id !== 'bol-101' &&
                  b.id !== 'bol-102' &&
                  b.id !== 'bol-201' &&
                  b.id !== 'bol-301'
              );
              saveStoredBoletos(validBoletos);
              return validBoletos;
            }
            return prev;
          });
        }
      });
      const unsubBoletos = subscribeBoletos((remoteBoletos) => {
        setBoletos((prevLocal) => {
          const localMap = new Map<string, Boleto>(prevLocal.map((b) => [b.id, b]));
          const currentClients = getStoredClients();
          const validClientIds = new Set(currentClients.map((c) => c.id));

          // Filter out mock boletos or orphans without a client
          const cleanedRemote = remoteBoletos.filter((rb) => {
            const isMock =
              rb.id === 'bol-101' ||
              rb.id === 'bol-102' ||
              rb.id === 'bol-201' ||
              rb.id === 'bol-301' ||
              rb.clientId === 'cli-1' ||
              rb.clientId === 'cli-2' ||
              rb.clientId === 'cli-3';
            const isOrphan = currentClients.length > 0 && !validClientIds.has(rb.clientId);
            if (isMock || isOrphan) {
              deleteBoletoFromFirestore(rb.id);
              return false;
            }
            return true;
          });

          const mergedRemote = cleanedRemote.map((rb) => {
            const lb = localMap.get(rb.id);
            if (lb) {
              return {
                ...rb,
                pdfFile: (lb.pdfFile?.dataUrl && !lb.pdfFile.dataUrl.includes('[large_pdf_file_saved_locally]'))
                  ? lb.pdfFile
                  : rb.pdfFile,
                paymentReceipt: (lb.paymentReceipt?.dataUrl && !lb.paymentReceipt.dataUrl.includes('[large_pdf_file_saved_locally]'))
                  ? lb.paymentReceipt
                  : rb.paymentReceipt,
              };
            }
            return rb;
          });

          const syncedRemote = syncAndSaveBoletoStatuses(mergedRemote);
          saveStoredBoletos(syncedRemote);
          return syncedRemote;
        });
      });
      const unsubNfes = subscribeNFes((remoteNfes) => {
        setNfes((prevLocal) => {
          const localMap = new Map<string, NotaFiscal>(prevLocal.map((n) => [n.id, n]));
          const mergedRemote = remoteNfes.map((rn) => {
            const ln = localMap.get(rn.id);
            if (ln) {
              return {
                ...rn,
                pdfFile: (ln.pdfFile?.dataUrl && !ln.pdfFile.dataUrl.includes('[large_pdf_file_saved_locally]'))
                  ? ln.pdfFile
                  : rn.pdfFile,
              };
            }
            return rn;
          });
          saveStoredNFes(mergedRemote);
          return mergedRemote;
        });
      });
      const unsubTickets = subscribeTickets((tk) => {
        setTickets(tk);
        saveStoredTickets(tk);
      });
      const unsubSporadic = subscribeSporadicServices((remoteSporadic) => {
        setSporadicServices((prevLocal) => {
          const localMap = new Map<string, SporadicService>(prevLocal.map((s) => [s.id, s]));
          const mergedRemote = remoteSporadic.map((rs) => {
            const ls = localMap.get(rs.id);
            if (ls) {
              return {
                ...rs,
                pdfFile: (ls.pdfFile?.dataUrl && !ls.pdfFile.dataUrl.includes('[large_pdf_file_saved_locally]'))
                  ? ls.pdfFile
                  : rs.pdfFile,
                paymentReceipt: (ls.paymentReceipt?.dataUrl && !ls.paymentReceipt.dataUrl.includes('[large_pdf_file_saved_locally]'))
                  ? ls.paymentReceipt
                  : rs.paymentReceipt,
              };
            }
            return rs;
          });
          saveStoredSporadicServices(mergedRemote);
          return mergedRemote;
        });
      });
      const unsubNotifs = subscribeNotifications((nt) => {
        setNotifications((prevNotifs) => {
          const cleaned = cleanupOrphanNotifications(nt, getStoredClients(), getStoredBoletos());
          saveStoredNotifications(cleaned);
          return cleaned;
        });
      });
      const unsubAdminPass = subscribeAdminPassword((pass) => setAdminPassword(pass));

      return () => {
        clearInterval(dateCheckTimer);
        unsubClients();
        unsubBoletos();
        unsubNfes();
        unsubTickets();
        unsubSporadic();
        unsubNotifs();
        unsubAdminPass();
      };
    });
  }, []);

  // Effect to re-check due boletos periodically (e.g., when boletos state updates)
  useEffect(() => {
    if (clients.length > 0) {
      const updatedNotifs = checkAndNotifyDueBoletos(boletos, clients, session);
      const cleaned = cleanupOrphanNotifications(updatedNotifs, clients, boletos);
      setNotifications(cleaned);
    }
  }, [boletos, clients, session]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, description?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSaveAdminPassword = (newPassword: string) => {
    setAdminPassword(newPassword);
    saveStoredAdminPassword(newPassword);
    saveAdminPasswordToFirestore(newPassword);
  };

  const handleSaveClientPassword = (newPassword: string) => {
    if (session?.role === 'client' && session.client) {
      const updatedClient: Client = { ...session.client, password: newPassword };
      handleUpdateClient(updatedClient);
      const updatedSession: UserSession = { ...session, client: updatedClient };
      setSession(updatedSession);
      saveStoredSession(updatedSession);
    }
  };

  // Sporadic Services Handlers
  const handleAddSporadicService = (serviceData: Omit<SporadicService, 'id' | 'createdAt'>) => {
    const newService: SporadicService = {
      ...serviceData,
      id: `sp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setSporadicServices((prev) => {
      const updated = [newService, ...prev];
      saveStoredSporadicServices(updated);
      return updated;
    });
    saveSporadicServiceToFirestore(newService);
  };

  const handleUpdateSporadicStatus = (id: string, status: 'realized' | 'pending') => {
    setSporadicServices((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, status } : s));
      saveStoredSporadicServices(updated);
      const item = updated.find((s) => s.id === id);
      if (item) saveSporadicServiceToFirestore(item);
      return updated;
    });
  };

  const handleDeleteSporadicService = (id: string) => {
    setSporadicServices((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveStoredSporadicServices(updated);
      return updated;
    });
    deleteSporadicServiceFromFirestore(id);
  };

  const handleUploadSporadicReceipt = (serviceId: string, receipt: PDFAttachment) => {
    let updatedItem: SporadicService | undefined;
    setSporadicServices((prev) => {
      const updated = prev.map((s) => {
        if (s.id === serviceId) {
          const item: SporadicService = {
            ...s,
            paymentReceipt: receipt,
          };
          updatedItem = item;
          return item;
        }
        return s;
      });
      saveStoredSporadicServices(updated);
      if (updatedItem) saveSporadicServiceToFirestore(updatedItem);
      return updated;
    });

    // Notify admin of sporadic receipt upload
    const targetService = sporadicServices.find((s) => s.id === serviceId);
    const notif: AppNotification = {
      id: `notif-rec-${Date.now()}`,
      title: 'Comprovante Enviado (Serviço Esporádico)',
      body: `Cliente enviou comprovante de pagamento para o serviço "${targetService?.description || serviceId}".`,
      type: 'system',
      clientId: targetService?.clientId,
      targetRole: 'admin',
      read: false,
      timestamp: new Date().toISOString(),
    };
    setNotifications((prev) => [notif, ...prev]);
    saveNotificationToFirestore(notif);
  };

  const handleRemoveSporadicReceipt = (serviceId: string) => {
    let updatedItem: SporadicService | undefined;
    setSporadicServices((prev) => {
      const updated = prev.map((s) => {
        if (s.id === serviceId) {
          const { paymentReceipt, ...rest } = s;
          const item = rest as SporadicService;
          updatedItem = item;
          return item;
        }
        return s;
      });
      saveStoredSporadicServices(updated);
      if (updatedItem) saveSporadicServiceToFirestore(updatedItem);
      return updated;
    });
    addToast('info', 'Comprovante Removido', 'O comprovante foi removido do serviço esporádico.');
  };

  const handleUploadSporadicBoletoPdf = (serviceId: string, pdfFile: PDFAttachment) => {
    let updatedItem: SporadicService | undefined;
    setSporadicServices((prev) => {
      const updated = prev.map((s) => {
        if (s.id === serviceId) {
          const item: SporadicService = {
            ...s,
            pdfFile,
          };
          updatedItem = item;
          return item;
        }
        return s;
      });
      saveStoredSporadicServices(updated);
      if (updatedItem) saveSporadicServiceToFirestore(updatedItem);
      return updated;
    });
    addToast('success', 'PDF do Boleto Inserido!', 'O arquivo PDF do boleto foi anexado com sucesso ao serviço.');
  };

  const handleRemoveSporadicBoletoPdf = (serviceId: string) => {
    let updatedItem: SporadicService | undefined;
    setSporadicServices((prev) => {
      const updated = prev.map((s) => {
        if (s.id === serviceId) {
          const { pdfFile, ...rest } = s;
          const item = rest as SporadicService;
          updatedItem = item;
          return item;
        }
        return s;
      });
      saveStoredSporadicServices(updated);
      if (updatedItem) saveSporadicServiceToFirestore(updatedItem);
      return updated;
    });
    addToast('info', 'PDF Removido', 'O PDF do boleto bancário foi removido.');
  };

  // Login Handlers
  const handleLoginClient = (client: Client) => {
    const newSession: UserSession = { role: 'client', client };
    setSession(newSession);
    saveStoredSession(newSession);
    setActiveTab('boletos');
  };

  const handleLoginAdmin = () => {
    const newSession: UserSession = { role: 'admin' };
    setSession(newSession);
    saveStoredSession(newSession);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setSession(null);
    saveStoredSession(null);
    addToast('info', 'Sessão encerrada', 'Você saiu da sua conta com segurança.');
  };

  const handleResetData = () => {
    if (window.confirm('Deseja restaurar todos os dados cadastrais da empresa? Suas alterações salvas serão atualizadas.')) {
      resetToInitialData();
      setClients(getStoredClients());
      setBoletos(getStoredBoletos());
      setNfes(getStoredNFes());
      setTickets(getStoredTickets());
      addToast('info', 'Dados Restaurados', 'O banco de dados foi atualizado com os clientes e documentos vigentes.');
    }
  };

  // CRUD Handlers
  // Client CRUD
  const handleAddClient = (newClientData: Omit<Client, 'id' | 'createdAt'>) => {
    const newClient: Client = {
      ...newClientData,
      id: `cli-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newClient, ...clients];
    setClients(updated);
    saveStoredClients(updated);
    saveClientToFirestore(newClient);
  };

  const handleUpdateClient = (updatedClient: Client) => {
    const updated = clients.map((c) => (c.id === updatedClient.id ? updatedClient : c));
    setClients(updated);
    saveStoredClients(updated);
    saveClientToFirestore(updatedClient);
  };

  const handleDeleteClient = (clientId: string) => {
    const updatedClients = clients.filter((c) => c.id !== clientId);
    setClients(updatedClients);
    saveStoredClients(updatedClients);
    deleteClientFromFirestore(clientId);

    // Remove associated boletos, NFs, tickets
    const clientBoletos = boletos.filter((b) => b.clientId === clientId);
    const deletedBoletoIds = new Set(clientBoletos.map((b) => b.id));
    clientBoletos.forEach((b) => deleteBoletoFromFirestore(b.id));
    const updatedBoletos = boletos.filter((b) => b.clientId !== clientId);
    setBoletos(updatedBoletos);
    saveStoredBoletos(updatedBoletos);

    const clientNFes = nfes.filter((n) => n.clientId === clientId);
    clientNFes.forEach((n) => deleteNFeFromFirestore(n.id));
    const updatedNFes = nfes.filter((n) => n.clientId !== clientId);
    setNfes(updatedNFes);
    saveStoredNFes(updatedNFes);

    const clientTickets = tickets.filter((t) => t.clientId === clientId);
    clientTickets.forEach((t) => deleteTicketFromFirestore(t.id));
    const updatedTickets = tickets.filter((t) => t.clientId !== clientId);
    setTickets(updatedTickets);
    saveStoredTickets(updatedTickets);

    // Remove associated notifications for deleted client or its boletos
    const removedNotifs = notifications.filter(
      (n) => n.clientId === clientId || (n.boletoId && deletedBoletoIds.has(n.boletoId))
    );
    removedNotifs.forEach((n) => deleteNotificationFromFirestore(n.id));
    const updatedNotifs = notifications.filter(
      (n) => n.clientId !== clientId && (!n.boletoId || !deletedBoletoIds.has(n.boletoId))
    );
    setNotifications(updatedNotifs);
    saveStoredNotifications(updatedNotifs);
  };

  // Boleto CRUD
  const handleAddBoleto = (newBoletoData: Omit<Boleto, 'id' | 'createdAt'>) => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    let initialStatus = newBoletoData.status;
    if (initialStatus !== 'paid' && newBoletoData.dueDate < todayStr) {
      initialStatus = 'overdue';
    }

    const newBoleto: Boleto = {
      ...newBoletoData,
      status: initialStatus,
      id: `bol-${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString(),
    };
    setBoletos((prev) => {
      const updated = syncAndSaveBoletoStatuses([newBoleto, ...prev]);
      saveStoredBoletos(updated);
      return updated;
    });
    saveBoletoToFirestore(newBoleto);

    // Trigger Notification for new boleto with session awareness for push isolation
    const targetClient = clients.find((c) => c.id === newBoleto.clientId);
    const notif = notifyNewBoletoCreated(newBoleto, targetClient, session);
    setNotifications((prev) => [notif, ...prev]);

    addToast(
      'info',
      'Notificação Disparada!',
      `Notificação Push enviada para o novo boleto #${newBoleto.id} (${targetClient?.name || 'Cliente'}).`
    );
  };

  // Notification Action Handlers
  const handleRequestPushPermission = async () => {
    const perm = await requestPushPermission();
    setPushPermission(perm);
    if (perm === 'granted') {
      sendNativePush('Mavie Solution', 'Notificações Push ativadas com sucesso! Você receberá alertas de boletos novos e vencimentos.');
      addToast('success', 'Notificações Ativadas!', 'O navegador agora enviará alertas push para novos boletos e vencimentos.');
    } else {
      addToast('error', 'Permissão Negada', 'Habilite as notificações nas configurações do seu navegador para receber alertas.');
    }
  };

  const handleSendTestNotification = () => {
    const isClient = session?.role === 'client' && session.client;
    const title = 'Notificação de Teste';
    const body = isClient
      ? `Olá ${session.client?.name}, seus alertas de boletos e vencimentos da Mavie Solution estão funcionando!`
      : 'O sistema de alertas e notificações da Mavie Solution está funcionando perfeitamente!';

    // Send browser native push
    sendNativePush(`Mavie Solution - ${title}`, body, `test-notif-${Date.now()}`);

    // Create in-app notification record strictly scoped to the active session user
    const newNotif: AppNotification = {
      id: `notif-test-${Date.now()}`,
      title,
      body,
      type: 'system',
      clientId: isClient ? session.client?.id : undefined,
      targetRole: isClient ? 'client' : 'admin',
      read: false,
      timestamp: new Date().toISOString(),
    };

    const updated = [newNotif, ...notifications];
    setNotifications(updated);
    saveStoredNotifications(updated);
    saveNotificationToFirestore(newNotif);

    addToast('success', 'Notificação Disparada!', 'Uma notificação de teste foi gerada com sucesso.');
  };

  const handleMarkNotificationAsRead = (id: string) => {
    const updated = notifications.map((n) => {
      if (n.id === id) {
        // Enforce privacy: a client can only mark their own notifications as read
        if (session?.role === 'client' && session.client && n.clientId !== session.client.id) {
          return n;
        }
        const updatedN = { ...n, read: true };
        saveNotificationToFirestore(updatedN);
        return updatedN;
      }
      return n;
    });
    setNotifications(updated);
    saveStoredNotifications(updated);
  };

  const handleMarkAllNotificationsAsRead = () => {
    // If logged in as a client, ONLY mark this client's notifications as read
    if (session?.role === 'client' && session.client) {
      const currentClientId = session.client.id;
      const updated = notifications.map((n) => {
        if (n.clientId === currentClientId && !n.read) {
          const updatedN = { ...n, read: true };
          saveNotificationToFirestore(updatedN);
          return updatedN;
        }
        return n;
      });
      setNotifications(updated);
      saveStoredNotifications(updated);
      return;
    }

    // If logged in as Admin, mark admin-visible notifications as read
    const updated = notifications.map((n) => {
      const updatedN = { ...n, read: true };
      saveNotificationToFirestore(updatedN);
      return updatedN;
    });
    setNotifications(updated);
    saveStoredNotifications(updated);
  };

  const handleClearAllNotifications = () => {
    // If logged in as a client, ONLY delete this client's notifications
    if (session?.role === 'client' && session.client) {
      const currentClientId = session.client.id;
      const toDelete = notifications.filter((n) => n.clientId === currentClientId);
      toDelete.forEach((n) => deleteNotificationFromFirestore(n.id));
      const remaining = notifications.filter((n) => n.clientId !== currentClientId);
      setNotifications(remaining);
      saveStoredNotifications(remaining);
      return;
    }

    // If logged in as Admin, clear notifications
    notifications.forEach((n) => deleteNotificationFromFirestore(n.id));
    setNotifications([]);
    saveStoredNotifications([]);
  };

  const handleUpdateBoletoStatus = (boletoId: string, status: BoletoStatus) => {
    // Guarantee immediate persistence with current storage snapshot
    const currentList = getStoredBoletos();
    const existing = currentList.find((b) => b.id === boletoId);
    let updatedBoleto: Boleto | undefined;

    if (existing) {
      updatedBoleto = {
        ...existing,
        status,
        paidAt: status === 'paid' ? (existing.paidAt || new Date().toISOString()) : undefined,
      };
      saveBoletoToFirestore(updatedBoleto);
    }

    setBoletos((prev) => {
      const updated = prev.map((b) => {
        if (b.id === boletoId) {
          const item: Boleto = {
            ...b,
            status,
            paidAt: status === 'paid' ? (b.paidAt || new Date().toISOString()) : undefined,
          };
          updatedBoleto = item;
          return item;
        }
        return b;
      });
      saveStoredBoletos(updated);
      if (updatedBoleto) {
        saveBoletoToFirestore(updatedBoleto);
      }
      return updated;
    });
  };

  const handleUpdateBoletoDueDate = (boletoId: string, newDueDate: string) => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const currentList = getStoredBoletos();
    const existing = currentList.find((b) => b.id === boletoId);
    let updatedBoleto: Boleto | undefined;

    if (existing) {
      let newStatus = existing.status;
      if (newStatus !== 'paid') {
        newStatus = newDueDate < todayStr ? 'overdue' : 'pending';
      }
      updatedBoleto = {
        ...existing,
        dueDate: newDueDate,
        status: newStatus,
      };
      saveBoletoToFirestore(updatedBoleto);
    }

    setBoletos((prev) => {
      const updated = prev.map((b) => {
        if (b.id === boletoId) {
          let newStatus = b.status;
          if (newStatus !== 'paid') {
            newStatus = newDueDate < todayStr ? 'overdue' : 'pending';
          }
          const item: Boleto = {
            ...b,
            dueDate: newDueDate,
            status: newStatus,
          };
          updatedBoleto = item;
          return item;
        }
        return b;
      });

      const synced = syncAndSaveBoletoStatuses(updated);
      saveStoredBoletos(synced);
      if (updatedBoleto) {
        saveBoletoToFirestore(updatedBoleto);
      }
      return synced;
    });

    const [year, month, day] = newDueDate.split('-');
    const formattedDate = `${day}/${month}/${year}`;
    addToast('success', 'Vencimento Atualizado', `Boleto #${boletoId} alterado para ${formattedDate}.`);
  };

  const handleUploadBoletoReceipt = (boletoId: string, receipt: PDFAttachment, markAsPaid: boolean = false) => {
    const currentList = getStoredBoletos();
    const existing = currentList.find((b) => b.id === boletoId);
    let updatedBoleto: Boleto | undefined;

    if (existing) {
      updatedBoleto = {
        ...existing,
        paymentReceipt: receipt,
        status: markAsPaid ? 'paid' : existing.status,
        paidAt: markAsPaid ? (existing.paidAt || new Date().toISOString()) : existing.paidAt,
      };
      saveBoletoToFirestore(updatedBoleto);
    }

    setBoletos((prev) => {
      const updated = prev.map((b) => {
        if (b.id === boletoId) {
          const item: Boleto = {
            ...b,
            paymentReceipt: receipt,
            status: markAsPaid ? 'paid' : b.status,
            paidAt: markAsPaid ? (b.paidAt || new Date().toISOString()) : b.paidAt,
          };
          updatedBoleto = item;
          return item;
        }
        return b;
      });
      saveStoredBoletos(updated);
      if (updatedBoleto) {
        saveBoletoToFirestore(updatedBoleto);
      }
      return updated;
    });

    // Notify admin of payment receipt upload (strictly isolated to admin)
    const targetBoleto = existing || boletos.find((b) => b.id === boletoId);
    if (targetBoleto) {
      const targetClient = clients.find((c) => c.id === targetBoleto.clientId);
      const notif: AppNotification = {
        id: `notif-rec-bol-${Date.now()}`,
        title: 'Comprovante de Boleto Enviado',
        body: `Comprovante de pagamento anexado ao boleto #${boletoId} (${targetClient?.name || 'Cliente'}).`,
        type: 'system',
        boletoId: boletoId,
        clientId: targetBoleto.clientId,
        targetRole: 'admin',
        read: false,
        timestamp: new Date().toISOString(),
      };
      setNotifications((prev) => [notif, ...prev]);
      saveNotificationToFirestore(notif);
    }
  };

  const handleRemoveBoletoReceipt = (boletoId: string) => {
    const currentList = getStoredBoletos();
    const existing = currentList.find((b) => b.id === boletoId);
    let updatedBoleto: Boleto | undefined;

    if (existing) {
      const { paymentReceipt, ...rest } = existing;
      updatedBoleto = rest as Boleto;
      saveBoletoToFirestore(updatedBoleto);
    }

    setBoletos((prev) => {
      const updated = prev.map((b) => {
        if (b.id === boletoId) {
          const { paymentReceipt, ...rest } = b;
          const item = rest as Boleto;
          updatedBoleto = item;
          return item;
        }
        return b;
      });
      saveStoredBoletos(updated);
      if (updatedBoleto) {
        saveBoletoToFirestore(updatedBoleto);
      }
      return updated;
    });

    addToast('info', 'Comprovante Removido', `O comprovante do boleto #${boletoId} foi removido.`);
  };

  const handleDeleteBoleto = (boletoId: string) => {
    setBoletos((prev) => {
      const updated = prev.filter((b) => b.id !== boletoId);
      saveStoredBoletos(updated);
      return updated;
    });
    deleteBoletoFromFirestore(boletoId);

    setNotifications((prevNotifs) => {
      const removedNotifs = prevNotifs.filter((n) => n.boletoId === boletoId);
      removedNotifs.forEach((n) => deleteNotificationFromFirestore(n.id));
      const updatedNotifs = prevNotifs.filter((n) => n.boletoId !== boletoId);
      saveStoredNotifications(updatedNotifs);
      return updatedNotifs;
    });
  };

  // NF-e CRUD
  const handleAddNFe = (newNFeData: Omit<NotaFiscal, 'id' | 'createdAt'>) => {
    const newNFe: NotaFiscal = {
      ...newNFeData,
      id: `nf-${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newNFe, ...nfes];
    setNfes(updated);
    saveStoredNFes(updated);
    saveNFeToFirestore(newNFe);
  };

  const handleDeleteNFe = (nfeId: string) => {
    const updated = nfes.filter((n) => n.id !== nfeId);
    setNfes(updated);
    saveStoredNFes(updated);
    deleteNFeFromFirestore(nfeId);
  };

  // Tickets CRUD
  const handleAddTicket = (ticketData: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'messages'> & { initialMessage: string }) => {
    const now = new Date().toISOString();
    const newTicket: SupportTicket = {
      id: `tkt-${tickets.length + 1}`,
      clientId: ticketData.clientId,
      subject: ticketData.subject,
      category: ticketData.category,
      priority: ticketData.priority,
      status: ticketData.status,
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: `msg-${Date.now()}`,
          senderType: 'client',
          senderName: session?.client?.name || 'Cliente',
          message: ticketData.initialMessage,
          timestamp: now,
        },
      ],
    };

    const updated = [newTicket, ...tickets];
    setTickets(updated);
    saveStoredTickets(updated);
    saveTicketToFirestore(newTicket);
  };

  const handleAddTicketMessage = (ticketId: string, message: string, senderType: 'client' | 'admin', senderName: string) => {
    const now = new Date().toISOString();
    let updatedTicket: SupportTicket | undefined;
    const updated = tickets.map((t) => {
      if (t.id === ticketId) {
        updatedTicket = {
          ...t,
          updatedAt: now,
          messages: [
            ...t.messages,
            {
              id: `msg-${Date.now()}`,
              senderType,
              senderName,
              message,
              timestamp: now,
            },
          ],
        };
        return updatedTicket;
      }
      return t;
    });
    setTickets(updated);
    saveStoredTickets(updated);
    if (updatedTicket) {
      saveTicketToFirestore(updatedTicket);
    }
  };

  const handleUpdateTicketStatus = (ticketId: string, status: TicketStatus) => {
    let updatedTicket: SupportTicket | undefined;
    const updated = tickets.map((t) => {
      if (t.id === ticketId) {
        updatedTicket = { ...t, status, updatedAt: new Date().toISOString() };
        return updatedTicket;
      }
      return t;
    });
    setTickets(updated);
    saveStoredTickets(updated);
    if (updatedTicket) {
      saveTicketToFirestore(updatedTicket);
    }
  };

  const handleCloseTicket = (
    ticketId: string,
    closureData: {
      reason: string;
      comment: string;
      whatsappScreenshot?: string;
      closedBy: string;
      status: TicketStatus;
    }
  ) => {
    const now = new Date().toISOString();
    let updatedTicket: SupportTicket | undefined;
    const updated = tickets.map((t) => {
      if (t.id === ticketId) {
        updatedTicket = {
          ...t,
          status: closureData.status,
          closureReason: closureData.reason,
          closureComment: closureData.comment,
          whatsappScreenshot: closureData.whatsappScreenshot,
          closedAt: now,
          closedBy: closureData.closedBy,
          updatedAt: now,
        };
        return updatedTicket;
      }
      return t;
    });
    setTickets(updated);
    saveStoredTickets(updated);
    if (updatedTicket) {
      saveTicketToFirestore(updatedTicket);
    }
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 font-sans selection:bg-amber-500 selection:text-black flex flex-col">
      <Header
        session={session}
        onLogout={handleLogout}
        onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setAdminClientFilter('');
        }}
        onResetData={handleResetData}
        onOpenEditAdminPassword={() => setIsEditAdminPasswordModalOpen(true)}
        onOpenEditClientPassword={() => setIsEditClientPasswordModalOpen(true)}
        notifications={
          session?.role === 'client' && session.client
            ? notifications.filter((n) => n.clientId === session.client!.id && n.targetRole !== 'admin')
            : session?.role === 'admin'
            ? notifications.filter((n) => n.targetRole !== 'client' || !n.clientId)
            : []
        }
        pushPermission={pushPermission}
        onRequestPushPermission={handleRequestPushPermission}
        onSendTestNotification={handleSendTestNotification}
        onMarkNotificationAsRead={handleMarkNotificationAsRead}
        onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
        onClearAllNotifications={handleClearAllNotifications}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!session ? (
          <LoginView
            clients={clients}
            onLoginClient={handleLoginClient}
            onToast={addToast}
          />
        ) : session.role === 'client' && session.client ? (
          <div>
            {activeTab === 'boletos' && (
              <ClientBoletosView
                client={session.client}
                boletos={boletos}
                onUploadReceipt={handleUploadBoletoReceipt}
                onToast={addToast}
              />
            )}

            {activeTab === 'sporadic' && (
              <ClientSporadicBoletosView
                client={session.client}
                sporadicServices={sporadicServices}
                onUploadReceipt={handleUploadSporadicReceipt}
                onToast={addToast}
              />
            )}

            {activeTab === 'nfes' && (
              <ClientNFesView
                client={session.client}
                nfes={nfes}
                onToast={addToast}
                onNavigateHome={() => setActiveTab('boletos')}
              />
            )}

            {activeTab === 'tickets' && (
              <ClientTicketsView
                client={session.client}
                tickets={tickets}
                onAddTicket={handleAddTicket}
                onAddMessage={handleAddTicketMessage}
                onToast={addToast}
              />
            )}
          </div>
        ) : (
          <div>
            {activeTab === 'dashboard' && (
              <AdminDashboard
                clients={clients}
                boletos={boletos}
                nfes={nfes}
                tickets={tickets}
                sporadicServices={sporadicServices}
                onNavigate={(tab) => {
                  setActiveTab(tab);
                  setAdminClientFilter('');
                }}
                onOpenEditAdminPassword={() => setIsEditAdminPasswordModalOpen(true)}
              />
            )}

            {activeTab === 'clients' && (
              <AdminClientsView
                clients={clients}
                onAddClient={handleAddClient}
                onUpdateClient={handleUpdateClient}
                onDeleteClient={handleDeleteClient}
                onNavigateToBoletos={(clientId) => {
                  setAdminClientFilter(clientId);
                  setActiveTab('admin-boletos');
                }}
                onNavigateToNFes={(clientId) => {
                  setAdminClientFilter(clientId);
                  setActiveTab('admin-nfes');
                }}
                onToast={addToast}
              />
            )}

            {activeTab === 'admin-financial' && (
              <AdminFinancialView
                clients={clients}
                boletos={boletos}
                sporadicServices={sporadicServices}
                onAddBoleto={handleAddBoleto}
                onAddSporadicService={handleAddSporadicService}
                onUpdateSporadicStatus={handleUpdateSporadicStatus}
                onDeleteSporadicService={handleDeleteSporadicService}
                onUploadSporadicBoletoPdf={handleUploadSporadicBoletoPdf}
                onRemoveSporadicBoletoPdf={handleRemoveSporadicBoletoPdf}
                onUploadSporadicReceipt={handleUploadSporadicReceipt}
                onRemoveSporadicReceipt={handleRemoveSporadicReceipt}
                onToast={addToast}
              />
            )}

            {activeTab === 'admin-boletos' && (
              <AdminBoletosView
                clients={clients}
                boletos={boletos}
                initialSelectedClientId={adminClientFilter}
                onAddBoleto={handleAddBoleto}
                onAddSporadicService={handleAddSporadicService}
                onUpdateBoletoStatus={handleUpdateBoletoStatus}
                onUpdateBoletoDueDate={handleUpdateBoletoDueDate}
                onUploadReceipt={handleUploadBoletoReceipt}
                onRemoveReceipt={handleRemoveBoletoReceipt}
                onDeleteBoleto={handleDeleteBoleto}
                onToast={addToast}
              />
            )}

            {activeTab === 'admin-nfes' && (
              <AdminNFesView
                clients={clients}
                nfes={nfes}
                initialSelectedClientId={adminClientFilter}
                onAddNFe={handleAddNFe}
                onDeleteNFe={handleDeleteNFe}
                onToast={addToast}
              />
            )}

            {activeTab === 'admin-tickets' && (
              <AdminTicketsView
                clients={clients}
                tickets={tickets}
                onAddMessage={handleAddTicketMessage}
                onUpdateTicketStatus={handleUpdateTicketStatus}
                onCloseTicket={handleCloseTicket}
                onToast={addToast}
              />
            )}
          </div>
        )}
      </main>

      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        adminPassword={adminPassword}
        onLoginAdmin={handleLoginAdmin}
        onToast={addToast}
      />

      <EditAdminPasswordModal
        isOpen={isEditAdminPasswordModalOpen}
        onClose={() => setIsEditAdminPasswordModalOpen(false)}
        currentAdminPassword={adminPassword}
        onSavePassword={handleSaveAdminPassword}
        onToast={addToast}
      />

      {session?.role === 'client' && session.client && (
        <EditClientPasswordModal
          isOpen={isEditClientPasswordModalOpen}
          onClose={() => setIsEditClientPasswordModalOpen(false)}
          client={session.client}
          onSavePassword={handleSaveClientPassword}
          onToast={addToast}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
