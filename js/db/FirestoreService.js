import { signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db, COLLECTIONS } from "../config/firebaseConfig.js";
import { USUARIOS_INICIALES } from "../config/constants.js";

export class FirestoreService {
  constructor() {
    this.equiposCol = collection(db, COLLECTIONS.EQUIPOS);
    this.usuariosCol = collection(db, COLLECTIONS.USUARIOS);
  }

  async initAuth(onReady, onError) {
    try {
      await signInAnonymously(auth);
    } catch (err) {
      console.error("Error de autenticación:", err);
      onError("No se pudo autenticar con Firebase. Verifica que el acceso Anónimo esté habilitado.");
      return;
    }

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        await this.seedInitialUsersIfEmpty();
        onReady(user);
      }
    });
  }

  async seedInitialUsersIfEmpty() {
    try {
      const snap = await getDocs(this.usuariosCol);
      if (snap.empty) {
        for (const u of USUARIOS_INICIALES) {
          await addDoc(this.usuariosCol, {
            ...u,
            createdAt: Date.now()
          });
        }
      }
    } catch (err) {
      console.error("Error inicializando usuarios:", err);
    }
  }

  // --- USUARIOS DEL SISTEMA ---
  subscribeUsers(onData) {
    return onSnapshot(this.usuariosCol, (snapshot) => {
      const users = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(users);
    });
  }

  async createUser(userData) {
    return await addDoc(this.usuariosCol, {
      ...userData,
      createdAt: Date.now()
    });
  }

  async updateUser(userId, updatedFields) {
    const docRef = doc(db, COLLECTIONS.USUARIOS, userId);
    return await updateDoc(docRef, updatedFields);
  }

  async deleteUser(userId) {
    const docRef = doc(db, COLLECTIONS.USUARIOS, userId);
    return await deleteDoc(docRef);
  }

  // --- REGISTROS DE EQUIPOS ---
  subscribeRecords(onData, onError) {
    return onSnapshot(
      this.equiposCol,
      (snapshot) => {
        const records = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        onData(records);
      },
      (error) => {
        console.error("Error en sincronización Firestore:", error);
        onError("Error de conexión con Firestore. Revisa tus reglas o señal de internet.");
      }
    );
  }

  async createRecord(recordData) {
    return await addDoc(this.equiposCol, recordData);
  }

  async updateRecord(recordId, updatedFields) {
    const docRef = doc(db, COLLECTIONS.EQUIPOS, recordId);
    return await updateDoc(docRef, updatedFields);
  }

  async deleteRecord(recordId) {
    const docRef = doc(db, COLLECTIONS.EQUIPOS, recordId);
    return await deleteDoc(docRef);
  }
}