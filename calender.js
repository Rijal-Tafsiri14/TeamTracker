import { db } from './firebase.js'; 
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    const filterType = document.getElementById('filterType');

    // Inisialisasi FullCalendar
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek'
        },
        height: '100%',
        themeSystem: 'standard',
        events: [], 
        eventClick: function(info) {
            Swal.fire({
                title: info.event.title,
                html: `
                    <div class="text-left mt-2 text-sm">
                        <p><strong>Tipe:</strong> <span class="capitalize">${info.event.extendedProps.type}</span></p>
                        <p><strong>Status:</strong> ${info.event.extendedProps.status}</p>
                        <p><strong>Team:</strong> ${info.event.extendedProps.team}</p>
                    </div>
                `,
                icon: 'info',
                confirmButtonColor: '#3b82f6'
            });
        }
    });

    calendar.render();

    // Wadah data
    let allEventsData = {
        project: [],
        pending: [],
        issue: []
    };

    function updateCalendarView() {
        const selectedFilter = filterType.value;
        let eventsToShow = [];

        if (selectedFilter === 'all' || selectedFilter === 'project') eventsToShow = eventsToShow.concat(allEventsData.project);
        if (selectedFilter === 'all' || selectedFilter === 'pending') eventsToShow = eventsToShow.concat(allEventsData.pending);
        if (selectedFilter === 'all' || selectedFilter === 'issue') eventsToShow = eventsToShow.concat(allEventsData.issue);

        calendar.removeAllEvents();
        calendar.addEventSource(eventsToShow);
    }

    // Trik WAJIB FullCalendar: Tambah 1 hari ke endDate agar bar/garis membentang dengan benar
    function getInclusiveEndDate(dateString) {
        if (!dateString) return null;
        let date = new Date(dateString);
        date.setDate(date.getDate() + 1); 
        return date.toISOString().split('T')[0];
    }

    // 1. Tarik Data Project (RENTANG WAKTU - WARNA BIRU)
    onSnapshot(collection(db, "projects"), (snapshot) => {
        allEventsData.project = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                title: `🎯 ${data.name}`,
                start: data.startDate, // Tanggal mulai dari DB
                end: getInclusiveEndDate(data.endDate), // Tanggal selesai + 1 hari
                backgroundColor: '#3b82f6', 
                allDay: true, // Pastikan true agar jadi balok panjang
                extendedProps: { type: 'project', status: data.status, team: data.team }
            };
        });
        updateCalendarView();
    });

    // 2. Tarik Data Pending (1 HARI - WARNA ORANYE)
    // 2. Tarik Data Pending (1 HARI - WARNA ORANYE)
onSnapshot(collection(db, "pending"), (snapshot) => {
    allEventsData.pending = snapshot.docs.map(doc => {
        const data = doc.data();
        // Pastikan variabel 'tgl' yang digunakan untuk 'start'
        const tgl = data.tanggalPending || data.tanggal; 
        
        return {
            title: `⏳ PO: ${data.noPo || 'Tanpa No PO'}`,
            start: tgl, // Ganti data.tanggal menjadi tgl
            backgroundColor: '#f97316', 
            allDay: true,
            extendedProps: { type: 'pending', status: data.status, team: data.team }
        };
    });
    updateCalendarView();
});

// 3. Tarik Data Issue (WARNA MERAH)
onSnapshot(collection(db, "issue"), (snapshot) => {
    allEventsData.issue = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log("Data Issue dari Firebase:", data);
        
        // Kita gunakan OR (||) untuk mencakup semua kemungkinan nama field yang mungkin Anda simpan
        // Sesuaikan urutan ini dengan nama field asli di database Firebase Anda
        const nama = data.issueNama || data.nama || data.judul || "Tanpa Nama";
        const tgl = data.issueTanggal || data.tanggalIssue || data.tanggal; 
        
        console.log("Rendering Issue:", data.issueNama, "Tanggal:", tgl); // Debugging
        
        return {
            title: `⚠️ ${data.issue || 'Tanpa Nama'}`, 
            start: tgl, 
            backgroundColor: '#ef4444', 
            allDay: true,
            extendedProps: { type: 'issue', status: data.status, team: data.team }
        };
    });
    updateCalendarView();
});
    // Filter dropdown listener
    filterType.addEventListener('change', updateCalendarView);

    // Responsive Fix (Agar kalender me-render ulang saat menu diklik)
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'viewCalendar' && !mutation.target.classList.contains('hidden')) {
                setTimeout(() => calendar.updateSize(), 100);
            }
        });
    });
    observer.observe(document.getElementById('viewCalendar'), { attributes: true, attributeFilter: ['class'] });
});