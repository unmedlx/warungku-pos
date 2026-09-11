import Header from "./components/Header";
import Hero from "./components/Hero";
import Strip from "./components/Strip";
import Masalah from "./components/Masalah";
import Manfaat from "./components/Manfaat";
import Langkah from "./components/Langkah";
import Usaha from "./components/Usaha";
import Harga from "./components/Harga";
import Jujur from "./components/Jujur";
import Testimoni from "./components/Testimoni";
import Faq from "./components/Faq";
import Penutup from "./components/Penutup";
import Footer from "./components/Footer";
import BottomBar from "./components/BottomBar";

export default function App() {
  return (
    <div className="min-h-screen bg-card pb-[68px] desktop:pb-0">
      <Header />
      <main>
        <Hero />
        <Strip />
        <Masalah />
        <Manfaat />
        <Langkah />
        <Usaha />
        <Harga />
        <Jujur />
        <Testimoni />
        <Faq />
        <Penutup />
      </main>
      <Footer />
      <BottomBar />
    </div>
  );
}
