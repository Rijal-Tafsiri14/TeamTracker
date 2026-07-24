import { logActivity } from './activity.js';
import { db } from './firebase.js';
import { 
    collection, onSnapshot, query, orderBy, addDoc, 
    deleteDoc, doc, serverTimestamp, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ==========================================
// 1. PENGECEKAN HAK AKSES (ROLE-BASED ACCESS)
// ==========================================
const userRole = localStorage.getItem('userRole');
const canEdit = (userRole === 'Leader Central' || userRole === 'SPV');

// ==========================================
// 2. REFERENSI ELEMEN DOM
// ==========================================
const container = document.getElementById('pendingContainer');
const modalAdd = document.getElementById('modalAddPending');
const modalEdit = document.getElementById('modalEditPending');
const form = document.getElementById('formAddPending');

// ==========================================
// 3. FITUR READ DATA (REALTIME & FILTER AKSES)
// ==========================================
const q = query(collection(db, "pending"), orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
    container.innerHTML = ''; 
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;
        
        const displayNoPo = data.noPo || "Tanpa PO";
        const displayKet = data.keterangan || "Tidak ada keterangan";
        const status = data.status || 'Pending';
        const tgl = data.tanggalPending || data.tanggal || 'No Date';
        
        let statusColor = status === 'Done' ? 'bg-green-500' : (status === 'In Progress' ? 'bg-blue-500' : 'bg-orange-500');
        
        // PEMBERSIH TEKS: Mengamankan tanda kutip dan enter (newline) agar tidak merusak tag onclick HTML
        const escapeHTML = (str) => {
            if (!str) return '';
            return String(str)
                .replace(/\\/g, "\\\\")
                .replace(/'/g, "\\'")
                .replace(/"/g, "&quot;")
                .replace(/\n/g, "\\n")
                .replace(/\r/g, "");
        };

        const safeNoPo = escapeHTML(data.noPo);
        const safeTgl = escapeHTML(data.tanggalPending || data.tanggal);
        const safeTeam = escapeHTML(data.team);
        const safeKet = escapeHTML(data.keterangan);
        const safeFu = escapeHTML(data.followUp);
        const safePic = escapeHTML(data.picProduct);
        const safeStatus = escapeHTML(data.status || 'Pending');

        // Logika render tombol berdasarkan akses
        let deleteButtonHTML = '';
        let editButtonHTML = '';

        if (canEdit) {
            deleteButtonHTML = `
                <button onclick="window.hapusTugas('${id}')" class="text-gray-400 hover:text-red-500 transition-colors" title="Hapus Tugas">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;
            // Menggunakan variabel yang sudah di-escape (aman)
            editButtonHTML = `
                <button onclick="window.editTugas('${id}', '${safeNoPo}', '${safeTgl}', '${safeTeam}', '${safeKet}', '${safeFu}', '${safePic}', '${safeStatus}')" 
                class="w-full py-2 bg-gray-100 dark:bg-gray-700 hover:bg-primary hover:text-white rounded-lg text-xs font-bold transition-colors">
                    <i class="fa-solid fa-pen-to-square mr-1"></i> Edit Lengkap
                </button>
            `;
        } else {
            // Tampilan untuk Staff / Leader Divisi
            editButtonHTML = `
                <div class="w-full py-2 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-lg text-xs font-bold text-center border border-gray-100 dark:border-gray-700 cursor-not-allowed">
                    <i class="fa-solid fa-lock mr-1"></i> View Only
                </div>
            `;
        }
        
        const pendingID = `PND-${id.substring(0, 6).toUpperCase()}`; // Bikin ID Cantik

        const card = document.createElement('div');
        card.setAttribute('data-team', (data.team || '').toLowerCase());
        card.className = "bg-white dark:bg-darkBox p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all flex flex-col";
        card.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <span class="text-[10px] font-bold uppercase text-white ${statusColor} px-2 py-1 rounded">${status}</span>
                ${deleteButtonHTML}
            </div>
            
            <div class="mb-2">
                <span class="text-xs font-bold text-orange-500 bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded-md mb-2 inline-block">
                    <i class="fa-solid fa-hashtag mr-1"></i>${pendingID}
                </span>
                <h4 class="font-bold text-gray-800 dark:text-white text-lg">${displayNoPo}</h4>
            </div>
            
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-2 flex-1 whitespace-pre-line">${displayKet}</p>
            <div class="text-xs text-gray-400 mb-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                <p class="mb-1"><i class="fa-solid fa-calendar-day mr-1"></i> ${tgl}</p>
                <p class="mb-1"><i class="fa-solid fa-users mr-1"></i> Team: <span class="font-medium text-gray-600 dark:text-gray-300">${data.team || '-'}</span></p>
                <p><i class="fa-regular fa-user mr-1"></i> PIC: <span class="font-medium text-gray-600 dark:text-gray-300">${data.picProduct || '-'}</span></p>
            </div>
            ${editButtonHTML}
        `;
        container.appendChild(card);
    });
});

// ==========================================
// 4. FITUR DELETE (Dilengkapi Proteksi Tambahan)
// ==========================================
window.hapusTugas = async (id) => {
    if (!canEdit) {
        Swal.fire('Akses Ditolak', 'Hanya SPV dan Leader Central yang dapat menghapus data.', 'error');
        return;
    }

    const result = await Swal.fire({
        title: 'Hapus Data Pending?',
        text: "Data yang dihapus tidak dapat dikembalikan!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Ya, Hapus!'
    });

    if (result.isConfirmed) {
        try {
            await deleteDoc(doc(db, "pending", id));
            await logActivity('DELETE', 'Pending', `Menghapus data pending ID: ${id}`);
            Swal.fire({ icon: 'success', title: 'Terhapus', showConfirmButton: false, timer: 1500 });
        } catch (error) {
            Swal.fire('Error', 'Gagal menghapus data.', 'error');
        }
    }
};

// ==========================================
// 5. FITUR CREATE DATA (Semua User Bisa)
// ==========================================
// Buka/Tutup Modal Add
document.getElementById('btnOpenModalPending').addEventListener('click', () => modalAdd.classList.remove('hidden'));
document.querySelector('.modal-backdrop-pending').addEventListener('click', () => modalAdd.classList.add('hidden'));

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await addDoc(collection(db, "pending"), {
            noPo: document.getElementById('pendNoPo').value,
            tanggal: document.getElementById('pendTanggal').value,
            team: document.getElementById('pendTeam').value,
            keterangan: document.getElementById('pendKeterangan').value,
            followUp: document.getElementById('pendFollowUp').value,
            picProduct: document.getElementById('pendPicProduct').value,
            status: "Pending",
            createdAt: serverTimestamp()
        });
        
        const noPo = document.getElementById('pendNoPo').value || 'Tanpa PO';
        await logActivity('CREATE', 'Pending', `Menambahkan tugas pending baru (PO: ${noPo})`);

        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Data tersimpan!', showConfirmButton: false, timer: 2000 });
        modalAdd.classList.add('hidden');
        form.reset();
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
    }
});

