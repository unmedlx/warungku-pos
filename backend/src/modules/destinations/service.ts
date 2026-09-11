// Data contoh untuk wilayah Indonesia.
// Untuk production, sebaiknya pindahkan ke tabel database dan seed saat migrasi.

const PROVINCES = [
  { id: 11, name: 'Aceh' },
  { id: 12, name: 'Sumatera Utara' },
  { id: 13, name: 'Sumatera Barat' },
  { id: 14, name: 'Riau' },
  { id: 15, name: 'Jambi' },
  { id: 16, name: 'Sumatera Selatan' },
  { id: 17, name: 'Bengkulu' },
  { id: 18, name: 'Lampung' },
  { id: 19, name: 'Kepulauan Bangka Belitung' },
  { id: 21, name: 'Kepulauan Riau' },
  { id: 31, name: 'DKI Jakarta' },
  { id: 32, name: 'Jawa Barat' },
  { id: 33, name: 'Jawa Tengah' },
  { id: 34, name: 'DI Yogyakarta' },
  { id: 35, name: 'Jawa Timur' },
  { id: 36, name: 'Banten' },
  { id: 51, name: 'Bali' },
  { id: 52, name: 'Nusa Tenggara Barat' },
  { id: 53, name: 'Nusa Tenggara Timur' },
];

const CITIES: Record<number, { id: number; name: string }[]> = {
  31: [
    { id: 3171, name: 'Jakarta Selatan' },
    { id: 3172, name: 'Jakarta Timur' },
    { id: 3173, name: 'Jakarta Pusat' },
    { id: 3174, name: 'Jakarta Barat' },
    { id: 3175, name: 'Jakarta Utara' },
  ],
  32: [
    { id: 3273, name: 'Bandung' },
    { id: 3275, name: 'Bekasi' },
    { id: 3276, name: 'Depok' },
    { id: 3279, name: 'Tasikmalaya' },
  ],
  33: [
    { id: 3374, name: 'Semarang' },
    { id: 3372, name: 'Surakarta' },
    { id: 3376, name: 'Tegal' },
  ],
  35: [
    { id: 3578, name: 'Surabaya' },
    { id: 3571, name: 'Malang' },
    { id: 3577, name: 'Madiun' },
  ],
};

const DISTRICTS: Record<number, { id: number; name: string }[]> = {
  3273: [
    { id: 327301, name: 'Bandung Wetan' },
    { id: 327302, name: 'Bandung Kulon' },
    { id: 327303, name: 'Cibeunying Kaler' },
    { id: 327304, name: 'Cibeunying Kidul' },
  ],
  3171: [
    { id: 317101, name: 'Kebayoran Baru' },
    { id: 317102, name: 'Kebayoran Lama' },
    { id: 317103, name: 'Pasar Minggu' },
  ],
  3374: [
    { id: 337401, name: 'Semarang Tengah' },
    { id: 337402, name: 'Semarang Selatan' },
    { id: 337403, name: 'Semarang Barat' },
  ],
};

export function listProvinces() {
  return PROVINCES;
}

export function listCities(provinceId: number) {
  return CITIES[provinceId] || [];
}

export function listDistricts(cityId: number) {
  return DISTRICTS[cityId] || [];
}
