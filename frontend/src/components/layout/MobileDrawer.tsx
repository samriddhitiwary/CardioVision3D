// No unused imports
import { Activity, X, LogOut } from "lucide-react"
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from "../ui/Dialog"
import { navItems } from "./Sidebar"
import { NavLink } from "react-router-dom"
import { cn } from "../../lib/utils"
import { Avatar, AvatarFallback } from "../ui/Avatar"

export function MobileDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="z-40" />
      <DialogContent className="fixed inset-y-0 left-0 z-50 w-72 max-w-[80vw] translate-x-0 translate-y-0 grid grid-rows-[auto_1fr_auto] gap-0 border-r border-[var(--border)] bg-[var(--sidebar-bg)] p-0 shadow-xl sm:rounded-none data-[state=closed]:slide-out-to-left-full data-[state=open]:slide-in-from-left-full">
        {/* Title for accessibility */}
        <div className="sr-only"><DialogTitle>Navigation Menu</DialogTitle></div>

        <div className="flex h-16 items-center justify-between px-6 border-b border-[var(--sidebar-active)]">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-white" />
            <span className="ml-3 text-xl font-bold tracking-tight text-white">CardioVision3D</span>
          </div>
          <button onClick={onClose} className="text-[var(--sidebar-muted)] hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "group flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[var(--sidebar-active)] text-white"
                    : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-active)] hover:text-white"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      "mr-3 h-6 w-6 shrink-0",
                      isActive ? "text-white" : "text-[var(--sidebar-muted)] group-hover:text-white"
                    )}
                    aria-hidden="true"
                  />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Card */}
        <div className="border-t border-[var(--sidebar-active)] p-4">
          <div className="flex items-center">
            <Avatar className="h-9 w-9 border-none bg-[var(--primary)] text-white">
              <AvatarFallback className="bg-[var(--primary)]">CL</AvatarFallback>
            </Avatar>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">Clinician</p>
              <p className="text-xs text-[var(--sidebar-muted)] truncate">clinician@hospital.org</p>
            </div>
            <button className="ml-auto text-[var(--sidebar-muted)] hover:text-white">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
