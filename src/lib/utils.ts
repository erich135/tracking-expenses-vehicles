import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date formatting utility for yyyy/mm/dd format
export function formatDate(date: Date | string): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  
  return `${year}/${month}/${day}`
}

// Parse yyyy/mm/dd format to Date
export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null
  
  const parts = dateStr.split('/')
  if (parts.length !== 3) return null
  
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  const day = parseInt(parts[2], 10)
  
  const date = new Date(year, month, day)
  if (isNaN(date.getTime())) return null
  
  return date
}

// Convert Date to yyyy-mm-dd format for HTML input
export function toInputDate(date: Date | string): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  
  return d.toISOString().split('T')[0]
}