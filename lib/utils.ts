import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCompactNumber(
  value: number,
  decimals = 1,
  prefix = "",
) {
  if (!Number.isFinite(value)) return `${prefix}0`

  const abs = Math.abs(value)
  const sign = value < 0 ? "-" : ""
  const safeDecimals = Math.max(0, decimals)

  const UNITS = [
    { threshold: 1_000_000_000, suffix: "B" },
    { threshold: 1_000_000, suffix: "M" },
    { threshold: 1_000, suffix: "K" },
  ] as const

  for (const unit of UNITS) {
    if (abs >= unit.threshold) {
      const scaled = abs / unit.threshold
      const text = scaled
        .toFixed(safeDecimals)
        .replace(/\.0+$/, "")
        .replace(/(\.\d*[1-9])0+$/, "$1")
      return `${sign}${prefix}${text}${unit.suffix}`
    }
  }

  const text = abs
    .toFixed(safeDecimals)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*[1-9])0+$/, "$1")

  return `${sign}${prefix}${text}`
}
