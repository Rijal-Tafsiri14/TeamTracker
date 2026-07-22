import { db } from './firebase.js';
import { collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ==========================================
// 1. FUNGSI UNTUK MENCATAT LOG (EXPORT)
// ==========================================
// Fungsi ini bisa dipanggil dari file JS mana saja untuk mencatat aktivitas
export const logActivity = async (action, moduleName, description) => {
    const userName = localStorage.getItem('userName') || 'System';
    const userRole = localStorage.getItem('userRole') || 'Unknown';
    
    try {
        await addDoc(collection(db, "activity_logs"), {
            user: userName,
            role: userRole,
            action: action, // Contoh: 'CREATE', 'UPDATE', 'DELETE'
            module: moduleName, // Contoh: 'Project', 'Issue', 'Pending'
            description: description, // Contoh: 'Menambahkan project baru: Aplikasi Kasir'
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("Gagal mencatat log aktivitas:", error);
    }
};

// ==========================================
// 2. RENDER ACTIVITY LOG KE HALAMAN
// ==========================================
const logContainer = document.getElementById('logContainer');
const filterLogModule = document.getElementById('filterLogModule');
let rawLogs = [];

if (logContainer) {
    // Ambil 100 log terbaru agar tidak memberatkan memori
    const q = query(collection(db, "activity_logs"), orderBy("timestamp", "desc"), limit(100));

    onSnapshot(q, (snapshot) => {
        rawLogs = [];
        snapshot.forEach(doc => {
            rawLogs.push({ id: doc.id, ...doc.data() });
        });
        renderLogs();
    });
}

function renderLogs() {
    if (!logContainer) return;
    logContainer.innerHTML = '';

    const filterValue = filterLogModule ? filterLogModule.value : 'all';
    
    const filteredLogs = rawLogs.filter(log => {
        if (filterValue === 'all') return true;
        return (log.module || '').toLowerCase() === filterValue.toLowerCase();
    });

    if (filteredLogs.length === 0) {
        logContainer.innerHTML = `<div class="text-center text-gray-500 py-10">Belum ada aktivitas tercatat.</div>`;
        return;
    }

    filteredLogs.forEach(log => {
        // Konversi Timestamp Firebase ke format jam/tanggal
        let timeString = 'Baru saja';
        if (log.timestamp) {
            const date = log.timestamp.toDate();
            timeString = date.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        }

        // Tentukan warna dan ikon berdasarkan jenis Action
        let icon = 'fa-pen';
        let colorClass = 'bg-blue-100 text-blue-500';
        
        const act = (log.action || '').toUpperCase();
        if (act === 'CREATE') {
            icon = 'fa-plus';
            colorClass = 'bg-green-100 text-green-500';
        } else if (act === 'DELETE') {
            icon = 'fa-trash';
            colorClass = 'bg-red-100 text-red-500';
        } else if (act === 'UPDATE') {
            icon = 'fa-pen-to-square';
            colorClass = 'bg-orange-100 text-orange-500';
        }

        const logHTML = `
            <div class="relative flex items-start gap-4 sm:gap-6 group">
                <!-- Icon Timeline (Hidden di layar sangat kecil) -->
                <div class="hidden sm:flex z-10 w-10 h-10 rounded-full ${colorClass} items-center justify-center shrink-0 border-4 border-white dark:border-darkBox shadow-sm transition-transform group-hover:scale-110">
                    <i class="fa-solid ${icon} text-sm"></i>
                </div>
                
                <!-- Card Konten -->
                <div class="flex-1 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <div class="flex flex-col sm:flex-row justify-between sm:items-center mb-1 gap-2">
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-gray-800 dark:text-white">${log.user}</span>
                            <span class="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">${log.module}</span>
                        </div>
                        <span class="text-xs font-semibold text-gray-400 flex items-center gap-1">
                            <i class="fa-regular fa-clock"></i> ${timeString}
                        </span>
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">${log.description}</p>
                </div>
            </div>
        `;
        logContainer.insertAdjacentHTML('beforeend', logHTML);
    });
}

// Event listener untuk filter module
if (filterLogModule) {
    filterLogModule.addEventListener('change', renderLogs);
}