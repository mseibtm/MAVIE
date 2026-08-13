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
      });
      const unsubBoletos = subscribeBoletos((remoteBoletos) => {
        setBoletos((prevLocal) => {
          const localMap = new Map<string, Boleto>(prevLocal.map((b) => [b.id, b]));
          const mergedRemote = remoteBoletos.map((rb) => {
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
      const unsubSporadic = subscribeSporadicServices((sp) => {
        setSporadicServices(sp);
        saveStoredSporadicServices(sp);
      });
      const unsubNotifs = subscribeNotifications((nt) => {
        setClients((latestClients) => {
          setBoletos((latestBoletos) => {
            const cleaned = cleanupOrphanNotifications(nt, latestClients, latestBoletos);
            setNotifications(cleaned);
            saveStoredNotifications(cleaned);
            return latestBoletos;
          });
          return latestClients;
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
      const updatedNotifs = checkAndNotifyDueBoletos(boletos, clients);
      const cleaned = cleanupOrphanNotifications(updatedNotifs, clients, boletos);
      setNotifications(cleaned);
    }
  }, [boletos, clients]);

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
    const updated = syncAndSaveBoletoStatuses([newBoleto, ...boletos]);
    setBoletos(updated);
    saveBoletoToFirestore(newBoleto);

    // Trigger Notification for new boleto
    const targetClient = clients.find((c) => c.id === newBoleto.clientId);
    const notif = notifyNewBoletoCreated(newBoleto, targetClient);
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
    const title = 'Notificação de Teste';
    const body = 'O sistema de alertas e notificações da Mavie Solution está funcionando perfeitamente!';

    // Send browser native push
    sendNativePush(`Mavie Solution - ${title}`, body, `test-notif-${Date.now()}`);

    // Create in-app notification record
    const targetClientId = session?.role === 'client' && session.client ? session.client.id : (clients[0]?.id || 'cli-1');
    const newNotif: AppNotification = {
      id: `notif-test-${Date.now()}`,
      title,
      body,
      type: 'boleto_created',
      clientId: targetClientId,
      read: false,
      timestamp: new Date().toISOString(),
    };

    const updated = [newNotif, ...notifications];
    setNotifications(updated);
    saveStoredNotifications(updated);
    saveNotificationToFirestore(newNotif);

    addToast('success', 'Notificação Disparada!', 'Uma notificação de teste foi gerada e enviada.');
  };

  const handleMarkNotificationAsRead = (id: string) => {
    const updated = notifications.map((n) => {
      if (n.id === id) {
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
    const updated = notifications.map((n) => {
      const updatedN = { ...n, read: true };
      saveNotificationToFirestore(updatedN);
      return updatedN;
    });
    setNotifications(updated);
    saveStoredNotifications(updated);
  };

  const handleClearAllNotifications = () => {
    notifications.forEach((n) => deleteNotificationFromFirestore(n.id));
    setNotifications([]);
    saveStoredNotifications([]);
  };

  const handleUpdateBoletoStatus = (boletoId: string, status: BoletoStatus) => {
    let updatedBoleto: Boleto | undefined;
    const updated = boletos.map((b) => {
      if (b.id === boletoId) {
        updatedBoleto = {
          ...b,
          status,
          paidAt: status === 'paid' ? new Date().toISOString() : b.paidAt,
        };
        return updatedBoleto;
      }
      return b;
    });
    setBoletos(updated);
    saveStoredBoletos(updated);
    if (updatedBoleto) {
      saveBoletoToFirestore(updatedBoleto);
    }
  };

  const handleUpdateBoletoDueDate = (boletoId: string, newDueDate: string) => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    let updatedBoleto: Boleto | undefined;

    const updated = boletos.map((b) => {
      if (b.id === boletoId) {
        let newStatus = b.status;
        if (newStatus !== 'paid') {
          newStatus = newDueDate < todayStr ? 'overdue' : 'pending';
        }
        updatedBoleto = {
          ...b,
          dueDate: newDueDate,
          status: newStatus,
        };
        return updatedBoleto;
      }
      return b;
    });

    const synced = syncAndSaveBoletoStatuses(updated);
    setBoletos(synced);

    if (updatedBoleto) {
      saveBoletoToFirestore(updatedBoleto);
      const [year, month, day] = newDueDate.split('-');
      const formattedDate = `${day}/${month}/${year}`;
      addToast('success', 'Vencimento Atualizado', `Boleto #${boletoId} alterado para ${formattedDate}.`);
    }

    // Refresh notifications for due date
    const updatedNotifs = checkAndNotifyDueBoletos(synced, clients);
    setNotifications(updatedNotifs);
  };

  const handleUploadBoletoReceipt = (boletoId: string, receipt: PDFAttachment, markAsPaid: boolean = false) => {
    let updatedBoleto: Boleto | undefined;
    const updated = boletos.map((b) => {
      if (b.id === boletoId) {
        updatedBoleto = {
          ...b,
          paymentReceipt: receipt,
          status: markAsPaid ? 'paid' : b.status,
          paidAt: markAsPaid ? new Date().toISOString() : b.paidAt,
        };
        return updatedBoleto;
      }
      return b;
    });
    setBoletos(updated);
    saveStoredBoletos(updated);
    if (updatedBoleto) {
      saveBoletoToFirestore(updatedBoleto);
    }
  };

  const handleRemoveBoletoReceipt = (boletoId: string) => {
    let updatedBoleto: Boleto | undefined;
    const updated = boletos.map((b) => {
      if (b.id === boletoId) {
        const { paymentReceipt, ...rest } = b;
        updatedBoleto = rest as Boleto;
        return updatedBoleto;
      }
      return b;
    });
    setBoletos(updated);
    saveStoredBoletos(updated);
    if (updatedBoleto) {
      saveBoletoToFirestore(updatedBoleto);
      addToast('info', 'Comprovante Removido', `O comprovante do boleto #${boletoId} foi removido.`);
    }
  };

  const handleDeleteBoleto = (boletoId: string) => {
    const updated = boletos.filter((b) => b.id !== boletoId);
    setBoletos(updated);
    saveStoredBoletos(updated);
    deleteBoletoFromFirestore(boletoId);

    const removedNotifs = notifications.filter((n) => n.boletoId === boletoId);
    removedNotifs.forEach((n) => deleteNotificationFromFirestore(n.id));
    const updatedNotifs = notifications.filter((n) => n.boletoId !== boletoId);
    setNotifications(updatedNotifs);
    saveStoredNotifications(updatedNotifs);
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
        notifications={notifications}
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
