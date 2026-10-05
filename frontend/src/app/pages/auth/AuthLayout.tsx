import { Activity } from "lucide-react"
import { Outlet } from "react-router-dom"
import { Toaster } from "../../../components/ui/Toaster"

export function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      {/* Brand Panel (Hidden on very small screens, compact on mobile, full on md) */}
      <div className="hidden md:flex flex-col w-1/2 bg-[var(--sidebar-bg)] text-white p-12 justify-center relative overflow-hidden">
        {/* Subtle SVG Background Pattern */}
        <svg 
          className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" 
          viewBox="0 0 100 100" 
          preserveAspectRatio="none"
        >
          <path d="M0,50 Q25,50 30,30 T50,50 T70,70 T100,50" stroke="white" strokeWidth="0.5" fill="none" />
          <path d="M0,60 Q20,60 30,20 T40,60 T60,60 T100,60" stroke="white" strokeWidth="0.2" fill="none" />
        </svg>

        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
              <Activity className="h-10 w-10 text-white" />
            </div>
            <span className="text-3xl font-bold tracking-tight">CardioVision3D</span>
          </div>
          
          <h1 className="text-4xl font-semibold mb-6 leading-tight">
            Next-Generation Cardiac Risk Assessment
          </h1>
          
          <ul className="space-y-4 text-[var(--sidebar-muted)] text-lg">
            <li className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
              Calibrated CAD and vessel-specific risk scores
            </li>
            <li className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
              Actionable, AI-driven patient narratives
            </li>
            <li className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
              3D interactive visualization tools
            </li>
          </ul>
        </div>
      </div>

      {/* Form Area */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-center gap-2 mb-8">
          <Activity className="h-8 w-8 text-[var(--primary)]" />
          <span className="text-2xl font-bold text-[var(--text)] tracking-tight">CardioVision3D</span>
        </div>

        <div className="mx-auto w-full max-w-sm">
          <Outlet />
        </div>
      </div>
      <Toaster />
    </div>
  )
}
