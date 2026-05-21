import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

export default function DebugUserPage() {
  const navigate = useNavigate()
  const [userId, setUserId] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [rutinas, setRutinas] = useState<any[]>([])

  useEffect(() => {
    async function fetchDebugInfo() {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        setUserId(user.id)
        setEmail(user.email || '')
      }

      // Buscar todas las rutinas (sin filtrar por user)
      const { data: todasRutinas } = await supabase
        .from('rutinas')
        .select('*')
        .order('created_at', { ascending: false })

      setRutinas(todasRutinas || [])
    }

    fetchDebugInfo()
  }, [])

  const handleFixUserId = async () => {
    if (!userId) return

    const { error } = await supabase
      .from('rutinas')
      .update({ user_id: userId })
      .ilike('nombre', '%mesociclo%')

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('User ID actualizado correctamente')
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-2xl">
        <Button onClick={() => navigate('/')} className="mb-4">
          ← Volver
        </Button>

        <Card className="mb-6 border-2 border-blue-500">
          <CardHeader>
            <CardTitle>🔍 Debug - Información del Usuario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Email:</p>
              <p className="font-mono text-lg">{email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">User ID:</p>
              <p className="font-mono text-sm bg-gray-100 p-2 rounded break-all">
                {userId}
              </p>
              <Button
                onClick={() => navigator.clipboard.writeText(userId)}
                size="sm"
                variant="outline"
                className="mt-2"
              >
                Copiar User ID
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>📋 Todas las Rutinas en la Base de Datos</CardTitle>
          </CardHeader>
          <CardContent>
            {rutinas.length === 0 ? (
              <p className="text-muted-foreground">No hay rutinas</p>
            ) : (
              <div className="space-y-4">
                {rutinas.map((rutina) => (
                  <div
                    key={rutina.id}
                    className="border rounded p-3"
                  >
                    <p className="font-semibold">{rutina.nombre}</p>
                    <div className="text-sm text-muted-foreground mt-2 space-y-1">
                      <p>User ID: <span className="font-mono text-xs">{rutina.user_id || 'null'}</span></p>
                      <p>Activa: {rutina.activa ? '✓ Sí' : '✗ No'}</p>
                      <p>Coincide con tu user: {rutina.user_id === userId ? '✓ Sí' : '✗ No'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-orange-500">
          <CardHeader>
            <CardTitle>🔧 Fix Rápido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Si Mesociclo 1 no tiene tu user_id, haz clic aquí para arreglarlo:
            </p>
            <Button onClick={handleFixUserId} className="w-full">
              Asignar Mesociclo 1 a mi usuario
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
