# Low-Data Mode Testing Guide

Target context: Rwanda mobile users, including expensive data, unstable 3G, and lower-cost Android devices.

Default language: Kinyarwanda (`rw`)

Fallback language: English (`en`)

> This document is a test plan, not evidence that the application meets a data, speed, accessibility, browser, or device target. Every manual item starts unchecked. Record an actual result before changing an item to pass or fail.

## Current evidence status

- Source-level and unit tests exist for low-data preference logic, responsive image URL construction, hero behavior, progressive product loading, deferred sections, offline cart foundations, and resilient GET requests.
- A development-only browser performance snapshot is available in the console.
- No physical Slow 3G, Rwanda carrier, Save-Data Android, low-cost Android, transferred-image-size, response-format, offline-reload, Lighthouse, or assistive-technology result is recorded in this document.
- Low-data work must not be described as deployed until Section 9 deployment verification is completed.

## Commands

```bash
npm run typecheck
npm run test:low-data
npm test
npm run build
```

These commands validate code and source expectations. They do not replace browser, network, device, or accessibility testing.

## Evidence record

Create one record for every browser/device/network combination:

```text
Build or commit:
Deployment URL or localhost URL:
Date and tester:
Country and mobile carrier, if applicable:
Device model and RAM:
OS and version:
Browser and version:
Viewport and orientation:
Language (rw/en):
Low-data preference (auto/on/off):
Save-Data request state:
Network profile or real connection:
Cache state (cold/warm/disabled):
Route and flow:
Expected result:
Actual result:
Transferred bytes:
Relevant image URLs, widths, and Content-Types:
Console snapshot:
Pass, fail, or blocked:
Screenshot/video/HAR/issue link:
```

Do not reuse a warm-cache result as evidence for a cold-cache target.

## Development performance monitor

The root layout mounts `PerformanceMonitor` only when:

```text
NODE_ENV === development
```

Open the browser console and look for:

```text
[FCS development performance snapshot]
```

The snapshot reports:

- Current route
- Effective low-data state
- Detected connection type
- Resource count
- Reported transferred bytes
- Reported encoded bytes
- Image resource count
- Images currently in the DOM
- Latest Largest Contentful Paint entry, when supported
- Accumulated layout-shift entries, when supported
- Observed long-task count, when supported

Limitations:

- It is diagnostic output, not analytics and not a pass/fail score.
- Browser caching can make `transferSize` zero.
- Cross-origin timing restrictions can hide resource sizes.
- Unsupported PerformanceObserver entry types remain unavailable.
- A snapshot taken before a user loads a deferred section does not include that section.
- Development-mode timings differ from production builds.
- No snapshot is sent to the server.

## 1. Preference and detection matrix

Test each row independently:

| Preference | Network/Save-Data condition | Expected effective mode | Result |
|---|---|---:|---|
| `on` | Any | Low-data on | Not tested |
| `off` | Slow 2G | Low-data off | Not tested |
| `off` | Save-Data enabled | Low-data off | Not tested |
| `auto` | Slow 2G | Low-data on | Not tested |
| `auto` | 2G | Low-data on | Not tested |
| `auto` | Downlink below 1 Mbps | Low-data on | Not tested |
| `auto` | Save-Data enabled | Low-data on | Not tested |
| `auto` | Normal connection without Save-Data | Low-data off | Not tested |

- [ ] Preference persists after reload.
- [ ] Preference synchronizes across two tabs.
- [ ] The HTML `data-low-data` state matches the effective mode.
- [ ] Kinyarwanda is still the default language.
- [ ] Explicit `off` overrides automatic detection.

## 2. Chrome throttling procedure

Use a production build where possible. In Chrome DevTools:

1. Open **Network**.
2. Disable cache while DevTools is open.
3. Select **Slow 3G**, or create and document a custom profile.
4. Clear site data for a cold-start run.
5. Record a HAR file.
6. Load `/`, `/products`, a product detail page, `/cart`, and the priority forms.
7. Repeat with low-data `on`, `off`, and `auto` where applicable.

- [ ] Record requests and transferred bytes for a cold homepage load.
- [ ] Record requests and transferred bytes for the first product page.
- [ ] Record the change after selecting “Load more products.”
- [ ] Record deferred-section requests before and after explicit loading.
- [ ] Record errors, retries, and retained form fields during interruption.

## 3. Responsive images and hero

For representative product cards, product details, thumbnails, and hero images:

- [ ] Mobile image requests do not exceed the configured context width.
- [ ] Low-data card candidates are limited to 240px and 320px.
- [ ] Low-data hero requests use the 480px target where a transformable Cloudinary URL is available.
- [ ] No helper-generated mobile image exceeds the 1024px global clamp.
- [ ] Cloudinary responses use `f_auto`.
- [ ] Record the actual response `Content-Type`; do not infer AVIF or WebP from the URL.
- [ ] Record actual transferred size for each representative image.
- [ ] Below-the-fold images remain unloaded until needed.
- [ ] Broken images expose an understandable fallback.

