import { useNavigate } from 'react-router-dom'

export default function DeloadPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-md">
        <button
          onClick={() => navigate('/')}
          className="text-blue-600 hover:text-blue-700 mb-4 text-sm font-semibold"
        >
          ← Volver
        </button>

        <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-6 mb-6">
          <div className="text-3xl mb-2">🎉</div>
          <h1 className="text-2xl font-bold text-orange-900 mb-2">
            Semana de Deload
          </h1>
          <p className="text-orange-800">
            Completaste 6 semanas del mesociclo. Esta semana es de recuperación activa.
          </p>
        </div>

        <div className="bg-white rounded-lg border-2 border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Instrucciones
          </h2>
          
          <div className="space-y-4 text-gray-700">
            <div>
              <div className="font-semibold text-gray-900 mb-1">
                📋 Mismos ejercicios
              </div>
              <p className="text-sm">
                Realiza los mismos ejercicios de tu rutina habitual, en el mismo orden.
              </p>
            </div>

            <div>
              <div className="font-semibold text-gray-900 mb-1">
                📊 60% del volumen
              </div>
              <p className="text-sm">
                Reduce el volumen (series) a aproximadamente 60% de lo normal.
              </p>
              <p className="text-sm mt-1 text-gray-600">
                Ejemplo: Si hacías 4 series, hace 2-3. Si hacías 3, hace 2.
              </p>
            </div>

            <div>
              <div className="font-semibold text-gray-900 mb-1">
                💪 Mismo peso
              </div>
              <p className="text-sm">
                Mantén los pesos de trabajo que venías usando. El descanso viene de la reducción de series, no de intensidad.
              </p>
            </div>

            <div>
              <div className="font-semibold text-gray-900 mb-1">
                😌 Objetivo: recuperación
              </div>
              <p className="text-sm">
                Esta semana tu cuerpo se recupera del estímulo acumulado. Es normal sentirte "fresco" al terminar.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-blue-900 mb-3">
            Próximos pasos
          </h2>
          <div className="text-sm text-blue-900 leading-relaxed space-y-3">
            <p>
              Después del deload, es momento de analizar tu progresión y planificar el Mesociclo 2.
            </p>
            <p>
              <strong>Recomendación:</strong> Exporta tu tracking de las 6 semanas y analízalo con Claude para identificar grupos musculares rezagados y ajustar el volumen.
            </p>
            <p className="font-semibold mt-4">
              ¿Listo para el Mesociclo 2? Carga la nueva rutina en la sección de Gestión de Rutinas.
            </p>
          </div>
          <button
            onClick={() => navigate('/rutinas')}
            className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700"
          >
            Ir a Gestión de Rutinas
          </button>
        </div>
      </div>
    </div>
  )
}
