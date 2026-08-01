/**
 * Cleans LaTeX/maths markup out of text pasted into the product form.
 *
 * Copying a product brief out of ChatGPT, a PDF or a maths-rendered page often
 * carries markup with it, so `$120\text{ ml}$` lands in the field instead of
 * `120 ml`. This turns that markup back into the plain text a shopper should
 * see, without touching text that has no markup in it.
 */

const SUPERSCRIPTS: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', n: 'ⁿ',
}

const SUBSCRIPTS: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
}

/** Markers that distinguish real maths from a plain sentence containing "$". */
const LATEX_MARKER = /[\\^_{}]/

/** True when the text is worth rewriting at all. */
export function hasLatexMarkup(value: string): boolean {
  if (!value) return false
  if (/\\[a-zA-Z]/.test(value)) return true
  if (/\^\{?[0-9n]\}?/.test(value)) return true
  if (/_\{?[0-9]\}?/.test(value)) return true
  return /\$[^$]*[\\^_{}][^$]*\$/.test(value)
}

function cleanLine(line: string): string {
  // Decide which $…$ spans are maths while the markup is still intact, then
  // strip only those. Currency like "$12 and $15" is left alone.
  let out = line.replace(/\$\$?([^$]*)\$\$?/g, (match, inner: string) =>
    LATEX_MARKER.test(inner) ? `\u0000${inner}\u0000` : match,
  )

  // \frac{a}{b} -> a/b. Runs before brace stripping so both parts survive.
  out = out.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '$1/$2')

  // \text{ ml} -> " ml". The wrapper goes, the contents stay.
  out = out.replace(
    /\\(?:text|textrm|mathrm|mathbf|textbf|textit|mathit|emph|operatorname)\s*\{([^{}]*)\}/g,
    '$1',
  )

  // Operators and symbols.
  out = out
    // The trailing \s? absorbs the space LaTeX needs after a word command,
    // so "2\times 60" becomes "2×60" rather than "2× 60".
    .replace(/\\times\s?/g, '×')
    .replace(/\\div\s?/g, '÷')
    .replace(/\\pm\s?/g, '±')
    .replace(/\\mp\s?/g, '∓')
    // Comparisons read better spaced ("pH ≤ 7"), so they keep their gap.
    .replace(/\\leq\b/g, '≤')
    .replace(/\\geq\b/g, '≥')
    .replace(/\\le\b/g, '≤')
    .replace(/\\ge\b/g, '≥')
    .replace(/\\neq\b/g, '≠')
    .replace(/\\approx/g, '≈')
    .replace(/\\cdot\s?/g, '·')
    .replace(/\\bullet\s?/g, '•')
    .replace(/\\degree/g, '°')
    .replace(/\^\s*\{?\\circ\}?/g, '°')
    .replace(/\\circ/g, '°')

  // Superscripts and subscripts, braced or bare.
  out = out.replace(/\^\{?([0-9n])\}?/g, (match, char: string) => SUPERSCRIPTS[char] ?? match)
  out = out.replace(/_\{?([0-9])\}?/g, (match, char: string) => SUBSCRIPTS[char] ?? match)

  // Spacing and sizing commands carry no meaning in plain text.
  out = out.replace(/\\(?:quad|qquad|,|;|:|!)/g, ' ')
  out = out.replace(/\\(?:left|right|big|Big|bigg|Bigg)\s*/g, '')

  // Inline and display delimiters: \( \) \[ \].
  out = out.replace(/\\[()[\]]/g, '')
  // Drop the markers left where a maths span was recognised above.
  out = out.replace(/\u0000/g, '')

  // Anything left over from a stripped command.
  out = out.replace(/\{\s*\}/g, '')

  return out.replace(/[ \t]{2,}/g, ' ').trim()
}

/**
 * Rewrites LaTeX markup as plain text.
 *
 * Line breaks are preserved: each line is cleaned on its own so a pasted
 * multi-line brief keeps its shape.
 */
export function cleanLatexPaste(input: string): string {
  if (!input) return ''
  return input
    .split('\n')
    .map(cleanLine)
    .join('\n')
    .trim()
}
