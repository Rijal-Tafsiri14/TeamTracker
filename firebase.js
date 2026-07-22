// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyB4dDEVxl63uYqGbEZlexvzzA1jVpL-clM",
    authDomain: "teamtracker-62802.firebaseapp.com",
    databaseURL: "https://teamtracker-62802-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "teamtracker-62802",
    storageBucket: "teamtracker-62802.firebasestorage.app",
    messagingSenderId: "1030365860703",
    appId: "1:1030365860703:web:205e69202ea728b2a01cea",
    measurementId: "G-LBJLZ60XJR"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);