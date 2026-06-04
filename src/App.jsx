import React, { useState, useEffect, useMemo } from 'react';
import { 
  Menu, X, LayoutDashboard, FilePlus, ClipboardList, 
  Trash2, Save, Calculator, AlertCircle, Package, User, 
  Wallet, Users, Pencil, ChevronDown, ChevronUp, Truck
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  deleteDoc, doc, updateDoc
} from 'firebase/firestore';

// --- MASUKKAN KUNCI FIREBASE ANDA DI SINI ---
const firebaseConfig = {
  apiKey: "AIzaSyAlqmn0d3cqgI71bie94cXv6-qUNz-FoaA",
  authDomain: "cvhamsabaidane.firebaseapp.com",
  projectId: "cvhamsabaidane",
  storageBucket: "cvhamsabaidane.firebasestorage.app",
  messagingSenderId: "576722231984",
  appId: "1:576722231984:web:469cd17e78cb459a821175"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- UTILS ---
const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
};
const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(dateString));
};

export default function App() {
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // State untuk form Produksi
  const [editingId, setEditingId] = useState(null);
  const [isNewPekerja, setIsNewPekerja] = useState(false);
  const [isNewMerek, setIsNewMerek] = useState(false);
  const [expandedWorker, setExpandedWorker] = useState(null);

  const initialFormState = {
    tanggal: new Date().toISOString().split('T')[0],
    namaPekerja: '', merekBarang: '',
    barangDisetor: '', hargaPerPcs: '', pembayaran: '', catatan: ''
  };
  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State untuk form Delivery
  const initialDeliveryState = {
    tanggal: new Date().toISOString().split('T')[0],
    merekBarang: '', deliveryBox: '', catatan: ''
  };
  const [deliveryData, setDeliveryData] = useState(initialDeliveryState);
  const [editingDeliveryId, setEditingDeliveryId] = useState(null);
  const [isNewMerekDelivery, setIsNewMerekDelivery] = useState(false);
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);

  // --- LOGIN ANONIM & AMBIL DATA ---
  useEffect(() => {
    signInAnonymously(auth).catch(error => console.error("Auto-login error:", error));
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    const recordsRef = collection(db, 'cv_hamsabaidane_produksi');
    const unsubRecords = onSnapshot(recordsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime() || b.timestamp - a.timestamp);
      setRecords(data);
      setIsLoadingData(false);
    }, (error) => {
      console.error("Error mengambil data:", error);
      setIsLoadingData(false);
    });

    return () => unsubRecords();
  }, [user]);

  // --- DERIVED DATA ---
  const uniqueWorkers = useMemo(() => [...new Set(records.map(r => r.namaPekerja).filter(Boolean))].sort(), [records]);
  const uniqueMerek = useMemo(() => [...new Set(records.map(r => r.merekBarang).filter(Boolean))].sort(), [records]);
  const deliveryRecords = useMemo(() => records.filter(r => r.deliveryBox && r.deliveryBox > 0), [records]);
  const produksiRecords = useMemo(() => records.filter(r => r.barangDisetor && r.barangDisetor > 0), [records]);

  // --- HANDLERS PRODUKSI ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.namaPekerja) return alert("Nama pekerja wajib diisi!");

    setIsSubmitting(true);
    try {
      const payload = {
        tanggal: formData.tanggal, 
        namaPekerja: formData.namaPekerja.trim(),
        merekBarang: formData.merekBarang.trim(),
        barangDisetor: Number(formData.barangDisetor) || 0, 
        hargaPerPcs: Number(formData.hargaPerPcs) || 0,
        pembayaran: Number(formData.pembayaran) || 0, 
        deliveryBox: 0, // Produksi tidak ada box
        catatan: formData.catatan || '',
        timestamp: editingId ? (records.find(r => r.id === editingId)?.timestamp || Date.now()) : Date.now()
      };

      if (editingId) await updateDoc(doc(db, 'cv_hamsabaidane_produksi', editingId), payload);
      else await addDoc(collection(db, 'cv_hamsabaidane_produksi'), payload);
      
      setFormData(initialFormState); setEditingId(null); setIsNewPekerja(false); setIsNewMerek(false);
      setActiveMenu('workers');
    } catch (error) {
      console.error(error); alert("Gagal menyimpan data transaksi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- HANDLERS DELIVERY ---
  const handleDeliveryChange = (e) => {
    const { name, value } = e.target;
    setDeliveryData(prev => ({ ...prev, [name]: value }));
  };

  const handleDeliverySubmit = async (e) => {
    e.preventDefault();
    if (!deliveryData.deliveryBox) return alert("Jumlah Box wajib diisi!");

    setIsSubmittingDelivery(true);
    try {
      const payload = {
        tanggal: deliveryData.tanggal, 
        merekBarang: deliveryData.merekBarang.trim(),
        deliveryBox: Number(deliveryData.deliveryBox) || 0, 
        barangDisetor: 0, // Delivery tidak ada setoran
        hargaPerPcs: 0,
        pembayaran: 0, 
        namaPekerja: '', 
        catatan: deliveryData.catatan || '',
        timestamp: editingDeliveryId ? (records.find(r => r.id === editingDeliveryId)?.timestamp || Date.now()) : Date.now()
      };

      if (editingDeliveryId) await updateDoc(doc(db, 'cv_hamsabaidane_produksi', editingDeliveryId), payload);
      else await addDoc(collection(db, 'cv_hamsabaidane_produksi'), payload);
      
      setDeliveryData(initialDeliveryState); setEditingDeliveryId(null); setIsNewMerekDelivery(false);
    } catch (error) {
      console.error(error); alert("Gagal menyimpan data delivery.");
    } finally {
      setIsSubmittingDelivery(false);
    }
  };

  // --- GENERAL HANDLERS ---
  const handleEdit = (record) => {
    if (record.deliveryBox > 0 && (!record.barangDisetor || record.barangDisetor === 0)) {
      // Edit Data Delivery
      setDeliveryData({
        tanggal: record.tanggal, merekBarang: record.merekBarang || '',
        deliveryBox: record.deliveryBox || '', catatan: record.catatan || ''
      });
      setEditingDeliveryId(record.id); setIsNewMerekDelivery(false);
      setActiveMenu('delivery'); window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Edit Data Produksi
      setFormData({
        tanggal: record.tanggal, namaPekerja: record.namaPekerja,
        merekBarang: record.merekBarang || '', barangDisetor: record.barangDisetor || '', 
        hargaPerPcs: record.hargaPerPcs || '', pembayaran: record.pembayaran || '', 
        catatan: record.catatan || ''
      });
      setEditingId(record.id); setIsNewPekerja(false); setIsNewMerek(false);
      setActiveMenu('input'); window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const cancelEdit = () => {
    setFormData(initialFormState); setEditingId(null);
    setIsNewPekerja(false); setIsNewMerek(false);
  };
  
  const cancelDeliveryEdit = () => {
    setDeliveryData(initialDeliveryState); setEditingDeliveryId(null);
    setIsNewMerekDelivery(false);
  };

  const handleDelete = async (id) => {
    if (confirm("Yakin ingin menghapus data ini?")) {
      await deleteDoc(doc(db, 'cv_hamsabaidane_produksi', id));
    }
  };

  const summary = useMemo(() => {
    let totalDisetor = 0, totalUangProduksi = 0, totalTelahDibayar = 0, totalDeliveryBox = 0;
    records.forEach(r => {
      totalDisetor += r.barangDisetor || 0;
      totalUangProduksi += (r.barangDisetor || 0) * (r.hargaPerPcs || 0);
      totalTelahDibayar += r.pembayaran || 0;
      totalDeliveryBox += r.deliveryBox || 0;
    });
    return { totalDisetor, totalUangProduksi, totalTelahDibayar, sisaHutang: totalUangProduksi - totalTelahDibayar, totalDeliveryBox };
  }, [records]);

  const workerSummary = useMemo(() => {
    const sumData = {};
    produksiRecords.forEach(r => {
      const name = r.namaPekerja;
      if (!name) return;
      if (!sumData[name]) sumData[name] = { namaPekerja: name, totalDisetor: 0, totalHak: 0, totalDibayar: 0, transaksi: [] };
      sumData[name].totalDisetor += r.barangDisetor || 0;
      sumData[name].totalHak += (r.barangDisetor || 0) * (r.hargaPerPcs || 0);
      sumData[name].totalDibayar += r.pembayaran || 0;
      sumData[name].transaksi.push(r);
    });
    return Object.values(sumData).sort((a, b) => a.namaPekerja.localeCompare(b.namaPekerja));
  }, [produksiRecords]);

  // --- VIEWS ---

  const renderSidebar = () => (
    <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col`}>
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center space-x-2 font-bold text-lg tracking-wide text-blue-400">
          <Package className="w-6 h-6 min-w-[24px]" /> <span className="truncate">CV. Hamsabaidane</span>
        </div>
        <button className="md:hidden text-gray-300 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}><X className="w-6 h-6" /></button>
      </div>
      
      <div className="p-4 flex flex-col space-y-2 flex-1 overflow-y-auto">
        <button onClick={() => { setActiveMenu('dashboard'); setIsMobileMenuOpen(false); }} className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${activeMenu === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}><LayoutDashboard className="w-5 h-5" /><span>Dashboard</span></button>
        <button onClick={() => { setActiveMenu('input'); setIsMobileMenuOpen(false); }} className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${activeMenu === 'input' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}><FilePlus className="w-5 h-5" /><span>{editingId ? 'Edit Data Produksi' : 'Input Setoran Produksi'}</span></button>
        <button onClick={() => { setActiveMenu('workers'); setIsMobileMenuOpen(false); }} className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${activeMenu === 'workers' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}><Users className="w-5 h-5" /><span>Rekap Pekerja</span></button>
        <button onClick={() => { setActiveMenu('delivery'); setIsMobileMenuOpen(false); }} className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${activeMenu === 'delivery' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}><Truck className="w-5 h-5" /><span>Data Delivery</span></button>
        <button onClick={() => { setActiveMenu('list'); setIsMobileMenuOpen(false); }} className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${activeMenu === 'list' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}><ClipboardList className="w-5 h-5" /><span>Riwayat Transaksi</span></button>
      </div>
      
      <div className="p-4 border-t border-slate-700 text-center text-xs text-slate-500">
        <p className="font-medium tracking-wide text-slate-400">Made with ❤️ by Ajam</p>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-slate-800">Dashboard CV. Hamsabaidane</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><Package className="w-8 h-8" /></div>
          <div><p className="text-sm text-slate-500 font-medium">Total Setoran Barang</p><h3 className="text-2xl font-bold text-slate-800">{summary.totalDisetor.toLocaleString('id-ID')} <span className="text-sm font-normal text-slate-500">pcs</span></h3></div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 bg-blue-50/30 flex items-center space-x-4">
          <div className="p-3 bg-blue-600 text-white rounded-xl"><Truck className="w-8 h-8" /></div>
          <div><p className="text-sm text-slate-600 font-medium">Total Pengiriman</p><h3 className="text-2xl font-bold text-blue-700">{summary.totalDeliveryBox.toLocaleString('id-ID')} <span className="text-sm font-normal text-slate-500">Box</span></h3></div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl"><Wallet className="w-8 h-8" /></div>
          <div><p className="text-sm text-slate-500 font-medium">Total Nilai Pekerjaan</p><h3 className="text-xl font-bold text-slate-800">{formatRupiah(summary.totalUangProduksi)}</h3></div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-rose-100 text-rose-600 rounded-xl"><AlertCircle className="w-8 h-8" /></div>
          <div><p className="text-sm text-slate-500 font-medium">Total Sisa Hutang Upah</p><h3 className="text-xl font-bold text-rose-600">{formatRupiah(summary.sisaHutang)}</h3></div>
        </div>
      </div>
    </div>
  );

  const renderInput = () => {
    const calculatedTotal = (Number(formData.barangDisetor) || 0) * (Number(formData.hargaPerPcs) || 0);
    const calculatedSisa = calculatedTotal - (Number(formData.pembayaran) || 0);

    return (
      <div className="max-w-4xl mx-auto animate-in fade-in duration-300 pb-10">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className={`${editingId ? 'bg-amber-500' : 'bg-blue-600'} p-6 text-white flex justify-between items-center transition-colors`}>
            <div>
              <h2 className="text-xl font-bold flex items-center">
                {editingId ? <Pencil className="w-6 h-6 mr-2"/> : <FilePlus className="w-6 h-6 mr-2"/>}
                {editingId ? 'Edit Data Produksi' : 'Form Input Setoran Produksi'}
              </h2>
            </div>
            {editingId && <button onClick={cancelEdit} className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition">Batal Edit</button>}
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800 border-b pb-2 flex items-center"><User className="w-4 h-4 mr-2"/> Data Pekerjaan</h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
                  <input type="date" name="tanggal" value={formData.tanggal} onChange={handleInputChange} required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nama Pekerja / Divisi</label>
                  <select value={isNewPekerja ? 'NEW' : (formData.namaPekerja || '')} onChange={(e) => { if(e.target.value==='NEW'){setIsNewPekerja(true); setFormData(p=>({...p, namaPekerja:''}))} else {setIsNewPekerja(false); setFormData(p=>({...p, namaPekerja:e.target.value}))} }} required={!isNewPekerja} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-2">
                    <option value="" disabled>-- Pilih Pekerja --</option>
                    {uniqueWorkers.map(w => <option key={w} value={w}>{w}</option>)}
                    <option value="NEW" className="font-bold text-blue-600 bg-blue-50">+ Tambah Pekerja Baru...</option>
                  </select>
                  {isNewPekerja && <input type="text" name="namaPekerja" value={formData.namaPekerja} onChange={handleInputChange} required placeholder="Ketik nama pekerja baru..." className="w-full p-2.5 bg-white border-2 border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none animate-in slide-in-from-top-2" autoFocus />}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Merek Barang</label>
                  <select value={isNewMerek ? 'NEW' : (formData.merekBarang || '')} onChange={(e) => { if(e.target.value==='NEW'){setIsNewMerek(true); setFormData(p=>({...p, merekBarang:''}))} else {setIsNewMerek(false); setFormData(p=>({...p, merekBarang:e.target.value}))} }} required={!isNewMerek} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-2">
                    <option value="" disabled>-- Pilih Merek --</option>
                    {uniqueMerek.map(m => <option key={m} value={m}>{m}</option>)}
                    <option value="NEW" className="font-bold text-blue-600 bg-blue-50">+ Merek Baru...</option>
                  </select>
                  {isNewMerek && <input type="text" name="merekBarang" value={formData.merekBarang} onChange={handleInputChange} required placeholder="Ketik Merek Barang baru..." className="w-full p-2.5 bg-white border-2 border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none animate-in slide-in-from-top-2" autoFocus />}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah Setoran (Barang Selesai)</label>
                  <input type="number" name="barangDisetor" value={formData.barangDisetor} onChange={handleInputChange} placeholder="0 Pcs" min="0" required className="w-full p-3 bg-emerald-50 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-xl font-bold text-emerald-800"/>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800 border-b pb-2 flex items-center"><Wallet className="w-4 h-4 mr-2"/> Keuangan / Upah Pekerja</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tarif Manual per Pcs (Rp)</label>
                  <input type="number" name="hargaPerPcs" value={formData.hargaPerPcs} onChange={handleInputChange} required placeholder="Ketik nominal tarif..." min="0" className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"/>
                </div>

                <div className="bg-slate-100 p-3 rounded-lg flex flex-col justify-center border border-slate-200">
                  <span className="text-xs text-slate-500 font-medium">Total Nilai Pekerjaan</span>
                  <span className="text-xl font-bold text-slate-800">{formatRupiah(calculatedTotal)}</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Di Bayar Tunai / Kasbon (Rp)</label>
                  <input type="number" name="pembayaran" value={formData.pembayaran} onChange={handleInputChange} placeholder="Misal: 100000" min="0" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
                </div>

                <div className={`p-4 rounded-xl mt-4 flex justify-between items-center ${calculatedSisa > 0 ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'} border`}>
                  <div><p className="text-sm font-medium">Sisa Hutang ke Pekerja</p></div>
                  <div className="text-xl md:text-2xl font-bold">{formatRupiah(calculatedSisa)}</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 mt-2">Catatan Tambahan</label>
                  <textarea name="catatan" value={formData.catatan} onChange={handleInputChange} rows="2" placeholder="Tuliskan keterangan..." className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
                </div>
              </div>

            </div>

            <div className="mt-8 flex justify-end">
              <button type="submit" disabled={isSubmitting} className={`${editingId ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'} text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all flex items-center active:scale-95 disabled:opacity-70 w-full md:w-auto justify-center`}>
                {isSubmitting ? 'Menyimpan...' : <><Save className="w-5 h-5 mr-2" /> {editingId ? 'Update Data Produksi' : 'Simpan Setoran Produksi'}</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderWorkerSummary = () => (
    <div className="space-y-4 animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-slate-800">Rekapitulasi Per Pekerja</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-600 uppercase bg-slate-100 border-b">
              <tr>
                <th className="px-4 py-4 w-8"></th>
                <th className="px-4 py-4">Nama Pekerja</th>
                <th className="px-4 py-4 text-center">Total Setoran</th>
                <th className="px-4 py-4 text-right">Total Upah Hak</th>
                <th className="px-4 py-4 text-right">Telah Dibayar</th>
                <th className="px-4 py-4 text-right bg-rose-50 text-rose-800">Sisa Hutang Upah</th>
              </tr>
            </thead>
            <tbody>
              {workerSummary.map((worker, i) => {
                const sisaHutang = worker.totalHak - worker.totalDibayar;
                const isExpanded = expandedWorker === worker.namaPekerja;
                return (
                  <React.Fragment key={i}>
                    <tr onClick={() => setExpandedWorker(isExpanded ? null : worker.namaPekerja)} className={`border-b transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <td className="px-4 py-3 text-slate-400">{isExpanded ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{worker.namaPekerja}</td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-600 bg-emerald-50/20">{worker.totalDisetor} pcs</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatRupiah(worker.totalHak)}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">{formatRupiah(worker.totalDibayar)}</td>
                      <td className={`px-4 py-3 text-right font-bold bg-rose-50/50 ${sisaHutang > 0 ? 'text-rose-600' : 'text-slate-500'}`}>{formatRupiah(sisaHutang)}</td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50/80 border-b">
                        <td colSpan="6" className="px-8 py-4">
                          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-inner">
                            <table className="w-full text-xs text-left">
                              <thead className="text-slate-500 bg-slate-50 border-b">
                                <tr>
                                  <th className="px-3 py-2">Tgl</th>
                                  <th className="px-3 py-2">Merek</th>
                                  <th className="px-3 py-2 text-center">Setor</th>
                                  <th className="px-3 py-2 text-right">Harga</th>
                                  <th className="px-3 py-2 text-right">Bayar</th>
                                  <th className="px-3 py-2 text-center">Aksi</th>
                                </tr>
                              </thead>
                              <tbody>
                                {worker.transaksi.map(t => (
                                  <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50">
                                    <td className="px-3 py-2">{formatDate(t.tanggal)}</td>
                                    <td className="px-3 py-2">{t.merekBarang}</td>
                                    <td className="px-3 py-2 text-center text-emerald-600 font-bold">{t.barangDisetor}</td>
                                    <td className="px-3 py-2 text-right text-slate-500">{formatRupiah(t.hargaPerPcs)}</td>
                                    <td className="px-3 py-2 text-right text-slate-600">{formatRupiah(t.pembayaran)}</td>
                                    <td className="px-3 py-2 text-center flex justify-center space-x-1">
                                      <button onClick={() => handleEdit(t)} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                                      <button onClick={() => handleDelete(t.id)} className="p-1.5 text-rose-500 hover:bg-rose-100 rounded" title="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {workerSummary.length === 0 && <tr><td colSpan="6" className="text-center py-8 text-slate-400">Belum ada data pekerja.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderDelivery = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Manajemen Pengiriman (Delivery)</h2>
        <div className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow-sm flex items-center space-x-3">
          <Truck className="w-6 h-6 opacity-80" />
          <div>
            <p className="text-xs text-blue-200 font-medium uppercase tracking-wider">Total Terkirim</p>
            <p className="text-2xl font-bold leading-none">{summary.totalDeliveryBox.toLocaleString('id-ID')} Box</p>
          </div>
        </div>
      </div>

      {/* FORM INPUT KHUSUS DELIVERY */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className={`${editingDeliveryId ? 'bg-amber-500' : 'bg-slate-800'} p-4 text-white flex justify-between items-center transition-colors`}>
          <h3 className="font-bold flex items-center">
            {editingDeliveryId ? <Pencil className="w-5 h-5 mr-2"/> : <Truck className="w-5 h-5 mr-2"/>}
            {editingDeliveryId ? 'Edit Data Pengiriman' : 'Input Pengiriman Baru'}
          </h3>
          {editingDeliveryId && <button onClick={cancelDeliveryEdit} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg">Batal Edit</button>}
        </div>
        
        <form onSubmit={handleDeliverySubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Kirim</label>
              <input type="date" name="tanggal" value={deliveryData.tanggal} onChange={handleDeliveryChange} required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Merek Barang</label>
              <select value={isNewMerekDelivery ? 'NEW' : (deliveryData.merekBarang || '')} onChange={(e) => { if(e.target.value==='NEW'){setIsNewMerekDelivery(true); setDeliveryData(p=>({...p, merekBarang:''}))} else {setIsNewMerekDelivery(false); setDeliveryData(p=>({...p, merekBarang:e.target.value}))} }} required={!isNewMerekDelivery} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="" disabled>-- Pilih Merek --</option>
                {uniqueMerek.map(m => <option key={m} value={m}>{m}</option>)}
                <option value="NEW" className="font-bold text-blue-600 bg-blue-50">+ Merek Baru...</option>
              </select>
              {isNewMerekDelivery && <input type="text" name="merekBarang" value={deliveryData.merekBarang} onChange={handleDeliveryChange} required placeholder="Ketik Merek baru..." className="w-full mt-2 p-2.5 bg-white border-2 border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none animate-in slide-in-from-top-2" autoFocus />}
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-700 mb-1">Jumlah Box</label>
              <input type="number" name="deliveryBox" value={deliveryData.deliveryBox} onChange={handleDeliveryChange} placeholder="0 Box" min="1" required className="w-full p-2.5 bg-blue-50 border border-blue-200 text-blue-800 font-bold rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Catatan</label>
              <input type="text" name="catatan" value={deliveryData.catatan} onChange={handleDeliveryChange} placeholder="Resi, Tujuan..." className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button type="submit" disabled={isSubmittingDelivery} className={`${editingDeliveryId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-800 hover:bg-slate-900'} text-white font-medium py-2 px-6 rounded-lg transition-all flex items-center active:scale-95 disabled:opacity-70 w-full md:w-auto justify-center`}>
              {isSubmittingDelivery ? 'Menyimpan...' : <><Save className="w-4 h-4 mr-2" /> {editingDeliveryId ? 'Update Delivery' : 'Simpan Delivery'}</>}
            </button>
          </div>
        </form>
      </div>

      {/* TABEL DELIVERY */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-600 uppercase bg-blue-50 border-b">
              <tr>
                <th className="px-4 py-4">Tgl Kirim</th>
                <th className="px-4 py-4">Merek Barang</th>
                <th className="px-4 py-4">Catatan</th>
                <th className="px-4 py-4 text-center font-bold text-blue-800">Jumlah Box</th>
                <th className="px-4 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {deliveryRecords.map((r) => (
                <tr key={r.id} className="border-b hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{formatDate(r.tanggal)}</td>
                  <td className="px-4 py-3">{r.merekBarang}</td>
                  <td className="px-4 py-3 text-slate-500">{r.catatan || '-'}</td>
                  <td className="px-4 py-3 text-center font-bold text-blue-600 text-lg bg-blue-50/30">{r.deliveryBox}</td>
                  <td className="px-4 py-3 text-center flex justify-center space-x-2">
                    <button onClick={() => handleEdit(r)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(r.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {deliveryRecords.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-slate-400">Belum ada riwayat pengiriman box.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderList = () => (
    <div className="space-y-4 animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Riwayat Semua Transaksi</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-600 uppercase bg-slate-100 border-b">
              <tr>
                <th className="px-4 py-4">Tanggal</th>
                <th className="px-4 py-4">Tipe</th>
                <th className="px-4 py-4">Deskripsi</th>
                <th className="px-4 py-4 text-center">Qty</th>
                <th className="px-4 py-4 text-right">Nilai / Bayar</th>
                <th className="px-4 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const isDelivery = r.deliveryBox > 0 && (!r.barangDisetor || r.barangDisetor === 0);
                return (
                  <tr key={r.id} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(r.tanggal)}</td>
                    <td className="px-4 py-3">
                      {isDelivery ? 
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold flex items-center w-fit"><Truck className="w-3 h-3 mr-1"/> Delivery</span> : 
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold flex items-center w-fit"><Package className="w-3 h-3 mr-1"/> Produksi</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      {isDelivery ? r.merekBarang : <span className="font-semibold">{r.namaPekerja} <br/><span className="text-xs font-normal text-slate-500">{r.merekBarang}</span></span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isDelivery ? 
                        <span className="font-bold text-blue-600">{r.deliveryBox} Box</span> : 
                        <span className="font-bold text-emerald-600">{r.barangDisetor} Pcs</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isDelivery ? '-' : 
                        <span>
                          <span className="text-slate-500 text-xs">Total: {formatRupiah((r.barangDisetor||0) * (r.hargaPerPcs||0))}</span><br/>
                          <span className="font-medium text-slate-800">DP: {formatRupiah(r.pembayaran)}</span>
                        </span>
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleEdit(r)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(r.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                )
              })}
              {records.length === 0 && <tr><td colSpan="6" className="text-center py-8 text-slate-400">Riwayat kosong.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (isLoadingData) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden font-sans text-slate-800">
      {renderSidebar()}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
          <div className="flex items-center space-x-2 font-bold text-lg text-blue-600"><Package className="w-5 h-5" /><span>CV. Hamsabaidane</span></div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-600 p-1"><Menu className="w-6 h-6" /></button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {activeMenu === 'dashboard' && renderDashboard()}
          {activeMenu === 'input' && renderInput()}
          {activeMenu === 'workers' && renderWorkerSummary()}
          {activeMenu === 'delivery' && renderDelivery()}
          {activeMenu === 'list' && renderList()}
        </main>
      </div>
    </div>
  );
}