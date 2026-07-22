import { logActivity } from './activity.js';
import { db } from './firebase.js';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ==========================================
// 1. PENGECEKAN HAK AKSES (ROLE-BASED ACCESS)
// ==========================================
// Ambil role user yang sedang login dari LocalStorage
const userRole = localStorage.getItem('userRole');

// Buat aturan: canEdit akan bernilai TRUE hanya jika role adalah SPV atau Leader Central
const canEdit = (userRole === 'Leader Central' || userRole === 'SPV');

// ==========================================
// 2. REFERENSI ELEMEN DOM
// ==========================================
const tableProjectBody = document.getElementById('tableProjectBody');
const formAddProject = document.getElementById('formAddProject');
const btnTambahProject = document.getElementById('btnTambahProject');
const modalAddProject = document.getElementById('modalAddProject');
const modalEditProject = document.getElementById('modalEditProject');

// ==========================================
// 3. FITUR READ DATA (REALTIME & BATASAN AKSES TOMBOL)
// ==========================================
onSnapshot(collection(db, "projects"), (snapshot) => {
    tableProjectBody.innerHTML = '';

    if (snapshot.empty) {
        tableProjectBody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-500">Belum ada data project.</td></tr>`;
        return;
    }

    snapshot.forEach((docSnap) => {
        const id = docSnap.id;
        const data = docSnap.data();

        // Variabel untuk menampung tombol aksi
        let actionButtons = '';

        // JIKA USER ADALAH SPV / LEADER CENTRAL -> TAMPILKAN TOMBOL EDIT & HAPUS
        if (canEdit) {
            actionButtons = `
                <div class="flex items-center justify-center gap-2">
                    <button onclick="window.openEditProject('${id}', '${data.progress || 0}', '${data.status || 'Belum Dimulai'}')" class="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 w-8 h-8 rounded-lg flex items-center justify-center transition-colors" title="Update Progress">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button onclick="window.deleteProject('${id}')" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 w-8 h-8 rounded-lg flex items-center justify-center transition-colors" title="Hapus Project">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
        } 
        // JIKA BUKAN (CONTOH: STAFF / LEADER DIVISI) -> TAMPILKAN LABEL VIEW ONLY
        else {
            actionButtons = `
                <div class="flex items-center justify-center">
                    <span class="text-[10px] font-bold uppercase text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">View Only</span>
                </div>
            `;
        }

        // Render Baris Tabel
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors";
        tr.innerHTML = `
            <td class="p-4 align-top font-medium text-gray-900 dark:text-white">${id.substring(0, 8).toUpperCase()}</td>
            <td class="p-4 align-top">
                <p class="font-bold text-gray-800 dark:text-white mb-1">${data.name}</p>
                <span class="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md font-medium">${data.category}</span>
                <p class="text-xs text-gray-500 mt-2 line-clamp-2">${data.description}</p>
            </td>
            <td class="p-4 align-top">
                <p class="font-semibold text-gray-800 dark:text-gray-200">${data.team}</p>
                <p class="text-sm text-gray-500 mt-1"><i class="fa-regular fa-user mr-1"></i> ${data.pic}</p>
            </td>
            <td class="p-4 align-top text-sm">
                <p class="text-gray-600 dark:text-gray-400 mb-1"><span class="font-medium text-gray-800 dark:text-gray-200">Start:</span> ${data.startDate}</p>
                <p class="text-gray-600 dark:text-gray-400"><span class="font-medium text-gray-800 dark:text-gray-200">End:</span> ${data.endDate}</p>
            </td>
            <td class="p-4 align-top">
                <div class="flex items-center gap-2 mb-2">
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold 
                        ${data.status === 'Completed' ? 'bg-green-100 text-green-600' : 
                          data.status === 'On Progress' ? 'bg-blue-100 text-blue-600' : 
                          data.status === 'Review' ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-600'}">
                        ${data.status || 'Belum Dimulai'}
                    </span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1">
                    <div class="bg-primary h-2 rounded-full" style="width: ${data.progress || 0}%"></div>
                </div>
                <p class="text-xs text-gray-500 font-medium text-right">${data.progress || 0}%</p>
            </td>
            <td class="p-4 align-top">
                <!-- INI ADALAH TEMPAT TOMBOL AKSI YANG SUDAH KITA FILTER DI ATAS -->
                ${actionButtons}
            </td>
        `;
        tableProjectBody.appendChild(tr);
    });
});


// ==========================================
// 4. FITUR CREATE DATA (Semua Role Bisa Akses)
// ==========================================
if (btnTambahProject) {
    btnTambahProject.addEventListener('click', () => {
        modalAddProject.classList.remove('hidden');
    });
}

// Tutup Modal Add
document.querySelectorAll('#modalAddProject .btnCloseModal, #modalAddProject .modal-backdrop').forEach(el => {
    el.addEventListener('click', () => modalAddProject.classList.add('hidden'));
});

// Submit Data Baru
if (formAddProject) {
    formAddProject.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnSubmit = document.getElementById('btnSubmitProject');
        const originalText = btnSubmit.innerHTML;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
        btnSubmit.disabled = true;

        try {
            await addDoc(collection(db, "projects"), {
                name: document.getElementById('projNama').value,
                description: document.getElementById('projDeskripsi').value,
                category: document.getElementById('projKategori').value,
                team: document.getElementById('projTeam').value,
                pic: document.getElementById('projPIC').value,
                startDate: document.getElementById('projStartDate').value,
                endDate: document.getElementById('projEndDate').value,
                priority: document.querySelector('input[name="projPriority"]:checked').value,
                status: 'Belum Dimulai',
                progress: 0,
                createdAt: serverTimestamp()
            });

            // LOG ACTIVITY: CREATE
            const namaProj = document.getElementById('projNama').value;
            await logActivity('CREATE', 'Project', `Menambahkan project baru: ${namaProj}`);

            Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Project baru telah ditambahkan!', showConfirmButton: false, timer: 1500 });
            formAddProject.reset();
            modalAddProject.classList.add('hidden');
        } catch (error) {
            console.error("Error adding document: ", error);
            Swal.fire('Error', 'Gagal menyimpan data project.', 'error');
        } finally {
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false;
        }
    });
}


// ==========================================
// 5. FITUR UPDATE & DELETE (Terekspos ke Global Window agar HTML onclick bekerja)
// ==========================================

// Fungsi Buka Modal Edit
window.openEditProject = (id, currentProgress, currentStatus) => {
    // Pengamanan Ekstra: Jika entah bagaimana user biasa berhasil memanggil fungsi ini, blokir!
    if (!canEdit) {
        Swal.fire('Akses Ditolak', 'Hanya SPV dan Leader Central yang dapat mengedit data.', 'error');
        return;
    }

    document.getElementById('editProjId').value = id;
    document.getElementById('editProgress').value = currentProgress;
    document.getElementById('editStatus').value = currentStatus;
    modalEditProject.classList.remove('hidden');
};

// Tutup Modal Edit
document.querySelectorAll('#modalEditProject .modal-backdrop').forEach(el => {
    el.addEventListener('click', () => modalEditProject.classList.add('hidden'));
});

// Fungsi Simpan Update
document.getElementById('btnSaveUpdate')?.addEventListener('click', async () => {
    if (!canEdit) return; // Pengamanan Ekstra

    const id = document.getElementById('editProjId').value;
    const newProgress = document.getElementById('editProgress').value;
    const newStatus = document.getElementById('editStatus').value;

    try {
        await updateDoc(doc(db, "projects", id), {
            progress: parseFloat(newProgress),
            status: newStatus
        });
        
        // LOG ACTIVITY: UPDATE
        await logActivity('UPDATE', 'Project', `Memperbarui progress/status pada Project ID: ${id}`);

        Swal.fire({ icon: 'success', title: 'Diperbarui', showConfirmButton: false, timer: 1500 });
        modalEditProject.classList.add('hidden');
    } catch (error) {
        Swal.fire('Error', 'Gagal memperbarui data.', 'error');
    }
});

// Fungsi Delete
window.deleteProject = async (id) => {
    if (!canEdit) {
        Swal.fire('Akses Ditolak', 'Hanya SPV dan Leader Central yang dapat menghapus data.', 'error');
        return;
    }

    const result = await Swal.fire({
        title: 'Hapus Project?',
        text: "Data yang dihapus tidak dapat dikembalikan!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Ya, Hapus!'
    });

    if (result.isConfirmed) {
        try {
            await deleteDoc(doc(db, "projects", id));
            
            // LOG ACTIVITY: DELETE
            await logActivity('DELETE', 'Project', `Menghapus Project ID: ${id}`);

            Swal.fire({ icon: 'success', title: 'Terhapus', showConfirmButton: false, timer: 1500 });
        } catch (error) {
            Swal.fire('Error', 'Gagal menghapus data.', 'error');
        }
    }
};