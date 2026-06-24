/**
 * One sub-turn row — a small die left of its outcome text — the atom both the
 * per-nest turn log (GameBoard) and the full Game Log window (LogModal) draw, so
 * a log line reads *identically* to the board notice it mirrors. It holds no
 * state and no rules: it just lays out a die (pips or a glyph) + a Notice (the
 * tinted text runs), sized in `em` so it scales with whatever font-size its
 * container sets. The `.nest-notice-row` / `.nest-row-die` styling lives in
 * index.css; the die's own knobs come from theme.ts.
 */
import { DieFace } from './DieFace'
import type { Notice } from './strings'
import type { Glyph } from './glyphs'
import {
  PLAYER_HEX,
  NOTICE_DIE_SIZE,
  NOTICE_DIE_GLYPH_TEXT,
  NOTICE_DIE_GLYPH_OFFSET_X,
  NOTICE_DIE_GLYPH_OFFSET_Y,
} from './theme'

interface Props {
  /** The pips to show, or null when the die is replaced by a `glyph` (or absent). */
  die: number | null
  /** A single big glyph filling the face instead of pips (e.g. the "!" prompt). */
  glyph?: Glyph | null
  /** The outcome text: a plain string or tinted Notice runs. */
  content: Notice | string
  /** The live prompt row — its text centres while finished rows stay left. */
  current?: boolean
  /** Die tint — the acting seat's colour (a resolved hex). */
  dieColor: string
}

export function NoticeRow({ die, glyph = null, content, current, dieColor }: Props) {
  return (
    <div className={current ? 'nest-notice-row nest-notice-row-current' : 'nest-notice-row'}>
      {(die != null || glyph != null) && (
        <svg
          className="nest-row-die"
          viewBox="-1.25 -1.25 2.5 2.5"
          style={{ width: `${NOTICE_DIE_SIZE}em`, height: `${NOTICE_DIE_SIZE}em` }}
          aria-hidden
        >
          <DieFace
            value={die ?? 1}
            cx={0}
            cy={0}
            size={2}
            color={dieColor}
            label={glyph ?? undefined}
            // The glyph fills the face (its own big knob), bbox-centred — so the
            // X/Y nudges stay at 0, kept only as optical escape hatches.
            labelSize={glyph != null ? NOTICE_DIE_GLYPH_TEXT : undefined}
            labelOffsetX={glyph != null ? NOTICE_DIE_GLYPH_OFFSET_X : undefined}
            labelOffsetY={glyph != null ? NOTICE_DIE_GLYPH_OFFSET_Y : undefined}
          />
        </svg>
      )}
      {/* One inner span so the tinted runs flow as inline text (spaces + wrapping
          intact) instead of each becoming its own flex item. */}
      <span>
        {typeof content === 'string'
          ? content
          : content.map((seg, i) => (
              <span key={i} style={seg.color ? { color: PLAYER_HEX[seg.color] } : undefined}>
                {seg.text}
              </span>
            ))}
      </span>
      {/* Live rows only: a right spacer the same width as the die so the centred
          text span is flanked symmetrically and lands on the nest centre. */}
      {current && <span aria-hidden style={{ flex: 'none', width: `${NOTICE_DIE_SIZE}em` }} />}
    </div>
  )
}
