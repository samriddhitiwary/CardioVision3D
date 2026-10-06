import { useAuthStore } from "./authStore"

export function useCurrentDoctor() {
  const { profile } = useAuthStore()
  
  // Derivation logic:
  // 1. stored fullName
  // 2. email
  // 3. "Clinician" fallback
  
  // Note: JWT claim derivation could be added here if needed, but since our backend
  // doesn't put name or email in the JWT, we rely on the profile we store at login/register.
  
  const displayName = profile?.fullName || profile?.email || "Clinician"
  const email = profile?.email || ""
  
  return {
    displayName,
    email,
    profile
  }
}
