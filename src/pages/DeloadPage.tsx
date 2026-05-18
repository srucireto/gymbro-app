import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function DeloadPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#fafafa] pb-20">
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            size="sm"
            className="mb-4 -ml-2"
          >
            ← Volver
          </Button>
        </div>

        {/* Banner principal */}
        <Alert className="bg-orange-50 border-2 border-orange-300 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-3xl">🎉</div>
            <div>
              <h1 className="text-2xl font-bold text-orange-900 mb-1">
                Semana de Deload
              </h1>
              <AlertDescription className="text-orange-800">
                Completaste 6 semanas del mesociclo. Esta semana es de recuperación activa.
              </AlertDescription>
            </div>
          </div>
        </Alert>

        {/* Instrucciones */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Instrucciones</CardTitle>
            <CardDescription>Cómo entrenar esta semana</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-xl">📋</span>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Mismos ejercicios</h3>
                    <p className="text-sm text-muted-foreground">
                      Realiza los mismos ejercicios de tu rutina habitual, en el mismo orden.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-xl">📊</span>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">60% del volumen</h3>
                    <p className="text-sm text-muted-foreground">
                      Reduce el volumen (series) a aproximadamente 60% de lo normal.
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      <strong>Ejemplo:</strong> Si hacías 4 series, hace 2-3. Si hacías 3, hace 2.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-xl">💪</span>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Mismo peso</h3>
                    <p className="text-sm text-muted-foreground">
                      Mantén los pesos de trabajo que venías usando. El descanso viene de la reducción de series, no de intensidad.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-xl">😌</span>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Objetivo: recuperación</h3>
                    <p className="text-sm text-muted-foreground">
                      Esta semana tu cuerpo se recupera del estímulo acumulado. Es normal sentirte "fresco" al terminar.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Próximos pasos */}
        <Card className="bg-blue-50 border-2 border-blue-200">
          <CardHeader>
            <CardTitle>Próximos pasos</CardTitle>
            <CardDescription className="text-blue-800">
              Preparación para el Mesociclo 2
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-blue-900">
            <p>
              Después del deload, es momento de analizar tu progresión y planificar el Mesociclo 2.
            </p>
            <p>
              <strong>Recomendación:</strong> Exporta tu tracking de las 6 semanas y analízalo con Claude para identificar grupos musculares rezagados y ajustar el volumen.
            </p>
            <Button
              onClick={() => navigate('/rutinas')}
              className="w-full mt-4"
              size="lg"
            >
              Ir a Gestión de Rutinas
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
