import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import SesionDetailPage from './pages/SesionDetailPage'
import RutinasPage from './pages/RutinasPage'
import DeloadPage from './pages/DeloadPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sesion/:id" element={<SesionDetailPage />} />
        <Route path="/rutinas" element={<RutinasPage />} />
        <Route path="/deload" element={<DeloadPage />} />
      </Routes>
    </Router>
  )
}

export default App
