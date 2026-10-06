import { useEffect, useRef } from "react"

export function usePageTitle(title: string, autoFocus: boolean = true) {
  const h1Ref = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    document.title = `${title} · CardioVision3D`
    if (autoFocus && h1Ref.current) {
      h1Ref.current.focus()
    }
  }, [title, autoFocus])

  return h1Ref
}
