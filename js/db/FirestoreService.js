import {
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { auth, db, COLLECTIONS } from "../config/firebaseConfig.js";
import { DEFAULT_USERS } from "../config/constants.js";

const COUNTERS_COLLECTION = "contadores_diarios";

export class FirestoreService {
  constructor() {
    this.auth = auth;
    this.db = db;
    this.recordsRef = collection(this.db, COLLECTIONS.EQUIPOS);
    this.usersRef = collection(this.db, COLLECTIONS.USUARIOS);
    this.unsubscribeDailyListener = null;
  }

  initAuth(onReadyCallback, onErrorCallback) {
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        onReadyCallback(user);
      }
    });

    signInAnonymously(this.auth).catch((err) => {
      console.error("Error de autenticación Firebase:", err);
      onErrorCallback("No se pudo iniciar sesión en Firebase. Verifica Authentication > Anónimo.");
    });
  }

  subscribeUsers(onUsersUpdate) {
    return onSnapshot(this.usersRef, async (snapshot) => {
      if (snapshot.empty) {
        for (const u of DEFAULT_USERS) {
          await addDoc(this.usersRef, u);
        }
        return;
      }
      const users = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onUsersUpdate(users);
    });
  }

  async createUser(userData) {
    return await addDoc(this.usersRef, userData);
  }

  async updateUser(userId, updatedFields) {
    const ref = doc(this.db, COLLECTIONS.USUARIOS, userId);
    return await updateDoc(ref, updatedFields);
  }

  async deleteUser(userId) {
    const ref = doc(this.db, COLLECTIONS.USUARIOS, userId);
    return await deleteDoc(ref);
  }

  // Suscripción optimizada: solo escucha los equipos de la fecha activa (ahorra lecturas)
  subscribeRecordsByDate(dateStr, onDataCallback, onErrorCallback) {
    if (this.unsubscribeDailyListener) {
      this.unsubscribeDailyListener();
    }

    const q = query(this.recordsRef, where("fecha", "==", dateStr));
    this.unsubscribeDailyListener = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        onDataCallback(list);
      },
      (err) => {
        console.error("Error Firestore onSnapshot:", err);
        onErrorCallback("Error de permisos en Firestore. Revisa las reglas de seguridad.");
      }
    );

    return this.unsubscribeDailyListener;
  }

  // Consulta bajo demanda para el Historial Global (solo cuando se abre esa pestaña)
  subscribeAllRecordsOnceOrLive(onDataCallback) {
    return onSnapshot(this.recordsRef, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onDataCallback(list);
    });
  }

  // TRANSACCIÓN ATÓMICA: Garantiza correlativos únicos (#1, #2, #3...) aunque guarden 5 personas a la vez
  async createRecordWithAtomicNumber(recordData) {
    const counterDocRef = doc(this.db, COUNTERS_COLLECTION, recordData.fecha);
    const newRecordRef = doc(this.recordsRef);

    const assignedNumber = await runTransaction(this.db, async (transaction) => {
      const counterSnap = await transaction.get(counterDocRef);
      const currentCount = counterSnap.exists() ? Number(counterSnap.data().ultimoNumero) || 0 : 0;
      const nextNumber = currentCount + 1;

      transaction.set(
        counterDocRef,
        {
          fecha: recordData.fecha,
          ultimoNumero: nextNumber,
          updatedAt: Date.now()
        },
        { merge: true }
      );

      transaction.set(newRecordRef, {
        ...recordData,
        numeroDia: nextNumber
      });

      return nextNumber;
    });

    return { id: newRecordRef.id, numeroDia: assignedNumber };
  }

  async updateRecord(id, updatedFields) {
    const docRef = doc(this.db, COLLECTIONS.EQUIPOS, id);
    return await updateDoc(docRef, updatedFields);
  }

  async deleteRecord(id) {
    const docRef = doc(this.db, COLLECTIONS.EQUIPOS, id);
    return await deleteDoc(docRef);
  }
}