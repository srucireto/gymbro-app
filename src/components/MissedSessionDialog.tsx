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
import type { DiasFuera } from '@/types'

interface MissedSessionDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (diasFuera: DiasFuera) => void
  sesionNombre: string
}

const DIAS_FUERA_OPTIONS: Array<{
  valor: DiasFuera
  label: string
  description: string
}> = [
  {
    valor: 1,
    label: '1 día',
    description: 'Solo hoy, mañana vuelvo'
  },
  {
    valor: 2,
    label: '2-3 días',
    description: 'Un par de días fuera'
  },
  {
    valor: 3,
    label: '4-7 días',
    description: 'Casi una semana'
  },
  {
    valor: 4,
    label: 'Más de 7 días',
    description: 'Enfermedad o viaje largo'
  }
]

export default function MissedSessionDialog({
  open,
  onClose,
  onConfirm,
  sesionNombre
}: MissedSessionDialogProps) {
  const [diasFuera, setDiasFuera] = useState<DiasFuera | null>(null)

  const handleConfirm = () => {
    if (diasFuera) {
      onConfirm(diasFuera)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Marcar sesión como faltada</DialogTitle>
          <DialogDescription>
            {sesionNombre} - ¿Cuántos días vas a estar fuera del gym?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {DIAS_FUERA_OPTIONS.map((option) => (
            <Card
              key={option.valor}
              className={`cursor-pointer transition-all ${
                diasFuera === option.valor
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => setDiasFuera(option.valor)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{option.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                  {diasFuera === option.valor && (
                    <div className="text-primary">✓</div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!diasFuera}
            className="flex-1"
          >
            Confirmar
          </Button>
        </div>

        {diasFuera && diasFuera >= 2 && (
          <div className="text-xs text-muted-foreground border-t pt-3">
            ℹ️ Se reorganizará el calendario automáticamente
            {diasFuera >= 3 && ' y se pedirá check-in al volver'}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
