import { useState, useEffect, useRef } from 'react'

export function useCountUp(target: number, duration: number = 500): number {
  const [value, setValue] = useState(target)
  const valueRef = useRef(target)

  useEffect(() => {
    const from = valueRef.current
    const to = target
    if (Math.abs(from - to) < 0.01) {
      valueRef.current = to
      setValue(to)
      return
    }

    let raf: number
    const start = performance.now()
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = from + (to - from) * eased
      valueRef.current = current
      setValue(current)
      if (progress < 1) {
        raf = requestAnimationFrame(animate)
      } else {
        valueRef.current = to
        setValue(to)
      }
    }

    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}
