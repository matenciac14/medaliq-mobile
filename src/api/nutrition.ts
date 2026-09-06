import { apiFetch } from './client'

export type PendingNutritionAdjustment = {
  id: string
  deltaKcal: number
  deltaCarbsG: number
  adjustedKcal: number
  adjustedCarbsG: number
  plannedIntensity: string | null
  actualIntensity: string | null
  status: string
}

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
  pendingAdjustment: PendingNutritionAdjustment | null
  gymKcalBurned: number | null
  waterMlTarget?: number
  planPhaseContext?: string | null
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

export async function deleteFoodLog(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/mobile/nutrition/log/${id}`, { method: 'DELETE', body: {} })
}

export type WeeklyNutritionSummary = {
  weekStart: string
  weekEnd: string
  daysWithLog: number
  daysWithoutLog: number
  avgKcal: number
  targetKcal: number
  adherencePct: number | null
}

export async function getWeeklyNutritionSummary(): Promise<WeeklyNutritionSummary> {
  return apiFetch('/api/mobile/nutrition/log/summary')
}

export type FoodItem = {
  id: string
  name: string
  category: string
  kcalPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  fiberPer100g?: number | null
  servingG: number
  servingLabel: string | null
}

export async function getFoods(): Promise<FoodItem[]> {
  return apiFetch<FoodItem[]>('/api/mobile/nutrition/foods')
}

export type MealTemplateItem = {
  id: string
  foodId: string
  grams: number
  food: {
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
}

export type MealTemplate = {
  id: string
  name: string
  mealType: string | null
  items: MealTemplateItem[]
}

export async function getMealTemplates(): Promise<{ templates: MealTemplate[] }> {
  return apiFetch('/api/mobile/nutrition/meal-templates')
}

export async function createMealTemplate(payload: {
  name: string
  mealType?: string
  items: { foodId: string; grams: number }[]
}): Promise<{ template: MealTemplate }> {
  return apiFetch('/api/mobile/nutrition/meal-templates', { method: 'POST', body: payload })
}

export async function deleteMealTemplate(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/mobile/nutrition/meal-templates/${id}`, { method: 'DELETE', body: {} })
}

export async function acceptNutritionAdjustment(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/mobile/nutrition/adjustment/${id}/accept`, { method: 'POST', body: {} })
}

export async function rejectNutritionAdjustment(id: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/mobile/nutrition/adjustment/${id}/reject`, { method: 'POST', body: {} })
}

export type ProposeInput = {
  name: string
  category: string
  kcalPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  fiberPer100g?: number
  servingG?: number
  servingLabel?: string
  country?: string
  notes?: string
}

export type FoodProposalSummary = {
  id: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  food: { id: string; name: string; kcalPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number }
  reviewNote?: string
  country?: string
  notes?: string
  createdAt: string
}

export async function proposeFood(payload: ProposeInput): Promise<{ proposalId: string; foodId: string }> {
  return apiFetch('/api/mobile/nutrition/foods/propose', { method: 'POST', body: payload })
}

export async function getMyProposals(): Promise<{ proposals: FoodProposalSummary[] }> {
  return apiFetch('/api/mobile/nutrition/foods/my-proposals')
}

// ── PlannedMeals ──────────────────────────────────────────────────────────────

export type PlannedMealFood = {
  id: string; name: string; category: string
  kcalPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number
  servingG: number; servingLabel: string | null
}

export type PlannedMealItem = {
  id: string
  mealType: string
  grams: number
  food: PlannedMealFood
  override: {
    overrideFoodId: string
    overrideGrams: number
    overrideFood: PlannedMealFood
  } | null
}

export async function getPlannedMeals(date: string): Promise<{ date: string; meals: PlannedMealItem[] }> {
  return apiFetch(`/api/mobile/nutrition/plan?date=${encodeURIComponent(date)}`)
}

export async function logPlannedMeal(plannedMealId: string): Promise<{ ok: boolean; action: 'created' | 'updated' }> {
  return apiFetch(`/api/mobile/nutrition/plan/${plannedMealId}/log`, { method: 'POST', body: {} })
}

export async function swapPlannedMeal(plannedMealId: string, foodId: string, grams: number): Promise<{ ok: boolean }> {
  return apiFetch(`/api/mobile/nutrition/plan/${plannedMealId}/swap`, { method: 'POST', body: { foodId, grams } })
}

export async function removeSwap(plannedMealId: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/mobile/nutrition/plan/${plannedMealId}/swap`, { method: 'DELETE', body: {} })
}

export async function logAllPlannedMealsToday(): Promise<{ created: number; total: number }> {
  return apiFetch('/api/mobile/nutrition/planned-meals/log-today', { method: 'POST', body: {} })
}

// ── Grocery list ───────────────────────────────────────────────────────────────

export type GroceryItem = {
  name: string
  totalG: number
}

export type GroceryCategory = {
  category: string
  label: string
  items: GroceryItem[]
}

export type GroceryListData = {
  weekStart: string
  weekEnd: string
  totalItems: number
  categories: GroceryCategory[]
}

export async function getGroceryList(weekStart: string): Promise<GroceryListData> {
  return apiFetch(`/api/mobile/nutrition/grocery-list?weekStart=${encodeURIComponent(weekStart)}`)
}

// ── NutritionTemplate (Constructor A) ─────────────────────────────────────────

export type NutritionTemplateItem = {
  id: string; grams: number
  food: { name: string; kcalPer100g: number }
}

export type NutritionTemplateMeal = {
  id: string; mealType: string
  items: NutritionTemplateItem[]
}

export type NutritionTemplateDay = {
  id: string; dayType: 'HARD' | 'EASY' | 'REST'
  meals: NutritionTemplateMeal[]
}

export type NutritionTemplate = {
  id: string; name: string; goal: string | null
  days: NutritionTemplateDay[]
}

export async function getNutritionTemplates(): Promise<{ templates: NutritionTemplate[] }> {
  return apiFetch('/api/mobile/nutrition/templates')
}

export async function applyNutritionTemplate(
  templateId: string,
  payload: { weekStart: string; intensityMap: Record<string, 'HARD' | 'EASY' | 'REST'> }
): Promise<{ ok: boolean; created: number }> {
  return apiFetch(`/api/mobile/nutrition/templates/${templateId}/apply`, { method: 'POST', body: payload })
}

// ── Water tracking ─────────────────────────────────────────────────────────────

export type WaterLogData = {
  mlLogged: number
  waterMlTarget: number
}

export async function getWaterLog(): Promise<WaterLogData> {
  return apiFetch<WaterLogData>('/api/mobile/nutrition/water')
}

export async function logWater(delta: number): Promise<{ mlLogged: number }> {
  return apiFetch<{ mlLogged: number }>('/api/mobile/nutrition/water', { method: 'POST', body: { delta } })
}
