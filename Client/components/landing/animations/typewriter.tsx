'use client'

import { useEffect, useState } from 'react'

interface TypewriterProps {
  text: string
  speed?: number
  delay?: number
}

export function Typewriter({ text, speed = 50, delay = 0 }: TypewriterProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (delay > 0) {
      const delayTimer = setTimeout(() => {
        let index = 0
        const timer = setInterval(() => {
          if (index <= text.length) {
            setDisplayedText(text.slice(0, index))
            index++
          } else {
            setIsComplete(true)
            clearInterval(timer)
          }
        }, speed)

        return () => clearInterval(timer)
      }, delay)

      return () => clearTimeout(delayTimer)
    } else {
      let index = 0
      const timer = setInterval(() => {
        if (index <= text.length) {
          setDisplayedText(text.slice(0, index))
          index++
        } else {
          setIsComplete(true)
          clearInterval(timer)
        }
      }, speed)

      return () => clearInterval(timer)
    }
  }, [text, speed, delay])

  return (
    <span className="relative">
      {displayedText}
      {!isComplete && (
        <span className="ml-1 inline-block w-0.5 h-16 bg-teal-600 dark:bg-teal-400 animate-pulse" />
      )}
    </span>
  )
}
