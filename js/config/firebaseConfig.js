import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB_MhMEMwQoHqFDDaptJsBUunbsfq2atLw",
  authDomain: "soporte-ti-c3841.firebaseapp.com",
  projectId: "soporte-ti-c3841",
  storageBucket: "soporte-ti-c3841.firebasestorage.app",
  messagingSenderId: "126643277274",
  appId: "1:126643277274:web:f2251216fa7ffbedc304e3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});

export const COLLECTIONS = {
  EQUIPOS: "equipos_soporte",
  USUARIOS: "usuarios_sistema"
};