import { toast as sonnerToast } from "sonner"

type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
  duration?: number
}

export function useToast() {
  const showToast = ({
    title = "",
    description,
    variant = "default",
    duration = 5000,
  }: ToastProps) => {
    sonnerToast(variant === "destructive" ? 'error' : 'default', {
      description: description || title,
      duration,
      className: variant === "destructive" ? "bg-destructive text-destructive-foreground" : "",
    })
  }

  return { toast: showToast }
}

export const toast = sonnerToast
