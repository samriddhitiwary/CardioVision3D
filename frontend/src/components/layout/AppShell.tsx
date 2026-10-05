import * as React from "react"
import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { MobileDrawer } from "./MobileDrawer"
import { DisclaimerBar } from "./DisclaimerBar"
import { Toaster } from "../ui/Toaster"
import { useLogout } from "../../features/auth/useLogout"

export function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const { openLogout, LogoutDialog } = useLogout()

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      {/* Mobile Drawer Navigation */}
      <MobileDrawer isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} onLogout={openLogout} />
      
      {/* Desktop Sidebar Navigation */}
      <Sidebar onLogout={openLogout} />
      
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <DisclaimerBar />
        <Topbar onMenuClick={() => setMobileMenuOpen(true)} onLogout={openLogout} />
        
        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      <LogoutDialog />
      <Toaster />
    </div>
  )
}
