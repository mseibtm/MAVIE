import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { Client, Boleto, NotaFiscal, SupportTicket, AppNotification } from '../types';
import { INITIAL_CLIENTS, INITIAL_BOLETOS, INITIAL_NFES, INITIAL_TICKETS } from '../data/mockData';

// Firestore collections
const COLS = {
  CLIENTS: 'clients',
  BOLETOS: 'boletos',
  NFES: 'nfes',
  TICKETS: 'tickets',
  NOTIFICATIONS: 'notifications',
};

/**
 * Sync initial seed data to Firestore if collection is empty
 */
export async function seedFirestoreIfEmpty() {
  try {
    const clientsSnap = await getDocs(collection(db, COLS.CLIENTS));
    if (clientsSnap.empty) {
      const batch = writeBatch(db);
      
      INITIAL_CLIENTS.forEach((c) => {
        batch.set(doc(db, COLS.CLIENTS, c.id), c);
      });
      INITIAL_BOLETOS.forEach((b) => {
        batch.set(doc(db, COLS.BOLETOS, b.id), b);
      });
      INITIAL_NFES.forEach((n) => {
        batch.set(doc(db, COLS.NFES, n.id), n);
      });
      INITIAL_TICKETS.forEach((t) => {
        batch.set(doc(db, COLS.TICKETS, t.id), t);
      });

      await batch.commit();
      console.log('Firebase Firestore successfully seeded with initial portal data.');
    }
  } catch (err) {
    console.warn('Firestore seeding notice:', err);
  }
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
      if (list.length > 0) {
        callback(list);
      }
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
      if (list.length > 0) {
        // Sort by date desc
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(list);
      }
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
      if (list.length > 0) {
        callback(list);
      }
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
      if (list.length > 0) {
        callback(list);
      }
    },
    (err) => console.warn('Firestore tickets listener error:', err)
  );
}

export function subscribeNotifications(callback: (notifs: AppNotification[]) => void) {
  return onSnapshot(
    collection(db, COLS.NOTIFICATIONS),
    (snap) => {
      const list: AppNotification[] = [];
      snap.forEach((d) => list.push(d.data() as AppNotification));
      if (list.length > 0) {
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        callback(list);
      }
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
    await setDoc(doc(db, COLS.CLIENTS, client.id), client, { merge: true });
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

    await setDoc(doc(db, COLS.BOLETOS, boleto.id), docToSave as Boleto, { merge: true });
  } catch (err) {
    console.error('Error saving boleto to Firestore:', err);
  }
}

export async function deleteBoletoFromFirestore(id: string) {
  try {
    await deleteDoc(doc(db, COLS.BOLETOS, id));
  } catch (err) {
    console.error('Error deleting boleto from Firestore:', err);
  }
}

export async function saveNFeToFirestore(nfe: NotaFiscal) {
  try {
    await setDoc(doc(db, COLS.NFES, nfe.id), nfe, { merge: true });
  } catch (err) {
    console.error('Error saving NFe to Firestore:', err);
  }
}

export async function saveTicketToFirestore(ticket: SupportTicket) {
  try {
    await setDoc(doc(db, COLS.TICKETS, ticket.id), ticket, { merge: true });
  } catch (err) {
    console.error('Error saving ticket to Firestore:', err);
  }
}

export async function saveNotificationToFirestore(notif: AppNotification) {
  try {
    await setDoc(doc(db, COLS.NOTIFICATIONS, notif.id), notif, { merge: true });
  } catch (err) {
    console.error('Error saving notification to Firestore:', err);
  }
}

export async function saveAdminPasswordToFirestore(password: string) {
  try {
    await setDoc(doc(db, 'settings', 'admin'), { password, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error('Error saving admin password to Firestore:', err);
  }
}
