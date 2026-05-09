import { Star } from 'lucide-react'
import { useState } from 'react'

export default function StarRating({ value = 0, onChange, max = 5, size = 18, readOnly = false }) {
  const [hover, setHover] = useState(0)

  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => {
        const filled = (hover || value) > i
        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(i + 1)}
            onMouseEnter={() => !readOnly && setHover(i + 1)}
            onMouseLeave={() => !readOnly && setHover(0)}
            className={readOnly ? 'cursor-default' : 'cursor-pointer transition-transform hover:scale-110'}
          >
            <Star
              size={size}
              className={filled ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}
            />
          </button>
        )
      })}
    </div>
  )
}
