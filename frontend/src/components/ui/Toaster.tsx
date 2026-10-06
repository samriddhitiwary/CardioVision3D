import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[var(--surface)] group-[.toaster]:text-[var(--text)] group-[.toaster]:border-[var(--border)] group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-[var(--text-muted)]",
          actionButton:
            "group-[.toast]:bg-[var(--primary)] group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-[var(--surface-muted)] group-[.toast]:text-[var(--text)]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
