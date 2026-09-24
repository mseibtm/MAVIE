import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  deleteDoc,
  writeBatch,
  deleteField,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { Client, Boleto, NotaFiscal, SupportTicket, AppNotification, SporadicService, BoletoStatus, PDFAttachment, Expense, MonthlyBalance } from '../types';
import { INITIAL_CLIENTS, INITIAL_BOLETOS, INITIAL_NFES, INITIAL_TICKETS, INITIAL_SPORADIC_SERVICES } from '../data/mockData';

// Firestore collections
const COLS = {
  CLIENTS: 'clients',
  BOLETOS: 'boletos',
  NFES: 'nfes',
  TICKETS: 'tickets',
  SPORADIC: 'sporadic_services',
  EXPENSES: 'expenses',
  MONTHLY_BALANCES: 'monthly_balances',
  NOTIFICATIONS: 'notifications',
};

// Helper to recursively remove undefined fields so Firestore setDoc does not throw errors
function removeUndefinedFields<T extends Record<string, any>>(obj: T): T {
  const newObj: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        newObj[key] = removeUndefinedFields(value);
      } else {
        newObj[key] = value;
      }
    }
  });
  return newObj as T;
}

/**
 * Sync initial seed data to Firestore if collection is empty (disabled to prevent dummy charges)
 */
export async function seedFirestoreIfEmpty() {
  // Never seed fictional mock data or placeholder charges into Firestore.
  // Real data entered by the user is preserved and respected.
}

/**
 * Subscribe to Realtime Firestore updates
 */
export function subscribeClients(callback: (clients: Client[]) => void) {
  return onSnapshot(
    collection(db, COLS.CLIENTS),
    (snap) => {
      const list: Client[] = [];
      snap.forEach((d) => list.push(d.data() as Client));
      callback(list);
    },
    (err) => console.warn('Firestore clients listener error:', err)
  );
}

export function subscribeBoletos(callback: (boletos: Boleto[]) => void) {
  return onSnapshot(
    collection(db, COLS.BOLETOS),
    (snap) => {
      const list: Boleto[] = [];
      snap.forEach((d) => list.push(d.data() as Boleto));
      // Sort by date desc
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    },
    (err) => console.warn('Firestore boletos listener error:', err)
  );
}

export function subscribeNFes(callback: (nfes: NotaFiscal[]) => void) {
  return onSnapshot(
    collection(db, COLS.NFES),
    (snap) => {
      const list: NotaFiscal[] = [];
      snap.forEach((d) => list.push(d.data() as NotaFiscal));
      callback(list);
    },
    (err) => console.warn('Firestore NFes listener error:', err)
  );
}

export function subscribeTickets(callback: (tickets: SupportTicket[]) => void) {
  return onSnapshot(
    collection(db, COLS.TICKETS),
    (snap) => {
      const list: SupportTicket[] = [];
      snap.forEach((d) => list.push(d.data() as SupportTicket));
      callback(list);
    },
    (err) => console.warn('Firestore tickets listener error:', err)
  );
}

export function subscribeSporadicServices(callback: (services: SporadicService[]) => void) {
  return onSnapshot(
    collection(db, COLS.SPORADIC),
    (snap) => {
      const list: SporadicService[] = [];
      snap.forEach((d) => list.push(d.data() as SporadicService));
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      callback(list);
    },
    (err) => console.warn('Firestore sporadic services listener error:', err)
  );
}

export function subscribeNotifications(callback: (notifs: AppNotification[]) => void) {
  return onSnapshot(
    collection(db, COLS.NOTIFICATIONS),
    (snap) => {
      const list: AppNotification[] = [];
      snap.forEach((d) => list.push(d.data() as AppNotification));
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(list);
    },
    (err) => console.warn('Firestore notifications listener error:', err)
  );
}

