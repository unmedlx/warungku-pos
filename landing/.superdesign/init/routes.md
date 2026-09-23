<!-- Superdesign init — generated for `landing` -->
# Routes — `landing`

Router entry: `src/App.tsx`

_No `<Route>` declarations found — this app uses state-driven view switching, not a router. See the full entry source below._

## Full entry source

### `src/App.tsx`

```tsx
import Header from "./components/Header";
import Hero from "./components/Hero";
import Strip from "./components/Strip";
import Masalah from "./components/Masalah";
import Manfaat from "./components/Manfaat";
import Ai from "./components/Ai";
import Langkah from "./components/Langkah";
import Usaha from "./components/Usaha";
import Harga from "./components/Harga";
import Jujur from "./components/Jujur";
import Testimoni from "./components/Testimoni";
import Faq from "./components/Faq";
import Penutup from "./components/Penutup";
import Footer from "./components/Footer";
import BottomBar from "./components/BottomBar";
import HalamanDownload from "./download/HalamanDownload";

/**
 * Testimoni disembunyikan sampai ada testimoni asli yang bisa dibuktikan.
 * Ubah ke true untuk menampilkannya lagi — latar FAQ & penutup ikut menyesuaikan.
 */
const TAMPILKAN_TESTIMONI = false;

export default function App() {
  // Landing hanya punya dua halaman, jadi cukup cek path — tanpa router.
  // Server statis wajib meneruskan semua path ke index.html (PM2_SERVE_SPA).
  if (window.location.pathname.replace(/\/+$/, "") === "/download") {
    return <HalamanDownload />;
  }

  return (
    <div className="min-h-screen bg-card pb-[68px] desktop:pb-0">
      <Header />
      <main>
        <Hero />
        <Strip />
        <Masalah />
        <Manfaat />
        <Ai />
        <Langkah />
        <Usaha />
        <Harga />
        <Jujur />
        {TAMPILKAN_TESTIMONI && <Testimoni />}
        {/* Latar seksi harus berselang putih/abu. Tanpa Testimoni (putih),
            Jujur dan FAQ yang sama-sama abu akan menyatu, jadi FAQ pindah ke
            putih dan penutup mengikutinya. */}
        <Faq alt={TAMPILKAN_TESTIMONI} />
        <Penutup alt={TAMPILKAN_TESTIMONI} />
      </main>
      <Footer />
      <BottomBar />
    </div>
  );
}
```

