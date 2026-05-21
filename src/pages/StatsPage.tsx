import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import StatsAusencias from '@/components/stats/StatsAusencias'
import StatsProgreso from '@/components/stats/StatsProgreso'
import StatsMusculos from '@/components/stats/StatsMusculos'
import { BarChart3 } from 'lucide-react'

export default function StatsPage() {
  const [activeTab, setActiveTab] = useState('ausencias')

  return (
    <div className="min-h-screen bg-[#fafafa] pb-20">
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Header */}
        <div className="mb-8">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="mb-3 -ml-2"
          >
            <Link to="/">← Volver</Link>
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Estadísticas</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Seguimiento de tu progreso y consistencia
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="ausencias" className="text-xs">
              Ausencias
            </TabsTrigger>
            <TabsTrigger value="progreso" className="text-xs">
              Progreso
            </TabsTrigger>
            <TabsTrigger value="musculos" className="text-xs">
              Músculos
            </TabsTrigger>
          </TabsList>

          {/* Tab: Ausencias */}
          <TabsContent value="ausencias" className="space-y-4">
            <StatsAusencias />
          </TabsContent>

          {/* Tab: Progreso de peso */}
          <TabsContent value="progreso" className="space-y-4">
            <StatsProgreso />
          </TabsContent>

          {/* Tab: Repeticiones por músculo */}
          <TabsContent value="musculos" className="space-y-4">
            <StatsMusculos />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
