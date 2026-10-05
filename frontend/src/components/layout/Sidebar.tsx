import { LayoutDashboard, ClipboardPlus, Activity, FolderOpen, Cpu, LogOut } from "lucide-react"
import { cn } from "../../lib/utils"
import { NavLink } from "react-router-dom"
import { Avatar, AvatarFallback } from "../ui/Avatar"
import { useCurrentDoctor } from "../../features/auth/useCurrentDoctor"

export const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "New Assessment", href: "/assessment/new", icon: ClipboardPlus },
  { name: "Patient Records", href: "/records", icon: FolderOpen },
  { name: "Analysis Report", href: "/analysis", icon: Activity },
  { name: "Model Info", href: "/model-info", icon: Cpu },
]

export function Sidebar({ onLogout }: { onLogout: () => void }) {
  const { displayName, email } = useCurrentDoctor()
  const initials = displayName.substring(0, 2).toUpperCase()

  return (
    <div className="hidden md:flex h-full flex-col bg-[var(--sidebar-bg)] text-[var(--sidebar-fg)] transition-all duration-300 w-16 xl:w-64">
      {/* Logo Area */}
      <div className="flex h-16 shrink-0 items-center justify-center xl:justify-start xl:px-6 border-b border-[var(--sidebar-active)]">
        <Activity className="h-8 w-8 text-[var(--primary)]" />
        <span className="ml-3 hidden text-xl font-bold tracking-tight text-white xl:block">CardioVision3D</span>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "group flex items-center rounded-md px-2 xl:px-3 py-2 text-sm font-medium transition-colors",
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
                    "mr-0 xl:mr-3 h-6 w-6 shrink-0",
                    isActive ? "text-white" : "text-[var(--sidebar-muted)] group-hover:text-white"
                  )}
                  aria-hidden="true"
                />
                <span className="hidden xl:block">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Card */}
      <div className="border-t border-[var(--sidebar-active)] p-4">
        <div className="flex items-center">
          <Avatar className="h-9 w-9 border-none bg-[var(--primary)] text-white">
            <AvatarFallback className="bg-[var(--primary)] text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="ml-3 hidden xl:block overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{displayName}</p>
            <p className="text-xs text-[var(--sidebar-muted)] truncate">{email}</p>
          </div>
          <button onClick={onLogout} className="ml-auto hidden xl:block text-[var(--sidebar-muted)] hover:text-white">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
