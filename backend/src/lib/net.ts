import dns from 'node:dns';
import net from 'node:net';

/**
 * Paksa koneksi keluar lewat IPv4.
 *
 * Jaringan dengan DNS64/NAT64 mengembalikan alamat sintetis `64:ff9b::…`
 * di samping alamat IPv4 asli. Node 22 menyalakan Happy Eyeballs
 * (autoSelectFamily) secara default dan mencoba alamat IPv6 itu lebih dulu;
 * kalau NAT64 tidak benar-benar bisa dilewati, percobaan IPv4 keburu
 * dibatalkan oleh timeout Happy Eyeballs yang cuma 250 ms dan koneksi gagal
 * dengan ETIMEDOUT — padahal host-nya sehat (curl ke host yang sama sukses).
 *
 * Diimpor paling awal di server.ts supaya berlaku sebelum ada klien HTTP
 * (S3/MinIO, Google API) yang dibuat.
 */
dns.setDefaultResultOrder('ipv4first');
net.setDefaultAutoSelectFamily(false);
