type BrandBeeMarkProps = {
  className?: string
}

export function BrandBeeMark({ className = "" }: BrandBeeMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={`brand-bee-mark ${className}`}
      viewBox="0 0 64 46"
      role="presentation"
    >
      <path
        className="brand-bee-wing brand-bee-wing-left"
        d="M27 19C20 9 10 7 4 13c4 9 12 13 23 11"
      />
      <path
        className="brand-bee-wing brand-bee-wing-right"
        d="M37 19c7-10 17-12 23-6-4 9-12 13-23 11"
      />
      <path
        className="brand-bee-antenna"
        d="M28 9c-3-4-6-5-9-4M36 9c3-4 6-5 9-4"
      />
      <circle className="brand-bee-head" cx="32" cy="10" r="4.5" />
      <path className="brand-bee-body" d="m32 14 9 6v13l-9 9-9-9V20z" />
      <path className="brand-bee-line" d="M25 23h14M23 29h18M26 35h12" />
      <path className="brand-bee-facet" d="m32 17 5 3v6l-5 3-5-3v-6z" />
    </svg>
  )
}
