"use client"

/**
 * ReviewsSection — displays product reviews + submit form.
 *
 * Features:
 *   - Rating distribution bar (5★ to 1★)
 *   - Average rating + total count
 *   - Individual review cards (avatar, name, rating, date, body, helpful votes)
 *   - Submit review form (rating, title, body, skin type)
 *   - Requires login to submit (shows login prompt if not authenticated)
 *   - "Mark as helpful" button (visual only in MVP)
 */

import { useEffect, useState } from "react"
import { useStore } from "@/store/useStore"
import { Product } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { Star, ThumbsUp, MessageSquare, Loader2, LogIn } from "lucide-react"

interface Review {
  id: string
  rating: number
  title: string | null
  body: string | null
  skinType: string | null
  shadeUsed: string | null
  helpfulVotes: number
  createdAt: string
  user: { name: string } | null
}

interface ReviewStats {
  total: number
  average: number
  distribution: Record<number, number>
}

interface ReviewsSectionProps {
  product: Product
}

const SKIN_TYPES = ["ALL", "OILY", "DRY", "COMBINATION", "SENSITIVE", "NORMAL"]

export function ReviewsSection({ product }: ReviewsSectionProps) {
  const { user, goLogin } = useStore()
  const { toast } = useToast()

  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<ReviewStats>({
    total: 0,
    average: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [skinType, setSkinType] = useState("")

  // Load reviews
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/reviews?productId=${product.id}`)
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        setReviews(data.reviews || [])
        setStats(
          data.stats || {
            total: 0,
            average: 0,
            distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          }
        )
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [product.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      goLogin()
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          rating,
          title: title || undefined,
          body: body || undefined,
          skinType: skinType || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({
          title: "Review failed",
          description: data.error,
          variant: "destructive",
        })
        return
      }
      toast({
        title: "Review submitted!",
        description:
          process.env.NODE_ENV === "production"
            ? "It will appear after moderation."
            : "Your review is now live.",
      })
      setShowForm(false)
      setTitle("")
      setBody("")
      setSkinType("")
      setRating(5)
      // Reload reviews
      const refreshRes = await fetch(`/api/reviews?productId=${product.id}`)
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json()
        setReviews(refreshData.reviews || [])
        setStats(refreshData.stats)
      }
    } catch {
      toast({
        title: "Network error",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
        Customer reviews ({stats.total})
      </h2>

      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        {/* Rating summary */}
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-4xl font-bold">{stats.average.toFixed(1)}</p>
              <div className="mt-1 flex justify-center">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-4 w-4 ${
                      s <= Math.round(stats.average)
                        ? "fill-amber-400 text-amber-400"
                        : "fill-muted text-muted"
                    }`}
                  />
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{stats.total} reviews</p>
            </div>
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.distribution[star] || 0
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="flex w-8 items-center gap-0.5">
                      {star}
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-amber-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-muted-foreground">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <Button
            className="mt-4 w-full"
            onClick={() => {
              if (!user) {
                goLogin()
              } else {
                setShowForm((s) => !s)
              }
            }}
          >
            {user ? (
              showForm ? "Cancel" : "Write a review"
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" /> Log in to review
              </>
            )}
          </Button>
        </div>

        {/* Submit form */}
        {showForm && user && (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border bg-card p-5 lg:col-span-2"
          >
            <h3 className="text-lg font-semibold">Write your review</h3>
            <div className="mt-4 space-y-4">
              {/* Rating */}
              <div>
                <Label>Your rating</Label>
                <div className="mt-1 flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      aria-label={`${s} stars`}
                    >
                      <Star
                        className={`h-8 w-8 transition-transform hover:scale-110 ${
                          s <= rating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-muted text-muted"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <Label htmlFor="review-title">Title (optional)</Label>
                <Input
                  id="review-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Summarize your experience"
                  maxLength={200}
                />
              </div>

              {/* Body */}
              <div>
                <Label htmlFor="review-body">Your review</Label>
                <Textarea
                  id="review-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="What did you like or dislike? How did it work for you?"
                  rows={4}
                  maxLength={2000}
                />
              </div>

              {/* Skin type */}
              <div>
                <Label>Your skin type (optional)</Label>
                <Select value={skinType} onValueChange={setSkinType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your skin type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SKIN_TYPES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Submit review
              </Button>
            </div>
          </form>
        )}

        {/* Reviews list */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-12 text-center">
              <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <h3 className="mt-3 font-semibold">No reviews yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Be the first to review this product!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-2xl border bg-card p-4 sm:p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                        {(review.user?.name || "A").charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <p className="text-sm font-medium">
                          {review.user?.name || "Anonymous"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString("en-RW", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-4 w-4 ${
                            s <= review.rating
                              ? "fill-amber-400 text-amber-400"
                              : "fill-muted text-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {review.title && (
                    <h4 className="mt-3 text-sm font-semibold">{review.title}</h4>
                  )}
                  {review.body && (
                    <p className="mt-1 text-sm text-foreground/85">{review.body}</p>
                  )}

                  <div className="mt-3 flex items-center gap-3 border-t pt-3">
                    {review.skinType && (
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                        {review.skinType} skin
                      </span>
                    )}
                    <button
                      onClick={() => toast({ title: "Thanks for your feedback!" })}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                      Helpful ({review.helpfulVotes})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
