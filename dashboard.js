import { db } from './firebase.js';
import { collection, onSnapshot, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ==========================================
// 1. SESSION MANAGEMENT & UI
// ==========================================
const isLoggedIn = localStorage.getItem('isLoggedIn');
const userName = localStorage.getItem('userName');
const userRole = localStorage.getItem('userRole');
const userTeam = localStorage.getItem('userTeam');

if (isLoggedIn !== 'true' || !userName) {
    window.location.replace('login.html');
}

document.getElementById('profileName').textContent = userName;
document.getElementById('profileRole').textContent = `${userRole} - ${userTeam}`;
document.getElementById('profileInitial').textContent = userName.charAt(0).toUpperCase();

const menuUser = document.getElementById('menuUser');
if (userRole === 'Leader Central' || userRole === 'SPV') {
    menuUser.classList.remove('hidden');
    menuUser.classList.add('flex');
}

const html = document.documentElement;
const btnDarkMode = document.getElementById('btnDarkMode');
const iconDark = document.getElementById('iconDark');

function updateDarkModeIcon() {
    iconDark.className = html.classList.contains('dark') ? 'fa-solid fa-sun text-yellow-500' : 'fa-regular fa-moon';
}
updateDarkModeIcon();

btnDarkMode.addEventListener('click', () => {
    html.classList.toggle('dark');
    localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
    updateDarkModeIcon();
    
    const isDark = html.classList.contains('dark');
    Chart.helpers.each(Chart.instances, (instance) => {
        instance.options.scales.x.grid.color = isDark ? '#334155' : '#e2e8f0';
        instance.options.scales.y.grid.color = isDark ? '#334155' : '#e2e8f0';
        instance.options.plugins.legend.labels.color = isDark ? '#cbd5e1' : '#475569';
        instance.update();
    });
});

setInterval(() => {
    document.getElementById('realtimeClock').textContent = new Date().toLocaleTimeString('id-ID', { hour12: false });
}, 1000);

document.getElementById('btnToggleSidebar').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('-translate-x-full');
    document.getElementById('sidebarOverlay').classList.toggle('hidden');
});
document.getElementById('sidebarOverlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('-translate-x-full');
    document.getElementById('sidebarOverlay').classList.add('hidden');
});

document.getElementById('btnLogout').addEventListener('click', () => {
    localStorage.clear();
    window.location.replace('login.html');
});

// ==========================================
// 2. RENDER KPI CARDS INITIALIZATION
// ==========================================
const kpiData = [
    { id: 'kpi-proj-total', title: 'Total Project', icon: 'fa-briefcase', color: 'blue' },
    { id: 'kpi-proj-run', title: 'Project Berjalan', icon: 'fa-person-running', color: 'indigo' },
    { id: 'kpi-proj-done', title: 'Project Completed', icon: 'fa-check-double', color: 'emerald' },
    { id: 'kpi-pend-total', title: 'Total Pending', icon: 'fa-clock-rotate-left', color: 'orange' },
    { id: 'kpi-pend-open', title: 'Pending Open', icon: 'fa-hourglass-start', color: 'amber' },
    { id: 'kpi-pend-close', title: 'Pending Closed', icon: 'fa-calendar-check', color: 'green' },
    { id: 'kpi-issue-total', title: 'Total Issue', icon: 'fa-triangle-exclamation', color: 'red' },
    { id: 'kpi-issue-open', title: 'Issue Open', icon: 'fa-fire', color: 'rose' },
    { id: 'kpi-issue-close', title: 'Issue Closed', icon: 'fa-fire-extinguisher', color: 'teal' },
    { id: 'kpi-avg-prog', title: 'Avg Progress', icon: 'fa-chart-line', color: 'cyan', suffix: '%' },
    { id: 'kpi-comp-rate', title: 'Completion Rate', icon: 'fa-percent', color: 'sky', suffix: '%' },
    { id: 'kpi-tot-team', title: 'Total Team', icon: 'fa-sitemap', color: 'purple' },
    { id: 'kpi-tot-user', title: 'Total User', icon: 'fa-users', color: 'fuchsia' },
    { id: 'kpi-tot-pic', title: 'Total PIC', icon: 'fa-id-badge', color: 'pink' }
];

