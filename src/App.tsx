import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import SesionDetailPage from './pages/SesionDetailPage'
import RutinasPage from './pages/RutinasPage'
import DeloadPage from './pages/DeloadPage'
import StatsPage from './pages/StatsPage'
import LoginPage from './pages/LoginPage'
import RegistroPage from './pages/RegistroPage'
import DebugUserPage from './pages/DebugUserPage'

function App() {
  return (
    <Router>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegistroPage />} />

        {/* Rutas protegidas */}
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/sesion/:id" element={<ProtectedRoute><SesionDetailPage /></ProtectedRoute>} />
        <Route path="/rutinas" element={<ProtectedRoute><RutinasPage /></ProtectedRoute>} />
        <Route path="/deload" element={<ProtectedRoute><DeloadPage /></ProtectedRoute>} />
        <Route path="/stats" element={<ProtectedRoute><StatsPage /></ProtectedRoute>} />
        <Route path="/debug-user" element={<ProtectedRoute><DebugUserPage /></ProtectedRoute>} />
      </Routes>
    </Router>
  )
}

export default App
