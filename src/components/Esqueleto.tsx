/** Esqueleto con pulso de opacidad 1 → .55 (estático con movimiento reducido). */
export function Esqueleto() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <span className="skeleton h-[22px] w-24 rounded-lg" />
      <div className="rounded-[18px] border border-line bg-surface px-[14px] py-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex h-14 items-center gap-3">
            <span className="skeleton size-[30px] rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <span className="skeleton h-[13px] w-[70%] rounded-md" />
              <span className="skeleton h-2.5 w-[40%] rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