const kpiContainer = document.getElementById('kpiContainer');
kpiContainer.innerHTML = '';
kpiData.forEach(kpi => {
    const card = document.createElement('div');
    // Penambahan cursor-pointer dan onclick memanggil fungsi pop-up
    card.className = `bg-white/80 dark:bg-darkBox/80 backdrop-blur-md rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden cursor-pointer`;
    card.onclick = () => window.showKpiDetail(kpi.id, kpi.title);
    card.innerHTML = `
        <div class="absolute -right-6 -top-6 w-24 h-24 bg-${kpi.color}-500/10 rounded-full blur-2xl group-hover:bg-${kpi.color}-500/20 transition-all"></div>
        <div class="flex justify-between items-start">
            <div>
                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">${kpi.title}</p>
                <div class="flex items-baseline gap-1 mt-1">
                    <h3 class="text-2xl font-bold text-gray-800 dark:text-white" id="${kpi.id}">0</h3>
                    ${kpi.suffix ? `<span class="text-sm font-semibold text-gray-500">${kpi.suffix}</span>` : ''}
                </div>
            </div>
            <div class="w-10 h-10 rounded-xl bg-${kpi.color}-500/10 text-${kpi.color}-500 flex items-center justify-center text-lg">
                <i class="fa-solid ${kpi.icon}"></i>
            </div>
        </div>
    `;
    kpiContainer.appendChild(card);
});

// ==========================================
// 3. CHART.JS INITIALIZATION
// ==========================================
Chart.defaults.font.family = "'Inter', 'Segoe UI', sans-serif";
const gridColor = html.classList.contains('dark') ? '#334155' : '#e2e8f0';
const textColor = html.classList.contains('dark') ? '#cbd5e1' : '#475569';

const commonOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: textColor, usePointStyle: true, boxWidth: 8 } } },
    scales: { x: { grid: { color: gridColor }, ticks: { color: textColor } }, y: { grid: { color: gridColor }, ticks: { color: textColor, precision: 0 } } }
};

const chartLine = new Chart(document.getElementById('chartLine').getContext('2d'), {
    type: 'line',
    data: { labels: ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'], datasets: [{ label: 'Proyek Aktif', data: [0,0,0,0], borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderWidth: 3, fill: true, tension: 0.4 }] },
    options: commonOptions
});

// Penambahan Label Tim Baru: Retail & Marketing (Total 6 Tim)
const chartLabels = ['B2B Outbound', 'B2B Inbound', 'Bazaar', 'Dropship', 'Return', 'Marketing'];
const chartColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

const chartDoughnut = new Chart(document.getElementById('chartDoughnut').getContext('2d'), {
    type: 'doughnut',
    data: { labels: chartLabels, datasets: [{ data: [0,0,0,0,0,0], backgroundColor: chartColors, borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: textColor, usePointStyle: true } } }, cutout: '70%' }
});

const chartBar = new Chart(document.getElementById('chartBar').getContext('2d'), {
    type: 'bar',
    data: { labels: chartLabels, datasets: [
        { label: 'Belum Dimulai', data: [0,0,0,0,0,0], backgroundColor: '#94a3b8', borderRadius: 4 },
        { label: 'On Progress', data: [0,0,0,0,0,0], backgroundColor: '#3b82f6', borderRadius: 4 },
        { label: 'Review', data: [0,0,0,0,0,0], backgroundColor: '#f59e0b', borderRadius: 4 },
        { label: 'Completed', data: [0,0,0,0,0,0], backgroundColor: '#10b981', borderRadius: 4 }
    ]},
    options: { ...commonOptions, scales: { x: { stacked: true, grid: { color: gridColor }, ticks: { color: textColor } }, y: { stacked: true, grid: { color: gridColor }, ticks: { color: textColor, precision: 0 } } } }
});

const chartPie = new Chart(document.getElementById('chartPie').getContext('2d'), {
    type: 'pie',
    data: { labels: chartLabels, datasets: [{ data: [0,0,0,0,0,0], backgroundColor: chartColors, borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: textColor, usePointStyle: true } } } }
});

// ==========================================
// 4. CACHE DATA & METRIC ENGINE
// ==========================================
let rawProjects = [];
let rawPending = [];
let rawIssues = [];

function isDateInFilter(dateString, startFilter, endFilter) {
    if (!startFilter && !endFilter) return true;
    if (!dateString) return false; 
    const targetDate = new Date(dateString).setHours(0,0,0,0);
    if (startFilter && targetDate < new Date(startFilter).setHours(0,0,0,0)) return false;
    if (endFilter && targetDate > new Date(endFilter).setHours(0,0,0,0)) return false;
    return true;
}

