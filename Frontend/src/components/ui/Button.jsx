import Spinner from './Spinner'

const variants = {
  primary:  'btn-primary',
  secondary:'btn-secondary',
  outline:  'btn-outline',
  ghost:    'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-2 rounded-xl transition-all',
  danger:   'bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-xl transition-all disabled:opacity-50',
}

const sizes = {
  sm:  'px-4 py-2 text-sm',
  md:  '',
  lg:  'px-8 py-4 text-lg',
  icon:'p-2',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
