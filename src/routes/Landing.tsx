import Header from '../components/Header';
import Hero from '../components/Hero';
import FeatureStrip from '../components/FeatureStrip';
import Footer from '../components/Footer';

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <Hero />
        <FeatureStrip />
      </main>
      <Footer />
    </div>
  );
}
