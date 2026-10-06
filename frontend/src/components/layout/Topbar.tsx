import { Menu, LogOut } from "lucide-react"
import { useLocation } from "react-router-dom"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/DropdownMenu"
import { Avatar, AvatarFallback } from "../ui/Avatar"
import { useCurrentDoctor } from "../../features/auth/useCurrentDoctor"
import { PatientSelector } from "./PatientSelector"

export function Topbar({ onMenuClick, onLogout }: { onMenuClick: () => void, onLogout: () => void }) {
  const location = useLocation()
  const { displayName, email } = useCurrentDoctor()
  const initials = displayName.substring(0, 2).toUpperCase()
  
  // Very basic breadcrumb derivation for placeholders
  const pathSegments = location.pathname.split('/').filter(Boolean)
  const breadcrumb = pathSegments.length === 0 
    ? "Dashboard" 
    : pathSegments.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" / ")

  return (
    <div className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b border-[var(--border)] bg-[var(--surface)] px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-[var(--text-muted)] hover:text-[var(--text)] md:hidden"
        onClick={onMenuClick}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-[var(--border)] md:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 items-center">
        {/* Breadcrumb */}
        <div className="flex-1 font-semibold text-[var(--text)]">
          {breadcrumb}
        </div>
        
        {/* Right section */}
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <div className="hidden sm:block">
            <PatientSelector />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 outline-none">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[var(--primary)] text-white text-xs">{initials}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-sm font-medium text-[var(--text)]">
                {displayName}
                <p className="text-xs font-normal text-[var(--text-muted)] truncate">{email}</p>
              </div>
              <div className="h-px bg-[var(--border)] my-1" />
              <DropdownMenuItem onClick={onLogout} className="text-[var(--danger)] focus:text-[var(--danger)] cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