// ==========================================
// 6. FITUR UPDATE DATA (Khusus Admin/SPV)
// ==========================================
// Buka Modal Edit
window.editTugas = (id, noPo, tgl, team, ket, fu, pic, status) => {
    if (!canEdit) {
        Swal.fire('Akses Ditolak', 'Hanya SPV dan Leader Central yang dapat mengedit data.', 'error');
        return;
    }

    document.getElementById('editPendingId').value = id;
    document.getElementById('editNoPo').value = (noPo !== 'undefined' && noPo !== 'null') ? noPo : '';
    document.getElementById('editTanggal').value = (tgl !== 'undefined' && tgl !== 'null') ? tgl : '';
    document.getElementById('editTeam').value = (team !== 'undefined' && team !== 'null') ? team : '';
    document.getElementById('editKeterangan').value = (ket !== 'undefined' && ket !== 'null') ? ket : '';
    document.getElementById('editFollowUp').value = (fu !== 'undefined' && fu !== 'null') ? fu : '';
    document.getElementById('editPicProduct').value = (pic !== 'undefined' && pic !== 'null') ? pic : '';
    document.getElementById('editPendingStatus').value = (status !== 'undefined' && status !== 'null') ? status : 'Pending';
    
    modalEdit.classList.remove('hidden');
};

document.querySelector('.modal-backdrop-edit').addEventListener('click', () => modalEdit.classList.add('hidden'));

// Simpan Update
document.getElementById('btnSavePendingUpdate').addEventListener('click', async () => {
    if (!canEdit) return;

    const id = document.getElementById('editPendingId').value;
    try {
        await updateDoc(doc(db, "pending", id), {
            noPo: document.getElementById('editNoPo').value,
            tanggal: document.getElementById('editTanggal').value,
            team: document.getElementById('editTeam').value,
            keterangan: document.getElementById('editKeterangan').value,
            followUp: document.getElementById('editFollowUp').value,
            picProduct: document.getElementById('editPicProduct').value,
            status: document.getElementById('editPendingStatus').value,
            lastUpdate: serverTimestamp()
        });
        
        const noPoUpdate = document.getElementById('editNoPo').value || 'Tanpa PO';
        await logActivity('UPDATE', 'Pending', `Memperbarui data pending (PO: ${noPoUpdate})`);

        modalEdit.classList.add('hidden');
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Data diupdate', showConfirmButton: false, timer: 1500 });
    } catch (e) {
        Swal.fire('Error', 'Gagal update: ' + e.message, 'error');
    }
});

// ==========================================
// 7. FITUR FILTER & SEARCH
// ==========================================
const searchInput = document.getElementById('searchPending');
const filterStatus = document.getElementById('filterStatus');
const filterTeam = document.getElementById('filterTeam'); 

function filterData() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusTerm = filterStatus.value.toLowerCase();
    const teamTerm = filterTeam ? filterTeam.value.toLowerCase() : 'all'; 

    const cards = container.children;

    Array.from(cards).forEach(card => {
        const text = card.textContent.toLowerCase();
        const status = card.querySelector('span').textContent.toLowerCase();
        const cardTeam = card.getAttribute('data-team') || ''; 

        const matchesSearch = text.includes(searchTerm);
        const matchesStatus = statusTerm === 'all' || status.includes(statusTerm);
        const matchesTeam = teamTerm === 'all' || cardTeam === teamTerm;

        card.style.display = (matchesSearch && matchesStatus && matchesTeam) ? 'flex' : 'none';
    });
}

searchInput.addEventListener('input', filterData);
filterStatus.addEventListener('change', filterData);
if (filterTeam) filterTeam.addEventListener('change', filterData);
