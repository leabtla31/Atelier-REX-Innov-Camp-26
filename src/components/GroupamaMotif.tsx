export function SignatureCirclesMotif() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none absolute -top-12 -right-12 sm:-top-16 sm:-right-10 w-[260px] h-[250px] sm:w-[390px] sm:h-[360px] overflow-visible z-0"
    >
      {/* Green circle (Groupama #006341) */}
      <div
        className="absolute rounded-full"
        style={{
          width: '210px',
          height: '210px',
          backgroundColor: '#006341',
          top: '68px',
          right: '115px',
          opacity: 0.94,
        }}
      />
      {/* Lime / Anis circle (#C7D530) */}
      <div
        className="absolute rounded-full"
        style={{
          width: '225px',
          height: '225px',
          backgroundColor: '#C7D530',
          top: '-10px',
          right: '24px',
          opacity: 0.95,
        }}
      />
      {/* Orange circle (#E16C2A) */}
      <div
        className="absolute rounded-full"
        style={{
          width: '205px',
          height: '205px',
          backgroundColor: '#E16C2A',
          top: '112px',
          right: '-18px',
          opacity: 0.96,
        }}
      />
    </div>
  );
}
