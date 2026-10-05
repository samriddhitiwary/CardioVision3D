import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { patientsApi } from "./patientsApi"
import type { Patient } from "../../types/api"

export function usePatients() {
  return useQuery({
    queryKey: ["patients", "all"],
    queryFn: patientsApi.listAll,
  })
}

export function usePatient(id: string | number | undefined) {
  return useQuery({
    queryKey: ["patient", id],
    queryFn: () => patientsApi.get(id!),
    enabled: !!id,
  })
}

export function useCreatePatient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<Patient>) => patientsApi.create(payload),
    onSuccess: (newPatient) => {
      queryClient.setQueryData<Patient[]>(["patients", "all"], (old) => old ? [...old, newPatient] : [newPatient])
      queryClient.setQueryData(["patient", newPatient.id], newPatient)
      queryClient.invalidateQueries({ queryKey: ["patients", "all"] })
    }
  })
}

export function useUpdatePatient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number, payload: Partial<Patient> }) => patientsApi.update(id, payload),
    onSuccess: (updatedPatient) => {
      queryClient.setQueryData(["patient", updatedPatient.id], updatedPatient)
      queryClient.invalidateQueries({ queryKey: ["patients", "all"] })
    }
  })
}

export function useDeletePatient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string | number) => patientsApi.remove(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: ["patient", deletedId] })
      queryClient.invalidateQueries({ queryKey: ["patients", "all"] })
    }
  })
}
