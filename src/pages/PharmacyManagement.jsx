import { motion } from 'framer-motion';
import { Package, Plus, Minus, Search, ShoppingCart, TrendingUp, AlertTriangle, Calendar, RefreshCw, X, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:8000';

const PharmacyManagement = () => {
  const [medicines, setMedicines] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [analytics, setAnalytics] = useState({
    mostDemanded: null,
    lowestStock: null,
    nearestExpiry: null
  });

  // Form states
  const [addSerialForm, setAddSerialForm] = useState({
    name: '',
    serial: '',
    expiry: '',
    price: ''
  });
  const [removeSerialForm, setRemoveSerialForm] = useState({
    name: '',
    serial: ''
  });
  const [searchName, setSearchName] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [billingForm, setBillingForm] = useState({
    patient_name: '',
    medicine_name: ''
  });

  // Fetch all medicines from backend
  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/pharmacy/medicines`);
      const data = await response.json();
      if (response.ok) {
        // Backend returns array directly, not wrapped in object
        // Filter out any null/undefined values and ensure valid structure
        const validMedicines = Array.isArray(data) 
          ? data.filter(med => med && med.name && typeof med.stock === 'number')
          : [];
        setMedicines(validMedicines);
      } else {
        toast.error(data.detail || 'Failed to fetch medicines');
        setMedicines([]); // Set empty array on error
      }
    } catch (error) {
      toast.error('Error connecting to server');
      console.error('Error fetching medicines:', error);
      setMedicines([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Fetch all patients billing history
  const fetchPatients = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/pharmacy/patients`);
      const data = await response.json();
      if (response.ok) {
        setPatients(data.patients || []);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      // Most demanded (max heap)
      const demandedRes = await fetch(`${API_BASE_URL}/api/pharmacy/analytics/most-demanded`);
      const demandedData = await demandedRes.json();
      
      // Lowest stock (min heap)
      const stockRes = await fetch(`${API_BASE_URL}/api/pharmacy/analytics/lowest-stock`);
      const stockData = await stockRes.json();
      
      // Nearest expiry (min heap)
      const expiryRes = await fetch(`${API_BASE_URL}/api/pharmacy/analytics/nearest-expiry`);
      const expiryData = await expiryRes.json();
      
      setAnalytics({
        mostDemanded: demandedData.medicine || null,
        lowestStock: stockData.medicine || null,
        nearestExpiry: expiryData.medicine || null
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Set null values on error to prevent crashes
      setAnalytics({
        mostDemanded: null,
        lowestStock: null,
        nearestExpiry: null
      });
    }
  };

  // Add medicine serial
  const handleAddSerial = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/pharmacy/medicines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addSerialForm.name,
          serial: addSerialForm.serial,
          expiry: addSerialForm.expiry,
          price: parseFloat(addSerialForm.price)
        })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || 'Medicine serial added successfully!');
        setAddSerialForm({ name: '', serial: '', expiry: '', price: '' });
        setActiveModal(null);
        fetchMedicines();
        fetchAnalytics();
      } else {
        toast.error(data.detail || 'Failed to add medicine serial');
      }
    } catch (error) {
      toast.error('Error connecting to server');
      console.error('Error adding serial:', error);
    } finally {
      setLoading(false);
    }
  };

  // Remove medicine serial
  const handleRemoveSerial = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/pharmacy/medicines/${removeSerialForm.name}/${removeSerialForm.serial}`,
        { method: 'DELETE' }
      );
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || 'Medicine serial removed successfully!');
        setRemoveSerialForm({ name: '', serial: '' });
        setActiveModal(null);
        fetchMedicines();
        fetchAnalytics();
      } else {
        toast.error(data.detail || 'Failed to remove medicine serial');
      }
    } catch (error) {
      toast.error('Error connecting to server');
      console.error('Error removing serial:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search medicine
  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/pharmacy/medicines/${searchName}`);
      const data = await response.json();
      if (response.ok) {
        setSearchResult(data.medicine);
        setActiveModal(null); // Close the modal
        toast.success(`Found medicine: ${searchName}`);
      } else {
        toast.error(data.detail || 'Medicine not found');
        setSearchResult(null);
      }
    } catch (error) {
      toast.error('Error connecting to server');
      console.error('Error searching medicine:', error);
      setSearchResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Bill patient (FIFO - earliest expiry first)
  const handleBilling = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/pharmacy/billing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: billingForm.patient_name,
          medicine_name: billingForm.medicine_name
        })
      });
      const data = await response.json();
      if (response.ok) {
        let successMsg = `✅ Billing successful! Serial: ${data.serial_sold}, Price: ₹${data.price_paid}`;
        if (data.expired_removed > 0) {
          successMsg += `\n⚠️ ${data.expired_removed} expired serial(s) removed`;
        }
        toast.success(successMsg, { duration: 4000 });
        setBillingForm({ patient_name: '', medicine_name: '' });
        setActiveModal(null);
        fetchMedicines();
        fetchPatients();
        fetchAnalytics();
      } else {
        toast.error(data.detail || 'Billing failed');
      }
    } catch (error) {
      toast.error('Error connecting to server');
      console.error('Error billing:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
    fetchPatients();
    fetchAnalytics();
  }, []);

  const getStockBadge = (stock) => {
    if (stock === 0) return { color: 'bg-gray-500 text-white', label: 'Out of Stock' };
    if (stock < 5) return { color: 'bg-error text-white', label: 'Critical' };
    if (stock < 20) return { color: 'bg-alert text-white', label: 'Low Stock' };
    return { color: 'bg-success text-white', label: 'In Stock' };
  };

  const getExpiryStatus = (expiry) => {
    const expiryDate = new Date(expiry);
    const today = new Date();
    const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { color: 'text-gray-500', label: 'Expired' };
    if (diffDays < 30) return { color: 'text-error', label: 'Expiring Soon' };
    if (diffDays < 90) return { color: 'text-alert', label: 'Check Date' };
    return { color: 'text-success', label: 'Valid' };
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-textPrimary mb-2">💊 Pharmacy Management</h1>
              <p className="text-textSecondary">Inventory Management with FIFO Billing & Heap Analytics</p>
            </div>
            <button
              onClick={() => { fetchMedicines(); fetchPatients(); fetchAnalytics(); }}
              className="bg-highlight text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-opacity-90 transition"
              disabled={loading}
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Refresh All
            </button>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8"
        >
          <button
            onClick={() => setActiveModal('addSerial')}
            className="bg-white p-4 rounded-lg shadow-lg hover:shadow-xl transition border-l-4 border-success flex flex-col items-center gap-2"
          >
            <Plus className="w-6 h-6 text-success" />
            <span className="font-semibold text-textPrimary text-sm">Add Serial</span>
          </button>
          
          <button
            onClick={() => setActiveModal('removeSerial')}
            className="bg-white p-4 rounded-lg shadow-lg hover:shadow-xl transition border-l-4 border-error flex flex-col items-center gap-2"
          >
            <Minus className="w-6 h-6 text-error" />
            <span className="font-semibold text-textPrimary text-sm">Remove Serial</span>
          </button>
          
          {/* <button
            onClick={() => setActiveModal('search')}
            className="bg-white p-4 rounded-lg shadow-lg hover:shadow-xl transition border-l-4 border-blue-500 flex flex-col items-center gap-2"
          >
            <Search className="w-6 h-6 text-blue-500" />
            <span className="font-semibold text-textPrimary text-sm">Search Medicine</span>
          </button> */}
          
          <button
            onClick={fetchMedicines}
            className="bg-white p-4 rounded-lg shadow-lg hover:shadow-xl transition border-l-4 border-purple-500 flex flex-col items-center gap-2"
          >
            <Package className="w-6 h-6 text-purple-500" />
            <span className="font-semibold text-textPrimary text-sm">Display All</span>
          </button>
          
          <button
            onClick={() => setActiveModal('billing')}
            className="bg-white p-4 rounded-lg shadow-lg hover:shadow-xl transition border-l-4 border-highlight flex flex-col items-center gap-2"
          >
            <ShoppingCart className="w-6 h-6 text-highlight" />
            <span className="font-semibold text-textPrimary text-sm">Bill Patient</span>
          </button>
          
          <button
            onClick={() => setActiveModal('patients')}
            className="bg-white p-4 rounded-lg shadow-lg hover:shadow-xl transition border-l-4 border-orange-500 flex flex-col items-center gap-2"
          >
            <Users className="w-6 h-6 text-orange-500" />
            <span className="font-semibold text-textPrimary text-sm">Patient History</span>
          </button>
        </motion.div>

        {/* Analytics Cards (Heap Algorithms) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          {/* Most Demanded (Max Heap) */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-success">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-success" />
                <h3 className="text-lg font-bold text-textPrimary">Most Demanded</h3>
              </div>
              <span className="text-xs bg-success text-white px-2 py-1 rounded">Max Heap</span>
            </div>
            {analytics.mostDemanded ? (
              <div>
                <p className="text-2xl font-bold text-textPrimary">{analytics.mostDemanded.name}</p>
                <p className="text-textSecondary text-sm">Frequency: {analytics.mostDemanded.frequency} purchases</p>
              </div>
            ) : (
              <p className="text-textSecondary">No data available</p>
            )}
          </div>

          {/* Lowest Stock (Min Heap) */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-error">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-error" />
                <h3 className="text-lg font-bold text-textPrimary">Lowest Stock</h3>
              </div>
              <span className="text-xs bg-error text-white px-2 py-1 rounded">Min Heap</span>
            </div>
            {analytics.lowestStock ? (
              <div>
                <p className="text-2xl font-bold text-textPrimary">{analytics.lowestStock.name}</p>
                <p className="text-textSecondary text-sm">Stock: {analytics.lowestStock.stock} units</p>
              </div>
            ) : (
              <p className="text-textSecondary">No data available</p>
            )}
          </div>

          {/* Nearest Expiry (Min Heap) */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-alert">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-6 h-6 text-alert" />
                <h3 className="text-lg font-bold text-textPrimary">Nearest Expiry</h3>
              </div>
              <span className="text-xs bg-alert text-white px-2 py-1 rounded">Min Heap</span>
            </div>
            {analytics.nearestExpiry ? (
              <div>
                <p className="text-2xl font-bold text-textPrimary">{analytics.nearestExpiry.name}</p>
                <p className="text-textSecondary text-sm">Serial: {analytics.nearestExpiry.serial}</p>
                <p className="text-error text-sm font-semibold">Expires: {analytics.nearestExpiry.expiry}</p>
              </div>
            ) : (
              <p className="text-textSecondary">No data available</p>
            )}
          </div>
        </motion.div>

        {/* Search Result Display */}
        {searchResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl shadow-xl p-6 mb-8 border-2 border-blue-300"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-textPrimary flex items-center gap-2">
                🔍 Search Results
              </h2>
              <button
                onClick={() => {
                  setSearchResult(null);
                  setSearchName('');
                  fetchMedicines();
                }}
                className="text-textSecondary hover:text-textPrimary flex items-center gap-1 bg-white px-3 py-1 rounded-lg shadow"
              >
                <X className="w-4 h-4" />
                <span className="text-sm">Clear & Show All</span>
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              {/* Medicine Header */}
              <div className="border-b pb-4 mb-4">
                <h3 className="text-3xl font-bold text-textPrimary mb-2">{searchResult.name}</h3>
                <div className="flex gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-500" />
                    <span className="text-textSecondary">Stock:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStockBadge(searchResult.stock).color}`}>
                      {searchResult.stock} units
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <span className="text-textSecondary">Total Sold:</span>
                    <span className="text-textPrimary font-bold">{searchResult.sold} units</span>
                  </div>
                </div>
              </div>

              {/* Serials Section */}
              {searchResult.serials && searchResult.serials.length > 0 ? (
                <div>
                  <h4 className="text-xl font-bold text-textPrimary mb-4 flex items-center gap-2">
                    📦 Available Serials ({searchResult.serials.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResult.serials.map((serial, idx) => {
                      const expiryStatus = getExpiryStatus(serial.expiry);
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-4 shadow-md border-2 border-gray-200 hover:border-blue-300 transition-all"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="text-xs text-textSecondary mb-1">Serial Number</p>
                              <p className="font-bold text-lg text-textPrimary">{serial.serial}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${expiryStatus.color}`}>
                              {expiryStatus.label}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-textSecondary">Price:</span>
                              <span className="text-lg font-bold text-success">₹{serial.price}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-textSecondary">Expiry:</span>
                              <span className="text-sm font-semibold text-textPrimary">{serial.expiry}</span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <p className="text-yellow-700 font-semibold">No serials available for this medicine</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Medicine Inventory Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-lg p-6 mb-8"
        >
          <h2 className="text-2xl font-bold text-textPrimary mb-4">📦 Medicine Inventory</h2>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-highlight" />
              <p className="text-textSecondary mt-2">Loading...</p>
            </div>
          ) : medicines.length === 0 ? (
            <p className="text-textSecondary text-center py-8">No medicines in inventory</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-textPrimary font-semibold">Medicine Name</th>
                    <th className="px-4 py-3 text-left text-textPrimary font-semibold">Stock</th>
                    <th className="px-4 py-3 text-left text-textPrimary font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-textPrimary font-semibold">Serials</th>
                  </tr>
                </thead>
                <tbody>
                  {medicines.filter(medicine => medicine && medicine.name).map((medicine, index) => {
                    const stockBadge = getStockBadge(medicine.stock || 0);
                    return (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-textPrimary">{medicine.name}</td>
                        <td className="px-4 py-3 text-textPrimary">{medicine.stock || 0} units</td>
                        <td className="px-4 py-3">
                          <span className={`${stockBadge.color} px-3 py-1 rounded-full text-xs font-semibold`}>
                            {stockBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setActiveModal({ type: 'serials', medicine })}
                            className="text-highlight hover:underline text-sm"
                          >
                            View {Object.keys(medicine.serials || {}).length} serials
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Modals */}
        {activeModal === 'addSerial' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-textPrimary">Add Medicine Serial</h3>
                <button onClick={() => setActiveModal(null)} className="text-textSecondary hover:text-textPrimary">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAddSerial} className="space-y-4">
                <div>
                  <label className="block text-textPrimary font-semibold mb-2">Medicine Name</label>
                  <input
                    type="text"
                    value={addSerialForm.name}
                    onChange={(e) => setAddSerialForm({ ...addSerialForm, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-highlight"
                    required
                  />
                </div>
                <div>
                  <label className="block text-textPrimary font-semibold mb-2">Serial Number</label>
                  <input
                    type="text"
                    value={addSerialForm.serial}
                    onChange={(e) => setAddSerialForm({ ...addSerialForm, serial: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-highlight"
                    required
                  />
                </div>
                <div>
                  <label className="block text-textPrimary font-semibold mb-2">Expiry Date</label>
                  <input
                    type="date"
                    value={addSerialForm.expiry}
                    onChange={(e) => setAddSerialForm({ ...addSerialForm, expiry: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-highlight"
                    required
                  />
                </div>
                <div>
                  <label className="block text-textPrimary font-semibold mb-2">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={addSerialForm.price}
                    onChange={(e) => setAddSerialForm({ ...addSerialForm, price: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-highlight"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-success text-white py-2 rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Serial'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {activeModal === 'removeSerial' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-textPrimary">Remove Medicine Serial</h3>
                <button onClick={() => setActiveModal(null)} className="text-textSecondary hover:text-textPrimary">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleRemoveSerial} className="space-y-4">
                <div>
                  <label className="block text-textPrimary font-semibold mb-2">Medicine Name</label>
                  <input
                    type="text"
                    value={removeSerialForm.name}
                    onChange={(e) => setRemoveSerialForm({ ...removeSerialForm, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-highlight"
                    required
                  />
                </div>
                <div>
                  <label className="block text-textPrimary font-semibold mb-2">Serial Number</label>
                  <input
                    type="text"
                    value={removeSerialForm.serial}
                    onChange={(e) => setRemoveSerialForm({ ...removeSerialForm, serial: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-highlight"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-error text-white py-2 rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"
                >
                  {loading ? 'Removing...' : 'Remove Serial'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {activeModal === 'search' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-textPrimary">Search Medicine</h3>
                <button onClick={() => {
                  setActiveModal(null);
                  setSearchName('');
                }} className="text-textSecondary hover:text-textPrimary">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <label className="block text-textPrimary font-semibold mb-2">Medicine Name</label>
                  <input
                    type="text"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-highlight"
                    placeholder="Enter medicine name..."
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {activeModal === 'billing' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-textPrimary">Bill Patient (FIFO)</h3>
                <button onClick={() => setActiveModal(null)} className="text-textSecondary hover:text-textPrimary">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-4 rounded">
                <p className="text-textSecondary text-sm">
                  <strong className="text-blue-700">ℹ️ FIFO Algorithm:</strong><br/>
                  • Sells medicine with earliest expiry date first<br/>
                  • Automatically removes expired serials<br/>
                  • Prevents medicine wastage
                </p>
              </div>
              <form onSubmit={handleBilling} className="space-y-4">
                <div>
                  <label className="block text-textPrimary font-semibold mb-2">Patient Name</label>
                  <input
                    type="text"
                    value={billingForm.patient_name}
                    onChange={(e) => setBillingForm({ ...billingForm, patient_name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-highlight"
                    required
                  />
                </div>
                <div>
                  <label className="block text-textPrimary font-semibold mb-2">Medicine Name</label>
                  <input
                    type="text"
                    value={billingForm.medicine_name}
                    onChange={(e) => setBillingForm({ ...billingForm, medicine_name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-highlight"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-highlight text-white py-2 rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Process Billing'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {activeModal === 'patients' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 my-8"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-textPrimary">Patient Billing History</h3>
                <button onClick={() => setActiveModal(null)} className="text-textSecondary hover:text-textPrimary">
                  <X className="w-6 h-6" />
                </button>
              </div>
              {patients.length === 0 ? (
                <p className="text-textSecondary text-center py-8">No patient records found</p>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {patients.map((patient, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="text-lg font-bold text-textPrimary mb-2">{patient.name}</h4>
                      <p className="text-textSecondary text-sm mb-2">
                        Total Spent: <span className="font-semibold text-textPrimary">₹{patient.total_price?.toFixed(2) || '0.00'}</span>
                      </p>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-textPrimary">Purchase History:</p>
                        {patient.purchases && patient.purchases.length > 0 ? (
                          <ul className="text-sm text-textSecondary space-y-1">
                            {patient.purchases.map((purchase, pIndex) => (
                              <li key={pIndex} className="flex justify-between">
                                <span>{purchase.medicine} (Serial: {purchase.serial})</span>
                                <span className="font-semibold">₹{purchase.price?.toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-textSecondary text-sm">No purchases yet</p>
                        )}
                      </div>
                      {patient.frequency && Object.keys(patient.frequency).length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-semibold text-textPrimary">Frequency:</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {Object.entries(patient.frequency).map(([med, count], fIndex) => (
                              <span key={fIndex} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {med}: {count}x
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}

        {activeModal?.type === 'serials' && activeModal.medicine && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl p-6 max-w-3xl w-full mx-4 my-8"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-textPrimary">
                  Serial Numbers - {activeModal.medicine.name}
                </h3>
                <button onClick={() => setActiveModal(null)} className="text-textSecondary hover:text-textPrimary">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {Object.entries(activeModal.medicine.serials || {}).map(([serial, details], index) => {
                  const expiryStatus = getExpiryStatus(details.expiry);
                  return (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-textPrimary">Serial: {serial}</p>
                        <p className="text-sm text-textSecondary">
                          Expiry: <span className={`font-semibold ${expiryStatus.color}`}>{details.expiry}</span>
                          {' '} ({expiryStatus.label})
                        </p>
                        <p className="text-sm text-textPrimary">Price: ₹{details.price?.toFixed(2)}</p>
                      </div>
                    </div>
                  );
                })}
                {Object.keys(activeModal.medicine.serials || {}).length === 0 && (
                  <p className="text-textSecondary text-center py-4">No serials available</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PharmacyManagement;
