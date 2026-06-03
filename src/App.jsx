import React, { useState, useEffect, useMemo } from 'react';
import { 
  Menu, X, LayoutDashboard, FilePlus, ClipboardList, 
  Trash2, Save, Calculator, AlertCircle, Package, User, 
  Wallet, Users, Pencil, ChevronDown, ChevronUp, Truck, Tag, Settings
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  deleteDoc, doc, updateDoc, setDoc
} from 'firebase/firestore';

// --- INITIALIZATION FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyAlqmn0d3cqgI71bie94cXv6-qUNz-FoaA",
  authDomain: "cvhamsabaidane.firebaseapp.com",
  projectId: "cvhamsabaidane",
  storageBucket: "cvhamsabaidane.firebasestorage.app",
  messagingSenderId: "576722231984",
  appId: "1:576722231984:web:469cd17e78cb459a821175",
  measurementId: "G-BBZMYJ2B8D"
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'rekap-produksi-app';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- UTILS ---
const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date);
};

export default function App() {
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Master Harga Default
  const defaultPrices = {
    '1 Proses': 83,
    '2 Proses': 167,
    '3 Proses': 250,
    '4 Proses': 333,
    '5 Proses': 417
  };
  const [masterPrices, setMasterPrices] = useState(defaultPrices);
  const [isSavingPrices, setIsSavingPrices] = useState(false);
  
  // Fitur Edit & Dropdown Manual Input
  const [editingId, setEditingId] = useState(null);
  const [isNewPekerja, setIsNewPekerja] = useState(false);
  const [isNewMerek, setIsNewMerek] = useState(false);
  const [expandedWorker, setExpandedWorker] = useState(null);

  // Form State
  const initialFormState = {
    tanggal: new Date().toISOString().split('T')[0],
    namaPekerja: '',
    jenisPekerjaan: '',
    merekBarang: '',
    setoranBarang: '',
    hargaPerPcs: '',
    pembayaran: '',
    deliveryBox: '',
    catatan: ''
  };
  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    
    // 1. Fetch Transaksi Produksi
    const recordsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'produksi_v3');
    const unsubscribeDB = onSnapshot(
      recordsRef, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        data.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime() || b.timestamp - a.timestamp);
        setRecords(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    );

    // 2. Fetch Master Harga
    const priceRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'prices');
    const unsubscribePrices = onSnapshot(priceRef, (docSnap) => {
      if (docSnap.exists()) {
        setMasterPrices(docSnap.data());
      }
    });

    return () => {
      unsubscribeDB();
      unsubscribePrices();
    };
  }, [user]);

  const uniqueWorkers = useMemo(() => {
    const names = records.map(r => r.namaPekerja).filter(Boolean);
    return [...new Set(names)].sort();
  }, [records]);

  const uniqueMerek = useMemo(() => {
    const mereks = records.map(r => r.merekBarang).filter(Boolean);
    return [...new Set(mereks)].sort();
  }, [records]);

  const deliveryRecords = useMemo(() => {
    return records.filter(r => r.deliveryBox && r.deliveryBox > 0);
  }, [records]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Auto fill harga saat pilih Jenis Pekerjaan
      if (name === 'jenisPekerjaan' && masterPrices[value]) {
        newData.hargaPerPcs = masterPrices[value];
      }
      
      return newData;
    });
  };

  const handleEdit = (record) => {
    setFormData({
      tanggal: record.tanggal,
      namaPekerja: record.namaPekerja,
      jenisPekerjaan: record.jenisPekerjaan || '',
      merekBarang: record.merekBarang || '',
      setoranBarang: record.setoranBarang || record.barangDisetor || '',
      hargaPerPcs: record.hargaPerPcs || '',
      pembayaran: record.pembayaran || '',
      deliveryBox: record.deliveryBox || '',
      catatan: record.catatan || ''
    });
    setEditingId(record.id);
    setIsNewPekerja(false);
    setIsNewMerek(false);
    setActiveMenu('input');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setFormData(initialFormState);
    setEditingId(null);
    setIsNewPekerja(false);
    setIsNewMerek(false);
  };

  const savePrices = async () => {
    if (!user) return;
    setIsSavingPrices(true);
    try {
      const priceRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'prices');
      await setDoc(priceRef, masterPrices);
      alert("Harga berhasil diupdate!");
    } catch (error) {
      console.error("Gagal simpan harga", error);
      alert("Gagal menyimpan harga.");
    } finally {
      setIsSavingPrices(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    if (!formData.namaPekerja || !formData.jenisPekerjaan) {
      alert("Nama pekerja dan jenis pekerjaan wajib diisi!");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        tanggal: formData.tanggal,
        namaPekerja: formData.namaPekerja.trim(),
        jenisPekerjaan: formData.jenisPekerjaan,
        merekBarang: formData.merekBarang.trim(),
        setoranBarang: Number(formData.setoranBarang) || 0,
        hargaPerPcs: Number(formData.hargaPerPcs) || 0,
        pembayaran: Number(formData.pembayaran) || 0,
        deliveryBox: Number(formData.deliveryBox) || 0,
        catatan: formData.catatan || '',
        timestamp: editingId ? (records.find(r => r.id === editingId)?.timestamp || Date.now()) : Date.now()
      };

      if (editingId) {
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'produksi_v3', editingId);
        await updateDoc(docRef, payload);
      } else {
        const recordsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'produksi_v3');
        await addDoc(recordsRef, payload);
      }
      
      setFormData(initialFormState);
      setEditingId(null);
      setIsNewPekerja(false);
      setIsNewMerek(false);
      
      if (payload.deliveryBox > 0) {
        setActiveMenu('delivery');
      } else {
        setActiveMenu('workers');
      }
      
    } catch (error) {
      console.error("Error saving document: ", error);
      alert("Gagal menyimpan data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!user) return;
    if (confirm("Apakah Anda yakin ingin menghapus data ini?")) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'produksi_v3', id);
        await deleteDoc(docRef);
      } catch (error) {
        console.error("Error deleting document: ", error);
      }
    }
  };

  const summary = useMemo(() => {
    let totalSetoran = 0;
    let totalUangProduksi = 0; 
    let totalTelahDibayar = 0;
    let totalDeliveryBox = 0;

    records.forEach(r => {
      const setoran = r.setoranBarang || r.barangDisetor || 0;
      totalSetoran += setoran;
      totalUangProduksi += setoran * (r.hargaPerPcs || 0);
      totalTelahDibayar += r.pembayaran || 0;
      totalDeliveryBox += r.deliveryBox || 0;
    });

    return { 
      totalSetoran, 
      totalUangProduksi, 
      totalTelahDibayar, 
      sisaHutang: totalUangProduksi - totalTelahDibayar,
      totalDeliveryBox
    };
  }, [records]);

  const workerSummary = useMemo(() => {
    const sumData = {};
    records.forEach(r => {
      const name = r.namaPekerja;
      if (!sumData[name]) {
        sumData[name] = {
          namaPekerja: name,
          totalSetoran: 0,
          totalUangHak: 0,
          totalDibayar: 0,
          transaksi: []
        };
      }
      const setoran = r.setoranBarang || r.barangDisetor || 0;
      sumData[name].totalSetoran += setoran;
      sumData[name].totalUangHak += setoran * (r.hargaPerPcs || 0);
      sumData[name].totalDibayar += r.pembayaran || 0;
      sumData[name].transaksi.push(r);
    });

    return Object.values(sumData).sort((a, b) => a.namaPekerja.localeCompare(b.namaPekerja));
  }, [records]);


  const renderSidebar = () => (
    <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col`}>
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center space-x-2 font-bold text-lg tracking-wide text-blue-400">
          <Package className="w-6 h-6 min-w-[24px]" />
          <span className="truncate">CV. Hamsabaidane</span>
        </div>
        <button className="md:hidden text-gray-300 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="p-4 flex flex-col space-y-2 flex-1">
        <button onClick={() => { setActiveMenu('dashboard'); setIsMobileMenuOpen(false); }} className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${activeMenu === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
          <LayoutDashboard className="w-5 h-5" /><span>Dashboard</span>
        </button>
        <button onClick={() => { setActiveMenu('input'); setIsMobileMenuOpen(false); }} className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${activeMenu === 'input' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
          <FilePlus className="w-5 h-5" /><span>{editingId ? 'Edit Data' : 'Input Data'}</span>
        </button>
        <button onClick={() => { setActiveMenu('workers'); setIsMobileMenuOpen(false); }} className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${activeMenu === 'workers' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
          <Users className="w-5 h-5" /><span>Rekap Pekerja</span>
        </button>
        <button onClick={() => { setActiveMenu('delivery'); setIsMobileMenuOpen(false); }} className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${activeMenu === 'delivery' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
          <Truck className="w-5 h-5" /><span>Data Delivery</span>
        </button>
        <button onClick={() => { setActiveMenu('list'); setIsMobileMenuOpen(false); }} className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${activeMenu === 'list' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
          <ClipboardList className="w-5 h-5" /><span>Semua Transaksi</span>
        </button>
        <button onClick={() => { setActiveMenu('settings'); setIsMobileMenuOpen(false); }} className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${activeMenu === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
          <Settings className="w-5 h-5" /><span>Pengaturan Harga</span>
        </button>
      </div>
      
      {/* Credit Footer */}
      <div className="p-4 border-t border-slate-700 text-center text-xs text-slate-400 mt-auto">
        <p className="font-medium tracking-wide">Made with ❤️ by Ajam</p>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-slate-800">Dashboard CV. Hamsabaidane</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><Calculator className="w-8 h-8" /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Setoran Barang</p>
            <h3 className="text-xl font-bold text-slate-800">{summary.totalSetoran.toLocaleString('id-ID')} <span className="text-sm font-normal text-slate-500">pcs</span></h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 bg-blue-50/30 flex items-center space-x-4">
          <div className="p-3 bg-blue-600 text-white rounded-xl"><Truck className="w-8 h-8" /></div>
          <div>
            <p className="text-sm text-slate-600 font-medium">Total Pengiriman</p>
            <h3 className="text-xl font-bold text-blue-700">{summary.totalDeliveryBox.toLocaleString('id-ID')} <span className="text-sm font-normal text-slate-500">Box</span></h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl"><Wallet className="w-8 h-8" /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Nilai Produksi / Upah</p>
            <h3 className="text-xl font-bold text-slate-800">{formatRupiah(summary.totalUangProduksi)}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-rose-100 text-rose-600 rounded-xl"><AlertCircle className="w-8 h-8" /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Sisa Hutang Upah</p>
            <h3 className="text-xl font-bold text-rose-600">{formatRupiah(summary.sisaHutang)}</h3>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInput = () => {
    const calculatedTotal = (Number(formData.setoranBarang) || 0) * (Number(formData.hargaPerPcs) || 0);
    const calculatedSisa = calculatedTotal - (Number(formData.pembayaran) || 0);

    return (
      <div className="max-w-4xl mx-auto animate-in fade-in duration-300 pb-10">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className={`${editingId ? 'bg-amber-500' : 'bg-blue-600'} p-6 text-white flex justify-between items-center transition-colors`}>
            <div>
              <h2 className="text-xl font-bold flex items-center">
                {editingId ? <Pencil className="w-6 h-6 mr-2"/> : <FilePlus className="w-6 h-6 mr-2"/>}
                {editingId ? 'Edit Data Transaksi' : 'Form Setoran Produksi'}
              </h2>
              <p className="text-white/80 text-sm mt-1">Catat setoran barang dari pekerja dan hitung upah otomatis.</p>
            </div>
            {editingId && (
              <button onClick={cancelEdit} className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition">Batal Edit</button>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800 border-b pb-2 flex items-center"><User className="w-4 h-4 mr-2"/> Informasi Pekerja & Pekerjaan</h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
                  <input type="date" name="tanggal" value={formData.tanggal} onChange={handleInputChange} required className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nama Pekerja</label>
                  <select
                    value={isNewPekerja ? 'NEW' : (formData.namaPekerja || '')}
                    onChange={(e) => {
                      if (e.target.value === 'NEW') {
                        setIsNewPekerja(true);
                        setFormData(prev => ({...prev, namaPekerja: ''}));
                      } else {
                        setIsNewPekerja(false);
                        setFormData(prev => ({...prev, namaPekerja: e.target.value}));
                      }
                    }}
                    required={!isNewPekerja}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-2"
                  >
                    <option value="" disabled>-- Pilih Pekerja --</option>
                    {uniqueWorkers.map(w => <option key={w} value={w}>{w}</option>)}
                    <option value="NEW" className="font-bold text-blue-600 bg-blue-50">+ Tambah Pekerja Baru...</option>
                  </select>
                  
                  {isNewPekerja && (
                    <input type="text" name="namaPekerja" value={formData.namaPekerja} onChange={handleInputChange} required placeholder="Ketik nama pekerja baru..." className="w-full p-2.5 bg-white border-2 border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none animate-in slide-in-from-top-2" autoFocus />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Pekerjaan</label>
                  <select
                    name="jenisPekerjaan"
                    value={formData.jenisPekerjaan}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="" disabled>-- Pilih Jenis Pekerjaan --</option>
                    {Object.keys(masterPrices).map(jenis => (
                      <option key={jenis} value={jenis}>{jenis}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Merek Barang</label>
                  <select
                    value={isNewMerek ? 'NEW' : (formData.merekBarang || '')}
                    onChange={(e) => {
                      if (e.target.value === 'NEW') {
                        setIsNewMerek(true);
                        setFormData(prev => ({...prev, merekBarang: ''}));
                      } else {
                        setIsNewMerek(false);
                        setFormData(prev => ({...prev, merekBarang: e.target.value}));
                      }
                    }}
                    required={!isNewMerek}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-2"
                  >
                    <option value="" disabled>-- Pilih Merek Barang --</option>
                    {uniqueMerek.map(merek => <option key={merek} value={merek}>{merek}</option>)}
                    <option value="NEW" className="font-bold text-blue-600 bg-blue-50">+ Tambah Merek Baru...</option>
                  </select>

                  {isNewMerek && (
                    <input type="text" name="merekBarang" value={formData.merekBarang} onChange={handleInputChange} required placeholder="Ketik merek barang baru..." className="w-full p-2.5 bg-white border-2 border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none animate-in slide-in-from-top-2" autoFocus />
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800 border-b pb-2 flex items-center"><Package className="w-4 h-4 mr-2"/> Alur & Pengiriman Barang</h3>
                
                <div>
                  <label className="block text-sm font-medium text-emerald-700 mb-1">Setoran Barang (Pcs)</label>
                  <input type="number" name="setoranBarang" value={formData.setoranBarang} onChange={handleInputChange} required placeholder="0 Pcs" min="0" className="w-full p-2.5 bg-emerald-50/50 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-lg font-bold text-emerald-800"/>
                </div>

                <div className="pt-4">
                  <label className="block text-sm font-medium text-blue-700 mb-1">Data Delivery (Jumlah Box)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Truck className="h-5 w-5 text-blue-400" />
                    </div>
                    <input type="number" name="deliveryBox" value={formData.deliveryBox} onChange={handleInputChange} placeholder="Jumlah box (Opsional)" min="0" className="w-full pl-10 p-2.5 bg-blue-50/50 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
                  </div>
                </div>
              </div>

              <div className="space-y-4 md:col-span-2 mt-4">
                <h3 className="font-semibold text-slate-800 border-b pb-2 flex items-center"><Wallet className="w-4 h-4 mr-2"/> Keuangan / Upah</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Harga per Pcs (Rp)</label>
                    <input type="number" name="hargaPerPcs" value={formData.hargaPerPcs} onChange={handleInputChange} placeholder="Pilih Jenis Pekerjaan" min="0" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
                  </div>
                  <div className="bg-slate-100 p-3 rounded-lg flex flex-col justify-center border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Nilai Upah (Setoran x Harga)</span>
                    <span className="text-lg font-bold text-slate-800">{formatRupiah(calculatedTotal)}</span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Di Bayar Tunai / DP (Rp)</label>
                    <input type="number" name="pembayaran" value={formData.pembayaran} onChange={handleInputChange} placeholder="Misal: 100000" min="0" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
                  </div>
                </div>
                <div className={`p-4 rounded-xl mt-4 flex justify-between items-center ${calculatedSisa > 0 ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'} border`}>
                  <div><p className="text-sm font-medium">Sisa Hutang ke Pekerja</p></div>
                  <div className="text-xl md:text-2xl font-bold">{formatRupiah(calculatedSisa)}</div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Catatan Tambahan</label>
                <textarea name="catatan" value={formData.catatan} onChange={handleInputChange} rows="2" placeholder="Tuliskan keterangan cacat, lembur, kasbon dll." className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
              </div>

            </div>

            <div className="mt-8 flex justify-end">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className={`${editingId ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'} text-white font-medium py-3 px-8 rounded-xl shadow-lg transition-all flex items-center active:scale-95 disabled:opacity-70`}
              >
                {isSubmitting ? (
                  <span className="animate-pulse">Menyimpan...</span>
                ) : (
                  <><Save className="w-5 h-5 mr-2" /> {editingId ? 'Update Data' : 'Simpan Data Setoran'}</>
                )}
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
      <p className="text-slate-500 text-sm mb-4">Klik baris untuk melihat detail setoran.</p>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-600 uppercase bg-slate-100 border-b">
              <tr>
                <th className="px-4 py-4 w-8"></th>
                <th className="px-4 py-4">Nama Pekerja</th>
                <th className="px-4 py-4 text-center">Total Setoran</th>
                <th className="px-4 py-4 text-right">Total Hak Upah</th>
                <th className="px-4 py-4 text-right">Telah Dibayar</th>
                <th className="px-4 py-4 text-right bg-rose-50 text-rose-800">Sisa Hutang</th>
              </tr>
            </thead>
            <tbody>
              {workerSummary.map((worker, i) => {
                const sisaHutang = worker.totalUangHak - worker.totalDibayar;
                const isExpanded = expandedWorker === worker.namaPekerja;
                
                return (
                  <React.Fragment key={i}>
                    <tr onClick={() => setExpandedWorker(isExpanded ? null : worker.namaPekerja)} className={`border-b transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <td className="px-4 py-3 text-slate-400">{isExpanded ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{worker.namaPekerja}</td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-600 bg-emerald-50/20">{worker.totalSetoran} pcs</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatRupiah(worker.totalUangHak)}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">{formatRupiah(worker.totalDibayar)}</td>
                      <td className={`px-4 py-3 text-right font-bold bg-rose-50/50 ${sisaHutang > 0 ? 'text-rose-600' : 'text-slate-500'}`}>{formatRupiah(sisaHutang)}</td>
                    </tr>
                    
                    {isExpanded && (
                      <tr className="bg-slate-50/80 border-b">
                        <td colSpan="6" className="px-8 py-4">
                          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-inner">
                            <div className="bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600">Detail Setoran: {worker.namaPekerja}</div>
                            <table className="w-full text-xs text-left">
                              <thead className="text-slate-500 bg-slate-50 border-b">
                                <tr>
                                  <th className="px-3 py-2">Tanggal</th>
                                  <th className="px-3 py-2">Pekerjaan</th>
                                  <th className="px-3 py-2">Merek</th>
                                  <th className="px-3 py-2 text-center">Setoran</th>
                                  <th className="px-3 py-2 text-right">Harga</th>
                                  <th className="px-3 py-2 text-right">Bayar</th>
                                  <th className="px-3 py-2 text-center">Aksi</th>
                                </tr>
                              </thead>
                              <tbody>
                                {worker.transaksi.map(t => (
                                  <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50">
                                    <td className="px-3 py-2">{formatDate(t.tanggal)}</td>
                                    <td className="px-3 py-2 font-medium">{t.jenisPekerjaan || t.jenisBarang}</td>
                                    <td className="px-3 py-2">{t.merekBarang || '-'}</td>
                                    <td className="px-3 py-2 text-center text-emerald-600 font-bold">{t.setoranBarang || t.barangDisetor || '-'}</td>
                                    <td className="px-3 py-2 text-right text-slate-500">{formatRupiah(t.hargaPerPcs)}</td>
                                    <td className="px-3 py-2 text-right text-slate-600">{formatRupiah(t.pembayaran)}</td>
                                    <td className="px-3 py-2 text-center flex justify-center space-x-1">
                                      <button onClick={() => handleEdit(t)} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded transition"><Pencil className="w-3.5 h-3.5" /></button>
                                      <button onClick={() => handleDelete(t.id)} className="p-1.5 text-rose-500 hover:bg-rose-100 rounded transition"><Trash2 className="w-3.5 h-3.5" /></button>
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
              
              {workerSummary.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" /> Belum ada data rekap.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderDelivery = () => (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Data Pengiriman (Delivery)</h2>
          <p className="text-slate-500 text-sm">Riwayat box terkirim.</p>
        </div>
        <div className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow-sm flex items-center space-x-3">
          <Truck className="w-6 h-6 opacity-80" />
          <div>
            <p className="text-xs text-blue-200 font-medium uppercase tracking-wider">Total Terkirim</p>
            <p className="text-2xl font-bold leading-none">{summary.totalDeliveryBox.toLocaleString('id-ID')} Box</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-600 uppercase bg-blue-50 border-b border-blue-100">
              <tr>
                <th className="px-4 py-4">Tanggal Kirim</th>
                <th className="px-4 py-4">Pekerjaan / Merek</th>
                <th className="px-4 py-4">Pekerja</th>
                <th className="px-4 py-4 text-center font-bold text-blue-800">Jumlah Box</th>
                <th className="px-4 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {deliveryRecords.map((r) => (
                <tr key={r.id} className="border-b hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{formatDate(r.tanggal)}</td>
                  <td className="px-4 py-3">{r.jenisPekerjaan || r.jenisBarang} <br/><span className="text-xs text-slate-500">{r.merekBarang}</span></td>
                  <td className="px-4 py-3 text-slate-600">{r.namaPekerja}</td>
                  <td className="px-4 py-3 text-center font-bold text-blue-600 text-lg bg-blue-50/30">{r.deliveryBox}</td>
                  <td className="px-4 py-3 text-center flex justify-center space-x-2">
                    <button onClick={() => handleEdit(r)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(r.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderList = () => (
    <div className="space-y-4 animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Semua Transaksi</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-600 uppercase bg-slate-100 border-b">
              <tr>
                <th className="px-4 py-4">Tanggal</th>
                <th className="px-4 py-4">Pekerja</th>
                <th className="px-4 py-4">Pekerjaan & Merek</th>
                <th className="px-4 py-4 text-center text-emerald-700">Setoran</th>
                <th className="px-4 py-4 text-right">Harga/Pcs</th>
                <th className="px-4 py-4 text-right text-rose-700">Bayar/DP</th>
                <th className="px-4 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-b hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(r.tanggal)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{r.namaPekerja}</td>
                  <td className="px-4 py-3 text-slate-700">{r.jenisPekerjaan || r.jenisBarang} <br/><span className="text-xs font-normal text-slate-500">{r.merekBarang}</span></td>
                  <td className="px-4 py-3 text-center font-bold text-emerald-600 bg-emerald-50/20">{r.setoranBarang || r.barangDisetor || '-'}</td>
                  <td className="px-4 py-3 text-right">{formatRupiah(r.hargaPerPcs)}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">{formatRupiah(r.pembayaran)}</td>
                  <td className="px-4 py-3 text-center flex justify-center space-x-2 mt-2">
                    <button onClick={() => handleEdit(r)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(r.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden pb-6">
        <div className="bg-slate-800 p-6 text-white">
          <h2 className="text-xl font-bold flex items-center"><Settings className="w-6 h-6 mr-2"/> Pengaturan Tarif per Proses</h2>
          <p className="text-slate-300 text-sm mt-1">Ubah harga default untuk otomatisasi pengisian form.</p>
        </div>
        
        <div className="p-6 space-y-4">
          {Object.entries(masterPrices).map(([proses, harga]) => (
            <div key={proses} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4">
              <div className="font-semibold text-slate-700 mb-2 sm:mb-0 flex items-center">
                <Tag className="w-4 h-4 mr-2 text-blue-500" /> {proses}
              </div>
              <div className="relative w-full sm:w-1/2">
                <span className="absolute left-3 top-2.5 text-slate-500 font-medium">Rp</span>
                <input 
                  type="number" 
                  value={harga}
                  onChange={(e) => setMasterPrices({...masterPrices, [proses]: Number(e.target.value)})}
                  className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                />
              </div>
            </div>
          ))}
          
          <button 
            onClick={savePrices}
            disabled={isSavingPrices}
            className="w-full sm:w-auto mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all flex items-center justify-center float-right"
          >
            {isSavingPrices ? 'Menyimpan...' : <><Save className="w-5 h-5 mr-2" /> Simpan Perubahan Tarif</>}
          </button>
        </div>
      </div>
    </div>
  );


  // --- MAIN RENDER ---
  if (!user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Memuat Sistem...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden font-sans text-slate-800">
      {renderSidebar()}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
          <div className="flex items-center space-x-2 font-bold text-lg text-blue-600">
            <Package className="w-5 h-5" /><span>CV. Hamsabaidane</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-600 p-1">
            <Menu className="w-6 h-6" />
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {activeMenu === 'dashboard' && renderDashboard()}
          {activeMenu === 'input' && renderInput()}
          {activeMenu === 'workers' && renderWorkerSummary()}
          {activeMenu === 'delivery' && renderDelivery()}
          {activeMenu === 'list' && renderList()}
          {activeMenu === 'settings' && renderSettings()}
        </main>
      </div>
    </div>
  );
}