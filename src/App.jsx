import { useState, lazy, Suspense, useEffect } from 'react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import PWABadge from './components/PWABadge.jsx'
import ConfirmModal from './components/modals/ConfirmModal.jsx'
import SplashScreen from './components/common/SplashScreen.jsx'
import gunService from './services/gunService.js'
import { Loader } from 'lucide-react'
import './App.css'

// 2. Implementasi Lazy Load
const Catalog = lazy(() => import('./pages/Catalog.jsx'))
const FavoritesPage = lazy(() => import('./pages/FavoritesPage.jsx'))
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'))
const CreateGunPage = lazy(() => import('./pages/CreateGunPage.jsx'))
const EditGunPage = lazy(() => import('./pages/EditGunPage.jsx'))
const GunDetail = lazy(() => import('./components/gun/GunDetail.jsx'))
const EditProfilePage = lazy(() => import('./pages/EditProfilePage.jsx'))
const CartPage = lazy(() => import('./pages/CartPage.jsx'))

function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [tab, setTab] = useState('Catalog')
  const [mode, setMode] = useState('list')
  const [selectedGun, setSelectedGun] = useState(null)
  const [editingGun, setEditingGun] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const handleNavigate = (target, payload) => {
    if (target === 'Create') {
      setEditingGun(payload || null)
      setMode('create')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Edit') {
      setEditingGun(payload)
      setMode('edit')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Detail') {
      setSelectedGun(payload)
      setMode('detail')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'EditProfile') {
      setMode('editProfile')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      setTab(target)
      setMode('list')
      setSelectedGun(null)
      setEditingGun(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sharedGunId = params.get('gunId')
    
    if (sharedGunId) {
      // Sembunyikan splash screen agar langsung masuk
      setShowSplash(false) 
      
      const loadSharedGun = async () => {
        try {
          // Panggil data langsung dari service berdasarkan ID di URL
          const response = await gunService.getGunById(sharedGunId)
          if (response.success) {
            setSelectedGun(response.data)
            setMode('detail') // Pindah ke tampilan detail
            
            // (Opsional) Membersihkan URL dari parameter setelah berhasil dimuat
            window.history.replaceState({}, document.title, window.location.pathname)
          }
        } catch (error) {
          console.error("Gagal memuat produk dari tautan bagikan:", error)
          alert("Produk tidak ditemukan atau telah dihapus.")
        }
      }
      
      loadSharedGun()
    }
  }, [])

  const handleBackToList = () => {
    setMode('list')
    setSelectedGun(null)
    setEditingGun(null)
  }

  return (
    <div className="shell">
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      )}
      <Header
        tab={mode === 'list' ? tab : ''}
        onTab={(newTab) => handleNavigate(newTab)}
        onNavigateCreate={() => handleNavigate('Create')}
      />
      <main className="main">
        {/* Suspense Wrapper untuk Lazy Loading */}
        <Suspense fallback={
          <div className="state-box">
            <Loader size={32} className="spin" />
            <p>Memuat modul aplikasi...</p>
          </div>
        }>
          {mode === 'create' && (
            <CreateGunPage resumeDraft={Boolean(editingGun?.resumeDraft)} onBack={handleBackToList} onSuccess={() => { handleBackToList(); setTab('Catalog'); }} />
          )}
          {mode === 'edit' && (
            <EditGunPage gun={editingGun?.resumeDraft ? null : editingGun} gunId={editingGun?.id} resumeDraft={Boolean(editingGun?.resumeDraft)} onBack={handleBackToList} onSuccess={() => { handleBackToList(); setTab('Catalog'); }} />
          )}
          {mode === 'detail' && selectedGun && (
            <GunDetail gun={selectedGun} onBack={handleBackToList} onEdit={(g) => handleNavigate('Edit', g)} onDelete={(g) => setDeleteTarget(g)} />
          )}
          {mode === 'editProfile' && (
            <EditProfilePage onBack={handleBackToList} />
          )}
          
          {mode === 'list' && (
            <>
              {tab === 'Catalog' && <Catalog onNavigate={handleNavigate} />}
              {tab === 'Favorites' && <FavoritesPage onSelectGun={(g) => handleNavigate('Detail', g)} onNavigateCatalog={() => setTab('Catalog')} />}
              
              {/* ProfilePage sekarang menghandle About & Contact */}
              {tab === 'Profile' && <ProfilePage onReplaySplash={() => setShowSplash(true)} onNavigate={handleNavigate} />}
              
              {tab === 'Cart' && <CartPage onNavigateCatalog={() => setTab('Catalog')} />}
            </>
          )}
        </Suspense>
      </main>

      {/* Global Delete Confirmation */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Hapus / Arsipkan Hardware"
        message={`Apakah Anda yakin ingin menghapus "${deleteTarget?.name}"?`}
        confirmLabel="Hapus"
        danger
        loading={deleting}
        onConfirm={async () => {
          if (!deleteTarget) return
          try {
            setDeleting(true)
            // PASTIKAN MENGIRIM OBJEK UTUH (deleteTarget), BUKAN deleteTarget.id
            await gunService.deleteGun(deleteTarget) 
            
            setDeleteTarget(null)
            handleBackToList()
            setTab('Catalog')
            window.location.reload() // Refresh untuk memfilter data arsip dari layar
          } catch (err) {
            alert(err.message || 'Gagal menghapus data.')
          } finally {
            setDeleting(false)
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
      <PWABadge />
      <Footer />
    </div>
  )
}
export default App