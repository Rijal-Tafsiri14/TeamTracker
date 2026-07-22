import { db } from './firebase.js';
import { 
    collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

console.log("User.js berhasil dimuat!");

// --- 1. REFERENSI ELEMEN DOM ---
const tableUserBody = document.getElementById('tableUserBody');
const formAddUser = document.getElementById('formAddUser');
const formEditUser = document.getElementById('formEditUser');
const btnOpenModalUser = document.getElementById('btnOpenModalUser');
const modalAddUser = document.getElementById('modalAddUser');
const modalEditUser = document.getElementById('modalEditUser');

// --- 2. FUNGSI HELPER ---
// Fungsi Hash (Wajib sama dengan auth.js -> btoa)
const hash = (str) => btoa(str); 

// Fungsi Pembuat Password Acak (8 Karakter)
const generateRandomPassword = (length = 8) => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let password = "";
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

// --- 3. EVENT LISTENER BUKA MODAL TAMBAH USER ---
// Ini yang memperbaiki tombol "Tambah User" yang sebelumnya tidak bisa diklik
if (btnOpenModalUser && modalAddUser) {
    btnOpenModalUser.addEventListener('click', () => {
        modalAddUser.classList.remove('hidden');
    });
}

// --- 4. RENDER TABEL USER (REALTIME) ---
onSnapshot(collection(db, "users"), (snapshot) => {
    if (!tableUserBody) return;
    
    tableUserBody.innerHTML = '';
    snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const row = `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800 border-b dark:border-gray-700">
                <td class="p-4 font-medium text-gray-800 dark:text-white">${data.name || '-'}</td>
                <td class="p-4 text-gray-500">${data.username || '-'}</td>
                <td class="p-4 text-gray-600 dark:text-gray-300">${data.team || '-'}</td>
                <td class="p-4">
                    <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-md text-xs font-bold text-blue-600 dark:text-blue-400">${data.role || '-'}</span>
                </td>
                <td class="p-4 text-center">
                    <button onclick="window.openEditModal('${docSnapshot.id}', '${data.name}', '${data.username}', '${data.team}', '${data.role}')" class="text-blue-500 hover:text-blue-700 mr-3" title="Edit User">
                        <i class="fa-solid fa-edit"></i>
                    </button>
                    <button onclick="window.deleteUser('${docSnapshot.id}')" class="text-red-500 hover:text-red-700" title="Hapus User">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        tableUserBody.insertAdjacentHTML('beforeend', row);
    });
});

// --- 5. SUBMIT TAMBAH USER (DENGAN RANDOM PASSWORD) ---
if (formAddUser) {
    formAddUser.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('addUserName').value;
        const username = document.getElementById('addUserUsername').value;
        const team = document.getElementById('addUserTeam').value;
        const role = document.getElementById('addUserRole').value;

        // Generate Password Acak
        const randomPassword = generateRandomPassword(8);

        try {
            // Cek apakah username sudah dipakai orang lain
            const q = query(collection(db, "users"), where("username", "==", username));
            const check = await getDocs(q);
            
            if (!check.empty) {
                Swal.fire('Gagal', 'Username sudah terpakai, silakan gunakan yang lain!', 'error');
                return;
            }

            // Simpan ke Firestore (Password langsung di-hash)
            await addDoc(collection(db, "users"), { 
                name, 
                username, 
                team, 
                role, 
                status: "Aktif", 
                passwordHash: hash(randomPassword), 
                createdAt: new Date() 
            });
            
            // Tampilkan Alert berisi Password Acak agar Admin bisa copy
            Swal.fire({
                title: 'User Berhasil Dibuat!',
                html: `
                    <div class="text-left bg-gray-100 p-4 rounded-lg mt-3">
                        <p class="mb-2">Berikan info login ini kepada user:</p>
                        <p><b>Username:</b> ${username}</p>
                        <p><b>Password:</b> <span class="text-xl font-mono text-red-600 bg-red-100 px-2 py-1 rounded tracking-widest">${randomPassword}</span></p>
                    </div>
                `,
                icon: 'success',
                confirmButtonText: 'Tutup & Selesai'
            });

            // Tutup modal dan reset form
            modalAddUser.classList.add('hidden');
            formAddUser.reset();
        } catch (error) {
            Swal.fire('Error', 'Gagal menyimpan: ' + error.message, 'error');
        }
    });
}

// --- 6. SUBMIT EDIT USER ---
if (formEditUser) {
    formEditUser.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editUserId').value;
        const name = document.getElementById('editUserName').value;
        const team = document.getElementById('editUserTeam').value;
        const role = document.getElementById('editUserRole').value;
        
        try {
            await updateDoc(doc(db, "users", id), {
                name, 
                team, 
                role, 
                updatedAt: new Date()
            });
            Swal.fire('Berhasil', 'Data user telah diperbarui', 'success');
            modalEditUser.classList.add('hidden');
        } catch (error) {
            Swal.fire('Error', 'Gagal update: ' + error.message, 'error');
        }
    });
}

// --- 7. FUNGSI GLOBAL (Bisa dipanggil dari HTML HTML onclick) ---
window.openEditModal = (id, name, username, team, role) => {
    document.getElementById('editUserId').value = id;
    document.getElementById('editUserName').value = name;
    document.getElementById('editUserUsername').value = username;
    document.getElementById('editUserTeam').value = team;
    document.getElementById('editUserRole').value = role;
    
    if (modalEditUser) modalEditUser.classList.remove('hidden');
};

window.deleteUser = async (id) => {
    const result = await Swal.fire({ 
        title: 'Yakin ingin menghapus user?', 
        text: "User yang dihapus tidak bisa dikembalikan!",
        icon: 'warning', 
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: 'Ya, Hapus!'
    });
    
    if (result.isConfirmed) {
        try {
            await deleteDoc(doc(db, "users", id));
            Swal.fire('Terhapus', 'User berhasil dihapus', 'success');
        } catch (error) {
            Swal.fire('Error', 'Gagal menghapus user: ' + error.message, 'error');
        }
    }
};
// --- 8. FITUR GANTI PASSWORD (USER) ---
const btnOpenChangePassword = document.getElementById('btnOpenChangePassword');
const modalChangePassword = document.getElementById('modalChangePassword');
const formChangePassword = document.getElementById('formChangePassword');

// Buka Modal Ganti Password
if (btnOpenChangePassword && modalChangePassword) {
    btnOpenChangePassword.addEventListener('click', () => {
        modalChangePassword.classList.remove('hidden');
    });
}

// Proses Ganti Password
if (formChangePassword) {
    formChangePassword.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newPasswordInput = document.getElementById('newPassword').value;
        const currentUserId = localStorage.getItem('userId'); // Mengambil ID user yang sedang login

        // Validasi jika sesi hilang
        if (!currentUserId) {
            Swal.fire('Sesi Habis', 'Sesi Anda tidak ditemukan. Silakan login ulang.', 'error');
            setTimeout(() => window.location.href = 'login.html', 1500);
            return;
        }

        // Konfirmasi sebelum merubah password
        const result = await Swal.fire({
            title: 'Ganti Password?',
            text: "Anda akan mengubah password login Anda.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#9ca3af',
            confirmButtonText: 'Ya, Simpan!'
        });

        if (result.isConfirmed) {
            try {
                // Update field passwordHash di Firestore milik user tersebut
                await updateDoc(doc(db, "users", currentUserId), {
                    passwordHash: hash(newPasswordInput),
                    updatedAt: new Date()
                });

                Swal.fire('Berhasil', 'Password Anda telah diperbarui. Gunakan password ini untuk login berikutnya.', 'success');
                
                // Tutup modal & bersihkan input form
                modalChangePassword.classList.add('hidden');
                formChangePassword.reset();
            } catch (error) {
                console.error("Error Ganti Password:", error);
                Swal.fire('Gagal', 'Terjadi kesalahan saat mengganti password: ' + error.message, 'error');
            }
        }
    });
}