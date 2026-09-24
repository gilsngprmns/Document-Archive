import { useEffect, useState } from 'react'
import api from './api'
import './DocumentExtras.css'

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
  : '-'

export function RecycleBin({ onBack, onReload }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadTrash = async () => {
    setLoading(true)
    try {
      const response = await api.get('/dokumen/trash')
      setDocuments(response.data.data || [])
      setError('')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Data Tempat Sampah belum dapat dimuat.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTrash() }, [])

  const restore = async (document) => {
    if (!window.confirm(`Pulihkan dokumen ${document.judul}?`)) return
    try {
      await api.put(`/dokumen/${document.id}/restore`)
      await loadTrash()
      await onReload()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Dokumen belum dapat dipulihkan.')
    }
  }

  const removePermanently = async (document) => {
    if (!window.confirm(`Hapus permanen dokumen ${document.judul}? Tindakan ini tidak dapat dibatalkan.`)) return
    try {
      await api.delete(`/dokumen/${document.id}/permanent`)
      await loadTrash()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Dokumen belum dapat dihapus permanen.')
    }
  }

  return <section className="extras-page">
    <button className="back-button extras-back" type="button" onClick={onBack}>← Kembali ke ringkasan</button>
    <div className="extras-heading"><div><p className="eyebrow">Ruang kerja</p><h1>Tempat Sampah</h1><p className="subheading">Pulihkan dokumen atau hapus arsip yang sudah tidak diperlukan.</p></div><span className="archive-total">{documents.length} dokumen</span></div>
    {error && <div className="alert error">{error}<button onClick={loadTrash}>Coba lagi</button></div>}
    <section className="panel extras-table-panel"><div className="extras-table-head"><strong>Dokumen yang dihapus</strong><span>Dokumen masih dapat dipulihkan</span></div>{loading ? <div className="table-message">Memuat Tempat Sampah...</div> : documents.length ? <div className="extras-list">{documents.map((document) => <article className="extras-row" key={document.id}><div className="file-type">{document.tipe_file?.includes('pdf') ? 'PDF' : 'FILE'}</div><div className="extras-info"><strong>{document.judul}</strong><span>{document.nomor_dokumen} · {document.nama_file}</span><small>{document.nama_seksi} · Dihapus {formatDate(document.deleted_at)}</small></div><div className="extras-reason"><span>Alasan</span><strong>{document.deleted_reason || 'Tidak dicantumkan'}</strong></div><div className="extras-actions"><button className="text-button" onClick={() => restore(document)}>Pulihkan</button><button className="danger-button" onClick={() => removePermanently(document)}>Hapus permanen</button></div></article>)}</div> : <div className="empty-state"><div className="empty-icon">▱</div><strong>Tempat Sampah kosong</strong><span>Dokumen yang dihapus akan muncul di sini.</span></div>}</section>
  </section>
}

export function VersionHistory({ document, onClose }) {
  const [versions, setVersions] = useState([])
  const [file, setFile] = useState(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const loadVersions = async () => {
    try {
      const response = await api.get(`/dokumen/${document.id}/versions`)
      setVersions(response.data.data || [])
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Riwayat versi belum dapat dimuat.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadVersions() }, [document.id])

  const uploadVersion = async (event) => {
    event.preventDefault()
    if (!file) return
    setUploading(true)
    setError('')
    const formData = new FormData()
    formData.append('file', file)
    if (note.trim()) formData.append('catatan_perubahan', note.trim())
    try {
      await api.post(`/dokumen/${document.id}/version`, formData)
      setFile(null)
      setNote('')
      event.target.reset()
      await loadVersions()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Versi baru belum dapat diupload.')
    } finally {
      setUploading(false)
    }
  }

  const download = async (version) => {
    const response = await api.get(`/dokumen/${document.id}/versions/${version.id}/download`, { responseType: 'blob' })
    const url = URL.createObjectURL(response.data)
    const link = window.document.createElement('a')
    link.href = url
    link.download = version.nama_file
    link.click()
    URL.revokeObjectURL(url)
  }

  return <div className="modal-backdrop"><section className="modal version-modal"><button className="modal-close" onClick={onClose}>×</button><p className="eyebrow">Riwayat dokumen</p><h2>{document.judul}</h2><p className="modal-number">{document.nomor_dokumen}</p>{error && <div className="alert error">{error}</div>}<form className="version-upload" onSubmit={uploadVersion}><label>Upload versi baru<input required type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={(event) => setFile(event.target.files[0])} /></label><label>Catatan perubahan<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Contoh: Perbaikan data halaman 2" /></label><button className="primary-button" disabled={uploading}>{uploading ? 'Mengupload...' : 'Upload versi'}</button></form><div className="version-list"><strong>Versi tersimpan</strong>{loading ? <div className="table-message">Memuat riwayat...</div> : versions.length ? versions.map((version) => <div className="version-row" key={version.id}><div><strong>Versi {version.version_number}</strong><span>{version.nama_file}</span><small>{version.uploaded_by_name} · {formatDate(version.created_at)}{version.catatan_perubahan ? ` · ${version.catatan_perubahan}` : ''}</small></div><button className="text-button" onClick={() => download(version)}>Download</button></div>) : <p className="notification-empty">Belum ada riwayat versi.</p>}</div></section></div>
}