## 4. Hero and moving content

- [ ] Hero does not auto-advance in low-data mode.
- [ ] Reviews do not auto-advance in low-data mode.
- [ ] Reduced-motion preference pauses automatic movement.
- [ ] Manual pause remains respected.
- [ ] Hover pauses movement.
- [ ] Keyboard focus inside the carousel pauses movement.
- [ ] Previous, next, and tab controls remain keyboard operable.
- [ ] Hidden slides cannot receive focus.
- [ ] Low-data mode loads only the active hero slide content.
- [ ] Any video requires explicit user activation and does not preload in low-data mode.

## 5. Product pagination and deferred sections

Expected request sizes:

| Mode | Initial products | Each load-more request |
|---|---:|---:|
| Low-data | 8 | 8 |
| Normal | 20 | 20 |

- [ ] Product API requests match the expected page size.
- [ ] “Load more” appends without duplicates.
- [ ] Existing products remain visible while more load.
- [ ] Product count updates are announced without excessive repetition.
- [ ] Filters reset progressive pagination correctly.
- [ ] In low-data mode, reviews remain unloaded until explicitly requested.
- [ ] In the alternate storefront, brands and blog remain unloaded until explicitly requested.
- [ ] Switching back to normal mode loads deferred content as expected.

## 6. Offline-first cart

Use DevTools offline mode and, separately, a real device with connectivity disabled.

- [ ] Add a product while online, reload, and confirm it remains in the cart.
- [ ] Go offline and add another product.
- [ ] Change quantity while offline.
- [ ] Remove and restore an item while offline.
- [ ] Save an item for later and move it back while offline.
- [ ] Reload while offline and confirm local cart hydration.
- [ ] Confirm the translated offline banner appears.
- [ ] Confirm the banner includes text and an icon, not color alone.
- [ ] Reconnect and observe synchronization without losing local items.
- [ ] Test with a signed-in account and a signed-out session.
- [ ] Record behavior when localStorage is blocked or unavailable.

## 7. Network resilience and form retention

Use an intercepting proxy, browser request blocking, or a controlled test server. Do not test destructive payment operations against production.

- [ ] A retryable GET network failure retries with exponential backoff.
- [ ] A retryable `500`, `502`, or `503` GET response retries.
- [ ] A `400`, `401`, `403`, `404`, `409`, or `422` response does not retry.
- [ ] An aborted request does not retry.
- [ ] A POST submission is not automatically replayed.
- [ ] Review fields remain entered after a failed submission.
- [ ] Wholesale application fields remain entered after a failed submission.
- [ ] Retry announcements are understandable in Kinyarwanda.
- [ ] Retry announcements are understandable in English.
- [ ] Final errors are announced and visible.
- [ ] Manual retry does not clear fields before a confirmed success.

## 8. Real Rwanda mobile testing

Record carrier and location without collecting unnecessary personal information.

- [ ] Test on a real Rwanda 3G connection.
- [ ] Test at least one lower-cost Android device available to the team.
- [ ] Record device model, RAM, Android version, browser, carrier, and approximate test area.
- [ ] Test portrait and landscape.
- [ ] Test with Data Saver or Save-Data where supported.
- [ ] Check scrolling, input latency, memory pressure, and browser reloads.
- [ ] Record failures rather than substituting desktop emulation evidence.

## 9. Accessibility checks

- [ ] Complete keyboard-only homepage, catalogue, cart, and form flows.
- [ ] Verify visible focus at 200% zoom.
- [ ] Verify the offline banner with TalkBack.
- [ ] Verify the offline banner with VoiceOver.
- [ ] Verify retry and final-error announcements with a screen reader.
- [ ] Verify load-more count announcements.
- [ ] Verify deferred-section buttons have understandable names and practical touch targets.
- [ ] Repeat key checks in `rw` and `en`.

Also follow `docs/ACCESSIBILITY_TESTING.md`.

## 10. Lighthouse and browser tooling

Run against a production build and preserve the report files.

- [ ] Lighthouse mobile performance report captured for low-data off.
- [ ] Lighthouse mobile performance report captured for low-data on.
- [ ] Lighthouse accessibility report reviewed finding by finding.
- [ ] Network HAR captured for low-data off.
- [ ] Network HAR captured for low-data on.
- [ ] Performance trace captured for a representative slow interaction.
- [ ] Console reviewed for errors and failed resources.

A score alone is not sufficient evidence. Record the URL, build, test conditions, and report file.

## Completion rule

Do not mark this plan complete until each required environment has a recorded pass, fail, or blocked result with evidence. Unchecked items mean “not established,” not “passed by implementation.”
