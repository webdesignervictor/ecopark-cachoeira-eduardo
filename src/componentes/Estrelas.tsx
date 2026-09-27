interface Props {
  /** 1 a 5. */
  nota: number
}

/** Fileira de cinco estrelas; as acesas usam o laranja da marca. */
export function Estrelas({ nota }: Props) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${nota} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={`size-5 ${i <= nota ? 'fill-laranja' : 'fill-linha'}`}
        >
          <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
        </svg>
      ))}
    </div>
  )
}
