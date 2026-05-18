import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { CheckInEstado } from '@/types'

interface CheckInDialogProps {
  open: boolean
  onCheckIn: (estado: CheckInEstado) => void
  diasFuera: number
}

const CHECK_IN_OPTIONS: Array<{
  estado: CheckInEstado
  label: string
  description: string
  icon: string
}> = [
  {
    estado: 'bien',
    label: 'Bien',
    description: 'Podría entrenar normal, me siento recuperado',
    icon: '💪'
  },
  {
    estado: 'regular',
    label: 'Regular',
    description: 'Algo de debilidad o cansancio residual',
    icon: '😐'
  },
  {
    estado: 'mal',
    label: 'Mal',
    description: 'Me fuerzo a ir pero no estoy al 100%',
    icon: '😔'
  }
]

export default function CheckInDialog({ open, onCheckIn, diasFuera }: CheckInDialogProps) {
  const [selectedEstado, setSelectedEstado] = useState<CheckInEstado | null>(null)

  const handleConfirm = () => {
    if (selectedEstado) {
      onCheckIn(selectedEstado)
    }
  }

  const getMessage = () => {
    if (diasFuera === 1) {
      return 'Estuviste 1 día fuera. ¿Cómo te sentís para entrenar hoy?'
    } else if (diasFuera <= 3) {
      return `Estuviste ${diasFuera} días fuera. ¿Cómo te sentís para entrenar hoy?`
    } else {
      return `Estuviste ${diasFuera === 4 ? 'más de 7' : diasFuera} días fuera. Check-in obligatorio antes de empezar.`
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Check-in de vuelta</DialogTitle>
          <DialogDescription>
            {getMessage()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {CHECK_IN_OPTIONS.map((option) => (
            <Card
              key={option.estado}
              className={`cursor-pointer transition-all ${
                selectedEstado === option.estado
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => setSelectedEstado(option.estado)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{option.icon}</span>
                  <div className="flex-1">
                    <div className="font-semibold">{option.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button
          onClick={handleConfirm}
          disabled={!selectedEstado}
          className="w-full"
          size="lg"
        >
          Confirmar y empezar sesión
        </Button>

        {selectedEstado === 'regular' && (
          <div className="text-xs text-muted-foreground border-t pt-3">
            ℹ️ Los compuestos pesados se reducirán a 3 series con RIR +1
          </div>
        )}

        {selectedEstado === 'mal' && (
          <div className="text-xs text-orange-600 border-t pt-3">
            ⚠️ Los compuestos pesados se desactivarán. Solo harás aislamiento y finishers.
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
