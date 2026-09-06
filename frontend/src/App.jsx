import { useEffect, useMemo, useRef, useState } from 'react'
import api from './api'
import { ActivityLogs, RackManagement, UserManagement } from './AdminPages'
import CategoryArchive from './CategoryArchive'
import DocumentArchive from './DocumentArchive'
import './App.css'
import './Polish.css'

const menuItems = [
  { id: 'dashboard', label: 'Ringkasan', icon: '⌂' },
  { id: 'documents', label: 'Dokumen arsip', icon: '▤' },
  { id: 'categories', label: 'Kategori', icon: '◫' },
  { id: 'racks', label: 'Rak penyimpanan', icon: '▥', adminOnly: true },
  { id: 'users', label: 'Manajemen pengguna', icon: '♙', adminOnly: true },
  { id: 'logs', label: 'Log aktivitas', icon: '≡', adminOnly: true },
]

const storedUser = () => {
  try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
}

const formatDate = (date) => date ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date)) : '-'

function App() {
  const publicToken = new URLSearchParams(window.location.search).get('public_token')
  const [user, setUser] = useState(storedUser)
  const [authReady, setAuthReady] = useState(false)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [activeView, setActiveView] = useState('dashboard')
  const [documents, setDocuments] = useState([])
  const [sections, setSections] = useState([])
  const [categories, setCategories] = useState([])
  const [racks, setRacks] = useState([])
  const [loading, setLoading] = useState(false)
  const [pageError, setPageError] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('aktif')
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [showScanner, setShowScanner] = useState(false)
  const [editingDocument, setEditingDocument] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [legacyUpload, setLegacyUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadForm, setUploadForm] = useState({ file: null, nomor_dokumen: '', judul: '', seksi_id: '', kategori_id: '', rak_id: '', tanggal_dokumen: '', tahun: String(new Date().getFullYear()), deskripsi: '' })

  const isAdmin = user?.role === 'admin'
  const loadWorkspace = async () => {
    setLoading(true); setPageError('')
    try {
      const [documentsResponse, sectionsResponse, categoriesResponse, racksResponse] = await Promise.all([api.get('/dokumen'), api.get('/seksi'), api.get('/kategori'), api.get('/rak')])
      setDocuments(documentsResponse.data.data || []); setSections(sectionsResponse.data.data || []); setCategories(categoriesResponse.data.data || [])
      setRacks(racksResponse.data.data || [])
    } catch (error) { setPageError(error.response?.data?.message || 'Data belum dapat dimuat. Pastikan backend sedang berjalan.') } finally { setLoading(false) }
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setAuthReady(true)
      return
    }

    api.get('/auth/me')
      .then((response) => {
        const currentUser = response.data.data
        localStorage.setItem('user', JSON.stringify(currentUser))
        setUser(currentUser)
      })
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
      })
      .finally(() => setAuthReady(true))
  }, [])

  useEffect(() => {
    if (user && user.role !== 'admin' && ['users', 'categories', 'racks', 'logs'].includes(activeView)) {
      setActiveView('dashboard')
    }
  }, [user, activeView])

  useEffect(() => { if (user && authReady) loadWorkspace() }, [user, authReady])

  useEffect(() => {
    const documentId = new URLSearchParams(window.location.search).get('document')
    if (!user || !authReady || !documentId) return
    api.get(`/dokumen/${documentId}`).then((response) => setSelectedDocument(response.data.data)).catch(() => setPageError('Dokumen dari QR tidak ditemukan.'))
  }, [user, authReady])

  const filteredDocuments = useMemo(() => documents.filter((document) => {
    const text = query.toLowerCase().trim()
    const matchesQuery = !text || [document.judul, document.nomor_dokumen, document.nama_kategori].some((value) => value?.toLowerCase().includes(text))
    return matchesQuery && (!statusFilter || document.status === statusFilter)
  }), [documents, query, statusFilter])

  const stats = useMemo(() => ({ total: documents.length, active: documents.filter((item) => item.status === 'aktif').length, archived: documents.filter((item) => item.status === 'arsip').length, sections: new Set(documents.map((item) => item.seksi_id)).size }), [documents])

  const handleLogin = async (event) => {
    event.preventDefault(); setIsLoggingIn(true); setLoginError('')
    try {
      const response = await api.post('/auth/login', loginForm); const { token, user: loggedInUser } = response.data.data
      localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(loggedInUser)); setUser(loggedInUser)
    } catch (error) { setLoginError(error.response?.data?.message || 'Login gagal. Periksa username dan password.') } finally { setIsLoggingIn(false) }
  }
  const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); setDocuments([]) }
  const handleArchive = async (id) => { try { await api.patch(`/dokumen/${id}/archive`); setSelectedDocument(null); await loadWorkspace() } catch (error) { setPageError(error.response?.data?.message || 'Dokumen belum dapat diarsipkan.') } }
  const handleEditDocument = async (event) => {
    event.preventDefault()
    try {
      const { judul, seksi_id, kategori_id, rak_id, deskripsi } = editingDocument.form
      await api.put(`/dokumen/${editingDocument.document.id}`, { judul, seksi_id, kategori_id, rak_id, deskripsi })
      setEditingDocument(null)
      setSelectedDocument(null)
      await loadWorkspace()
    } catch (error) {
      setPageError(error.response?.data?.message || 'Metadata dokumen belum dapat diperbarui.')
    }
  }
  const handleDownload = async (documentRecord) => {
    try {
      const response = await api.get(`/dokumen/${documentRecord.id}/download`, { responseType: 'blob' })
      if (response.headers['content-type']?.includes('application/json')) {
        const errorText = await response.data.text()
        const errorData = JSON.parse(errorText)
        throw new Error(errorData.message || 'File belum dapat diunduh.')
      }

      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = documentRecord.nama_file || 'dokumen-arsip'
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      window.setTimeout(() => {
        URL.revokeObjectURL(url)
        link.remove()
      }, 1000)
    } catch (error) {
      let message = error.response?.data?.message || error.message
      if (error.response?.data instanceof Blob) {
        try {
          const errorData = JSON.parse(await error.response.data.text())
          message = errorData.message
        } catch {
          message = 'File belum dapat diunduh.'
        }
      }
      setPageError(message || 'File belum dapat diunduh.')
    }
  }
  const handleUpload = async (event) => {
    event.preventDefault()
    setUploadError('')
    const effectiveSectionId = uploadForm.seksi_id || user.seksi_id
    if (!uploadForm.file || !uploadForm.nomor_dokumen || !uploadForm.judul || !effectiveSectionId || !uploadForm.kategori_id || (legacyUpload && !uploadForm.tanggal_dokumen)) {
      setUploadError(legacyUpload ? 'Dokumen lama wajib memiliki tanggal dokumen' : 'File, nomor dokumen, judul, seksi, dan kategori wajib diisi')
      return
    }

    setUploading(true)
    const formData = new FormData()
    Object.entries({ ...uploadForm, seksi_id: effectiveSectionId }).forEach(([key, value]) => {
      if (value) formData.append(key, value)
    })
    try { await api.post('/dokumen', formData); setShowUpload(false); setLegacyUpload(false); setUploadForm({ ...uploadForm, file: null, nomor_dokumen: '', judul: '', deskripsi: '' }); await loadWorkspace() } catch (error) { setUploadError(error.response?.data?.message || 'Upload gagal. Lengkapi data dan coba lagi.') } finally { setUploading(false) }
  }

  const handleQrResult = async (value) => {
    try {
      const parsedUrl = new URL(value)
      if (!parsedUrl.searchParams.get('public_token')) throw new Error('QR tidak berisi tautan dokumen')
      window.location.assign(parsedUrl.href)
    } catch (error) {
      setPageError(error.response?.data?.message || 'QR tidak berisi dokumen yang valid.')
    }
  }

  if (!authReady) return <div className="auth-loading">Memeriksa sesi pengguna...</div>
  if (!user) return publicToken ? <PublicDocumentPage token={publicToken} /> : <LoginPage form={loginForm} setForm={setLoginForm} onSubmit={handleLogin} error={loginError} loading={isLoggingIn} />
  if (activeView === 'documents') return <div className="document-page-shell"><DocumentArchive documents={documents} sections={sections} categories={categories} onBack={() => setActiveView('dashboard')} onOpen={(document) => setSelectedDocument(document)} onLegacyUpload={() => { setLegacyUpload(true); setActiveView('dashboard'); setShowUpload(true) }} onScan={() => setShowScanner(true)} /></div>
  const visibleMenu = menuItems.filter((item) => !item.adminOnly || isAdmin)
  const activeSection = user.nama_seksi || 'Semua seksi kelurahan'

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark">AR</div><div><strong>Arsip<span>Kita</span></strong><small>Kelurahan digital</small></div></div><div className="office-badge"><span className="status-dot" /> Sistem aktif<div className="office-name">Kantor Kelurahan</div></div><nav className="main-nav"><small className="nav-label">RUANG KERJA</small>{visibleMenu.map((item) => <button key={item.id} className={activeView === item.id ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav><div className="sidebar-foot"><div className="help-mark">?</div><div><strong>Butuh bantuan?</strong><small>Hubungi admin sistem</small></div></div></aside>
    <main className="main-content"><header className="topbar"><div><span className="breadcrumb">Ruang kerja / </span><strong>{activeView === 'dashboard' ? 'Ringkasan' : visibleMenu.find((item) => item.id === activeView)?.label}</strong></div><div className="top-actions"><button className="icon-button" aria-label="Notifikasi">♢<i /></button><div className="user-chip"><div className="avatar">{user.nama?.slice(0, 2).toUpperCase()}</div><div><strong>{user.nama}</strong><span>{isAdmin ? 'Administrator' : user.nama_seksi}</span></div></div><button className="logout-button" onClick={handleLogout}>Keluar</button></div></header>
      {activeView === 'users' ? <UserManagement sections={sections} /> : activeView === 'categories' ? <CategoryArchive sections={sections} categories={categories} documents={documents} isAdmin={isAdmin} onReload={loadWorkspace} /> : activeView === 'racks' ? <RackManagement sections={sections} /> : activeView === 'logs' ? <ActivityLogs /> : <section className="content-wrap"><div className="welcome-row"><div><p className="eyebrow">{new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</p><h1>{activeView === 'documents' ? 'Dokumen arsip.' : `Selamat datang, ${user.nama?.split(' ')[0]}.`}</h1><p className="subheading">{activeView === 'documents' ? 'Telusuri seluruh arsip yang tersimpan di sistem.' : `Kelola arsip administrasi ${isAdmin ? 'seluruh kelurahan' : activeSection} dengan lebih tertata.`}</p></div><button className="primary-button" onClick={() => setShowUpload(true)}><span>＋</span> Upload dokumen</button></div>{pageError && <div className="alert error">{pageError}<button onClick={loadWorkspace}>Coba lagi</button></div>}{activeView === 'dashboard' && <div className="stat-grid"><StatCard label="Total dokumen" value={stats.total} detail="Seluruh arsip tersimpan" tone="blue" /><StatCard label="Dokumen aktif" value={stats.active} detail="Masih digunakan" tone="green" /><StatCard label="Diarsipkan" value={stats.archived} detail="Riwayat tersimpan" tone="orange" /><StatCard label="Seksi terhubung" value={stats.sections} detail={isAdmin ? 'Dalam sistem' : 'Seksi Anda'} tone="violet" /></div>}
        <div className="workspace-grid"><section className="panel document-panel"><div className="panel-heading"><div><h2>Dokumen terbaru</h2><p>Arsip yang baru ditambahkan ke sistem</p></div><button className="text-button" onClick={() => setActiveView('documents')}>Lihat semua <span>→</span></button></div><div className="toolbar"><label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nomor atau judul dokumen..." /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="aktif">Aktif</option><option value="arsip">Arsip</option><option value="">Semua status</option></select></div>{loading ? <div className="empty-state">Memuat arsip...</div> : filteredDocuments.length === 0 ? <div className="empty-state"><div className="empty-icon">▤</div><strong>Belum ada dokumen</strong><span>Dokumen dari backend akan muncul di sini.</span></div> : <div className="document-list">{filteredDocuments.slice(0, 6).map((document) => <DocumentRow key={document.id} document={document} onClick={() => setSelectedDocument(document)} />)}</div>}</section><aside className="side-column"><section className="panel section-panel"><div className="panel-heading"><div><h2>Seksi</h2><p>Distribusi dokumen</p></div><span className="mini-icon">⌁</span></div>{sections.map((section) => { const count = documents.filter((document) => document.seksi_id === section.id).length; return <div className="section-row" key={section.id}><div className="section-avatar">{section.nama_seksi?.slice(0, 1)}</div><div><strong>{section.nama_seksi}</strong><span>{count} dokumen</span></div><b>{Math.round((count / Math.max(stats.total, 1)) * 100)}%</b></div> })}</section><section className="notice"><span>i</span><div><strong>Ruang arsip tertata</strong><p>Pastikan setiap dokumen memiliki kategori dan nomor yang jelas.</p></div></section></aside></div></section>}</main>
    {selectedDocument && <DocumentModal document={selectedDocument} user={user} onClose={() => setSelectedDocument(null)} onEdit={() => setEditingDocument({ document: selectedDocument, form: { judul: selectedDocument.judul, seksi_id: selectedDocument.seksi_id, kategori_id: selectedDocument.kategori_id, rak_id: selectedDocument.rak_id || '', deskripsi: selectedDocument.deskripsi || '' } })} onArchive={handleArchive} onDownload={handleDownload} />}{editingDocument && <EditDocumentModal value={editingDocument} setValue={setEditingDocument} sections={sections} categories={categories} racks={racks} onClose={() => setEditingDocument(null)} onSubmit={handleEditDocument} />}{showUpload && <UploadModal form={uploadForm} setForm={setUploadForm} sections={sections} categories={categories} racks={racks} user={user} onClose={() => { setShowUpload(false); setLegacyUpload(false) }} onSubmit={handleUpload} loading={uploading} error={uploadError} legacy={legacyUpload} />}{showScanner && <QrScanner onClose={() => setShowScanner(false)} onDetected={handleQrResult} />}</div>
}

function LoginPage({ form, setForm, onSubmit, error, loading }) { return <main className="login-page"><div className="login-visual"><div className="visual-content"><div className="brand login-brand"><div className="brand-mark">AR</div><div><strong>Arsip<span>Kita</span></strong><small>Kelurahan digital</small></div></div><div className="visual-copy"><p className="eyebrow">Pusat administrasi kelurahan</p><h1>Arsip yang rapi,<br /><em>pelayanan berarti.</em></h1><p>Satu ruang kerja untuk menyimpan, menemukan, dan menjaga dokumen kelurahan tetap aman.</p></div><div className="visual-footer">◈ Sistem Pengarsipan Dokumen <span>•</span> v1.0</div></div></div><section className="login-card"><div className="login-form-wrap"><p className="eyebrow">Selamat datang kembali</p><h2>Masuk ke ruang kerja</h2><p className="login-intro">Gunakan akun kantor Anda untuk melanjutkan.</p>{error && <div className="alert error">{error}</div>}<form onSubmit={onSubmit}><label>Username<input required value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="Masukkan username" /></label><label>Password<input required type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Masukkan password" /></label><button className="primary-button login-button" disabled={loading}>{loading ? 'Memeriksa akun...' : 'Masuk ke sistem'} <span>→</span></button></form><p className="login-note">Akses terbatas untuk petugas Kantor Kelurahan.</p></div></section></main> }

function PublicDocumentPage({ token }) { const [document, setDocument] = useState(null); const [error, setError] = useState(''); useEffect(() => { api.get(`/dokumen/public/${token}`).then((response) => setDocument(response.data.data)).catch((requestError) => setError(requestError.response?.data?.message || 'Informasi dokumen tidak ditemukan.')) }, [token]); if (error) return <main className="public-document-page"><section className="public-document-card"><p className="eyebrow">ArsipKita</p><h1>Dokumen tidak ditemukan</h1><p>{error}</p></section></main>; if (!document) return <div className="auth-loading">Memuat informasi dokumen...</div>; return <main className="public-document-page"><section className="public-document-card"><p className="eyebrow">Informasi dokumen</p><h1>{document.judul}</h1><p className="modal-number">{document.nomor_dokumen}</p><div className="detail-grid"><span>Seksi<strong>{document.nama_seksi}</strong></span><span>Kategori<strong>{document.nama_kategori}</strong></span><span>Status<strong>{document.status}</strong></span><span>Tanggal<strong>{formatDate(document.tanggal_dokumen)}</strong></span><span>Lokasi rak<strong>{document.kode_rak ? `${document.kode_rak} · ${document.nama_rak}` : 'Belum ditempatkan'}</strong></span><span>Posisi<strong>{document.lokasi_rak || '-'}</strong></span></div><div className="detail-description"><small>Deskripsi</small><p>{document.deskripsi || 'Tidak ada deskripsi untuk dokumen ini.'}</p></div><p className="public-note">Halaman ini hanya menampilkan metadata. File asli tetap terlindungi di dalam sistem.</p></section></main> }
function StatCard({ label, value, detail, tone }) { return <div className={`stat-card ${tone}`}><div className="stat-top"><span>{label}</span><b>↗</b></div><strong>{value}</strong><small>{detail}</small></div> }
function DocumentRow({ document, onClick }) { return <button className="document-row" onClick={onClick}><div className="file-type">{document.tipe_file?.includes('pdf') ? 'PDF' : 'DOC'}</div><div className="document-info"><strong>{document.judul}</strong><span>{document.nomor_dokumen} · {document.nama_kategori || 'Tanpa kategori'}</span></div><div className="document-date"><span>{formatDate(document.tanggal_dokumen)}</span><small className={document.status}>{document.status}</small></div><span className="row-arrow">→</span></button> }
function DocumentModal({ document, user, onClose, onEdit, onArchive, onDownload }) { const canEdit = user.role === 'admin' || String(user.seksi_id) === String(document.seksi_id); const qrValue = `${window.location.origin}/?public_token=${document.qr_token}`; const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrValue)}`; return <div className="modal-backdrop"><section className="modal document-modal"><button className="modal-close" onClick={onClose}>×</button><p className="eyebrow">Detail dokumen</p><h2>{document.judul}</h2><p className="modal-number">{document.nomor_dokumen}</p><div className="detail-grid"><span>Seksi<strong>{document.nama_seksi}</strong></span><span>Kategori<strong>{document.nama_kategori}</strong></span><span>Rak<strong>{document.kode_rak ? `${document.kode_rak} · ${document.nama_rak}` : 'Belum ditempatkan'}</strong></span><span>Tanggal<strong>{formatDate(document.tanggal_dokumen)}</strong></span><span>Diunggah oleh<strong>{document.nama_uploader}</strong></span></div><div className="detail-description"><small>Deskripsi</small><p>{document.deskripsi || 'Tidak ada deskripsi untuk dokumen ini.'}</p></div><div className="document-qr"><img src={qrImage} alt={`QR ${document.judul}`} /><div><strong>QR informasi dokumen</strong><small>Scan QR ini untuk membuka metadata tanpa login.</small></div></div><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Tutup</button><button className="secondary-button" onClick={() => onDownload(document)}>Unduh file</button>{canEdit && <button className="secondary-button" onClick={onEdit}>Edit metadata</button>}{canEdit && document.status === 'aktif' && <button className="danger-button" onClick={() => onArchive(document.id)}>Arsipkan</button>}</div></section></div> }
function EditDocumentModal({ value, setValue, sections, categories, racks, onClose, onSubmit }) { const sectionId = value.form.seksi_id; const availableCategories = categories.filter((category) => String(category.seksi_id) === String(sectionId)); const availableRacks = racks.filter((rack) => !rack.seksi_id || String(rack.seksi_id) === String(sectionId)); return <div className="modal-backdrop"><section className="modal admin-modal"><button className="modal-close" onClick={onClose}>×</button><p className="eyebrow">Perbarui arsip</p><h2>Edit metadata dokumen</h2><form className="admin-form" onSubmit={onSubmit}><label>Judul dokumen<input required value={value.form.judul} onChange={(event) => setValue({ ...value, form: { ...value.form, judul: event.target.value } })} /></label><div className="form-grid"><label>Seksi<select required value={sectionId} onChange={(event) => setValue({ ...value, form: { ...value.form, seksi_id: event.target.value, kategori_id: '', rak_id: '' } })}>{sections.map((section) => <option key={section.id} value={section.id}>{section.nama_seksi}</option>)}</select></label><label>Kategori<select required value={value.form.kategori_id} onChange={(event) => setValue({ ...value, form: { ...value.form, kategori_id: event.target.value } })}>{availableCategories.map((category) => <option key={category.id} value={category.id}>{category.nama_kategori}</option>)}</select></label><label>Rak<select value={value.form.rak_id} onChange={(event) => setValue({ ...value, form: { ...value.form, rak_id: event.target.value } })}><option value="">Belum ditempatkan</option>{availableRacks.map((rack) => <option key={rack.id} value={rack.id}>{rack.kode_rak} · {rack.nama_rak}</option>)}</select></label></div><label>Deskripsi<textarea rows="4" value={value.form.deskripsi} onChange={(event) => setValue({ ...value, form: { ...value.form, deskripsi: event.target.value } })} /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Batal</button><button className="primary-button">Simpan perubahan</button></div></form></section></div> }
function UploadModal({ form, setForm, sections, categories, racks, user, onClose, onSubmit, loading, error, legacy }) {
  const activeSection = form.seksi_id || user.seksi_id || ''
  const availableCategories = categories.filter((category) => !activeSection || String(category.seksi_id) === String(activeSection))
  const selectedCategory = categories.find((category) => String(category.id) === String(form.kategori_id))
  const handleCategoryChange = (event) => {
    const categoryId = event.target.value
    const category = categories.find((item) => String(item.id) === String(categoryId))
    setForm({ ...form, kategori_id: categoryId, seksi_id: form.seksi_id || (user.role === 'admin' ? category?.seksi_id || '' : form.seksi_id) })
  }

  return <div className="modal-backdrop"><section className="modal upload-modal"><button className="modal-close" onClick={onClose}>×</button><p className="eyebrow">Ruang arsip</p><h2>Upload dokumen baru</h2><p className="modal-intro">Simpan dokumen administrasi dengan metadata yang lengkap.</p>{error && <div className="alert error">{error}</div>}<form onSubmit={onSubmit} className="upload-form"><label className="file-drop"><input required type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={(event) => setForm({ ...form, file: event.target.files[0] })} /><span className="upload-symbol">↑</span><strong>{form.file?.name || 'Pilih file dokumen'}</strong><small>PDF, DOC, XLS, JPG, PNG · Maks. 10 MB</small></label><div className="form-grid"><label>Nomor dokumen<input required value={form.nomor_dokumen} onChange={(event) => setForm({ ...form, nomor_dokumen: event.target.value })} placeholder="Contoh: 045/PEM/2026" /></label><label>Judul dokumen<input required value={form.judul} onChange={(event) => setForm({ ...form, judul: event.target.value })} placeholder="Judul arsip" /></label><label>Seksi<select required disabled={user.role !== 'admin'} value={activeSection} onChange={(event) => setForm({ ...form, seksi_id: event.target.value, kategori_id: '' })}><option value="">Pilih seksi</option>{sections.map((section) => <option key={section.id} value={section.id}>{section.nama_seksi}</option>)}</select></label><label>Kategori<select required value={form.kategori_id} onChange={handleCategoryChange}><option value="">Pilih kategori{!activeSection && categories.length ? ' (pilih seksi otomatis)' : ''}</option>{availableCategories.map((category) => <option key={category.id} value={category.id}>{!activeSection ? `${category.nama_seksi} - ` : ''}{category.nama_kategori}</option>)}</select>{selectedCategory && !form.seksi_id && <small className="field-hint">Seksi otomatis: {selectedCategory.nama_seksi}</small>}</label><label>Rak<select value={form.rak_id} onChange={(event) => setForm({ ...form, rak_id: event.target.value })}><option value="">Belum ditempatkan</option>{racks.filter((rack) => !rack.seksi_id || String(rack.seksi_id) === String(activeSection)).map((rack) => <option key={rack.id} value={rack.id}>{rack.kode_rak} · {rack.nama_rak}</option>)}</select></label>
  </div></form></section></div>
}

function QrScanner({ onClose, onDetected }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState('')
  const [manualValue, setManualValue] = useState('')

  useEffect(() => {
    let timer
    const start = async () => {
      if (!('BarcodeDetector' in window)) {
        setError('Browser ini belum mendukung pemindaian kamera. Gunakan Chrome terbaru atau masukkan tautan QR secara manual.')
        return
      }
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        videoRef.current.srcObject = streamRef.current
        await videoRef.current.play()
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        const scan = async () => {
          if (!videoRef.current) return
          const codes = await detector.detect(videoRef.current)
          if (codes[0]?.rawValue) return onDetected(codes[0].rawValue)
          timer = window.setTimeout(scan, 300)
        }
        scan()
      } catch {
        setError('Kamera tidak dapat dibuka. Izinkan akses kamera lalu coba lagi.')
      }
    }
    start()
    return () => {
      window.clearTimeout(timer)
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [onDetected])

  return <div className="modal-backdrop"><section className="modal scanner-modal"><button className="modal-close" onClick={onClose}>×</button><p className="eyebrow">Pencarian cepat</p><h2>Scan QR dokumen</h2><div className="scanner-frame">{error ? <p>{error}</p> : <video ref={videoRef} muted playsInline />}</div><p className="modal-intro">Arahkan kamera ke QR yang tercetak pada dokumen atau map arsip.</p><label className="scanner-manual">Tautan QR manual<input value={manualValue} onChange={(event) => setManualValue(event.target.value)} placeholder="Tempel tautan QR di sini" /></label><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Tutup pemindai</button><button className="primary-button" disabled={!manualValue.trim()} onClick={() => onDetected(manualValue.trim())}>Buka dokumen</button></div></section></div>
}

export default App
