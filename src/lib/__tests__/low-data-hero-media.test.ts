import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { IMAGE_QUALITY, optimizeCloudinaryUrl } from '@/lib/cloudinary-images'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const hero = read('src/components/home/HeroBanner.tsx')
const staticHero = read('src/components/home/Hero.tsx')
const imageHelpers = read('src/lib/cloudinary-images.ts')
const productGallery = read('src/components/products/ProductImageGallery.tsx')
const english = read('src/lib/i18n/translations/en.ts')
const kinyarwanda = read('src/lib/i18n/translations/rw.ts')

describe('low-data hero and media behavior', () => {
  it('prevents hero auto-advance in low-data mode', () => {
    expect(hero).toContain("import { useLowData } from '@/contexts/LowDataContext'")
    expect(hero).toContain('const { isLowData } = useLowData()')
    expect(hero).toMatch(/const controlPaused = isLowData \|\|/)
    expect(hero).toContain('const autoAdvancePaused = controlPaused || interactionPaused')
    expect(hero).toContain('if (autoAdvancePaused ||')
    expect(hero).toContain('if (isLowData) return')
    expect(hero).toContain('disabled={isLowData}')
  })

  it('keeps reduced-motion and pointer or keyboard interaction pauses', () => {
    expect(hero).toContain('reducedMotionPause')
    expect(hero).toContain('onMouseEnter={() => setInteractionPaused(true)}')
    expect(hero).toContain('onMouseLeave={() => setInteractionPaused(false)}')
    expect(hero).toContain('onFocusCapture={() => setInteractionPaused(true)}')
    expect(hero).toContain('onBlurCapture=')
  })

  it('renders only the necessary hero slide content and mobile image in low-data mode', () => {
    expect(hero).toContain('{(!isLowData || active) && (')
    expect(hero).toContain('src={lowDataImage}')
    expect(hero).toContain('width: IMAGE_SIZES.hero.lowData')
    expect(hero).toContain('quality: IMAGE_QUALITY.lowData')
    expect(hero).toContain('inert={active ? undefined : true}')
    expect(hero).toContain('aria-hidden={!active}')
    expect(hero).toContain('role="tablist"')
    expect(hero).toContain('aria-controls={`hero-slide-${index}`}')
  })

  it('optimizes the active homepage hero for a 480px eco-quality request', () => {
    const optimized = optimizeCloudinaryUrl(
      'https://res.cloudinary.com/dohoc0tmp/image/upload/v123/freedomcosmeticshop/banners/hero.jpg',
      { width: 480, quality: IMAGE_QUALITY.lowData },
    )
    expect(optimized).toContain('/w_480,c_fill,g_auto,q_auto:eco,f_auto,dpr_auto/')
    const optimizedFetch = optimizeCloudinaryUrl(
      'https://res.cloudinary.com/dohoc0tmp/image/fetch/f_auto,q_auto,w_1200/https://example.com/hero.jpg',
      { width: 480, quality: IMAGE_QUALITY.lowData },
    )
    expect(optimizedFetch).toContain('/image/fetch/w_480,c_fill,g_auto,q_auto:eco,f_auto,dpr_auto/https://example.com/hero.jpg')
    expect(optimizedFetch).not.toContain('w_1200')
    expect(optimizeCloudinaryUrl('https://example.com/hero.jpg', { width: 480 })).toBe('https://example.com/hero.jpg')
    expect(staticHero).toContain('const { isLowData } = useLowData()')
    expect(staticHero).toContain('width: IMAGE_SIZES.hero.lowData')
    expect(staticHero).toContain('quality: IMAGE_QUALITY.lowData')
    expect(staticHero).toContain('isLowData ? (')
    expect(imageHelpers).toContain('f_auto,dpr_auto')
    expect(imageHelpers).toContain('Math.min(1024')
  })

  it('shows translated low-data hero and carousel statuses', () => {
    expect(hero).toContain("t('low_data.carousel_paused')")
    expect(staticHero).toContain("t('low_data.hero_optimized')")
    expect(english).toMatch(/carousel_paused: 'Low data mode:/)
    expect(english).toMatch(/hero_optimized: 'Low data mode:/)
    expect(kinyarwanda).toMatch(/carousel_paused:.*\/\/ verified-rw/)
    expect(kinyarwanda).toMatch(/hero_optimized:.*\/\/ verified-rw/)
  })

  it('does not preload or autoplay native video and retains explicit video activation', () => {
    const applicationSource = `${hero}\n${productGallery}`
    expect(applicationSource).not.toMatch(/<video\b/)
    expect(applicationSource).not.toMatch(/\bautoPlay=/)
    expect(productGallery).toContain('videoUrl &&')
    expect(productGallery).toContain('href={videoUrl}')
    expect(productGallery).toContain("t('product.play_video')")
  })
})
