import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { analyzePatient } from "../../services/cardioApi"
import { generateRiskStory } from "../../services/riskStoryService"
import type { RiskStoryRequest } from "../../services/riskStoryService"
import { usePatient, useUpdatePatient } from "../patients/hooks"
import { AnalyzeResponseSchema } from "./normalizeAnalysis"
import type { AnalyzeResponse } from "../../types/api"

export function useAnalysis(patientId: string | number | undefined) {
  const { data: patient } = usePatient(patientId)
  const updatePatient = useUpdatePatient()
  
  return useQuery({
    queryKey: ["analysis", patientId],
    queryFn: async () => {
      if (!patient) throw new Error("Patient not found")
      
      // If we already have analysis_data, validate and return it
      if (patient.analysis_data && patient.analysis_data.data) {
        try {
          // Normalize/validate
          const parsed = AnalyzeResponseSchema.parse(patient.analysis_data.data)
          return parsed as AnalyzeResponse
        } catch (e) {
          console.warn("Stored analysis data is invalid, falling back to re-analyze", e)
        }
      }

      // Check if we have clinical data (53 clinical fields excluding name, age, sex)
      if (!patient.clinical_data || Object.keys(patient.clinical_data).length < 53) {
        throw new Error("INCOMPLETE_ASSESSMENT")
      }

      // Fetch fresh analysis by combining root age/sex with clinical data
      const payload = {
        ...patient.clinical_data,
        age: patient.age,
        sex: patient.gender
      }
      
      const analysisData = await analyzePatient(payload as any)
      
      // Save it silently
      try {
        await updatePatient.mutateAsync({
          id: patientId as string,
          payload: {
            analysis_data: {
              data: analysisData,
              id: patient.analysis_data?.id || "new",
              patient_id: patient.id,
              created_at: patient.analysis_data?.created_at || new Date().toISOString()
            }
          }
        })
      } catch (err) {
        console.warn("Failed to persist analysis data silently", err)
      }

      return analysisData
    },
    enabled: !!patientId && !!patient,
    staleTime: 1000 * 60 * 5 // 5 minutes
  })
}

export function useRiskStory(patientId: string | number | undefined) {
  const queryClient = useQueryClient()
  
  const query = useQuery({
    queryKey: ["riskStory", patientId],
    queryFn: () => generateRiskStory(patientId!, { force_regenerate: false }),
    enabled: !!patientId,
    staleTime: Infinity, // don't refetch automatically
  })

  const mutation = useMutation({
    mutationFn: (request: RiskStoryRequest) => generateRiskStory(patientId!, request),
    onSuccess: (data) => {
      queryClient.setQueryData(["riskStory", patientId], data)
    }
  })

  return {
    ...query,
    regenerate: () => mutation.mutate({ force_regenerate: true })
  }
}
