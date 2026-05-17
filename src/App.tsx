import { BrowserRouter as Router } from 'react-router-dom'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900">
            GymBro
          </h1>
          <p className="mt-2 text-gray-600">
            Gestión de rutinas de hipertrofia
          </p>
        </div>
      </div>
    </Router>
  )
}

export default App
