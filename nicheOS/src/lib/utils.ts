import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function nanoid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function scoreColor(score: number): string {
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#f59e0b'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

export function scoreLabel(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Weak'
}

export function trendIcon(trend: 'up' | 'down' | 'stable'): string {
  return trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'
}

export function trendColor(trend: 'up' | 'down' | 'stable'): string {
  return trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#8888aa'
}

export function opportunityColor(opp: 'high' | 'medium' | 'low'): string {
  return opp === 'high' ? '#10b981' : opp === 'medium' ? '#f59e0b' : '#ef4444'
}
