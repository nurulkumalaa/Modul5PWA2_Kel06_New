import { useState, useEffect } from 'react'
import {
  Shield,
  Copy,
  Check,
  Heart,
  FileText,
  Play,
  MapPin,
  Phone,
  Info,
  Archive,
  Edit,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import userService from '../services/userService'
import { useFavorites } from '../hooks/useFavorites'
import {
  getAllDraftIds,
  loadDraft,
  archiveDraft,
  getArchivedDrafts,
  restoreArchivedDraft,
  permanentlyDeleteArchivedDraft,
} from '../utils/draftStorage'
import gunService from '../services/gunService'

export default function ProfilePage({ onReplaySplash, onNavigate }) {
  const [profile] = useState(() => userService.getUserProfile())
  const [copied, setCopied] = useState(false)
  const { favorites } = useFavorites()
  
  const [drafts, setDrafts] = useState(() => {
    return getAllDraftIds().map((id) => {
      const data = loadDraft(id)
      return { id, name: data?.formData?.name || `Draft (${id})` }
    })
  })
  const [archivedDrafts, setArchivedDrafts] = useState(() => getArchivedDrafts())
  const [draftError, setDraftError] = useState('')

  const [archivedGuns, setArchivedGuns] = useState([])
  const [archiveError, setArchiveError] = useState('')
  const [archiveActionId, setArchiveActionId] = useState(null)

  const loadArchivedItems = () => {
    try {
      const ids = JSON.parse(localStorage.getItem('archived_guns') || '[]')
      const details = JSON.parse(localStorage.getItem('archived_guns_detail') || '[]')
      const detailById = new Map(details.map((item) => [String(item.id), item]))
      setArchivedGuns(ids.map((entry) => {
        const id = entry?.id ?? entry
        return detailById.get(String(id)) || (typeof entry === 'object' ? entry : { id })
      }))
    } catch (error) {
      setArchiveError(error.message || 'Gagal memuat arsip.')
    }
  }

  useEffect(() => {
    loadArchivedItems()
  }, [])

  const handleRestore = async (id) => {
    try {
      setArchiveError('')
      setArchiveActionId(id)
      await gunService.restoreGun(id)
      loadArchivedItems()
    } catch (error) {
      setArchiveError(error.message || 'Gagal mengembalikan item.')
    } finally {
      setArchiveActionId(null)
    }
  }

  const handlePermanentDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus item ini secara PERMANEN?')) return
    try {
      setArchiveError('')
      setArchiveActionId(id)
      await gunService.permanentlyDeleteGun(id)
      loadArchivedItems()
    } catch (error) {
      setArchiveError(error.message || 'Gagal menghapus item secara permanen.')
    } finally {
      setArchiveActionId(null)
    }
  }

  const handleCopyId = () => {
    navigator.clipboard.writeText(profile.userId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const refreshDrafts = () => {
    setDrafts(getAllDraftIds().map((id) => {
      const data = loadDraft(id)
      return { id, name: data?.formData?.name || `Draft (${id})` }
    }))
    setArchivedDrafts(getArchivedDrafts())
  }

  const handleArchiveDraft = (id) => {
    try {
      setDraftError('')
      archiveDraft(id)
      refreshDrafts()
    } catch (error) {
      setDraftError(error.message || 'Gagal mengarsipkan draft.')
    }
  }

  const handleRestoreDraft = (id) => {
    try {
      setDraftError('')
      restoreArchivedDraft(id)
      refreshDrafts()
    } catch (error) {
      setDraftError(error.message || 'Gagal memulihkan draft.')
    }
  }

  const handlePermanentlyDeleteDraft = (id) => {
    if (!window.confirm('Hapus draft arsip ini secara permanen?')) return
    try {
      setDraftError('')
      permanentlyDeleteArchivedDraft(id)
      refreshDrafts()
    } catch (error) {
      setDraftError(error.message || 'Gagal menghapus draft.')
    }
  }

  const handleContinueDraft = (id, archived = false) => {
    try {
      setDraftError('')
      if (archived) restoreArchivedDraft(id)
      onNavigate(id === 'create' ? 'Create' : 'Edit', {
        id: id === 'create' ? undefined : id,
        resumeDraft: true,
      })
    } catch (error) {
      setDraftError(error.message || 'Gagal membuka draft.')
    }
  }

  return (
    <div className="profile-page">
      <section className="masthead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="display">Operator Profile</h1>
          <p className="lede">Operator credentials and station details.</p>
        </div>
        {onReplaySplash && (
          <button type="button" className="btn btn--outline btn--sm" onClick={onReplaySplash}>
            <Play size={14} /> Replay Intro
          </button>
        )}
      </section>

      {/* Operator Card */}
      <div className="profile-card">
        <div className="profile-card-top">
          <div className="avatar-wrap">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.username} className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">
                <Shield size={36} stroke="var(--brass)" />
              </div>
            )}
          </div>
          <div className="profile-identity" style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="display">{profile.username || 'Shooter'}</h2>
              {/* Challenge 5: Edit Profile di Page Baru */}
              <button type="button" className="btn btn--outline btn--sm" onClick={() => onNavigate?.('EditProfile')}>
                <Edit size={14} /> Edit Profile
              </button>
            </div>
            <p className="lede" style={{ fontSize: '0.9rem', margin: '4px 0 8px' }}>
              {profile.bio || 'Tidak ada bio station.'}
            </p>
            <div className="profile-id-row">
              <span className="mono-badge">{profile.userId}</span>
              <button type="button" className="icon-btn" onClick={handleCopyId}>
                {copied ? <Check size={14} color="var(--brass)" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>

        <div className="profile-stats">
          <div className="stat-item">
            <Heart size={20} stroke="var(--brass)" />
            <div className="stat-val">{favorites.length}</div>
            <div className="stat-label">Favorites</div>
          </div>
          <div className="stat-item">
            <FileText size={20} stroke="var(--steel)" />
            <div className="stat-val">{drafts.length}</div>
            <div className="stat-label">Offline Drafts</div>
          </div>
        </div>
      </div>

      {/* Challenge 5: Section Draft */}
      <div className="profile-card">
        <h3 className="section-title">Saved Drafts</h3>
        {drafts.length === 0 ? (
          <p className="lede" style={{ fontSize: '0.9rem' }}>No active drafts.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {drafts.map((d) => (
              <li key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--paper)', padding: '10px', borderRadius: '4px' }}>
                <span>{d.name}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn btn--primary btn--sm" onClick={() => handleContinueDraft(d.id)}>
                    Lanjutkan Edit
                  </button>
                  <button type="button" className="btn btn--outline btn--sm" onClick={() => handleArchiveDraft(d.id)}>
                    <Archive size={14} /> Arsipkan
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="profile-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Archive size={18} stroke="var(--brass)" />
          <h3 className="section-title" style={{ margin: 0 }}>Draft Archive</h3>
        </div>
        {archivedDrafts.length === 0 ? (
          <p className="lede" style={{ fontSize: '0.9rem', marginTop: '8px' }}>Belum ada draft di arsip.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {archivedDrafts.map((draft) => (
              <li key={draft.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--paper)', padding: '10px', borderRadius: '4px' }}>
                <span>{draft.name}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn btn--primary btn--sm" onClick={() => handleContinueDraft(draft.id, true)}>
                    Lanjutkan Edit
                  </button>
                  <button type="button" className="btn btn--outline btn--sm" onClick={() => handleRestoreDraft(draft.id)}>
                    <RotateCcw size={14} /> Restore
                  </button>
                  <button type="button" className="btn btn--danger btn--sm" onClick={() => handlePermanentlyDeleteDraft(draft.id)}>
                    <Trash2 size={14} /> Delete Permanen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {draftError && <p className="form-error" role="alert">{draftError}</p>}
      </div>

      {/* Challenge 6: Section Soft Delete / Arsip (Bisa Restore & Delete Permanen) */}
      <div className="profile-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Archive size={18} stroke="var(--brass)" />
          <h3 className="section-title" style={{ margin: 0 }}>Archived Items (Soft Delete)</h3>
        </div>
        {archivedGuns.length === 0 ? (
          <p className="lede" style={{ fontSize: '0.9rem', marginTop: '8px' }}>Belum ada item yang di-soft delete / diarsip.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {archivedGuns.map((item, idx) => (
              <li key={item.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--paper)', padding: '10px', borderRadius: '4px' }}>
                <span>{item.name || `Archived Item #${idx + 1}`}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn btn--outline btn--sm" onClick={() => handleRestore(item.id)} disabled={archiveActionId === item.id}>
                    <RotateCcw size={14} /> Restore
                  </button>
                  <button type="button" className="btn btn--danger btn--sm" onClick={() => handlePermanentDelete(item.id)} disabled={archiveActionId === item.id}>
                    <Trash2 size={14} /> Delete Permanen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {archiveError && <p className="form-error" role="alert">{archiveError}</p>}
      </div>

      {/* Challenge 5: Section About */}
      <div className="profile-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={18} stroke="var(--brass)" />
          <h3 className="section-title" style={{ margin: 0 }}>About Armory</h3>
        </div>
        <p className="lede" style={{ marginTop: '8px' }}>
          Bore &amp; Barrel sells a short, honest list of firearms. Each piece is priced from the bench — no markup theatre.
        </p>
      </div>

      {/* Challenge 5: Section Contact */}
      <div className="profile-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={18} stroke="var(--brass)" />
          <h3 className="section-title" style={{ margin: 0 }}>Contact & Location</h3>
        </div>
        <p className="lede" style={{ marginTop: '8px' }}>123 Range Road. Open Tuesday to Saturday, 10 to 6.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', color: 'var(--steel)' }}>
          <Phone size={15} /> (555) 010-0100
        </div>
      </div>
    </div>
  )
}