function getWeekOfMonth(date) {
    return Math.ceil(new Date(date).getDate() / 7); 
}

function updateDashboardMetrics() {
    const startFilter = document.getElementById('filterStartDate')?.value;
    const endFilter = document.getElementById('filterEndDate')?.value;

    const projects = rawProjects.filter(p => isDateInFilter(p.startDate || p.createdAt, startFilter, endFilter));
    const pending = rawPending.filter(p => isDateInFilter(p.tanggal || p.createdAt, startFilter, endFilter));
    const issues = rawIssues.filter(i => isDateInFilter(i.issueTanggal || i.tanggal, startFilter, endFilter));

    let projRun = 0, projDone = 0, sumProgress = 0;
    let uniqueTeams = new Set();
    let uniquePics = new Set();
    
    // Mapping dengan penambahan Retail & Marketing
    const teamIndexMap = { 'B2B Outbound': 0, 'B2B Inbound': 1, 'Bazaar': 2, 'Dropship': 3, 'Return': 4, 'Marketing': 5 };
    
    // Array dirubah menjadi 6 item (menyesuaikan jumlah list tim di mapping)
    const chartBarData = { 'Belum Dimulai': [0,0,0,0,0,0], 'On Progress': [0,0,0,0,0,0], 'Review': [0,0,0,0,0,0], 'Completed': [0,0,0,0,0,0] };
    const chartPieData = [0,0,0,0,0,0]; 
    const chartWeeklyData = [0,0,0,0,0]; 

    // --- PROSES DATA PROYEK ---
    projects.forEach(p => {
        const status = p.status || 'Belum Dimulai';
        if (status === 'On Progress' || status === 'Review') projRun++;
        if (status === 'Completed') projDone++;
        
        // Memastikan perhitungan AVG Progress presisi
        sumProgress += parseFloat(p.progress) || 0; 
        
        if (p.team) uniqueTeams.add(p.team);
        if (p.pic) uniquePics.add(p.pic);

        const tIdx = teamIndexMap[p.team];
        if (tIdx !== undefined) {
            chartPieData[tIdx]++;
            if (chartBarData[status]) chartBarData[status][tIdx]++;
        }

        if (p.startDate) {
            let weekNum = getWeekOfMonth(p.startDate);
            if (weekNum > 4) weekNum = 4;
            chartWeeklyData[weekNum]++;
        }
    });

    const totalProj = projects.length;
    document.getElementById('kpi-proj-total').textContent = totalProj;
    document.getElementById('kpi-proj-run').textContent = projRun;
    document.getElementById('kpi-proj-done').textContent = projDone;
    // Perbaikan AVG Progress (Rata-rata dari keseluruhan)
    document.getElementById('kpi-avg-prog').textContent = totalProj > 0 ? Math.round(sumProgress / totalProj) : 0;
    document.getElementById('kpi-comp-rate').textContent = totalProj > 0 ? Math.round((projDone / totalProj) * 100) : 0;
    document.getElementById('kpi-tot-team').textContent = uniqueTeams.size;
    document.getElementById('kpi-tot-pic').textContent = uniquePics.size;

    // --- PROSES DATA PENDING ---
    let pendOpen = 0, pendClose = 0;
    pending.forEach(p => {
        const status = (p.status || "pending").toLowerCase().trim();
        if (status === 'done' || status === 'selesai' || status === 'completed') {
            pendClose++;
        } else {
            pendOpen++;
        }
    });
    
    document.getElementById('kpi-pend-total').textContent = pending.length;
    document.getElementById('kpi-pend-open').textContent = pendOpen;
    document.getElementById('kpi-pend-close').textContent = pendClose;

    // --- PROSES DATA ISSUE ---
    let issueOpen = 0, issueClose = 0;
    const chartDoughnutData = [0,0,0,0,0,0]; // Update menjadi array 6 item

    issues.forEach(i => {
        const status = (i.status || "").toLowerCase();
        if (status === 'resolved' || status === 'done' || status === 'selesai') issueClose++;
        else issueOpen++;

        const tIdx = teamIndexMap[i.team];
        if (tIdx !== undefined) chartDoughnutData[tIdx]++;
    });

    document.getElementById('kpi-issue-total').textContent = issues.length;
    document.getElementById('kpi-issue-open').textContent = issueOpen;
    document.getElementById('kpi-issue-close').textContent = issueClose;

    // --- UPDATE GRAFIK ---
    chartBar.data.datasets[0].data = chartBarData['Belum Dimulai'];
    chartBar.data.datasets[1].data = chartBarData['On Progress'];
    chartBar.data.datasets[2].data = chartBarData['Review'];
    chartBar.data.datasets[3].data = chartBarData['Completed'];
    chartBar.update();
    
    chartPie.data.datasets[0].data = chartPieData;
    chartPie.update();
    
    chartDoughnut.data.datasets[0].data = chartDoughnutData;
    chartDoughnut.update();
    
    chartLine.data.datasets[0].data = [chartWeeklyData[1], chartWeeklyData[2], chartWeeklyData[3], chartWeeklyData[4]];
    chartLine.update();
}

