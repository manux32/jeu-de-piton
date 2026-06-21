/**
 * A small custom dropdown — a trigger button that opens a popover of options,
 * each rendered as arbitrary content (a colour swatch, a word, …). Pure UI: it
 * holds only its own open/closed state and reports the chosen value back.
 *
 * We roll our own instead of a native `<select>` because the options aren't
 * plain text — the colour picker shows bare coloured circles — and a native
 * select can't render swatch markup cross-platform. It lives in the New Game
 * window, which is a plain DOM overlay (not inside the board SVG), so there's no
 * iOS `foreignObject` caveat to worry about (see cross-platform-ui.md).
 *
 * Generic over the value type `T` (a string union — `PlayerColor`, `StrategyId`)
 * so each use stays type-safe end to end.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'

export interface DropdownOption<T extends string> {
  value: T
  /** Accessible text for this option (read out; also the trigger's title). */
  label: string
  /** What to draw for this option — a swatch span, a word, etc. */
  node: ReactNode
}

interface Props<T extends string> {
  value: T
  options: DropdownOption<T>[]
  onChange: (value: T) => void
  /** Accessible label for the trigger (e.g. "Player 1 colour"). */
  ariaLabel: string
  /** Extra class on the popover, so a caller can lay the options out as a
   *  wrapping swatch grid (colours) instead of the default vertical list. */
  menuClassName?: string
}

export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  menuClassName,
}: Props<T>) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  // While open, dismiss on a pointer outside the widget or on Escape.
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="dropdown" ref={rootRef}>
      <button
        type="button"
        className="dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={selected ? `${ariaLabel} — ${selected.label}` : ariaLabel}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="dropdown-current">{selected?.node}</span>
        <span className="dropdown-caret" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div
          className={menuClassName ? `dropdown-menu ${menuClassName}` : 'dropdown-menu'}
          role="listbox"
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              aria-label={o.label}
              title={o.label}
              className={
                o.value === value ? 'dropdown-option dropdown-option-on' : 'dropdown-option'
              }
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
            >
              {o.node}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
