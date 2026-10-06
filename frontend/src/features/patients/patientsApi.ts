import { http } from "../../lib/http"
import type { Patient } from "../../types/api"

export const patientsApi = {
  async listAll(): Promise<Patient[]> {
    let allPatients: Patient[] = []
    let skip = 0
    const limit = 100
    
    while (allPatients.length < 500) {
      const { data } = await http.get<Patient[]>("/api/patients/", {
        params: { skip, limit }
      })
      
      allPatients = allPatients.concat(data)
      
      if (data.length < limit) {
        break
      }
      skip += limit
    }
    
    // Cap at 500
    return allPatients.slice(0, 500)
  },

  async get(id: string | number): Promise<Patient> {
    const { data } = await http.get<Patient>(`/api/patients/${id}`)
    return data
  },

  async create(payload: Partial<Patient>): Promise<Patient> {
    const { data } = await http.post<Patient>("/api/patients/", payload)
    return data
  },

  async update(id: string | number, payload: Partial<Patient>): Promise<Patient> {
    const { data } = await http.put<Patient>(`/api/patients/${id}`, payload)
    return data
  },

  async remove(id: string | number): Promise<void> {
    await http.delete(`/api/patients/${id}`)
  }
}
