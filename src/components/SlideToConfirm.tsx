import { useState, useRef, useEffect } from 'react'
import { Check, ChevronRight } from 'lucide-react'

interface SlideToConfirmProps {
  onConfirm: () => void
  text?: string
  className?: string
}

export default function SlideToConfirm({
  onConfirm,
  text = "Deslizar para completar",
  className = ""
}: SlideToConfirmProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const sliderRef = useRef<HTMLDivElement>(null)

  const SLIDER_WIDTH = 60
  const THRESHOLD = 0.85 // 85% para completar

  useEffect(() => {
    if (isCompleted) {
      const timer = setTimeout(() => {
        onConfirm()
        setPosition(0)
        setIsCompleted(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isCompleted, onConfirm])

  const handleStart = (_clientX: number) => {
    if (isCompleted) return
    setIsDragging(true)
  }

  const handleMove = (clientX: number) => {
    if (!isDragging || !containerRef.current || isCompleted) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const maxPosition = containerRect.width - SLIDER_WIDTH

    let newPosition = clientX - containerRect.left - SLIDER_WIDTH / 2
    newPosition = Math.max(0, Math.min(newPosition, maxPosition))

    setPosition(newPosition)

    // Check if reached threshold
    if (newPosition >= maxPosition * THRESHOLD) {
      setIsDragging(false)
      setPosition(maxPosition)
      setIsCompleted(true)
    }
  }

  const handleEnd = () => {
    if (isCompleted) return
    setIsDragging(false)

    // Animate back to start
    setPosition(0)
  }

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    handleStart(e.clientX)
  }

  const handleMouseMove = (e: MouseEvent) => {
    handleMove(e.clientX)
  }

  const handleMouseUp = () => {
    handleEnd()
  }

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX)
  }

  const handleTouchEnd = () => {
    handleEnd()
  }

  // Add/remove global listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging])

  const containerWidth = containerRef.current?.getBoundingClientRect().width || 0
  const maxPosition = containerWidth - SLIDER_WIDTH
  const progress = maxPosition > 0 ? (position / maxPosition) * 100 : 0

  return (
    <div className={`relative ${className}`}>
      <div
        ref={containerRef}
        className={`
          relative h-14 rounded-full overflow-hidden
          ${isCompleted ? 'bg-green-500' : 'bg-gray-700/90'}
          border border-gray-600
          transition-colors duration-300
          select-none touch-none
        `}
      >
        {/* Background progress glow */}
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/30 to-transparent transition-all duration-100"
          style={{ width: `${progress}%` }}
        />

        {/* Text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className={`
            font-semibold text-sm tracking-wide transition-opacity duration-200
            ${isCompleted ? 'text-white' : 'text-gray-300'}
            ${progress > 50 ? 'opacity-0' : 'opacity-100'}
          `}>
            {isCompleted ? '¡Completado!' : text}
          </span>
          {isCompleted && (
            <Check className="h-5 w-5 text-white animate-in zoom-in duration-300" />
          )}
        </div>

        {/* Slider Button */}
        <div
          ref={sliderRef}
          className={`
            absolute top-1 left-1 bottom-1
            w-12 rounded-full
            ${isCompleted ? 'bg-white' : 'bg-gradient-to-b from-gray-100 to-gray-200'}
            border border-gray-300
            shadow-lg cursor-grab active:cursor-grabbing
            flex items-center justify-center
            transition-all duration-300
            ${isDragging ? 'scale-105 shadow-xl' : 'scale-100'}
          `}
          style={{
            transform: `translateX(${position}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out'
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {isCompleted ? (
            <Check className="h-5 w-5 text-green-500" />
          ) : (
            <ChevronRight className={`h-5 w-5 text-gray-600 transition-transform ${isDragging ? 'scale-110' : ''}`} />
          )}
        </div>
      </div>

      {/* Hint text */}
      {!isCompleted && position === 0 && (
        <div className="text-center mt-2 text-xs text-muted-foreground">
          Arrastra hacia la derecha para confirmar
        </div>
      )}
    </div>
  )
}
