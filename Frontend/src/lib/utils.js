import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatAddress(address) {
  if (!address) return ''
  // Split by comma or Arabic comma
  const parts = address.split(/[،,]+/).map(p => p.trim())
  const blacklist = [
    'موريتانيا', 'الجمهورية الإسلامية الموريتانية', 'نواكشوط', 
    'نواكشوط الشمالية', 'نواكشوط الغربية', 'نواكشوط الجنوبية',
    'Mauritania', 'Nouakchott', 'Nouakchott-Nord', 'Nouakchott-Ouest', 'Nouakchott-Sud'
  ]
  
  // Filter out generic parts
  const filtered = parts.filter(p => !blacklist.includes(p))
  
  // Return the most specific part (usually the first non-generic part)
  return filtered.length > 0 ? filtered[0] : parts[0]
}
