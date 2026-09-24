import { useEffect, useMemo, useState } from 'react'
import api from './api'
import './DocumentArchive.css'
import './DocumentArchiveRefinement.css'

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
  : '-'

const formatMonth = (value) => new Intl.DateTimeFormat('id-ID', {
  month: 'long',
  year: 'numeric',
}).format(new Date(`${value}-01`))

export default function DocumentArchive({ documents, sections, categories, onBack, onOpen, onLegacyUpload, onScan }) {
  const [query, setQuery] = useState('')
  const [section, setSection] = useState('')
  const [category, setCategory] = useState('')
  const [month, setMonth] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [serverDocuments, setServerDocuments] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const months = [...new Set(documents.map((item) => {
    const date = new Date(item.tanggal_dokumen || item.created_at)
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 7)
  }).filter(Boolean))].sort().reverse()
  useEffect(() => {
    const loadDocuments = async () => {
      setLoading(true)
      try {
        const response = await api.get('/dokumen', { params: { page, limit: 10, search: query || undefined, seksi_id: section || undefined, kategori_id: category || undefined, bulan: month || undefined, status: status || undefined } })
        setServerDocuments(response.data.data || [])
        setPagination(response.data.pagination || { page, pages: 1, total: response.data.data?.length || 0 })
        setError('')
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Daftar dokumen belum dapat dimuat.')
        setServerDocuments([])
      } finally {
        setLoading(false)
      }
    }
    loadDocuments()
  }, [page, query, section, category, month, status])
  const pages = pagination.pages || 1
  const visible = serverDocuments
  const update = (setter) => (event) => { setter(event.target.value); setPage(1) }

  const download = async (item) => {
    const response = await api.get(`/dokumen/${item.id}/download`, { responseType: 'blob' })
    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = item.nama_file || 'dokumen'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <section className="document-archive-page">
    <button className="back-button archive-back-button" type="button" onClick={onBack}>← Kembali ke ringkasan</button>
    <div className="archive-page-heading"><div><p className="eyebrow">Ruang kerja</p><h1>Dokumen arsip</h1><p className="subheading">Cari dan buka seluruh dokumen yang tersimpan di sistem.</p></div><div className="archive-heading-actions"><span className="archive-total">{pagination.total || 0} dokumen</span><button className="secondary-button" onClick={onScan}>▣ Scan QR</button><button className="primary-button" onClick={onLegacyUpload}>＋ Input dokumen lama</button></div></div>
    <div className="document-filters"><label className="search-box"><span>⌕</span><input value={query} onChange={update(setQuery)} placeholder="Cari judul, nomor, atau nama file..." /></label><select value={section} onChange={update(setSection)}><option value="">Semua seksi</option>{sections.map((item) => <option key={item.id} value={item.id}>{item.nama_seksi}</option>)}</select><select value={category} onChange={update(setCategory)}><option value="">Semua kategori</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.nama_kategori}</option>)}</select><select value={month} onChange={update(setMonth)}><option value="">Semua bulan</option>{months.map((item) => <option key={item} value={item}>{formatMonth(item)}</option>)}</select><select value={status} onChange={update(setStatus)}><option value="">Semua status</option><option value="aktif">Aktif</option><option value="arsip">Arsip</option></select></div>
    <section className="panel archive-table-panel"><div className="archive-table-head"><span>Daftar dokumen</span><small>{loading ? 'Memuat dokumen...' : `Menampilkan ${visible.length} dari ${pagination.total || 0} dokumen`}</small></div>{error ? <div className="empty-state"><strong>{error}</strong><button className="text-button" onClick={() => setPage(1)}>Coba lagi</button></div> : visible.length ? <div className="archive-document-list">{visible.map((item) => <article className="archive-document-row" key={item.id}><div className="file-type">{item.tipe_file?.includes('pdf') ? 'PDF' : 'FILE'}</div><div className="archive-document-info"><strong>{item.judul}</strong><span>{item.nomor_dokumen} · {item.nama_file}</span><small>{item.nama_seksi} · {item.nama_kategori}</small></div><div className="archive-document-meta"><span>{formatDate(item.tanggal_dokumen || item.created_at)}</span><small className={item.status}>{item.status}</small></div><button className="text-button" onClick={() => onOpen(item)}>Detail</button><button className="download-button" onClick={() => download(item)} aria-label={`Download ${item.judul}`}>↓</button></article>)}</div> : <div className="empty-state"><div className="empty-icon">▤</div><strong>Dokumen tidak ditemukan</strong><span>Coba ubah filter atau kata pencarian.</span></div>}<div className="pagination"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>← Sebelumnya</button><span>Halaman {page} dari {pages}</span><button disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Berikutnya →</button></div></section>
  </section>
}
