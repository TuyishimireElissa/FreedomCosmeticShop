# Accessibility Testing Checklist

Target: WCAG 2.2 Level AA

Default language: Kinyarwanda (`rw`)

Fallback language: English (`en`)

> Code-level checks are not proof of WCAG conformance. The manual checks below must be completed on the deployed build by people using the stated browsers, devices, and assistive technologies. Record defects rather than marking a check complete without evidence.

## Evidence record

For each run, record:

- Build or commit:
- URL and page:
- Date and tester:
- Device and orientation:
- OS and browser versions:
- Assistive technology and version:
- Language (`rw` or `en`):
- Expected result:
- Actual result:
- Pass, fail, or blocked:
- Screenshot/video or issue link:

## 1. Keyboard-only navigation

Test the homepage, product catalogue, product detail, cart, checkout, account, order tracking, wholesale, support, authentication, and admin.

- [ ] Put the mouse or trackpad aside.
- [ ] Press Tab from the page top; the translated skip link becomes visible.
- [ ] Enter activates the skip link and moves focus to main content.
- [ ] Tab order follows the visual and reading order.
- [ ] Shift+Tab reverses the same logical order.
- [ ] Every action is reachable.
- [ ] Enter and Space activate native buttons.
- [ ] Links activate with Enter.
- [ ] Arrow keys work in native selects, radio groups, tabs, and carousels where applicable.
- [ ] Focus is always visible.
- [ ] Sticky headers, bottom navigation, drawers, and summaries do not hide focus.
- [ ] Opening a modal moves focus inside it.
- [ ] Focus cannot leave an open modal.
- [ ] Escape closes dismissible overlays.
- [ ] Closing an overlay restores focus to its trigger.
- [ ] No action requires pointer dragging.

## 2. Android TalkBack

Use at least one supported Android phone with the production browser.

- [ ] Enable **Settings > Accessibility > TalkBack**.
- [ ] Confirm the page language changes between Kinyarwanda and English.
- [ ] Navigate by swipe in a logical reading order.
- [ ] Navigate by TalkBack headings, links, controls, and landmarks.
- [ ] Open the navigation menu and close it.
- [ ] Search for and open a product.
- [ ] Verify product name, price, rating, and stock are announced.
- [ ] Add a product and hear the cart announcement once.
- [ ] Change quantity, remove, undo, save for later, and restore.
- [ ] Complete the address form; verify labels, required state, hints, and errors.
- [ ] Verify payment errors are announced without moving focus unexpectedly.
- [ ] Pause and manually navigate every moving carousel.
- [ ] Track an order and verify icon-and-text statuses are announced.
- [ ] Repeat key flows in both `rw` and `en`.

## 3. iPhone VoiceOver

Use at least one supported iPhone and Safari.

- [ ] Enable **Settings > Accessibility > VoiceOver**.
- [ ] Confirm the HTML language changes with the language selector.
- [ ] Use swipe navigation and confirm logical reading order.
- [ ] Use the rotor for headings, links, form controls, and landmarks.
- [ ] Activate the skip link.
- [ ] Complete homepage, product, cart, and checkout flows.
- [ ] Verify cart live announcements are neither missing nor duplicated.
- [ ] Verify form errors announce and remain connected to their fields.
- [ ] Verify dialog focus containment and restoration.
- [ ] Pause and navigate hero and review carousels.
- [ ] Verify order, payment, and stock status text.
- [ ] Repeat key flows in both `rw` and `en`.

## 4. 200% browser zoom and reflow

Test Chrome, Firefox, and Safari where supported.

- [ ] Set browser zoom to 200%.
- [ ] Check all customer and admin routes.
- [ ] Text remains readable and is not clipped.
- [ ] Content reflows without horizontal page scrolling where WCAG 1.4.10 applies.
- [ ] Controls do not overlap.
- [ ] Navigation menus remain usable.
- [ ] Forms, hints, and errors remain associated and visible.
- [ ] Dialogs fit the viewport and can be scrolled.
- [ ] Sticky and fixed UI does not cover focused content.
- [ ] Carousel controls remain visible and usable.

## 5. Contrast and color use

Use measured contrast values, not visual judgment alone.

- [ ] Normal text is at least 4.5:1.
- [ ] Large text is at least 3:1.
- [ ] Focus indicators and meaningful UI boundaries are at least 3:1.
- [ ] Link and control states remain distinguishable.
- [ ] Disabled text is understandable where contrast exceptions do not apply.
- [ ] Error text, placeholder text, and muted text are measured.
- [ ] Stock, order, payment, and form states include text or icons in addition to color.
- [ ] Simulate common color-vision deficiencies in browser developer tools.

## 6. Reduced motion and moving content

