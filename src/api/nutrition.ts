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

export type FoodLogEntry = {
  id: string
  foodId: string
  food: {
    name: string
    category: string
    servingG: number
    servingLabel: string | null
    kcalPer100g: number
    proteinPer100g: number
    carbsPer100g: number
    fatPer100g: number
  }
  grams: number
  mealType: string
  date: string
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

export type MacroTotals = {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

export type FoodLogData = {
  date: string
  dayType: 'hard' | 'easy' | 'rest'
  logs: FoodLogEntry[]
  totals: MacroTotals
  target: MacroTotals | null
  pct: MacroTotals | null
}

export async function getNutrition(): Promise<NutritionData> {
  return apiFetch<NutritionData>('/api/mobile/nutrition')
}

export async function getFoodLogs(date?: string): Promise<FoodLogData> {
  const param = date ? `?date=${date}` : ''
  return apiFetch<FoodLogData>(`/api/mobile/nutrition/log${param}`)
}

export async function logFood(payload: {
  foodId: string
  grams: number
  mealType: string
  date?: string
}): Promise<FoodLogEntry & MacroTotals> {
  return apiFetch('/api/mobile/nutrition/log', { method: 'POST', body: payload })
}

export type FoodItem = {
  id: string
  name: string
  category: string
  kcalPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  servingG: number
  servingLabel: string | null
}

export async function getFoods(): Promise<FoodItem[]> {
  return apiFetch<FoodItem[]>('/api/mobile/nutrition/foods')
}

export async function generateMeals(payload: {
  availableFoods: string[]
  restrictions: string[]
  mealsPerDay: number
  weighsFood: boolean
  notes?: string
}): Promise<{ ok: boolean; mealPlanId: string }> {
  return apiFetch('/api/mobile/nutrition/generate-meals', { method: 'POST', body: payload })
}
