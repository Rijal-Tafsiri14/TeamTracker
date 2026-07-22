console.log("Auth.js dimuat!");

import { db } from './firebase.js'; // Cukup import sekali
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const formLogin = document.getElementById('formLogin');

// Fungsi hash HARUS SAMA dengan yang di user.js
const hash = (str) => btoa(str); 

if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const usernameInput = document.getElementById('loginUsername').value;
        const passwordInput = document.getElementById('loginPassword').value;

        try {
            // 1. Cari user berdasarkan username
            const q = query(collection(db, "users"), where("username", "==", usernameInput));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                Swal.fire('Gagal', 'Username tidak ditemukan', 'error');
                return;
            }

            // 2. Ambil data user
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            
            // 3. Bandingkan hash
            const hashedInput = hash(passwordInput);
            const storedHash = userData.passwordHash;

            console.log("Input:", passwordInput, "Hashed:", hashedInput, "DB Hash:", storedHash);

            if (hashedInput === storedHash) {
                // Login Berhasil
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('userId', userDoc.id); 
                localStorage.setItem('userName', userData.name);
                localStorage.setItem('userRole', userData.role);
                localStorage.setItem('userTeam', userData.team);

                Swal.fire({
                    title: 'Berhasil',
                    text: 'Selamat datang, ' + userData.name,
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = 'dashboard.html'; 
                });
            } else {
                Swal.fire('Gagal', 'Password salah', 'error');
            }
        } catch (error) {
            console.error("Error Login:", error);
            Swal.fire('Error', 'Terjadi kesalahan sistem: ' + error.message, 'error');
        }
    });
}