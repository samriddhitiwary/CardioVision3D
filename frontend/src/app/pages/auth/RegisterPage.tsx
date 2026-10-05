import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react"
import { RegisterSchema, type RegisterFormData } from "../../../features/auth/registerValidation"
import { authApi } from "../../../features/auth/authApi"
import { authStore } from "../../../features/auth/authStore"
import { Button } from "../../../components/ui/Button"
import { Input } from "../../../components/ui/Input"
import { getApiErrorMessage } from "../../../lib/apiError"

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors }, watch, setError } = useForm<RegisterFormData>({
    resolver: zodResolver(RegisterSchema)
  })

  const passwordValue = watch("password", "")

  // Strength meter logic
  const calculateStrength = (pwd: string) => {
    let score = 0
    if (pwd.length >= 10) score += 1
    if (/[A-Za-z]/.test(pwd)) score += 1
    if (/[0-9]/.test(pwd)) score += 1
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1
    return score
  }
  const strength = calculateStrength(passwordValue)

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      // 1. Register
      await authApi.register({
        email: data.email,
        password: data.password,
        full_name: data.fullName
      })
      
      // 2. Auto-login
      const tokens = await authApi.login(data.email, data.password)
      return { tokens, profile: { email: data.email, fullName: data.fullName } }
    },
    onSuccess: ({ tokens, profile }) => {
      authStore.setSession(tokens.access_token, tokens.refresh_token, profile)
      navigate("/dashboard", { replace: true })
    },
    onError: (error) => {
      const msg = getApiErrorMessage(error)
      if (msg.toLowerCase().includes("email already registered")) {
        setError("email", { message: "Email already registered" })
      } else if (msg.toLowerCase().includes("incorrect email or password")) {
        // Auto-login failed but registration might have succeeded
        toast.success("Account created! Please log in.")
        navigate("/login", { replace: true })
      } else {
        toast.error(msg)
      }
    }
  })

  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data)
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 my-8">
      <div>
        <h2 className="text-3xl font-bold text-[var(--text)] tracking-tight">Create an account</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Join CardioVision3D to start analyzing risk.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Full Name"
          {...register("fullName")}
          error={errors.fullName?.message}
          placeholder="Dr. Jane Doe"
        />

        <Input
          label="Email address"
          type="email"
          {...register("email")}
          error={errors.email?.message}
          placeholder="doctor@hospital.org"
          autoComplete="email"
        />

        <div className="space-y-1">
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              {...register("password")}
              error={errors.password?.message}
              placeholder="••••••••"
            />
            <button
              type="button"
              className="absolute right-3 top-8 text-[var(--text-muted)] hover:text-[var(--text)]"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          
          {/* Strength Meter */}
          {passwordValue.length > 0 && (
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4].map((level) => (
                <div 
                  key={level} 
                  className={`h-1 w-full rounded-full ${
                    strength >= level 
                      ? strength <= 2 ? "bg-[var(--warning)]" : strength === 3 ? "bg-blue-400" : "bg-[var(--success)]"
                      : "bg-[var(--surface-muted)]"
                  }`} 
                />
              ))}
            </div>
          )}
        </div>

        <Input
          label="Confirm Password"
          type={showPassword ? "text" : "password"}
          {...register("confirmPassword")}
          error={errors.confirmPassword?.message}
          placeholder="••••••••"
        />

        <Button 
          type="submit" 
          className="w-full mt-6" 
          loading={registerMutation.isPending}
        >
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-[var(--text-muted)]">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-[var(--primary)] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
