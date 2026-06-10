import { apiFetch } from './client'

export type NutritionData = {
  hasNutritionPlan: boolean
  dayType: 'hard' | 'easy' | 'rest'
  macros: {
    kcal: number
    proteinG: number
    carbsG: number
    fatG: number
    tdee: number
  } | null
  mealPlan: any | null
}

export async function getNutrition(): Promise<NutritionData> {
  return apiFetch<NutritionData>('/api/mobile/nutrition')
}
