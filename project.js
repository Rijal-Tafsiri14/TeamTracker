import { logActivity } from './activity.js';
import { db } from './firebase.js';
// Tambahkan getDoc di import atas
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ==========================================
// 1. PENGECEKAN HAK AKSES (ROLE-BASED ACCESS)
// ==========================================
const userRole = localStorage.getItem('userRole');
const canEdit = (userRole === 'Leader Central' || userRole === 'SPV');

// ==========================================
// 2. REFERENSI ELEMEN DOM
// ==========================================
const tableProjectBody = document.getElementById('tableProjectBody');
const formAddProject = document.getElementById('formAddProject');
const btnTambahProject = document.getElementById('btnTambahProject');
const modalAddProject = document.getElementById('modalAddProject');
const modalEditProject = document.getElementById('modalEditProject');

const filterTeamProj = document.getElementById('filterTeamProject');
const filterStatusProj = document.getElementById('filterStatusProject');

// ==========================================
// 3. FITUR READ DATA
// ==========================================
onSnapshot(collection(db, "projects"), (snapshot) => {
    tableProjectBody.innerHTML = '';

    if (snapshot.empty) {
        tableProjectBody.innerHTML = `<tr class="empty-row"><td colspan="6" class="p-8 text-center text-gray-500">Belum ada data project.</td></tr>`;
        return;
    }

    snapshot.forEach((docSnap) => {
        const id = docSnap.id;
        const data = docSnap.data();

        const displayId = `PRJ-${id.substring(0, 6).toUpperCase()}`;

        let actionButtons = '';

        if (canEdit) {
            // Parameter window.openEditProject sekarang cukup melempar ID saja
            actionButtons = `
                <div class="flex items-center justify-center gap-2">
                    <button onclick="window.openEditProject('${id}')" class="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg flex items-center justify-center transition-colors text-xs font-bold" title="Update Project">
                        <i class="fa-solid fa-pen-to-square mr-1"></i> Update
                    </button>
                    <button onclick="window.deleteProject('${id}')" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 w-8 h-8 rounded-lg flex items-center justify-center transition-colors" title="Hapus Project">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
        } else {
            actionButtons = `
                <div class="flex items-center justify-center">
                    <span class="text-[10px] font-bold uppercase text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">View Only</span>
                </div>
            `;
        }

        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors project-row";
        tr.setAttribute('data-team', (data.team || '').toLowerCase());
        tr.setAttribute('data-status', (data.status || 'Belum Dimulai').toLowerCase());

        tr.innerHTML = `
            <td class="p-4 align-top font-bold text-blue-600 dark:text-blue-400">
                <span class="bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded border border-blue-100 dark:border-blue-500/20 whitespace-nowrap">
                    <i class="fa-solid fa-hashtag mr-1"></i>${displayId}
                </span>
            </td>
            <td class="p-4 align-top w-1/3">
                <p class="font-bold text-gray-800 dark:text-white mb-1">${data.name}</p>
                <span class="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md font-medium inline-block mb-2">${data.category}</span>
                <p class="text-xs text-gray-500 line-clamp-3 leading-relaxed whitespace-pre-line">${data.description}</p>
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
                ${actionButtons}
            </td>
        `;
        tableProjectBody.appendChild(tr);
    });

    filterDataProject();
});

// ==========================================
// 4. FITUR CREATE DATA 
// ==========================================
if (btnTambahProject) {
    btnTambahProject.addEventListener('click', () => {
        modalAddProject.classList.remove('hidden');
    });
}

document.querySelectorAll('#modalAddProject .btnCloseModal, #modalAddProject .modal-backdrop').forEach(el => {
    el.addEventListener('click', () => modalAddProject.classList.add('hidden'));
});

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

            const namaProj = document.getElementById('projNama').value;
            await logActivity('CREATE', 'Project', `Menambahkan project baru: ${namaProj}`);

            Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Project baru telah ditambahkan!', showConfirmButton: false, timer: 1500 });
            formAddProject.reset();
            modalAddProject.classList.add('hidden');
        } catch (error) {
            Swal.fire('Error', 'Gagal menyimpan data project.', 'error');
        } finally {
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false;
        }
    });
}

// ==========================================
// 5. FITUR UPDATE & DELETE
// ==========================================
// Fungsi Buka Modal Edit (Menarik Data Full dari Firebase)
window.openEditProject = async (id) => {
    if (!canEdit) {
        Swal.fire('Akses Ditolak', 'Hanya SPV dan Leader Central yang dapat mengedit data.', 'error');
        return;
    }

    try {
        const docRef = doc(db, "projects", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Masukkan data ke dalam form edit
            document.getElementById('editProjId').value = id;
            document.getElementById('editProjNama').value = data.name || '';
            document.getElementById('editProjDeskripsi').value = data.description || '';
            document.getElementById('editProjKategori').value = data.category || '';
            document.getElementById('editProjTeam').value = data.team || '';
            document.getElementById('editProjPIC').value = data.pic || '';
            document.getElementById('editProjPriority').value = data.priority || 'Medium';
            document.getElementById('editProjStartDate').value = data.startDate || '';
            document.getElementById('editProjEndDate').value = data.endDate || '';
            document.getElementById('editProjStatus').value = data.status || 'Belum Dimulai';
            document.getElementById('editProjProgress').value = data.progress || 0;
            
            modalEditProject.classList.remove('hidden');
        }
    } catch (error) {
        Swal.fire('Error', 'Gagal memuat data project.', 'error');
    }
};

// Tutup Modal Edit
document.querySelectorAll('#modalEditProject .btnCloseModal, #modalEditProject .modal-backdrop').forEach(el => {
    el.addEventListener('click', () => modalEditProject.classList.add('hidden'));
});

// Proses Simpan Perubahan Full Edit
const formEditProject = document.getElementById('formEditProject');
if (formEditProject) {
    formEditProject.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!canEdit) return;

        const id = document.getElementById('editProjId').value;
        const btnSubmit = document.getElementById('btnSaveUpdateProject');
        const originalText = btnSubmit.innerHTML;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
        btnSubmit.disabled = true;

        try {
            await updateDoc(doc(db, "projects", id), {
                name: document.getElementById('editProjNama').value,
                description: document.getElementById('editProjDeskripsi').value,
                category: document.getElementById('editProjKategori').value,
                team: document.getElementById('editProjTeam').value,
                pic: document.getElementById('editProjPIC').value,
                priority: document.getElementById('editProjPriority').value,
                startDate: document.getElementById('editProjStartDate').value,
                endDate: document.getElementById('editProjEndDate').value,
                status: document.getElementById('editProjStatus').value,
                progress: parseFloat(document.getElementById('editProjProgress').value),
                lastUpdate: serverTimestamp()
            });
            
            const displayId = `PRJ-${id.substring(0, 6).toUpperCase()}`;
            const projNama = document.getElementById('editProjNama').value;
            await logActivity('UPDATE', 'Project', `Update informasi project ID: ${displayId} (${projNama})`);

            Swal.fire({ icon: 'success', title: 'Data Diperbarui', showConfirmButton: false, timer: 1500 });
            modalEditProject.classList.add('hidden');
        } catch (error) {
            Swal.fire('Error', 'Gagal memperbarui data.', 'error');
        } finally {
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false;
        }
    });
}

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
            
            const displayId = `PRJ-${id.substring(0, 6).toUpperCase()}`;
            await logActivity('DELETE', 'Project', `Menghapus Project ID: ${displayId}`);

            Swal.fire({ icon: 'success', title: 'Terhapus', showConfirmButton: false, timer: 1500 });
        } catch (error) {
            Swal.fire('Error', 'Gagal menghapus data.', 'error');
        }
    }
};

// ==========================================
// 6. FITUR FILTER PROJECT
// ==========================================
function filterDataProject() {
    const teamTerm = filterTeamProj ? filterTeamProj.value.toLowerCase() : 'all';
    const statusTerm = filterStatusProj ? filterStatusProj.value.toLowerCase() : 'all';
    
    const rows = document.querySelectorAll('#tableProjectBody .project-row');

    Array.from(rows).forEach(row => {
        const rowTeam = row.getAttribute('data-team') || '';
        const rowStatus = row.getAttribute('data-status') || '';

        const matchesTeam = teamTerm === 'all' || rowTeam === teamTerm;
        const matchesStatus = statusTerm === 'all' || rowStatus === statusTerm;

        row.style.display = (matchesTeam && matchesStatus) ? 'table-row' : 'none';
    });
}

if (filterTeamProj) filterTeamProj.addEventListener('change', filterDataProject);
if (filterStatusProj) filterStatusProj.addEventListener('change', filterDataProject);
