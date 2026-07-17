'use client'

import { useEffect, useMemo, useState } from 'react'
import Image, { type ImageLoader, type ImageProps } from 'next/image'
import { useLowData } from '@/contexts/LowDataContext'
import {
  buildImageUrl,
  getImageSizes,
  getResponsiveSrcSet,
  IMAGE_QUALITY,
  IMAGE_SIZES,
  type ResponsiveImageContext,
} from '@/lib/cloudinary-images'
import { cn } from '@/lib/utils'

interface SmartImageProps extends Omit<ImageProps, 'src' | 'sizes' | 'loader' | 'onLoad' | 'onError'> {
  publicId?: string
  fallbackSrc?: string
  context?: ResponsiveImageContext
  aspectRatio?: number
  showPlaceholder?: boolean
}

export default function SmartImage({
  publicId,
  fallbackSrc,
  context = 'card',
  aspectRatio,
  alt,
  className,
  priority = false,
  showPlaceholder = true,
  fill,
  width,
  height,
  ...props
}: SmartImageProps) {
  const { isLowData } = useLowData()
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const configured = IMAGE_SIZES[context]
  const maxWidth = isLowData ? configured.mobile : configured.desktop
  const quality = isLowData ? IMAGE_QUALITY.lowData : IMAGE_QUALITY.normal

  useEffect(() => {
    setLoaded(false)
    setFailed(false)
  }, [fallbackSrc, isLowData, publicId])

  const loader = useMemo<ImageLoader | undefined>(() => {
    if (!publicId) return undefined
    return ({ width: requestedWidth }) => buildImageUrl({
      publicId,
      width: Math.min(requestedWidth, maxWidth),
      height: aspectRatio && aspectRatio > 0 ? Math.round(Math.min(requestedWidth, maxWidth) / aspectRatio) : undefined,
      quality,
    })
  }, [aspectRatio, maxWidth, publicId, quality])

  const responsive = publicId
    ? getResponsiveSrcSet(publicId, { context, isLowData, aspectRatio })
    : null
  const source = publicId || fallbackSrc

  if (!source || failed) {
    if (!showPlaceholder) return null
    return (
      <span
        role="img"
        aria-label={typeof alt === 'string' ? alt : ''}
        className={cn(
          'flex items-center justify-center bg-gray-100 p-2 text-center text-xs text-gray-600',
          fill && 'absolute inset-0',
          className,
        )}
        style={!fill && aspectRatio ? { aspectRatio } : undefined}
      >
        {alt}
      </span>
    )
  }

  return (
    <Image
      {...props}
      src={source}
      loader={loader}
      alt={alt}
      fill={fill}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      sizes={responsive?.sizes || getImageSizes(context)}
      priority={priority}
      loading={priority ? undefined : 'lazy'}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      className={cn(
        'transition-opacity duration-300',
        showPlaceholder && !loaded ? 'opacity-0' : 'opacity-100',
        className,
      )}
    />
  )
}