// ==========================================
// 5. REALTIME LISTENERS FIRESTORE
// ==========================================
onSnapshot(collection(db, "projects"), (snapshot) => {
    rawProjects = [];
    snapshot.forEach(doc => rawProjects.push({ id: doc.id, ...doc.data() }));
    updateDashboardMetrics();
});

onSnapshot(collection(db, "pending"), (snapshot) => {
    rawPending = [];
    snapshot.forEach(doc => rawPending.push({ id: doc.id, ...doc.data() }));
    updateDashboardMetrics();
});

onSnapshot(collection(db, "issue"), (snapshot) => {
    rawIssues = [];
    snapshot.forEach(doc => rawIssues.push({ id: doc.id, ...doc.data() }));
    updateDashboardMetrics();
});

onSnapshot(collection(db, "users"), (snapshot) => {
    document.getElementById('kpi-tot-user').textContent = snapshot.size;
});

// ==========================================
// 6. FILTER & ROUTING
// ==========================================
if(document.getElementById('filterStartDate')) {
    document.getElementById('filterStartDate').addEventListener('change', updateDashboardMetrics);
    document.getElementById('filterEndDate').addEventListener('change', updateDashboardMetrics);
    document.getElementById('btnClearDateFilter').addEventListener('click', () => {
        document.getElementById('filterStartDate').value = '';
        document.getElementById('filterEndDate').value = '';
        updateDashboardMetrics();
    });
}

const menuLinks = document.querySelectorAll('aside nav a');
const viewSections = document.querySelectorAll('.view-section');

menuLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const menuName = link.querySelector('span').textContent.trim();
        
        menuLinks.forEach(m => {
            m.classList.remove('bg-primary', 'text-white', 'shadow-md', 'shadow-primary/20');
            m.classList.add('text-gray-600', 'dark:text-gray-400');
        });

        link.classList.remove('text-gray-600', 'dark:text-gray-400');
        link.classList.add('bg-primary', 'text-white', 'shadow-md', 'shadow-primary/20');

        viewSections.forEach(view => view.classList.add('hidden'));

        if (menuName === 'Dashboard') {
            document.getElementById('viewDashboard').classList.remove('hidden');
            document.querySelector('header span.font-medium').textContent = 'Dashboard';
        } else if (menuName === 'Project') {
            document.getElementById('viewProject').classList.remove('hidden');
            document.querySelector('header span.font-medium').textContent = 'Project Management';
        } else if (menuName === 'Pending') {
            document.getElementById('viewPending').classList.remove('hidden');
            document.querySelector('header span.font-medium').textContent = 'Pending Tasks';
        } else if (menuName === 'Issue') {
            document.getElementById('viewIssue').classList.remove('hidden');
            document.querySelector('header span.font-medium').textContent = 'Issue Tracking';
        } else if (menuName === 'Calendar') {
            document.getElementById('viewCalendar').classList.remove('hidden');
            document.querySelector('header span.font-medium').textContent = 'Project Calendar';
        } else if (menuName === 'User Management') {
            document.getElementById('viewUserManagement').classList.remove('hidden');
            document.querySelector('header span.font-medium').textContent = 'User Management';
        } else if (menuName === 'Reports') {
            document.getElementById('viewReport').classList.remove('hidden');
            document.querySelector('header span.font-medium').textContent = 'Reports & Export';
        } else if (menuName === 'Activity Log') { 
            document.getElementById('viewActivityLog').classList.remove('hidden');
            document.querySelector('header span.font-medium').textContent = 'Activity Log';
        }
    });
});

