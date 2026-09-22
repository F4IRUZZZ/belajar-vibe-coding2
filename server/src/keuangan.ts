// API keuangan Fase A-2: produk/transaksi/catatan/hutang + saldo.
// Mirror js/keuangan.js: validasi, otorisasi userId, snapshot kategori,
// cascade catatan (FK), hutang auto-kas + idempoten, jejak audit.
// Kontrak kode: 201 buat, 400 validasi, 401 bukan milikmu, 404 hilang.
import { Elysia, t } from 'elysia';
import { pool } from './db';
import { bacaToken, tanggalLokal, userDariToken, validTanggal } from './guard';

function kapitalisasi(teks: string): string {
  const s = String(teks || '').trim();
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function kategoriDariProduk(produkId: number | null): Promise<string | null> {
  if (produkId === null || produkId === undefined) return null;
  const [rows] = await pool.query('SELECT kategori FROM produk WHERE id = ?', [produkId]);
  const data = rows as Array<{ kategori: string }>;
  const d0 = data[0];
  return d0 ? d0.kategori : null;
}

// Ejaan ikut yang sudah ada (banding lowercase); benar-benar baru -> kapital.
async function normalisasiKategori(nama: string | null | undefined): Promise<string> {
  const bersih = String(nama || '').trim();
  if (!bersih) return 'Lainnya';
  const [rows] = await pool.query('SELECT kategori FROM produk WHERE LOWER(kategori) = LOWER(?) LIMIT 1', [
    bersih
  ]);
  const data = rows as Array<{ kategori: string }>;
  const d1 = data[0];
  if (d1) return d1.kategori;
  return kapitalisasi(bersih);
}

const Tgl = t.Optional(t.String());
const SEL_TRANSAKSI =
  "id, user_id AS userId, jenis, jumlah, produk_id AS produkId, kategori, DATE_FORMAT(tanggal, '%Y-%m-%d') AS tanggal";
const SEL_HUTANG =
  "id, user_id AS userId, arah, pihak, jumlah, dibayar, DATE_FORMAT(tanggal, '%Y-%m-%d') AS tanggal, DATE_FORMAT(jatuh_tempo, '%Y-%m-%d') AS jatuhTempo, keterangan, status, transaksi_id_lunas AS transaksiIdLunas";

export const keuanganRoutes = new Elysia({ prefix: '/api' })
  // --- Produk (SHARED global, tanpa user_id — sama seperti simulasi) ---
  .get('/produk', async () => {
    const [rows] = await pool.query('SELECT id, nama, kategori FROM produk ORDER BY id');
    return { data: rows };
  })
  .post(
    '/produk',
    async ({ body, headers, status }) => {
      const user = await userDariToken(bacaToken(headers['authorization']));
      if (!user) return status(401, { error: 'Unauthorized' });
      const nama = String(body.nama || '').trim();
      if (!nama) return status(400, { error: 'Nama produk wajib' });
      const kategori = await normalisasiKategori(body.kategori);
      try {
        const [res] = await pool.query('INSERT INTO produk (nama, kategori) VALUES (?, ?)', [
          nama,
          kategori
        ]);
        const id = (res as { insertId: number }).insertId;
        return status(201, { data: { id, nama, kategori } });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '';
        if (msg.includes('uq_nama')) return status(400, { error: 'Produk sudah ada' });
        throw e;
      }
    },
    { body: t.Object({ nama: t.String(), kategori: t.Optional(t.String()) }) }
  )
  .put(
    '/produk/:id',
    async ({ params, body, headers, status }) => {
      const user = await userDariToken(bacaToken(headers['authorization']));
      if (!user) return status(401, { error: 'Unauthorized' });
      const id = Number(params.id);
      const [ada] = await pool.query('SELECT id FROM produk WHERE id = ?', [id]);
      if ((ada as Array<object>).length === 0) return status(404, { error: 'Produk tidak ditemukan' });
      if (body.nama !== undefined) {
        const nama = String(body.nama || '').trim();
        if (!nama) return status(400, { error: 'Nama produk wajib' });
        try {
          await pool.query('UPDATE produk SET nama = ? WHERE id = ?', [nama, id]);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : '';
          if (msg.includes('uq_nama')) return status(400, { error: 'Produk sudah ada' });
          throw e;
        }
      }
      if (body.kategori !== undefined) {
        await pool.query('UPDATE produk SET kategori = ? WHERE id = ?', [
          await normalisasiKategori(body.kategori),
          id
        ]);
      }
      const [rows] = await pool.query('SELECT id, nama, kategori FROM produk WHERE id = ?', [id]);
      return { data: (rows as Array<object>)[0] ?? null };
    },
    { body: t.Object({ nama: t.Optional(t.String()), kategori: t.Optional(t.String()) }) }
  )
  .delete('/produk/:id', async ({ params, headers, status }) => {
    const user = await userDariToken(bacaToken(headers['authorization']));
    if (!user) return status(401, { error: 'Unauthorized' });
    const [res] = await pool.query('DELETE FROM produk WHERE id = ?', [Number(params.id)]);
    if ((res as { affectedRows: number }).affectedRows === 0)
      return status(404, { error: 'Produk tidak ditemukan' });
    return { data: true };
  })
  // --- Transaksi (milik user) ---
  .get('/transaksi', async ({ headers, status }) => {
    const user = await userDariToken(bacaToken(headers['authorization']));
    if (!user) return status(401, { error: 'Unauthorized' });
    const [rows] = await pool.query(
      'SELECT ' + SEL_TRANSAKSI + ' FROM transaksi WHERE user_id = ? ORDER BY id',
      [user.id]
    );
    return { data: rows };
  })
  .post(
    '/transaksi',
    async ({ body, headers, status }) => {
      const user = await userDariToken(bacaToken(headers['authorization']));
      if (!user) return status(401, { error: 'Unauthorized' });
      const jenis = String(body.jenis || '');
      const jumlah = Number(body.jumlah);
      if (jenis !== 'masuk' && jenis !== 'keluar')
        return status(400, { error: 'Jenis harus masuk/keluar' });
      if (!(jumlah > 0)) return status(400, { error: 'Jumlah harus angka > 0 (Rp)' });
      const produkId =
        body.produkId === null || body.produkId === undefined ? null : Number(body.produkId);
      let kategori: string | null;
      if (body.kategori !== undefined && body.kategori !== null) {
        kategori = await normalisasiKategori(body.kategori);
      } else {
        kategori = await kategoriDariProduk(produkId);
      }
      const tanggal =
        body.tanggal && validTanggal(body.tanggal) ? body.tanggal : tanggalLokal();
      const [res] = await pool.query(
        'INSERT INTO transaksi (user_id, jenis, jumlah, produk_id, kategori, tanggal) VALUES (?, ?, ?, ?, ?, ?)',
        [user.id, jenis, jumlah, produkId, kategori, tanggal]
      );
      const id = (res as { insertId: number }).insertId;
      const [rows] = await pool.query('SELECT ' + SEL_TRANSAKSI + ' FROM transaksi WHERE id = ?', [
        id
      ]);
      return status(201, { data: (rows as Array<object>)[0] ?? null });
    },
    {
      body: t.Object({
        jenis: t.String(),
        jumlah: t.Number(),
        produkId: t.Optional(t.Any()),
        kategori: t.Optional(t.Any()),
        tanggal: Tgl
      })
    }
  )
  .put(
    '/transaksi/:id',
    async ({ params, body, headers, status }) => {
      const user = await userDariToken(bacaToken(headers['authorization']));
      if (!user) return status(401, { error: 'Unauthorized' });
      const id = Number(params.id);
      const [ada] = await pool.query('SELECT user_id AS userId FROM transaksi WHERE id = ?', [id]);
      const baris = ada as Array<{ userId: number }>;
      if (baris.length === 0) return status(404, { error: 'Transaksi tidak ditemukan' });
      if (baris[0]!.userId !== user.id) return status(401, { error: 'Bukan milikmu' });
      if (body.jumlah !== undefined && !(Number(body.jumlah) > 0))
        return status(400, { error: 'Jumlah harus angka > 0 (Rp)' });
      if (body.jenis !== undefined && body.jenis !== 'masuk' && body.jenis !== 'keluar')
        return status(400, { error: 'Jenis harus masuk/keluar' });
      if (body.tanggal !== undefined && !validTanggal(body.tanggal))
        return status(400, { error: 'Tanggal harus YYYY-MM-DD' });
      const set: string[] = [];
      const val: unknown[] = [];
      if (body.jumlah !== undefined) {
        set.push('jumlah = ?');
        val.push(Number(body.jumlah));
      }
      if (body.jenis !== undefined) {
        set.push('jenis = ?');
        val.push(body.jenis);
      }
      if (body.tanggal !== undefined) {
        set.push('tanggal = ?');
        val.push(body.tanggal);
      }
      if (body.kategori !== undefined) {
        set.push('kategori = ?');
        val.push(await normalisasiKategori(body.kategori));
      }
      if (set.length > 0) {
        val.push(id);
        await pool.query('UPDATE transaksi SET ' + set.join(', ') + ' WHERE id = ?', val);
      }
      const [rows] = await pool.query('SELECT ' + SEL_TRANSAKSI + ' FROM transaksi WHERE id = ?', [
        id
      ]);
      return { data: (rows as Array<object>)[0] ?? null };
    },
    {
      body: t.Object({
        jumlah: t.Optional(t.Number()),
        jenis: t.Optional(t.String()),
        tanggal: Tgl,
        kategori: t.Optional(t.Any())
      })
    }
  )
  .delete('/transaksi/:id', async ({ params, headers, status }) => {
    const user = await userDariToken(bacaToken(headers['authorization']));
    if (!user) return status(401, { error: 'Unauthorized' });
    const id = Number(params.id);
    const [ada] = await pool.query('SELECT user_id AS userId FROM transaksi WHERE id = ?', [id]);
    const baris = ada as Array<{ userId: number }>;
    if (baris.length === 0) return status(404, { error: 'Transaksi tidak ditemukan' });
    if (baris[0]!.userId !== user.id) return status(401, { error: 'Bukan milikmu' });
    // Cascade catatan via FK ON DELETE CASCADE (anti yatim, mirror filter()).
    await pool.query('DELETE FROM transaksi WHERE id = ?', [id]);
    return { data: true };
  })
  // --- Catatan (otorisasi via transaksi induk) ---
  // Semua catatan milik user dalam 1 query (ganti N+1 per transaksi).
  .get('/catatan/semua', async ({ headers, status }) => {
    const user = await userDariToken(bacaToken(headers['authorization']));
    if (!user) return status(401, { error: 'Unauthorized' });
    const [rows] = await pool.query(
      'SELECT c.id, c.transaksi_id AS transaksiId, c.isi FROM catatan c JOIN transaksi t ON t.id = c.transaksi_id WHERE t.user_id = ? ORDER BY c.id',
      [user.id]
    );
    return { data: rows };
  })
  .get('/catatan', async ({ query, headers, status }) => {
    const user = await userDariToken(bacaToken(headers['authorization']));
    if (!user) return status(401, { error: 'Unauthorized' });
    const tid = Number(query.transaksi_id);
    if (!(tid > 0)) return status(400, { error: 'transaksi_id wajib' });
    const [ada] = await pool.query('SELECT user_id AS userId FROM transaksi WHERE id = ?', [tid]);
    const baris = ada as Array<{ userId: number }>;
    if (baris.length === 0) return status(404, { error: 'Transaksi tidak ditemukan' });
    if (baris[0]!.userId !== user.id) return status(401, { error: 'Bukan milikmu' });
    const [rows] = await pool.query('SELECT id, transaksi_id AS transaksiId, isi FROM catatan WHERE transaksi_id = ? ORDER BY id', [
      tid
    ]);
    return { data: rows };
  })
  .post(
    '/transaksi/:id/catatan',
    async ({ params, body, headers, status }) => {
      const user = await userDariToken(bacaToken(headers['authorization']));
      if (!user) return status(401, { error: 'Unauthorized' });
      const tid = Number(params.id);
      const [ada] = await pool.query('SELECT user_id AS userId FROM transaksi WHERE id = ?', [tid]);
      const baris = ada as Array<{ userId: number }>;
      if (baris.length === 0) return status(404, { error: 'Transaksi tidak ditemukan' });
      if (baris[0]!.userId !== user.id) return status(401, { error: 'Bukan milikmu' });
      const isi = String(body.isi || '').trim();
      if (!isi) return status(400, { error: 'Isi catatan wajib' });
      const [res] = await pool.query('INSERT INTO catatan (transaksi_id, isi) VALUES (?, ?)', [
        tid,
        isi
      ]);
      const id = (res as { insertId: number }).insertId;
      return status(201, { data: { id, transaksiId: tid, isi } });
    },
    { body: t.Object({ isi: t.String() }) }
  )
  .put(
    '/catatan/:id',
    async ({ params, body, headers, status }) => {
      const user = await userDariToken(bacaToken(headers['authorization']));
      if (!user) return status(401, { error: 'Unauthorized' });
      const id = Number(params.id);
      const [ada] = await pool.query(
        'SELECT t.user_id AS userId FROM catatan c JOIN transaksi t ON t.id = c.transaksi_id WHERE c.id = ?',
        [id]
      );
      const baris = ada as Array<{ userId: number }>;
      if (baris.length === 0) return status(404, { error: 'Catatan tidak ditemukan' });
      if (baris[0]!.userId !== user.id) return status(401, { error: 'Bukan milikmu' });
      const isi = String(body.isi || '').trim();
      if (!isi) return status(400, { error: 'Isi catatan wajib' });
      await pool.query('UPDATE catatan SET isi = ? WHERE id = ?', [isi, id]);
      const [rows] = await pool.query(
        'SELECT id, transaksi_id AS transaksiId, isi FROM catatan WHERE id = ?',
        [id]
      );
      return { data: (rows as Array<object>)[0] ?? null };
    },
    { body: t.Object({ isi: t.String() }) }
  )
  .delete('/catatan/:id', async ({ params, headers, status }) => {
    const user = await userDariToken(bacaToken(headers['authorization']));
    if (!user) return status(401, { error: 'Unauthorized' });
    const id = Number(params.id);
    const [ada] = await pool.query(
      'SELECT t.user_id AS userId FROM catatan c JOIN transaksi t ON t.id = c.transaksi_id WHERE c.id = ?',
      [id]
    );
    const baris = ada as Array<{ userId: number }>;
    if (baris.length === 0) return status(404, { error: 'Catatan tidak ditemukan' });
    if (baris[0]!.userId !== user.id) return status(401, { error: 'Bukan milikmu' });
    await pool.query('DELETE FROM catatan WHERE id = ?', [id]);
    return { data: true };
  })
  // --- Hutang-piutang (milik user, auto-kas, idempoten, jejak audit) ---
  .get('/hutang', async ({ headers, status }) => {
    const user = await userDariToken(bacaToken(headers['authorization']));
    if (!user) return status(401, { error: 'Unauthorized' });
    const [rows] = await pool.query('SELECT ' + SEL_HUTANG + ' FROM hutang WHERE user_id = ? ORDER BY id', [
      user.id
    ]);
    return { data: rows };
  })
  .post(
    '/hutang',
    async ({ body, headers, status }) => {
      const user = await userDariToken(bacaToken(headers['authorization']));
      if (!user) return status(401, { error: 'Unauthorized' });
      const arah = String(body.arah || '');
      const jumlah = Number(body.jumlah);
      const pihak = String(body.pihak || '').trim();
      if (arah !== 'hutang' && arah !== 'piutang')
        return status(400, { error: 'Arah harus hutang/piutang' });
      if (!pihak) return status(400, { error: 'Pihak wajib diisi' });
      if (!(jumlah > 0)) return status(400, { error: 'Jumlah harus angka > 0 (Rp)' });
      let jatuhTempo: string | null = null;
      if (body.jatuhTempo !== undefined && body.jatuhTempo !== null && body.jatuhTempo !== '') {
        if (!validTanggal(body.jatuhTempo))
          return status(400, { error: 'Jatuh tempo harus YYYY-MM-DD' });
        jatuhTempo = body.jatuhTempo;
      }
      const tanggal = body.tanggal && validTanggal(body.tanggal) ? body.tanggal : tanggalLokal();
      const keterangan = body.keterangan ? String(body.keterangan).trim() : '';
      const [res] = await pool.query(
        'INSERT INTO hutang (user_id, arah, pihak, jumlah, tanggal, jatuh_tempo, keterangan) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [user.id, arah, pihak, jumlah, tanggal, jatuhTempo, keterangan]
      );
      const id = (res as { insertId: number }).insertId;
      const [rows] = await pool.query('SELECT ' + SEL_HUTANG + ' FROM hutang WHERE id = ?', [id]);
      return status(201, { data: (rows as Array<object>)[0] ?? null });
    },
    {
      body: t.Object({
        arah: t.String(),
        pihak: t.String(),
        jumlah: t.Number(),
        tanggal: Tgl,
        jatuhTempo: t.Optional(t.Any()),
        keterangan: t.Optional(t.String())
      })
    }
  )
  .post(
    '/hutang/:id/bayar',
    async ({ params, body, headers, status }) => {
      const user = await userDariToken(bacaToken(headers['authorization']));
      if (!user) return status(401, { error: 'Unauthorized' });
      const id = Number(params.id);
      const nominal = Number(body.nominal);
      if (!(nominal > 0)) return status(400, { error: 'Nominal harus angka > 0 (Rp)' });
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [ada] = await conn.query('SELECT * FROM hutang WHERE id = ? FOR UPDATE', [id]);
        const baris = ada as Array<{
          id: number;
          user_id: number;
          arah: string;
          pihak: string;
          jumlah: number;
          dibayar: number;
          status: string;
        }>;
        if (baris.length === 0) {
          await conn.rollback();
          return status(404, { error: 'Hutang tidak ditemukan' });
        }
        const h = baris[0]!; // aman: length dicek + FOR UPDATE
        if (h.user_id !== user.id) {
          await conn.rollback();
          return status(401, { error: 'Bukan milikmu' });
        }
        if (h.status === 'lunas') {
          await conn.rollback();
          return status(400, { error: 'Sudah lunas' });
        }
        const sisa = h.jumlah - h.dibayar;
        if (nominal > sisa) {
          await conn.rollback();
          return status(400, { error: 'Nominal melebihi sisa Rp' + sisa });
        }
        // Auto-catat kas (hutang->keluar, piutang->masuk) + catatan konsisten.
        const jenisKas = h.arah === 'hutang' ? 'keluar' : 'masuk';
        const [resT] = await conn.query(
          'INSERT INTO transaksi (user_id, jenis, jumlah, produk_id, kategori, tanggal) VALUES (?, ?, ?, NULL, NULL, ?)',
          [h.user_id, jenisKas, nominal, tanggalLokal()]
        );
        const idT = (resT as { insertId: number }).insertId;
        const teksCatat =
          'Bayar ' + (h.arah === 'hutang' ? 'hutang ke ' : 'piutang ') + h.pihak + ' Rp' + nominal;
        await conn.query('INSERT INTO catatan (transaksi_id, isi) VALUES (?, ?)', [idT, teksCatat]);
        const dibayarBaru = h.dibayar + nominal;
        if (dibayarBaru >= h.jumlah) {
          await conn.query(
            'UPDATE hutang SET dibayar = ?, status = ?, transaksi_id_lunas = ? WHERE id = ?',
            [dibayarBaru, 'lunas', idT, id]
          );
        } else {
          await conn.query('UPDATE hutang SET dibayar = ? WHERE id = ?', [dibayarBaru, id]);
        }
        await conn.commit();
        const [rows] = await pool.query('SELECT ' + SEL_HUTANG + ' FROM hutang WHERE id = ?', [id]);
        return { data: (rows as Array<object>)[0] ?? null };
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
    },
    { body: t.Object({ nominal: t.Number() }) }
  )
  .post('/hutang/:id/lunaskan', async ({ params, headers, status }) => {
    const user = await userDariToken(bacaToken(headers['authorization']));
    if (!user) return status(401, { error: 'Unauthorized' });
    const id = Number(params.id);
    const [ada] = await pool.query('SELECT user_id AS userId, jumlah, dibayar, status FROM hutang WHERE id = ?', [
      id
    ]);
    const baris = ada as Array<{ userId: number; jumlah: number; dibayar: number; status: string }>;
    if (baris.length === 0) return status(404, { error: 'Hutang tidak ditemukan' });
    if (baris[0]!.userId !== user.id) return status(401, { error: 'Bukan milikmu' });
    if (baris[0]!.status === 'lunas') return status(400, { error: 'Sudah lunas' });
    // Lunasi = bayar sisa sekaligus (transaksional, sama seperti /bayar).
    const sisa = baris[0]!.jumlah - baris[0]!.dibayar;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [lock] = await conn.query('SELECT * FROM hutang WHERE id = ? FOR UPDATE', [id]);
      const h = (lock as Array<{
        user_id: number;
        arah: string;
        pihak: string;
        jumlah: number;
        dibayar: number;
        status: string;
      }>)[0]!; // aman: id lolos SELECT awal, pasti ada
      if (h.status === 'lunas') {
        await conn.rollback();
        return status(400, { error: 'Sudah lunas' });
      }
      const jenisKas = h.arah === 'hutang' ? 'keluar' : 'masuk';
      const [resT] = await conn.query(
        'INSERT INTO transaksi (user_id, jenis, jumlah, produk_id, kategori, tanggal) VALUES (?, ?, ?, NULL, NULL, ?)',
        [h.user_id, jenisKas, sisa, tanggalLokal()]
      );
      const idT = (resT as { insertId: number }).insertId;
      await conn.query('INSERT INTO catatan (transaksi_id, isi) VALUES (?, ?)', [
        idT,
        'Pelunasan ' + (h.arah === 'hutang' ? 'hutang ke ' : 'piutang ') + h.pihak + ' Rp' + sisa
      ]);
      await conn.query(
        'UPDATE hutang SET dibayar = jumlah, status = ?, transaksi_id_lunas = ? WHERE id = ?',
        ['lunas', idT, id]
      );
      await conn.commit();
      const [rows] = await pool.query('SELECT ' + SEL_HUTANG + ' FROM hutang WHERE id = ?', [id]);
      return { data: (rows as Array<object>)[0] ?? null };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  })
  .delete('/hutang/:id', async ({ params, headers, status }) => {
    const user = await userDariToken(bacaToken(headers['authorization']));
    if (!user) return status(401, { error: 'Unauthorized' });
    const id = Number(params.id);
    const [ada] = await pool.query('SELECT user_id AS userId, status FROM hutang WHERE id = ?', [id]);
    const baris = ada as Array<{ userId: number; status: string }>;
    if (baris.length === 0) return status(404, { error: 'Hutang tidak ditemukan' });
    if (baris[0]!.userId !== user.id) return status(401, { error: 'Bukan milikmu' });
    if (baris[0]!.status === 'lunas')
      return status(400, { error: 'Sudah lunas, tidak boleh dihapus' }); // jejak audit
    await pool.query('DELETE FROM hutang WHERE id = ?', [id]);
    return { data: true };
  })
  // --- Saldo + ringkasan (dashboard A-3 butuh ini, bukan hitung di klien) ---
  .get('/saldo', async ({ query, headers, status }) => {
    const user = await userDariToken(bacaToken(headers['authorization']));
    if (!user) return status(401, { error: 'Unauthorized' });
    const cond: string[] = ['user_id = ?'];
    const val: unknown[] = [user.id];
    if (query.dari) {
      cond.push('tanggal >= ?');
      val.push(query.dari);
    }
    if (query.sampai) {
      cond.push('tanggal <= ?');
      val.push(query.sampai);
    }
    const [rows] = await pool.query(
      "SELECT COALESCE(SUM(CASE WHEN jenis = 'masuk' THEN jumlah ELSE 0 END), 0) AS masuk, COALESCE(SUM(CASE WHEN jenis = 'keluar' THEN jumlah ELSE 0 END), 0) AS keluar FROM transaksi WHERE " +
        cond.join(' AND '),
      val
    );
    const r = (rows as Array<{ masuk: number; keluar: number }>)[0]!; // SUM selalu 1 baris
    const masuk = Number(r.masuk);
    const keluar = Number(r.keluar);
    return { data: { masuk, keluar, saldo: masuk - keluar } };
  })
  .get('/ringkasan-kategori', async ({ query, headers, status }) => {
    const user = await userDariToken(bacaToken(headers['authorization']));
    if (!user) return status(401, { error: 'Unauthorized' });
    const cond: string[] = ["t.user_id = ?", "t.jenis = 'keluar'"];
    const val: unknown[] = [user.id];
    if (query.dari) {
      cond.push('t.tanggal >= ?');
      val.push(query.dari);
    }
    if (query.sampai) {
      cond.push('t.tanggal <= ?');
      val.push(query.sampai);
    }
    // Snapshot diutamakan, fallback produk, terakhir 'Lainnya' (mirror JS).
    const [rows] = await pool.query(
      "SELECT COALESCE(t.kategori, p.kategori, 'Lainnya') AS kategori, SUM(t.jumlah) AS total FROM transaksi t LEFT JOIN produk p ON p.id = t.produk_id WHERE " +
        cond.join(' AND ') +
        ' GROUP BY kategori ORDER BY total DESC',
      val
    );
    const data = rows as Array<{ kategori: string; total: number }>;
    const keluarSemua = data.reduce((s, r) => s + Number(r.total), 0);
    return {
      data: data.map((r) => ({
        kategori: r.kategori,
        total: Number(r.total),
        persen: keluarSemua > 0 ? Math.round((Number(r.total) / keluarSemua) * 100) : 0
      }))
    };
  });
