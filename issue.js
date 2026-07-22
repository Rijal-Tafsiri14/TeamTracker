import { logActivity } from './activity.js';
import { db } from './firebase.js';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, serverTimestamp, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ==========================================
// 1. PENGECEKAN HAK AKSES (ROLE-BASED ACCESS)
// ==========================================
const userRole = localStorage.getItem('userRole');
const canEdit = (userRole === 'Leader Central' || userRole === 'SPV');

// ==========================================
// 2. REFERENSI ELEMEN DOM
// ==========================================
const container = document.getElementById('issueContainer');
const formIssue = document.getElementById('formAddIssue');
const modalIssue = document.getElementById('modalAddIssue');
const btnOpenModal = document.getElementById('btnOpenModalIssue');
const backdrop = document.querySelector('.modal-backdrop-issue');

const formEdit = document.getElementById('formEditIssue');
const modalEdit = document.getElementById('modalEditIssue');
const backdropEdit = document.querySelector('.modal-backdrop-edit-issue');

// 1. Logika Tampil/Sembunyi Modal Add
if (btnOpenModal) btnOpenModal.addEventListener('click', () => modalIssue.classList.remove('hidden'));
if (backdrop) backdrop.addEventListener('click', () => modalIssue.classList.add('hidden'));
if (backdropEdit) backdropEdit.addEventListener('click', () => modalEdit.classList.add('hidden'));