- [ ] Enable reduced motion in the operating system.
- [ ] Hero carousel does not auto-advance.
- [ ] Reviews carousel does not auto-advance.
- [ ] Brand scrolling uses immediate rather than smooth movement.
- [ ] An explicit Play action is required to resume automatic movement.
- [ ] Pause controls have translated accessible names.
- [ ] Hover and keyboard focus pause moving content.
- [ ] Slide changes are announced without excessive interruption.

## 7. Form accessibility

- [ ] Every text input, select, textarea, checkbox, and radio control has a programmatic label.
- [ ] Required fields expose native and ARIA required state.
- [ ] Hints use `aria-describedby`.
- [ ] Errors use `aria-describedby` and `aria-errormessage` where supported.
- [ ] Invalid controls expose `aria-invalid`.
- [ ] Errors include icon and text, not color alone.
- [ ] Error announcements do not repeat excessively.
- [ ] Autofill and expected input modes work on mobile.
- [ ] Data remains entered after a validation error.

## 8. Touch targets and orientation

- [ ] Practical action targets are at least 44×44 CSS px.
- [ ] Adjacent actions have enough spacing to avoid accidental activation.
- [ ] Icon actions have visible tooltips where appropriate and programmatic names.
- [ ] Test small and large phones in portrait.
- [ ] Test the same devices in landscape.
- [ ] On-screen keyboards do not cover the active field or submit action.
- [ ] Safe-area insets are respected.

## 9. Reading and focus order

- [ ] Screen-reader order matches visual meaning.
- [ ] One primary page heading identifies each route.
- [ ] Heading levels describe structure without relying on font size.
- [ ] Navigation, main, complementary, and footer landmarks are meaningful.
- [ ] Decorative images/icons are hidden from assistive technology.
- [ ] Informative images have useful translated alternatives where required.
- [ ] Hidden carousel slides cannot receive focus.
- [ ] Dynamic insertion does not unexpectedly move focus.

## 10. Automated tools

Run on representative pages and every unique template:

- [ ] `npm run test:a11y`
- [ ] Full unit test suite
- [ ] TypeScript validation
- [ ] Production build
- [ ] axe DevTools scan with zero unreviewed serious/critical findings
- [ ] Lighthouse accessibility audit; investigate every finding rather than relying only on the score
- [ ] WAVE structural review
- [ ] Browser accessibility-tree inspection
- [ ] HTML validation for duplicate IDs and invalid landmark nesting

## 11. Real-user evaluation

Automated tools and developer testing cannot establish usability for everyone.

- [ ] Blind screen-reader user completes product-to-checkout flow.
- [ ] Keyboard-only user completes customer and admin flows.
- [ ] Low-vision user tests zoom, contrast, and focus visibility.
- [ ] User with motor disability tests target size and timing.
- [ ] Older user tests labels, instructions, and recovery from errors.
- [ ] Findings are documented and retested after remediation.

## WCAG 2.2 AA implementation map

These rows indicate code or planned test coverage—not a conformance certification.

| Criterion | Current evidence |
|---|---|
| 1.1.1 Non-text Content | IconButton names; decorative icons hidden; image review pending |
| 1.3.1 Info and Relationships | Semantic labels, fieldsets, landmarks, status roles |
| 1.3.2 Meaningful Sequence | Source structure added; manual reading-order test pending |
| 1.4.3 Contrast Minimum | Focus color measured; full text audit pending |
| 1.4.4 Resize Text | Viewport permits zoom; 200% manual test pending |
| 1.4.10 Reflow | Responsive implementation exists; manual 200% test pending |
| 1.4.11 Non-text Contrast | Focus indicator measured; full control-state audit pending |
| 2.1.1 Keyboard | Native controls and carousel controls; full walkthrough pending |
| 2.1.2 No Keyboard Trap | Radix and custom focus management; manual verification pending |
| 2.2.2 Pause, Stop, Hide | Hero and review pause/play controls implemented |
| 2.4.1 Bypass Blocks | Translated skip link implemented |
| 2.4.3 Focus Order | Source order and focus restoration; manual verification pending |
| 2.4.7 Focus Visible | Global 3px visible focus implemented |
| 2.4.11 Focus Not Obscured (Minimum) | Scroll offsets implemented; manual sticky-UI test pending |
| 2.5.3 Label in Name | Visible labels and translated icon names; audit pending |
| 2.5.8 Target Size (Minimum) | 44px baseline and IconButton; spacing audit pending |
| 3.2.1 On Focus | No intended focus-triggered navigation; manual test pending |
| 3.3.1 Error Identification | Icon-and-text errors implemented on priority forms |
| 3.3.2 Labels or Instructions | Accessible form components implemented |
| 3.3.3 Error Suggestion | Existing translated validation guidance; audit pending |
| 4.1.2 Name, Role, Value | Controls, tabs, radios, and statuses improved |
| 4.1.3 Status Messages | Global polite/assertive announcer implemented |
