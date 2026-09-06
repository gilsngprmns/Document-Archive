import { useMemo, useState } from 'react'
import api from './api'
import './CategoryArchive.css'

const emptyForm = { seksi_id: '', nama_kategori: '', deskripsi: '' }
const formatMonth = (value) => new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(`${value}-01`))

export default function CategoryArchive({ sections, categories, documents, isAdmin, onReload }) {
  const [month, setMonth] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const months = useMemo(() => [...new Set(documents.map((item) => {
    const date = new Date(item.tanggal_dokumen || item.created_at)
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 7)
  }).filter(Boolean))].sort().reverse(), [documents])

  const visibleDocuments = useMemo(() => documents.filter((item) => {
    if (!month) return true
    const date = new Date(item.tanggal_dokumen || item.created_at)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 7) === month
  }), [documents, month])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setShowForm(true) }
  const openEdit = (category) => { setEditing(category); setForm({ seksi_id: category.seksi_id, nama_kategori: category.nama_kategori, deskripsi: category.deskripsi || '' }); setError(''); setShowForm(true) }
  const closeForm = () => { setEditing(null); setForm(emptyForm); setShowForm(false) }
  const submit = async (event) => {
    event.preventDefault()
    try {
      if (editing) await api.put(`/kategori/${editing.id}`, form)
      else await api.post('/kategori', form)
      closeForm(); setError(''); await onReload()
    } catch (requestError) { setError(requestError.response?.data?.message || 'Kategori belum dapat disimpan.') }
  }
  const remove = async (category) => {
    if (!window.confirm(`Hapus kategori ${category.nama_kategori}?`)) return
    try { await api.delete(`/kategori/${category.id}`); await onReload() } catch (requestError) { setError(requestError.response?.data?.message || 'Kategori belum dapat dihapus.') }
  }

  return <div className="admin-page category-archive-page"><div className="admin-heading"><div><p className="eyebrow">Ruang pencarian arsip</p><h1>Kategori dokumen</h1><p className="subheading">Temukan dokumen berdasarkan kategori dan bulan pengarsipan.</p></div>{isAdmin && <button className="primary-button" onClick={openCreate}>＋ Tambah kategori</button>}</div>{error && <div className="alert error">{error}</div>}<section className="archive-filter"><div><strong>Filter periode dokumen</strong><span>{month ? `Menampilkan arsip ${formatMonth(month)}` : 'Menampilkan seluruh periode'}</span></div><select value={month} onChange={(event) => setMonth(event.target.value)}><option value="">Semua bulan</option>{months.map((item) => <option key={item} value={item}>{formatMonth(item)}</option>)}</select></section><section className="category-archive-grid">{categories.map((category) => { const categoryDocuments = visibleDocuments.filter((document) => String(document.kategori_id) === String(category.id)); return <article className="category-archive-card" key={category.id}><div className="category-card-top"><span className="category-icon">◫</span><span className="section-tag">{category.nama_seksi}</span></div><h3>{category.nama_kategori}</h3><p>{category.deskripsi || 'Belum ada deskripsi kategori.'}</p><div className="archive-count">{categoryDocuments.length} dokumen ditemukan</div><div className="category-document-list">{categoryDocuments.length ? categoryDocuments.map((document) => <div className="category-document" key={document.id}><div><strong>{document.judul}</strong><span>{document.nomor_dokumen} · {document.nama_file}</span></div><small>{new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(document.tanggal_dokumen || document.created_at))}</small></div>) : <span className="no-documents">Tidak ada dokumen pada periode ini.</span>}</div>{isAdmin && <div className="category-actions"><button onClick={() => openEdit(category)}>Edit</button><button onClick={() => remove(category)}>Hapus</button></div>}</article>})}</section>{!categories.length && <div className="table-message">Belum ada kategori.</div>}{showForm && <div className="modal-backdrop"><section className="modal admin-modal"><button className="modal-close" onClick={closeForm}>×</button><p className="eyebrow">Klasifikasi arsip</p><h2>{editing ? 'Edit kategori' : 'Tambah kategori'}</h2><form className="admin-form" onSubmit={submit}><label>Seksi<select required value={form.seksi_id} onChange={(event) => setForm({ ...form, seksi_id: event.target.value })}><option value="">Pilih seksi</option>{sections.map((section) => <option key={section.id} value={section.id}>{section.nama_seksi}</option>)}</select></label><label>Nama kategori<input required value={form.nama_kategori} onChange={(event) => setForm({ ...form, nama_kategori: event.target.value })} /></label><label>Deskripsi<textarea rows="3" value={form.deskripsi} onChange={(event) => setForm({ ...form, deskripsi: event.target.value })} /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={closeForm}>Batal</button><button className="primary-button">Simpan kategori</button></div></form></section></div>}</div>
}
