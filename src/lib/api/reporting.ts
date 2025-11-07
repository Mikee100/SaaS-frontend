import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function for merging class names.
 * 
 * This function takes in multiple class names as inputs and returns a single class name string.
 * It uses the `clsx` function from the `clsx` library to merge the class names, and then passes the result to the `twMerge` function from the `tailwind-merge` library to handle any Tailwind-specific class name merging.
 * 
 * @param inputs - Multiple class names to be merged.
 * @returns A single class name string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}