// ==========================================
// 7. FITUR POP-UP DETAIL DASHBOARD
// ==========================================
window.showKpiDetail = (kpiId, kpiTitle) => {
    const modal = document.getElementById('modalDetailDashboard');
    if (!modal) return;
    
    document.getElementById('modalDetailTitle').textContent = `Detail: ${kpiTitle}`;
    const thead = document.getElementById('modalDetailHead');
    const tbody = document.getElementById('modalDetailBody');
    
    let data = [];
    let type = '';

    // Tentukan data berdasarkan Card yang diklik
    if (kpiId === 'kpi-proj-run') { 
        // Tambahkan || p.status === 'Review' di sini ya!
        data = rawProjects.filter(p => p.status === 'On Progress' || p.status === 'Review'); 
        type = 'project'; 
    }
    else if (kpiId === 'kpi-proj-done') { data = rawProjects.filter(p => p.status === 'Completed'); type = 'project'; }
    else if (kpiId === 'kpi-pend-open') { data = rawPending.filter(p => !['done', 'selesai', 'completed'].includes((p.status || '').toLowerCase().trim())); type = 'pending'; }
    else if (kpiId === 'kpi-pend-close') { data = rawPending.filter(p => ['done', 'selesai', 'completed'].includes((p.status || '').toLowerCase().trim())); type = 'pending'; }
    else if (kpiId === 'kpi-issue-open') { data = rawIssues.filter(i => !['resolved', 'done', 'selesai'].includes((i.status || '').toLowerCase().trim())); type = 'issue'; }
    else if (kpiId === 'kpi-issue-close') { data = rawIssues.filter(i => ['resolved', 'done', 'selesai'].includes((i.status || '').toLowerCase().trim())); type = 'issue'; }
    else { return; }

    // Render Table Header
    if (type === 'project') {
        thead.innerHTML = `<tr><th class="p-4">Nama Project</th><th class="p-4">Team</th><th class="p-4">PIC</th><th class="p-4">Status & Progress</th></tr>`;
    } else if (type === 'pending') {
        thead.innerHTML = `<tr><th class="p-4">No PO/SO</th><th class="p-4">Tanggal</th><th class="p-4">Team</th><th class="p-4">Status</th></tr>`;
    } else if (type === 'issue') {
        thead.innerHTML = `<tr><th class="p-4">Nama Issue</th><th class="p-4">Team</th><th class="p-4">PIC</th><th class="p-4">Status</th></tr>`;
    }

    // Render Table Body
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-gray-500">Belum ada data di kategori ini.</td></tr>`;
    } else {
        data.forEach(d => {
            if (type === 'project') {
                tbody.innerHTML += `<tr><td class="p-4 font-bold text-gray-800 dark:text-white">${d.name}</td><td class="p-4">${d.team}</td><td class="p-4">${d.pic}</td><td class="p-4"><span class="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-bold">${d.status} (${d.progress || 0}%)</span></td></tr>`;
            } else if (type === 'pending') {
                tbody.innerHTML += `<tr><td class="p-4 font-bold text-gray-800 dark:text-white">${d.noPo || '-'}</td><td class="p-4">${d.tanggal}</td><td class="p-4">${d.team}</td><td class="p-4"><span class="bg-orange-100 text-orange-600 px-2 py-1 rounded text-xs font-bold">${d.status || 'Pending'}</span></td></tr>`;
            } else if (type === 'issue') {
                const iName = d.nama || d.issue || d.judul || "-";
                tbody.innerHTML += `<tr><td class="p-4 font-bold text-gray-800 dark:text-white">${iName}</td><td class="p-4">${d.team}</td><td class="p-4">${d.pic}</td><td class="p-4"><span class="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">${d.status}</span></td></tr>`;
            }
        });
    }
    
    modal.classList.remove('hidden');
};

// Fungsi Tutup Pop-up
document.querySelectorAll('.btnCloseDetail, .modal-backdrop-detail').forEach(btn => {
    btn.addEventListener('click', () => {
        const modal = document.getElementById('modalDetailDashboard');
        if (modal) modal.classList.add('hidden');
    });
});

// ==========================================
// 8. FITUR NOTIFIKASI WEB (Realtime dari Activity Log)
// ==========================================
const btnNotif = document.getElementById('btnNotif');
const notifDropdown = document.getElementById('notifDropdown');
const notifList = document.getElementById('notifList');
const notifBadge = document.getElementById('notifBadge');
const btnMarkAllRead = document.getElementById('btnMarkAllRead');

