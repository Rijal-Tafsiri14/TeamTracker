import { db } from './firebase.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

console.log("Report.js dimuat! Mengecek elemen HTML...");

const repType = document.getElementById('repType');
const repStartDate = document.getElementById('repStartDate');
const repEndDate = document.getElementById('repEndDate');
const btnTampilkanReport = document.getElementById('btnTampilkanReport');
const btnDownloadReport = document.getElementById('btnDownloadReport');
const repTableHead = document.getElementById('repTableHead');
const repTableBody = document.getElementById('repTableBody');

// Pastikan tombol terdeteksi
if (!btnTampilkanReport) {
    console.error("ERROR: Tombol Tampilkan tidak ditemukan di HTML!");
} else {
    console.log("OK: Tombol Tampilkan siap digunakan.");
}

function isDateInReportRange(dateString, startFilter, endFilter) {
    if (!dateString) return false;
    const targetDate = new Date(dateString).setHours(0,0,0,0);
    if (startFilter && targetDate < new Date(startFilter).setHours(0,0,0,0)) return false;
    if (endFilter && targetDate > new Date(endFilter).setHours(0,0,0,0)) return false;
    return true;
}

if (btnTampilkanReport) {
    btnTampilkanReport.addEventListener('click', async () => {
        const type = repType.value;
        const start = repStartDate.value;
        const end = repEndDate.value;
        
        console.log(`[TOMBOL DIKLIK] Tipe: ${type} | Mulai: ${start || 'Semua'} | Akhir: ${end || 'Semua'}`);
        
        repTableBody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-gray-500"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Mengambil data dari database...</td></tr>`;
        if(btnDownloadReport) btnDownloadReport.classList.add('hidden'); 

        try {
            console.log(`Menjalankan query ke Firebase untuk koleksi: "${type}"...`);
            const querySnapshot = await getDocs(collection(db, type));
            let rawData = [];
            
            querySnapshot.forEach(doc => {
                rawData.push({ id: doc.id, ...doc.data() });
            });

            console.log(`Berhasil menarik ${rawData.length} data mentah dari Firebase.`);

            if (rawData.length === 0) {
                repTableHead.innerHTML = '';
                repTableBody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-red-500">Koleksi "${type}" kosong di database. Pastikan nama koleksinya benar!</td></tr>`;
                return;
            }

            const filteredData = rawData.filter(item => {
                const tgl = item.startDate || item.tanggal || item.issueTanggal || item.createdAt;
                if (!start && !end) return true;
                return isDateInReportRange(tgl, start, end);
            });

            console.log(`Data yang lolos filter tanggal: ${filteredData.length}`);

            if (filteredData.length === 0) {
                repTableHead.innerHTML = '';
                repTableBody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-red-500">Tidak ada data ditemukan pada rentang tanggal tersebut.</td></tr>`;
                return;
            }

            // Render ke tabel
            renderTable(type, filteredData);
            console.log("Tabel berhasil dirender!");
            
            if(btnDownloadReport) {
                btnDownloadReport.classList.remove('hidden');
                btnDownloadReport.classList.add('flex');
            }

        } catch (error) {
            console.error("ERROR SAAT TARIK DATA:", error);
            Swal.fire('Error', 'Gagal memuat laporan: ' + error.message, 'error');
            repTableBody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-red-500">Terjadi kesalahan teknis. Cek console (F12).</td></tr>`;
        }
    });
}

function renderTable(type, dataArray) {
    let headerHTML = '';
    let bodyHTML = '';

    if (type === 'projects') {
        headerHTML = `<tr>
            <th class="p-4">ID Project</th><th class="p-4">Nama Project</th><th class="p-4">Kategori</th>
            <th class="p-4">Team</th><th class="p-4">PIC</th><th class="p-4">Priority</th>
            <th class="p-4">Mulai</th><th class="p-4">Selesai</th><th class="p-4">Progress</th><th class="p-4">Status</th>
        </tr>`;
        dataArray.forEach(d => {
            bodyHTML += `<tr>
                <td class="p-4">${d.id}</td><td class="p-4">${d.name || '-'}</td><td class="p-4">${d.category || '-'}</td>
                <td class="p-4">${d.team || '-'}</td><td class="p-4">${d.pic || '-'}</td><td class="p-4">${d.priority || '-'}</td>
                <td class="p-4">${d.startDate || '-'}</td><td class="p-4">${d.endDate || '-'}</td><td class="p-4">${d.progress || 0}%</td>
                <td class="p-4">${d.status || '-'}</td>
            </tr>`;
        });
    } 
    else if (type === 'pending') {
        headerHTML = `<tr>
            <th class="p-4">No PO/SO</th><th class="p-4">Tanggal</th><th class="p-4">Team</th>
            <th class="p-4">Keterangan</th><th class="p-4">Follow Up</th><th class="p-4">PIC Product</th><th class="p-4">Status</th>
        </tr>`;
        dataArray.forEach(d => {
            bodyHTML += `<tr>
                <td class="p-4">${d.noPo || '-'}</td><td class="p-4">${d.tanggal || '-'}</td><td class="p-4">${d.team || '-'}</td>
                <td class="p-4">${d.keterangan || '-'}</td><td class="p-4">${d.followUp || '-'}</td>
                <td class="p-4">${d.picProduct || '-'}</td><td class="p-4">${d.status || 'Pending'}</td>
            </tr>`;
        });
    } 
    else if (type === 'issue') {
        headerHTML = `<tr>
            <th class="p-4">Nama Issue</th><th class="p-4">Tanggal</th><th class="p-4">Kronologi</th>
            <th class="p-4">Action Taken</th><th class="p-4">Team</th><th class="p-4">PIC</th>
            <th class="p-4">Priority</th><th class="p-4">Status</th>
        </tr>`;
        dataArray.forEach(d => {
            const iName = d.nama || d.issue || d.judul || "-";
            const iDate = d.issueTanggal || d.tanggal || "-";
            bodyHTML += `<tr>
                <td class="p-4">${iName}</td><td class="p-4">${iDate}</td><td class="p-4">${d.kronologi || '-'}</td>
                <td class="p-4">${d.action || d.actionTaken || '-'}</td><td class="p-4">${d.team || '-'}</td><td class="p-4">${d.pic || '-'}</td>
                <td class="p-4">${d.priority || '-'}</td><td class="p-4">${d.status || '-'}</td>
            </tr>`;
        });
    }

    repTableHead.innerHTML = headerHTML;
    repTableBody.innerHTML = bodyHTML;
}

// FUNGSI DOWNLOAD KE EXCEL
if (btnDownloadReport) {
    btnDownloadReport.addEventListener('click', () => {
        console.log("Tombol Download Excel diklik!");
        const tableElement = document.getElementById('tableExport');
        const typeLaporan = repType.options[repType.selectedIndex].text;
        const dateNow = new Date().toISOString().split('T')[0];
        const fileName = `Laporan_${typeLaporan}_${dateNow}.xlsx`;

        try {
            const workbook = XLSX.utils.table_to_book(tableElement, { sheet: "Report Data" });
            XLSX.writeFile(workbook, fileName);
            console.log("Berhasil mengunduh Excel!");
        } catch (err) {
            console.error("Gagal membuat Excel:", err);
            Swal.fire('Error', 'Gagal membuat file Excel. Pastikan library SheetJS ter-load.', 'error');
        }
    });
}