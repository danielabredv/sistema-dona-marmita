import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB1eEe2r3GgEQDlBpn57BftRTzC-Dm_BUk",
  authDomain: "sistema-dona-marmita.firebaseapp.com",
  projectId: "sistema-dona-marmita",
  storageBucket: "sistema-dona-marmita.firebasestorage.app",
  messagingSenderId: "439555811611",
  appId: "1:439555811611:web:d38014958f8d40ecbe0bbe"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.db = db;
window.fb = {
  collection,
  addDoc,
  query,
  where,
  getDocs
};