// ==========================================
// 3. FETCH DATA & RENDER CARD DENGAN FILTER AKSES
// ==========================================
const q = query(collection(db, "issue"), orderBy("createdAt", "desc"));
onSnapshot(q, (snapshot) => {
    container.innerHTML = ''; 
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const card = document.createElement('div');
        card.className = "bg-white dark:bg-darkBox p-5 rounded-xl border-l-4 border-red-500 shadow-sm flex flex-col justify-between";
        
        // Warna Badge Status
        let statusColor = "bg-red-100 text-red-600";
        if (data.status === "Investigating") statusColor = "bg-orange-100 text-orange-600";
        if (data.status === "Resolved") statusColor = "bg-green-100 text-green-600"; 
        
        // Warna Ikon Prioritas
        let priorityColor = "text-gray-400";
        if (data.priority === "Medium") priorityColor = "text-blue-500";
        if (data.priority === "High") priorityColor = "text-orange-500";
        if (data.priority === "Critical") priorityColor = "text-red-600 font-bold animate-pulse"; 

        // Logika Render Tombol Berdasarkan Role
        let actionButtons = '';
        if (canEdit) {
            actionButtons = `
                <div class="flex gap-3">
                    <button onclick="window.bukaModalEdit('${docSnap.id}')" class="text-gray-400 hover:text-blue-500 transition-colors" title="Edit Issue">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button onclick="window.hapusIssue('${docSnap.id}')" class="text-gray-400 hover:text-red-500 transition-colors" title="Hapus Issue">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
        } else {
            actionButtons = `
                <span class="text-[10px] font-bold uppercase text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700">
                    <i class="fa-solid fa-lock mr-1"></i> View Only
                </span>
            `;
        }

        const issueID = `ISU-${docSnap.id.substring(0, 6).toUpperCase()}`; // Bikin ID Cantik

        card.innerHTML = `
            <div>
                <div class="flex justify-between items-start mb-3">
                    <span class="px-3 py-1 rounded-md text-xs font-bold ${statusColor}">${data.status}</span>
                    ${actionButtons}
                </div>
                
                <!-- INI BAGIAN YANG DIROMBAK: MUNCULIN ID -->
                <div class="mb-2">
                    <span class="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded-md mb-2 inline-block">
                        <i class="fa-solid fa-hashtag mr-1"></i>${issueID}
                    </span>
                    <h4 class="font-bold text-gray-800 dark:text-white text-lg leading-tight">${data.issue}</h4>
                </div>
                
                <!-- Info Grid: Tanggal, Team, PIC, Priority -->
                <div class="grid grid-cols-2 gap-2 text-xs mb-4 mt-3 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                    <div class="text-gray-500"><i class="fa-regular fa-calendar mr-1"></i> ${data.tanggal || '-'}</div>
                    <div class="text-primary font-bold"><i class="fa-solid fa-users mr-1"></i> ${data.team}</div>
                    <div class="text-gray-500"><i class="fa-regular fa-user mr-1"></i> ${data.pic || '-'}</div>
                    <div class="${priorityColor}"><i class="fa-solid fa-flag mr-1"></i> ${data.priority || '-'}</div>
                </div>
                
                <div class="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                    <div>
                        <p class="text-xs font-bold text-gray-400">KRONOLOGI:</p>
                        <p class="leading-snug">${data.kronologi}</p>
                    </div>
                    <div>
                        <p class="text-xs font-bold text-gray-400">ACTION TAKEN:</p>
                        <p class="leading-snug font-medium text-gray-700 dark:text-gray-300 border-l-2 border-primary pl-2">${data.actionTaken}</p>
                    </div>
                </div>
            </div>
        `;        
        if (data.status === "Resolved") {
            card.classList.replace('border-red-500', 'border-green-500');
        }

        container.appendChild(card);
    });
});

// ==========================================
// 4. TAMBAH ISSUE BARU (Semua Role Bisa)
// ==========================================
if (formIssue) {
    formIssue.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "issue"), {
                issue: document.getElementById('issueNama').value,
                kronologi: document.getElementById('issueKronologi').value,
                actionTaken: document.getElementById('issueAction').value,
                team: document.getElementById('issueTeam').value,
                status: document.getElementById('issueStatus').value,
                tanggal: document.getElementById('issueTanggal').value, 
                pic: document.getElementById('issuePIC').value,         
                priority: document.getElementById('issuePriority').value, 
                createdAt: serverTimestamp()
            });

            // LOG ACTIVITY: CREATE
            const issueNama = document.getElementById('issueNama').value;
            await logActivity('CREATE', 'Issue', `Melaporkan issue baru: ${issueNama}`);

            Swal.fire({ icon: 'success', title: 'Issue ditambahkan!', timer: 1500, showConfirmButton: false });
            modalIssue.classList.add('hidden'); 
            formIssue.reset(); 
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    });
}

// ==========================================
// 5. BUKA MODAL EDIT (Proteksi Khusus Admin/SPV)
// ==========================================
window.bukaModalEdit = async (id) => {
    if (!canEdit) {
        Swal.fire('Akses Ditolak', 'Hanya SPV dan Leader Central yang dapat mengedit data.', 'error');
        return;
    }

    try {
        const docRef = doc(db, "issue", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            document.getElementById('editIssueId').value = id;
            document.getElementById('editIssueNama').value = data.issue;
            document.getElementById('editIssueKronologi').value = data.kronologi;
            document.getElementById('editIssueAction').value = data.actionTaken;
            document.getElementById('editIssueTeam').value = data.team;
            document.getElementById('editIssueStatus').value = data.status;
            
            document.getElementById('editIssueTanggal').value = data.tanggal || '';
            document.getElementById('editIssuePIC').value = data.pic || '';
            document.getElementById('editIssuePriority').value = data.priority || 'Medium';
            
            modalEdit.classList.remove('hidden');
        }
    } catch (error) {
        Swal.fire('Error', 'Gagal mengambil data', 'error');
    }
};

// ==========================================
// 6. SIMPAN HASIL EDIT
// ==========================================
if (formEdit) {
    formEdit.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!canEdit) return; // Proteksi ganda

        const id = document.getElementById('editIssueId').value;
        
        try {
            const docRef = doc(db, "issue", id);
            await updateDoc(docRef, {
                issue: document.getElementById('editIssueNama').value,
                kronologi: document.getElementById('editIssueKronologi').value,
                actionTaken: document.getElementById('editIssueAction').value,
                team: document.getElementById('editIssueTeam').value,
                status: document.getElementById('editIssueStatus').value,
                tanggal: document.getElementById('editIssueTanggal').value,
                pic: document.getElementById('editIssuePIC').value,
                priority: document.getElementById('editIssuePriority').value,
                lastUpdate: serverTimestamp() // Tambahan info kapan diedit terakhir
            });
            
            // LOG ACTIVITY: UPDATE
            const issueUpdate = document.getElementById('editIssueNama').value;
            await logActivity('UPDATE', 'Issue', `Memperbarui issue: ${issueUpdate}`);

            Swal.fire({ icon: 'success', title: 'Data Diperbarui!', timer: 1500, showConfirmButton: false });
            modalEdit.classList.add('hidden'); 
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    });
}

// ==========================================
// 7. HAPUS DATA (Proteksi Khusus Admin/SPV)
// ==========================================
window.hapusIssue = async (id) => {
    if (!canEdit) {
        Swal.fire('Akses Ditolak', 'Hanya SPV dan Leader Central yang dapat menghapus data.', 'error');
        return;
    }

    const result = await Swal.fire({
        title: 'Hapus Issue?',
        text: "Data tidak bisa dikembalikan!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Hapus'
    });

    if (result.isConfirmed) {
        try {
            await deleteDoc(doc(db, "issue", id));
            
            // LOG ACTIVITY: DELETE
            await logActivity('DELETE', 'Issue', `Menghapus data issue ID: ${id}`);

            Swal.fire({ icon: 'success', title: 'Terhapus!', timer: 1000, showConfirmButton: false });
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    }
};