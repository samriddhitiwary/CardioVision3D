import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { authApi } from "../../../features/auth/authApi"
import { authStore } from "../../../features/auth/authStore"
import { sanitizeNextUrl } from "../../guards/utils"
import { Button } from "../../../components/ui/Button"
import { Input } from "../../../components/ui/Input"
import { Alert } from "../../../components/ui/Alert"
import { Eye, EyeOff } from "lucide-react"

export function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const loginMutation = useMutation({
    mutationFn: () => authApi.login(email, password),
    onSuccess: (tokens) => {
      authStore.setSession(tokens.access_token, tokens.refresh_token, authStore.getProfile() || { email })
      const nextUrl = sanitizeNextUrl(searchParams.get("next"))
      navigate(nextUrl, { replace: true })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loginMutation.mutate()
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold text-[var(--text)] tracking-tight">Sign in</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Welcome back. Please enter your details.
        </p>
      </div>

      {loginMutation.isError && (
        <Alert variant="error" title="Sign in failed">
          Incorrect email or password.
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="doctor@hospital.org"
          autoComplete="email"
        />

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
          <button
            type="button"
            aria-label="Toggle password visibility"
            className="absolute right-3 top-8 text-[var(--text-muted)] hover:text-[var(--text)]"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <Button 
          type="submit" 
          className="w-full mt-6" 
          loading={loginMutation.isPending}
        >
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-[var(--text-muted)]">
        Don't have an account?{" "}
        <Link to="/register" className="font-semibold text-[var(--primary)] hover:underline">
          Register here
        </Link>
      </p>
    </div>
  )
}