// Buka/Tutup Dropdown Notifikasi
if (btnNotif && notifDropdown) {
    btnNotif.addEventListener('click', (e) => {
        e.stopPropagation();
        notifDropdown.classList.toggle('hidden');
    });

    // Tutup dropdown jika user klik di sembarang tempat
    document.addEventListener('click', (e) => {
        if (!btnNotif.contains(e.target) && !notifDropdown.contains(e.target)) {
            notifDropdown.classList.add('hidden');
        }
    });

    // Tombol "Lihat Semua Aktivitas" (Arahkan ke Menu Activity Log)
    document.getElementById('btnViewAllNotif').addEventListener('click', (e) => {
        e.preventDefault();
        notifDropdown.classList.add('hidden');
        
        const activityMenu = Array.from(document.querySelectorAll('aside nav a')).find(a => a.textContent.includes('Activity Log'));
        if(activityMenu) activityMenu.click();
    });

    // Simpan kapan terakhir user melihat notifikasi di Local Storage browser
    let lastReadTime = localStorage.getItem('lastReadNotif') || 0;

    // Tarik 10 aktivitas terakhir dari collection 'activities'
    // (Pastikan nama collection ini sama dengan yang ada di file activity.js Anda)
    const qNotif = query(collection(db, "activities"), orderBy("timestamp", "desc"), limit(10));
    
    onSnapshot(qNotif, (snapshot) => {
        notifList.innerHTML = '';
        let hasNew = false;
        
        if (snapshot.empty) {
            notifList.innerHTML = '<div class="p-8 text-center text-sm text-gray-500">Belum ada aktivitas.</div>';
            notifBadge.classList.add('hidden');
            return;
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            // Ambil waktu data dibuat (fallback ke waktu sekarang jika kosong)
            const timeMs = data.timestamp ? data.timestamp.toMillis() : Date.now();
            
            // Cek apakah aktivitas ini terjadi SETELAH user terakhir klik "Tandai dibaca"
            const isNew = timeMs > lastReadTime;
            if (isNew) hasNew = true;

            // Format Jam & Tanggal
            const dateObj = data.timestamp ? data.timestamp.toDate() : new Date();
            const timeString = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' });
            const dateString = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

            // Styling berdasarkan jenis aktivitas
            let icon = 'fa-bell';
            let color = 'text-gray-500';
            let bg = 'bg-gray-100 dark:bg-gray-800';

            if (data.action === 'CREATE') { icon = 'fa-plus'; color = 'text-green-500'; bg = 'bg-green-100 dark:bg-green-500/10'; }
            else if (data.action === 'UPDATE') { icon = 'fa-pen'; color = 'text-blue-500'; bg = 'bg-blue-100 dark:bg-blue-500/10'; }
            else if (data.action === 'DELETE') { icon = 'fa-trash'; color = 'text-red-500'; bg = 'bg-red-100 dark:bg-red-500/10'; }

            const item = document.createElement('div');
            // Jika notif baru, background-nya sedikit menyala (orange transparan)
            item.className = `p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex gap-3 cursor-pointer ${isNew ? 'bg-orange-50/50 dark:bg-orange-500/5' : ''}`;
            
            item.innerHTML = `
                <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${bg} ${color}">
                    <i class="fa-solid ${icon}"></i>
                </div>
                <div class="flex-1">
                    <p class="text-sm text-gray-800 dark:text-gray-200 line-clamp-2 leading-snug">
                        <span class="font-bold">${data.user || 'Sistem'}</span> ${data.details || 'Melakukan perubahan'}
                    </p>
                    <p class="text-xs text-gray-500 mt-1">${dateString}, ${timeString} • Modul ${data.module}</p>
                </div>
                ${isNew ? '<div class="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0 indicator-dot"></div>' : ''}
            `;
            notifList.appendChild(item);
        });

        // Tampilkan/Sembunyikan titik merah di lonceng header
        if (hasNew) notifBadge.classList.remove('hidden');
        else notifBadge.classList.add('hidden');
    });

    // Fitur "Tandai Dibaca"
    btnMarkAllRead.addEventListener('click', () => {
        lastReadTime = Date.now();
        localStorage.setItem('lastReadNotif', lastReadTime);
        notifBadge.classList.add('hidden');
        
        // Hapus styling "baru" (hilangkan warna & titik merah) secara visual
        document.querySelectorAll('#notifList > div').forEach(el => {
            el.classList.remove('bg-orange-50/50', 'dark:bg-orange-500/5');
            const dot = el.querySelector('.indicator-dot');
            if(dot) dot.remove();
        });
    });
}