export function subscribeAdminPassword(callback: (pass: string) => void) {
  return onSnapshot(
    doc(db, 'settings', 'admin'),
    (snap) => {
      if (snap.exists() && snap.data().password) {
        callback(snap.data().password);
      }
    },
    (err) => console.warn('Firestore admin password listener error:', err)
  );
}

/**
 * Write operations to Firestore
 */
export async function saveClientToFirestore(client: Client) {
  try {
    await setDoc(doc(db, COLS.CLIENTS, client.id), removeUndefinedFields(client), { merge: true });
  } catch (err) {
    console.error('Error saving client to Firestore:', err);
  }
}

export async function saveBoletoToFirestore(boleto: Boleto) {
  try {
    const docToSave: Record<string, any> = { ...boleto };

    // Prevent Firestore document size limit crash (1MB) if PDF base64 is huge
    if (docToSave.pdfFile && docToSave.pdfFile.dataUrl && docToSave.pdfFile.dataUrl.length > 700000) {
      docToSave.pdfFile = {
        name: docToSave.pdfFile.name,
        size: docToSave.pdfFile.size,
        uploadedAt: docToSave.pdfFile.uploadedAt,
        dataUrl: docToSave.pdfFile.dataUrl.substring(0, 1000) + '...[large_pdf_file_saved_locally]',
        isLargeFile: true,
      };
    }

    if (docToSave.paymentReceipt && docToSave.paymentReceipt.dataUrl && docToSave.paymentReceipt.dataUrl.length > 700000) {
      docToSave.paymentReceipt = {
        name: docToSave.paymentReceipt.name,
        size: docToSave.paymentReceipt.size,
        uploadedAt: docToSave.paymentReceipt.uploadedAt,
        dataUrl: docToSave.paymentReceipt.dataUrl.substring(0, 1000) + '...[large_pdf_file_saved_locally]',
        isLargeFile: true,
      };
    }

    await setDoc(doc(db, COLS.BOLETOS, boleto.id), removeUndefinedFields(docToSave), { merge: true });
  } catch (err) {
    console.error('Error saving boleto to Firestore:', err);
  }
}

/**
 * Direct, dedicated receipt save to Firestore with merge: true
 * Guarantees that receipt and paid status are atomically persisted without resending large PDF files
 */
export async function saveBoletoReceiptToFirestore(
  boletoId: string,
  receipt: PDFAttachment,
  markAsPaid: boolean = true
) {
  try {
    const payload: Record<string, any> = {
      paymentReceipt: receipt,
      updatedAt: new Date().toISOString(),
    };
    if (markAsPaid) {
      payload.status = 'paid';
      payload.paidAt = receipt.uploadedAt || new Date().toISOString();
    }
    await setDoc(doc(db, COLS.BOLETOS, boletoId), removeUndefinedFields(payload), { merge: true });
  } catch (err) {
    console.error('Error saving boleto receipt to Firestore:', err);
  }
}

/**
 * Direct, lightweight status update to Firestore with merge: true
 * Guarantees that status and paidAt updates succeed immediately without payload overhead
 */
export async function updateBoletoStatusInFirestore(boletoId: string, status: BoletoStatus, paidAt?: string) {
  try {
    const payload: Record<string, any> = {
      status,
      updatedAt: new Date().toISOString(),
    };
    if (status === 'paid') {
      payload.paidAt = paidAt || new Date().toISOString();
    } else {
      payload.paidAt = deleteField();
    }
    await setDoc(doc(db, COLS.BOLETOS, boletoId), payload, { merge: true });
  } catch (err) {
    console.error('Error updating boleto status in Firestore:', err);
  }
}

/**
 * Remove receipt from a boleto in Firestore
 */
