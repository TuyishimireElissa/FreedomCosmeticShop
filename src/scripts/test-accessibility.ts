/**
 * Accessibility foundation checks and manual test instructions.
 * Run: npm run test:a11y
 *
 * These source checks do not replace browser, assistive-technology, contrast,
 * zoom, orientation, or disabled-user testing.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

const sources = {
  layout: read('src/app/layout.tsx'),
  chrome: read('src/components/layout/SiteChrome.tsx'),
  css: read('src/app/globals.css'),
  skip: read('src/components/a11y/SkipToContent.tsx'),
  announcer: read('src/components/a11y/LiveAnnouncer.tsx'),
  field: read('src/components/a11y/FormField.tsx'),
  select: read('src/components/a11y/FormSelect.tsx'),
  textarea: read('src/components/a11y/FormTextarea.tsx'),
  iconButton: read('src/components/a11y/IconButton.tsx'),
  stock: read('src/components/a11y/StockStatus.tsx'),
  orderStatus: read('src/components/a11y/OrderStatusBadge.tsx'),
  paymentStatus: read('src/components/a11y/PaymentStatusBadge.tsx'),
  hero: read('src/components/home/HeroBanner.tsx'),
  reviews: read('src/components/home/ReviewsCarousel.tsx'),
  rw: read('src/lib/i18n/translations/rw.ts'),
}

const checks: Array<[string, boolean]> = [
  ['Skip link targets #main-content', sources.skip.includes('href="#main-content"') && sources.chrome.includes('id="main-content"')],
  ['Skip link precedes application chrome', sources.layout.indexOf('<SkipToContent />') < sources.layout.indexOf('<SiteChrome>')],
  ['Visible keyboard focus is defined', sources.css.includes(':focus-visible') && sources.css.includes('outline: 3px solid #B76E79')],
  ['Sticky focus offsets are defined', sources.css.includes('scroll-padding-block-start') && sources.css.includes('scroll-padding-block-end')],
  ['Reduced-motion CSS is defined', sources.css.includes('@media (prefers-reduced-motion: reduce)')],
  ['Global polite and assertive live regions exist', sources.announcer.includes('aria-live="polite"') && sources.announcer.includes('aria-live="assertive"')],
  ['Inputs connect labels and errors', sources.field.includes('htmlFor={inputId}') && sources.field.includes('aria-errormessage=')],
  ['Selects connect labels and errors', sources.select.includes('htmlFor={selectId}') && sources.select.includes('aria-describedby=')],
  ['Textareas connect labels and errors', sources.textarea.includes('htmlFor={textareaId}') && sources.textarea.includes('aria-describedby=')],
  ['IconButton requires accessible names', sources.iconButton.includes('label: string') && sources.iconButton.includes('aria-label={label}')],
  ['Status components combine roles, icons, and text', [sources.stock, sources.orderStatus, sources.paymentStatus].every((source) => source.includes('role="status"') && source.includes('aria-hidden="true"'))],
  ['Hero has pause/play and carousel semantics', sources.hero.includes("t('accessibility.pause_carousel')") && sources.hero.includes('aria-roledescription="carousel"')],
  ['Reviews have pause/play and carousel semantics', sources.reviews.includes("t('accessibility.pause_carousel')") && sources.reviews.includes('aria-roledescription="carousel"')],
  ['Accessibility Kinyarwanda strings are marked verified-rw', sources.rw.includes("pause_carousel: 'Hagarika uruhererekane rw’amashusho', // verified-rw")],
]

console.log('FreedomCosmeticShop accessibility source checks\n')
let failed = 0
for (const [name, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}`)
  if (!passed) failed += 1
}
console.log(`\n${checks.length - failed}/${checks.length} source checks passed.`)

console.log(`
MANUAL KEYBOARD TEST — REQUIRED
1. Disconnect or do not use the mouse/trackpad.
2. Press Tab from the top of each page; activate the skip link with Enter.
3. Continue with Tab and Shift+Tab through every action.
4. Use Enter and Space to activate buttons.
5. Use arrow keys in radio groups, selects, and supported composite widgets.
6. Open every modal; verify focus stays inside and Escape closes it.
7. Verify focus remains visible and is not hidden by sticky or fixed UI.
8. Record the page, action, expected result, actual result, browser, and OS.

ANDROID TALKBACK — PHYSICAL DEVICE REQUIRED
1. Enable Settings > Accessibility > TalkBack.
2. Test homepage navigation, product selection, add to cart, cart editing, checkout, and order tracking.
3. Swipe right/left through reading order and double-tap every action.
4. Verify labels, prices, stock, errors, status, and cart announcements in Kinyarwanda and English.

IPHONE VOICEOVER — PHYSICAL DEVICE REQUIRED
1. Enable Settings > Accessibility > VoiceOver.
2. Repeat homepage, product, cart, checkout, and tracking flows.
3. Use swipe navigation, rotor headings/links/form controls, and double-tap activation.
4. Verify modal focus, carousel pause, field errors, and live announcements.

200% ZOOM — REQUIRED
1. Test Chrome, Firefox, and Safari at 200% browser zoom.
2. Check reflow without two-dimensional scrolling at 1280 CSS px equivalent.
3. Verify dialogs, menus, sticky summaries, forms, and fixed mobile actions do not cover content.

CONTRAST — REQUIRED
1. Measure normal text at 4.5:1 minimum.
2. Measure large text and non-text UI boundaries at 3:1 minimum.
3. Test default, hover, focus, disabled, error, and selected states.

REDUCED MOTION — REQUIRED
1. Enable the operating-system reduced-motion preference.
2. Verify hero and review carousels do not auto-advance.
3. Verify an explicit Play action is required before motion resumes.

ORIENTATION AND TOUCH — REQUIRED
1. Test supported Android and iPhone widths in portrait and landscape.
2. Verify practical 44x44 CSS px targets and adequate spacing.
3. Confirm every action has a non-drag keyboard/tap alternative.
`)

if (failed > 0) process.exitCode = 1
