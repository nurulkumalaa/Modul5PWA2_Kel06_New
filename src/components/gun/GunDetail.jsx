import { useState, useMemo } from 'react'
import { ArrowLeft, Star, Send, Loader, ThumbsUp, ThumbsDown, ShoppingCart, Share2 } from 'lucide-react'
import FavoriteButton from '../common/FavoriteButton'
import { useReviews, useCreateReview } from '../../hooks/useReviews'
import { getUserIdentifier } from '../../services/userService'
import { formatPrice } from '../../utils/helpers'
import { addToCart } from '../../utils/cartStorage'

export default function GunDetail({ gun, onBack, onEdit, onDelete, onOpenCart }) {
  const primaryImage = gun.image_url || gun.image || '/guns/pistol.svg'
  const images = useMemo(
    () => [...new Set([primaryImage, ...(Array.isArray(gun.images) ? gun.images : [])].filter(Boolean))],
    [primaryImage, gun.images],
  )
  const [imageSelection, setImageSelection] = useState({ gunId: gun.id, index: 0 })
  const activeImageIndex = imageSelection.gunId === gun.id
    ? Math.min(imageSelection.index, images.length - 1)
    : 0
  const activeImage = images[activeImageIndex]
  const category = gun.type || gun.category || '—'
  const caliber = gun.caliber || gun.difficulty || ''
  const price = gun.price ?? gun.cook_time ?? 0

  const { reviews, loading: reviewsLoading, refetch: refetchReviews } = useReviews(gun.id)
  const { createReview, loading: submitting } = useCreateReview()

  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState('')
  const [votes, setVotes] = useState({})
  const [shareStatus, setShareStatus] = useState('')

  const handleVote = (reviewId, type) => {
    setVotes((prev) => {
      const current = prev[reviewId] || { up: 0, down: 0, userVote: null }
      if (current.userVote === type) return prev
      return {
        ...prev,
        [reviewId]: {
          up: type === 'up' ? current.up + 1 : (current.userVote === 'up' ? current.up - 1 : current.up),
          down: type === 'down' ? current.down + 1 : (current.userVote === 'down' ? current.down - 1 : current.down),
          userVote: type,
        },
      }
    })
  }

  const handleDirectWA = () => {
    const phoneNumber = '6281234567890'
    const message = `Hi aku mau pesan ${gun.name} seharga ${formatPrice(price)}`
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank')
  }

  const handleAddToCart = () => {
    addToCart(gun)
    if (onOpenCart) onOpenCart()
  }

  const handleShare = async () => {
    const shareUrl = new URL(window.location.href)
    shareUrl.searchParams.set('gunId', gun.id)
    const url = shareUrl.toString()

    try {
      if (navigator.share) {
        await navigator.share({ title: gun.name, text: `Lihat produk ${gun.name}`, url })
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        setShareStatus('Link produk berhasil disalin.')
      } else {
        window.prompt('Salin link produk ini:', url)
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        setShareStatus('Gagal membagikan link produk.')
      }
    }
  }

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    setReviewError('')
    setReviewSuccess('')
    if (rating < 1 || rating > 5) {
      setReviewError('Rating must be between 1 and 5.')
      return
    }

    const result = await createReview(gun.id, {
      user_identifier: getUserIdentifier(),
      rating,
      comment: comment.trim(),
    })

    if (result) {
      setReviewSuccess('Review submitted!')
      setComment('')
      setRating(5)
      refetchReviews()
    } else {
      setReviewError('Could not submit review.')
    }
  }

  return (
    <div className="detail">
      <button type="button" className="detail-back" onClick={onBack}>
        <ArrowLeft size={18} /> Back to Catalog
      </button>

      <div className="detail-hero">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <img className="detail-img" src={activeImage} alt={gun.name} style={{ width: '100%', maxHeight: '350px', objectFit: 'contain' }} />

          {images.length > 1 && (
            <div className="detail-thumbnails" aria-label="Product images">
              {images.map((img, idx) => (
                <button
                  type="button"
                  key={img}
                  className={`detail-thumbnail${activeImageIndex === idx ? ' detail-thumbnail--active' : ''}`}
                  onClick={() => setImageSelection({ gunId: gun.id, index: idx })}
                  aria-label={`Show product image ${idx + 1}`}
                  aria-pressed={activeImageIndex === idx}
                >
                  <img src={img} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="detail-info" style={{ flex: 1 }}>
          <h1 className="display">{gun.name}</h1>
          <p className="type">{category} {caliber ? `· ${caliber}` : ''}</p>
          <p className="price detail-price">{formatPrice(price)}</p>

          <div className="detail-actions" style={{ flexWrap: 'wrap', gap: '8px' }}>
            <FavoriteButton gunId={gun.id || gun.name} />
            {gun.id && !String(gun.id).startsWith('local-') && (
              <button type="button" className="btn btn--outline" onClick={handleShare}>
                <Share2 size={16} /> Share
              </button>
            )}
            {onEdit && <button type="button" className="btn btn--outline" onClick={() => onEdit(gun)}>Edit</button>}
            {onDelete && <button type="button" className="btn btn--danger" onClick={() => onDelete(gun)}>Archive</button>}
          </div>
          {shareStatus && <p className="form-hint" role="status">{shareStatus}</p>}

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button type="button" className="btn btn--outline" onClick={handleAddToCart} style={{ flex: 1 }}>
              <ShoppingCart size={16} /> + Keranjang
            </button>
            <button type="button" className="btn btn--primary" onClick={handleDirectWA} style={{ flex: 1 }}>
              Pesan via WA
            </button>
          </div>
        </div>
      </div>

      <section className="detail-section">
        <h2>Description</h2>
        <p>{gun.description || 'No description available.'}</p>
      </section>

      {/* Challenge 7: Reviews & Thumbs Up/Down */}
      <section className="detail-section">
        <h2>Reviews</h2>
        <form className="review-form" onSubmit={handleSubmitReview}>
          <div className="review-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" className="star-btn" onClick={() => setRating(n)}>
                <Star size={22} fill={n <= rating ? 'var(--brass)' : 'none'} stroke={n <= rating ? 'var(--brass)' : 'var(--steel)'} />
              </button>
            ))}
          </div>
          <textarea className="review-input" rows="3" placeholder="Write a short review..." value={comment} onChange={(e) => setComment(e.target.value)} />
          <button type="submit" className="btn btn--primary" disabled={submitting || !gun.id}>
            {submitting ? <Loader size={16} className="spin" /> : <Send size={16} />} Submit Review
          </button>
          {reviewError && <p className="form-error">{reviewError}</p>}
          {reviewSuccess && <p className="form-success">{reviewSuccess}</p>}
        </form>

        {reviewsLoading ? (
          <p className="detail-loading">Loading reviews…</p>
        ) : reviews.length > 0 ? (
          <ul className="review-list">
            {reviews.map((rev) => {
              const vote = votes[rev.id] || { up: 0, down: 0, userVote: null }
              return (
                <li key={rev.id} className="review-item">
                  <div className="review-head">
                    <span className="review-user">{rev.user_identifier || 'Anonymous'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => handleVote(rev.id, 'up')}
                        style={{ color: vote.userVote === 'up' ? '#27ae60' : 'inherit' }}
                      >
                        <ThumbsUp size={14} /> {vote.up}
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => handleVote(rev.id, 'down')}
                        style={{ color: vote.userVote === 'down' ? '#c0392b' : 'inherit' }}
                      >
                        <ThumbsDown size={14} /> {vote.down}
                      </button>
                    </div>
                  </div>
                  {rev.comment && <p className="review-comment">{rev.comment}</p>}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="detail-empty">No reviews yet.</p>
        )}
      </section>
    </div>
  )
}