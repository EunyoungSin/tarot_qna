interface CardBackProps {
  onClick?: () => void
  disabled?: boolean
  dimmed?: boolean
  selected?: boolean
  order?: number
}

export default function CardBack({ onClick, disabled, dimmed, selected, order }: CardBackProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative aspect-[2/3] w-full shrink-0 overflow-hidden rounded-md border-2 shadow-md transition-all duration-200 ${
        selected
          ? 'z-10 -translate-y-6 border-gold shadow-lg shadow-gold/40 ring-2 ring-gold'
          : 'border-gold/60'
      } ${
        disabled && !selected ? 'cursor-default' : ''
      } ${
        !disabled || selected ? 'hover:-translate-y-2 hover:border-gold cursor-pointer' : ''
      } ${dimmed && !selected ? 'opacity-30' : 'opacity-100'}`}
    >
      <img
        src="/cards/card-back.png"
        alt="카드 뒷면"
        className="h-full w-full object-cover"
        draggable={false}
      />
      {selected && order != null && (
        <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-gold text-xs font-bold text-ink shadow">
          {order}
        </span>
      )}
    </button>
  )
}
