import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface MessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  variant?: 'default' | 'success' | 'error'
}

export default function MessageDialog({
  open,
  onOpenChange,
  title,
  message,
  variant = 'default'
}: MessageDialogProps) {
  const getIcon = () => {
    switch (variant) {
      case 'success':
        return '✓'
      case 'error':
        return '✗'
      default:
        return '💡'
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{getIcon()}</span>
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>
            Entendido
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
