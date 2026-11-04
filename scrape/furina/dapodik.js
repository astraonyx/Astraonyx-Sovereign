const axios = require('axios');
const cheerio = require('cheerio');

class DapodikScraper {
    constructor() {
        this.baseUrl = 'https://dapo.kemdikbud.go.id';
        this.dataSekolahUrl = 'https://sekolah.data.kemdikbud.go.id';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            'Connection': 'keep-alive'
        };
        this.cookies = '';
    }

    /**
     * Mengambil konfigurasi awal / token sesi (cookie) dari portal Dapodik
     */
    async fetchConfig() {
        try {
            const res = await axios.get(this.baseUrl, {
                headers: this.headers,
                timeout: 10000
            });

            if (res.headers['set-cookie']) {
                this.cookies = res.headers['set-cookie']
                    .map(cookie => cookie.split(';')[0])
                    .join('; ');
                this.headers['Cookie'] = this.cookies;
            }
            return true;
        } catch (error) {
            throw new Error(`Gagal menghubungkan ke server Dapodik: ${error.message}`);
        }
    }

    /**
     * Mencari daftar sekolah berdasarkan kata kunci nama sekolah atau NPSN
     * @param {string} query - Kata kunci pencarian (min 3 karakter)
     */
    async searchSchools(query) {
        if (!query || query.trim().length < 3) {
            throw new Error('Kata kunci pencarian minimal 3 karakter.');
        }

        try {
            // Menggunakan endpoint pencarian resmi Dapodik Kemdikbud
            const endpoint = `${this.baseUrl}/api/getHasilPencarian?keyword=${encodeURIComponent(query.trim())}`;
            const res = await axios.get(endpoint, {
                headers: this.headers,
                timeout: 15000
            });

            if (!res.data) return [];

            let results = [];
            if (Array.isArray(res.data)) {
                results = res.data;
            } else if (res.data.rows && Array.isArray(res.data.rows)) {
                results = res.data.rows;
            } else if (res.data.data && Array.isArray(res.data.data)) {
                results = res.data.data;
            }

            // Normalisasi properti hasil agar konsisten
            return results.map(item => ({
                npsn: item.npsn || item.NPSN || '',
                nama: item.nama || item.nama_sekolah || item.sekolah || '',
                jenjang: item.bentuk_pendidikan || item.jenjang || '',
                status_sekolah: item.status_sekolah || item.status || '',
                provinsi: item.provinsi || item.propinsi || '',
                kabupaten: item.kabupaten_kota || item.kabupaten || '',
                kecamatan: item.kecamatan || '',
                sekolah_id_enkrip: item.sekolah_id_enkrip || item.id_sekolah || ''
            }));
        } catch (error) {
            throw new Error(`Gagal mencari data sekolah: ${error.message}`);
        }
    }

    /**
     * Mengambil detail lengkap sekolah berdasarkan kode NPSN (8 digit)
     * @param {string} npsn - Nomor Pokok Sekolah Nasional (8 digit angka)
     */
    async getSchoolDetail(npsn) {
        const cleanNpsn = String(npsn).trim();
        if (!/^\d{8}$/.test(cleanNpsn)) {
            throw new Error('NPSN tidak valid! Harus berupa 8 digit angka.');
        }

        try {
            // 1. Cari terlebih dahulu untuk mendapatkan data dasar sekolah
            const searchResults = await this.searchSchools(cleanNpsn);
            const schoolBase = searchResults.find(s => String(s.npsn) === cleanNpsn) || searchResults[0];

            // 2. Ambil data detail profil dari API Sekolah Data Kemdikbud / Dapodik
            let detailData = {};
            try {
                const detailEndpoint = `https://api-sekolah-indonesia.vercel.app/sekolah?npsn=${cleanNpsn}`;
                const apiRes = await axios.get(detailEndpoint, {
                    headers: this.headers,
                    timeout: 10000
                });
                if (apiRes.data && apiRes.data.dataSekolah && apiRes.data.dataSekolah.length > 0) {
                    detailData = apiRes.data.dataSekolah[0];
                }
            } catch {
                // Fallback jika endpoint publik eksternal mengalami kendala
                detailData = {};
            }

            // 3. Gabungkan data agar struktur konsisten dengan yang diminta oleh main.js
            const merged = {
                npsn: cleanNpsn,
                nama: detailData.nama || schoolBase?.nama || '',
                bentuk_pendidikan: detailData.bentuk_pendidikan || schoolBase?.jenjang || '',
                jenjang: detailData.bentuk_pendidikan || schoolBase?.jenjang || '',
                status_sekolah: detailData.status_sekolah || schoolBase?.status_sekolah || '',
                akreditasi: detailData.akreditasi || 'Belum Terakreditasi',
                partisipasi_bos: detailData.partisipasi_bos || 'Ya',
                status_kepemilikan: detailData.status_kepemilikan || 'Pemerintah Daerah',
                nama_yayasan: detailData.nama_yayasan || '-',
                npyp: detailData.npyp || '-',
                sk_pendirian_sekolah: detailData.sk_pendirian_sekolah || '-',
                tlg_sk_pendirian_sekolah: detailData.tanggal_sk_pendirian || '-',
                sk_izin_operasional: detailData.sk_izin_operasional || '-',
                tlg_sk_izin_operasional: detailData.tanggal_sk_operasional || '-',
                tanggal_update: detailData.last_sync || new Date().toISOString().split('T')[0],
                semester: detailData.semester || '2025/2026 Genap',
                nama_kepsek: detailData.kepala_sekolah || '-',

                // Lokasi
                alamat_jalan: detailData.alamat_jalan || '-',
                rt: detailData.rt || '00',
                rw: detailData.rw || '00',
                desa_kelurahan: detailData.desa_kelurahan || '-',
                kecamatan: detailData.kecamatan || schoolBase?.kecamatan || '-',
                kabupaten: detailData.kabupaten_kota || schoolBase?.kabupaten || '-',
                provinsi: detailData.provinsi || schoolBase?.provinsi || '-',
                kode_pos: detailData.kode_pos || '-',
                lintang: detailData.lintang || null,
                bujur: detailData.bujur || null,

                // Siswa & Rombel
                pd: detailData.pd || 0,
                pd_l: detailData.pd_l || 0,
                pd_p: detailData.pd_p || 0,
                rombel: detailData.rombel || 0,
                paud_klp_a: detailData.paud_klp_a || 0,
                paud_klp_b: detailData.paud_klp_b || 0,
                paud_KB: detailData.paud_KB || 0,
                paud_TPA: detailData.paud_TPA || 0,
                paud_SPS: detailData.paud_SPS || 0,
                pd_tk_1: detailData.pd_tk_1 || 0,
                pd_tk_2: detailData.pd_tk_2 || 0,
                pd_tk_3: detailData.pd_tk_3 || 0,
                pd_tk_4: detailData.pd_tk_4 || 0,
                pd_tk_5: detailData.pd_tk_5 || 0,
                pd_tk_6: detailData.pd_tk_6 || 0,
                pd_tk_7: detailData.pd_tk_7 || 0,
                pd_tk_8: detailData.pd_tk_8 || 0,
                pd_tk_9: detailData.pd_tk_9 || 0,
                pd_tk_10: detailData.pd_tk_10 || 0,
                pd_tk_11: detailData.pd_tk_11 || 0,
                pd_tk_12: detailData.pd_tk_12 || 0,
                pd_tk_13: detailData.pd_tk_13 || 0,

                // PTK & Tendik
                jum_ptk: detailData.ptk || detailData.jum_ptk || 0,
                jum_guru: detailData.guru || detailData.jum_guru || 0,
                jum_tendik: detailData.pegawai || detailData.jum_tendik || 0,

                // Sarana Prasarana
                ruang_kelas: detailData.ruang_kelas || 0,
                kelas_ringan: detailData.kelas_ringan || 0,
                kelas_sedang: detailData.kelas_sedang || 0,
                kelas_berat: detailData.kelas_berat || 0,
                perpus: detailData.perpus || 0,
                perpus_ringan: detailData.perpus_ringan || 0,
                perpus_sedang: detailData.perpus_sedang || 0,
                perpus_berat: detailData.perpus_berat || 0,
                lab_ipa: detailData.lab_ipa || 0,
                lab_ipa_ringan: 0,
                lab_ipa_sedang: 0,
                lab_ipa_berat: 0,
                lab_kom: detailData.lab_kom || 0,
                lab_kom_ringan: 0,
                lab_kom_sedang: 0,
                lab_kom_berat: 0,
                lab_bahasa: detailData.lab_bahasa || 0,
                lab_bahasa_ringan: 0,
                lab_bahasa_sedang: 0,
                lab_bahasa_berat: 0,
                r_guru: detailData.r_guru || 0,
                r_guru_ringan: 0,
                r_guru_sedang: 0,
                r_guru_berat: 0,
                r_kepsek: detailData.r_kepsek || 0,
                r_kepsek_ringan: 0,
                r_kepsek_sedang: 0,
                r_kepsek_berat: 0,
                r_tu: detailData.r_tu || 0,
                r_tu_ringan: 0,
                r_tu_sedang: 0,
                r_tu_berat: 0,
                wc_guru: detailData.wc_guru || 0,
                wc_guru_ringan: 0,
                wc_guru_sedang: 0,
                wc_guru_berat: 0,
                wc_siswa: detailData.wc_siswa || 0,
                wc_siswa_ringan: 0,
                wc_siswa_sedang: 0,
                wc_siswa_berat: 0,

                // Listrik & Internet
                sumber_listrik: detailData.sumber_listrik || 'PLN',
                daya_listrik: detailData.daya_listrik || '0',
                akses_internet: detailData.akses_internet || '-',
                internet_jenis_layanan: detailData.internet_jenis_layanan || '-',
                internet_jenis_koneksi: detailData.internet_jenis_koneksi || '-',
                internet_provider: detailData.internet_provider || '-',
                internet_bandwidth: detailData.internet_bandwidth || 0
            };

            return { data: [merged] };
        } catch (error) {
            throw new Error(`Gagal mengambil detail sekolah NPSN ${npsn}: ${error.message}`);
        }
    }
}

module.exports = DapodikScraper;