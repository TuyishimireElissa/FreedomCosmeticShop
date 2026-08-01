import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { cleanLatexPaste, hasLatexMarkup } from '@/lib/latex-paste'

const manager = readFileSync('src/components/admin/AdminProductManager.tsx', 'utf8')

describe('latex paste cleanup', () => {
  it('cleans the pasted volume string exactly as specified', () => {
    const pasted = '$120\\text{ ml}$ Total ($2\\times 60\\text{ ml}$ / $2\\times 2.0\\text{ fl. oz.}$)'
    expect(cleanLatexPaste(pasted)).toBe('120 ml Total (2×60 ml / 2×2.0 fl. oz.)')
  })

  it('keeps the contents of \\text{} and drops the wrapper', () => {
    expect(cleanLatexPaste('50\\text{ ml}')).toBe('50 ml')
    expect(cleanLatexPaste('\\mathrm{SPF} 50')).toBe('SPF 50')
    expect(cleanLatexPaste('\\textbf{Bold} and \\textit{italic}')).toBe('Bold and italic')
  })

  it('replaces maths operators with their plain characters', () => {
    expect(cleanLatexPaste('2\\times3')).toBe('2×3')
    expect(cleanLatexPaste('10\\div2')).toBe('10÷2')
    expect(cleanLatexPaste('5\\pm1')).toBe('5±1')
    expect(cleanLatexPaste('pH \\leq 7')).toBe('pH ≤ 7')
    expect(cleanLatexPaste('pH \\geq 5')).toBe('pH ≥ 5')
    expect(cleanLatexPaste('a \\neq b')).toBe('a ≠ b')
    expect(cleanLatexPaste('about \\approx 30')).toBe('about ≈ 30')
    expect(cleanLatexPaste('25\\degree C')).toBe('25° C')
    expect(cleanLatexPaste('25^\\circ C')).toBe('25° C')
  })

  it('converts fractions, superscripts and subscripts', () => {
    expect(cleanLatexPaste('\\frac{1}{2} teaspoon')).toBe('1/2 teaspoon')
    expect(cleanLatexPaste('10 cm^{2}')).toBe('10 cm²')
    expect(cleanLatexPaste('10 cm^3')).toBe('10 cm³')
    expect(cleanLatexPaste('H_{2}O')).toBe('H₂O')
    expect(cleanLatexPaste('CO_2')).toBe('CO₂')
  })

  it('strips spacing commands and delimiters', () => {
    expect(cleanLatexPaste('50\\quad ml')).toBe('50 ml')
    expect(cleanLatexPaste('\\left(30 ml\\right)')).toBe('(30 ml)')
    expect(cleanLatexPaste('\\(30\\text{ ml}\\)')).toBe('30 ml')
  })

  it('collapses repeated spaces, trims, and keeps line breaks', () => {
    expect(cleanLatexPaste('  50   ml  ')).toBe('50 ml')
    expect(cleanLatexPaste('Line one\nLine two')).toBe('Line one\nLine two')
    expect(cleanLatexPaste('$1\\times2$\n$3\\times4$')).toBe('1×2\n3×4')
  })

  it('leaves ordinary product text completely untouched', () => {
    const untouched = [
      'Vitamin C Brightening Serum 30ml',
      'https://res.cloudinary.com/demo/image/upload/v1/a_b.jpg?w=800',
      'RWF 12,000',
      "L'Oréal Paris — Éclat Lumière",
      'Apply morning and evening to clean skin.',
      'Kwita ku ruhu: koresha buri munsi',
    ]
    for (const value of untouched) {
      expect(cleanLatexPaste(value)).toBe(value)
      expect(hasLatexMarkup(value)).toBe(false)
    }
  })

  it('does not unwrap two plain prices sharing a line', () => {
    // The dollars here are currency, not maths delimiters.
    expect(cleanLatexPaste('Price is $12 and $15')).toBe('Price is $12 and $15')
    expect(hasLatexMarkup('Price is $12 and $15')).toBe(false)
    // But a genuine maths span between dollars is still cleaned.
    expect(cleanLatexPaste('Size $2\\times 60$ ml')).toBe('Size 2×60 ml')
  })

  it('detects markup only when there is markup to clean', () => {
    expect(hasLatexMarkup('$120\\text{ ml}$')).toBe(true)
    expect(hasLatexMarkup('10 cm^{2}')).toBe(true)
    expect(hasLatexMarkup('')).toBe(false)
    expect(hasLatexMarkup('Plain product name')).toBe(false)
  })

  it('is wired to the product form text fields but not to numbers or dates', () => {
    expect(manager).toContain("import { cleanLatexPaste } from '@/lib/latex-paste'")
    expect(manager).toContain('const handleLatexPaste =')
    // setRangeText keeps the caret and native undo; execCommand is deprecated.
    expect(manager).toContain('setRangeText')
    expect(manager).not.toContain("document.execCommand('insertText'")
    // Number and date inputs must never receive the handler.
    expect(manager).not.toMatch(/type="number"[^>]*onPaste=\{handleLatexPaste\}/)
    expect(manager).not.toMatch(/type="date"[^>]*onPaste=\{handleLatexPaste\}/)
  })
})
