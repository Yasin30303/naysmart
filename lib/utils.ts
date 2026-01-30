import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Create a UTC date from a date string (YYYY-MM-DD) for consistent database queries.
 * This ensures the date matches the @db.Date format in Prisma.
 */
export function parseToUTCDate(dateString: string): Date {
  // Parse "YYYY-MM-DD" and create UTC date at midnight
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Get today's date as a UTC Date object for consistent database queries.
 */
export function getTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/**
 * Get today's date as a string in YYYY-MM-DD format.
 */
export function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
