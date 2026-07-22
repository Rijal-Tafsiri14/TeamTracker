import { db } from './firebase.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const q = query(collection(db, "users"), where("username", "==", username));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                Swal.fire('Error', 'User tidak ditemukan', 'error');
                return;
            }

            let userData = null;
            querySnapshot.forEach((doc) => userData = doc.data());

            // Cek password (pastikan field di database bernama 'passwordHash')
            if (userData.passwordHash === password) {
                // SIMPAN SESSION SECARA OTOMATIS DI SINI
                localStorage.setItem('userSession', JSON.stringify(userData));
                
                Swal.fire('Sukses', 'Login berhasil!', 'success').then(() => {
                    window.location.href = 'dashboard.html'; // Pindah ke dashboard
                });
            } else {
                Swal.fire('Error', 'Password salah', 'error');
            }
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    });
}