
import Navbar from '../components/Navbar'
import HeroSection from '../components/HeroSection'
import ServicesSection from '../components/ServicesSection'
import Footer from '../components/Footer'
import '../App.css'

function Home() {
  return (
    <div className="app">
      <Navbar />

      <main>
        <HeroSection />
        <ServicesSection />
      </main>

      <Footer />
    </div>
  )
}

export default Home