export async function removeBoletoReceiptFromFirestore(boletoId: string) {
  try {
    await setDoc(
      doc(db, COLS.BOLETOS, boletoId),
      {
        paymentReceipt: deleteField(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Error removing boleto receipt from Firestore:', err);
  }
}

export async function deleteClientFromFirestore(id: string) {
  try {
    await deleteDoc(doc(db, COLS.CLIENTS, id));
  } catch (err) {
    console.error('Error deleting client from Firestore:', err);
  }
}

export async function deleteBoletoFromFirestore(id: string) {
  try {
    await deleteDoc(doc(db, COLS.BOLETOS, id));
  } catch (err) {
    console.error('Error deleting boleto from Firestore:', err);
  }
}

export async function deleteNFeFromFirestore(id: string) {
  try {
    await deleteDoc(doc(db, COLS.NFES, id));
  } catch (err) {
    console.error('Error deleting NFe from Firestore:', err);
  }
}

export async function deleteTicketFromFirestore(id: string) {
  try {
    await deleteDoc(doc(db, COLS.TICKETS, id));
  } catch (err) {
    console.error('Error deleting ticket from Firestore:', err);
  }
}

export async function saveNFeToFirestore(nfe: NotaFiscal) {
  try {
    const docToSave: Record<string, any> = { ...nfe };

    if (docToSave.pdfFile && docToSave.pdfFile.dataUrl && docToSave.pdfFile.dataUrl.length > 700000) {
      docToSave.pdfFile = {
        name: docToSave.pdfFile.name,
        size: docToSave.pdfFile.size,
        uploadedAt: docToSave.pdfFile.uploadedAt,
        dataUrl: docToSave.pdfFile.dataUrl.substring(0, 1000) + '...[large_pdf_file_saved_locally]',
        isLargeFile: true,
      };
    }

    await setDoc(doc(db, COLS.NFES, nfe.id), removeUndefinedFields(docToSave), { merge: true });
  } catch (err) {
    console.error('Error saving NFe to Firestore:', err);
  }
}

export async function saveTicketToFirestore(ticket: SupportTicket) {
  try {
    await setDoc(doc(db, COLS.TICKETS, ticket.id), removeUndefinedFields(ticket), { merge: true });
  } catch (err) {
    console.error('Error saving ticket to Firestore:', err);
  }
}

export async function saveNotificationToFirestore(notif: AppNotification) {
  try {
    await setDoc(doc(db, COLS.NOTIFICATIONS, notif.id), removeUndefinedFields(notif), { merge: true });
  } catch (err) {
    console.error('Error saving notification to Firestore:', err);
  }
}

export async function deleteNotificationFromFirestore(id: string) {
  try {
    await deleteDoc(doc(db, COLS.NOTIFICATIONS, id));
  } catch (err) {
    console.error('Error deleting notification from Firestore:', err);
  }
}

export async function saveAdminPasswordToFirestore(password: string) {
  try {
    await setDoc(doc(db, 'settings', 'admin'), { password, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error('Error saving admin password to Firestore:', err);
  }
}

export async function saveSporadicServiceToFirestore(service: SporadicService) {
  try {
    const docToSave: Record<string, any> = { ...service };

    if (docToSave.pdfFile && docToSave.pdfFile.dataUrl && docToSave.pdfFile.dataUrl.length > 700000) {
      docToSave.pdfFile = {
        name: docToSave.pdfFile.name,
        size: docToSave.pdfFile.size,
        uploadedAt: docToSave.pdfFile.uploadedAt,
        dataUrl: docToSave.pdfFile.dataUrl.substring(0, 1000) + '...[large_pdf_file_saved_locally]',
        isLargeFile: true,
      };
    }

    if (docToSave.paymentReceipt && docToSave.paymentReceipt.dataUrl && docToSave.paymentReceipt.dataUrl.length > 700000) {
      docToSave.paymentReceipt = {
        name: docToSave.paymentReceipt.name,
        size: docToSave.paymentReceipt.size,
        uploadedAt: docToSave.paymentReceipt.uploadedAt,
        dataUrl: docToSave.paymentReceipt.dataUrl.substring(0, 1000) + '...[large_pdf_file_saved_locally]',
        isLargeFile: true,
      };
    }

    await setDoc(doc(db, COLS.SPORADIC, service.id), removeUndefinedFields(docToSave), { merge: true });
  } catch (err) {
    console.error('Error saving sporadic service to Firestore:', err);
  }
}

export async function saveSporadicReceiptToFirestore(serviceId: string, receipt: PDFAttachment, markAsRealized: boolean = true) {
  try {
    const docReceipt: Record<string, any> = { ...receipt };
    if (docReceipt.dataUrl && docReceipt.dataUrl.length > 700000) {
      docReceipt.dataUrl = docReceipt.dataUrl.substring(0, 1000) + '...[large_pdf_file_saved_locally]';
      docReceipt.isLargeFile = true;
    }
    const payload: Record<string, any> = {
      paymentReceipt: docReceipt,
      updatedAt: new Date().toISOString(),
    };
    if (markAsRealized) {
      payload.status = 'realized';
    }
    await setDoc(doc(db, COLS.SPORADIC, serviceId), removeUndefinedFields(payload), { merge: true });
  } catch (err) {
    console.error('Error saving sporadic receipt to Firestore:', err);
  }
}

export async function removeSporadicReceiptFromFirestore(serviceId: string) {
  try {
    await updateDoc(doc(db, COLS.SPORADIC, serviceId), {
      paymentReceipt: deleteField(),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error removing sporadic receipt from Firestore:', err);
  }
}

export async function deleteSporadicServiceFromFirestore(id: string) {
  try {
    await deleteDoc(doc(db, COLS.SPORADIC, id));
  } catch (err) {
    console.error('Error deleting sporadic service from Firestore:', err);
  }
}

export function subscribeExpenses(callback: (expenses: Expense[]) => void) {
  return onSnapshot(
    collection(db, COLS.EXPENSES),
    (snap) => {
      const list: Expense[] = [];
      snap.forEach((d) => list.push(d.data() as Expense));
      callback(list);
    },
    (err) => console.warn('Firestore expenses listener error:', err)
  );
}

export async function saveExpenseToFirestore(expense: Expense) {
  try {
    const docToSave: Record<string, any> = { ...expense };
    if (docToSave.receipt && docToSave.receipt.dataUrl && docToSave.receipt.dataUrl.length > 700000) {
      docToSave.receipt = {
        name: docToSave.receipt.name,
        size: docToSave.receipt.size,
        uploadedAt: docToSave.receipt.uploadedAt,
        dataUrl: docToSave.receipt.dataUrl.substring(0, 1000) + '...[large_receipt_file_saved_locally]',
        isLargeFile: true,
      };
    }
    await setDoc(doc(db, COLS.EXPENSES, expense.id), removeUndefinedFields(docToSave), { merge: true });
  } catch (err) {
    console.error('Error saving expense to Firestore:', err);
  }
}

export async function deleteExpenseFromFirestore(id: string) {
  try {
    await deleteDoc(doc(db, COLS.EXPENSES, id));
  } catch (err) {
    console.error('Error deleting expense from Firestore:', err);
  }
}

export function subscribeMonthlyBalances(callback: (balances: MonthlyBalance[]) => void) {
  return onSnapshot(
    collection(db, COLS.MONTHLY_BALANCES),
    (snap) => {
      const list: MonthlyBalance[] = [];
      snap.forEach((d) => list.push(d.data() as MonthlyBalance));
      callback(list);
    },
    (err) => console.warn('Firestore monthly balances listener error:', err)
  );
}

export async function saveMonthlyBalanceToFirestore(balance: MonthlyBalance) {
  try {
    await setDoc(doc(db, COLS.MONTHLY_BALANCES, balance.id), removeUndefinedFields(balance), { merge: true });
  } catch (err) {
    console.error('Error saving monthly balance to Firestore:', err);
  }
}

export async function deleteMonthlyBalanceFromFirestore(id: string) {
  try {
    await deleteDoc(doc(db, COLS.MONTHLY_BALANCES, id));
  } catch (err) {
    console.error('Error deleting monthly balance from Firestore:', err);
  }
}
