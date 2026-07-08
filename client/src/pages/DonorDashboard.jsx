import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash, Check, X, ShieldAlert, Award, Calendar, Star, ArrowLeft, Thermometer, Droplets, Sparkles, Box, User, Heart, Leaf, Cookie, Apple, Flame, MapPin, ClipboardList, Info, HelpCircle, Package, Activity, Clock, UploadCloud, QrCode, RefreshCw } from 'lucide-react';
import logoImg from '../assets/logo.png';


const DonorDashboard = () => {
  const { user, logout } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);
  const [activeQrCode, setActiveQrCode] = useState('');
  const [activeSecret, setActiveSecret] = useState('');

  // Form states
  const [foodItems, setFoodItems] = useState([{ name: '', quantity: 1, unit: 'kg', foodType: 'veg' }]);
  const [cookedAt, setCookedAt] = useState('');
  const [address, setAddress] = useState('456 Market St, San Francisco, CA');
  const [lng, setLng] = useState(-122.4194);
  const [lat, setLat] = useState(37.7749);
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // AI Shelf-Life Prediction specific states
  const [category, setCategory] = useState('Cooked Food');
  const [manufacturingDate, setManufacturingDate] = useState('');
  const [storageMethod, setStorageMethod] = useState('Room Temperature');
  const [temperature, setTemperature] = useState(22.0);
  const [humidity, setHumidity] = useState(50.0);
  const [packagingType, setPackagingType] = useState('Open');
  const [freshnessScore, setFreshnessScore] = useState(7);

  // Review & Rating states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewDonation, setReviewDonation] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewDonation) return;

    setSubmittingReview(true);
    try {
      await api.post('/reviews', {
        donationId: reviewDonation._id,
        rating,
        comment,
      });
      alert('Review submitted successfully!');
      setShowReviewModal(false);
      setComment('');
      setRating(5);
      fetchDonationHistory();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  useEffect(() => {
    fetchDonationHistory();

    // Dynamically retrieve donor coordinates from GPS/maps
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const longitude = parseFloat(position.coords.longitude.toFixed(5));
          const latitude = parseFloat(position.coords.latitude.toFixed(5));
          setLng(longitude);
          setLat(latitude);

          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            if (response.ok) {
              const data = await response.json();
              if (data.display_name) {
                setAddress(data.display_name);
              }
            }
          } catch (err) {
            console.warn('Reverse geocoding failed, using coordinates');
          }
        },
        (error) => {
          console.warn('Geolocation lookup blocked or failed:', error.message);
        }
      );
    }
  }, []);

  const fetchDonationHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/donations');
      setDonations(res.data.data.donations);
    } catch (err) {
      console.error('Error fetching donations:', err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAddItem = () => {
    setFoodItems((prev) => [...prev, { name: '', quantity: 1, unit: 'kg', foodType: 'veg' }]);
  };

  const handleRemoveItem = (index) => {
    if (foodItems.length === 1) return;
    setFoodItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setFoodItems((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const handleCreateDonation = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // --- FRONTEND VALIDATIONS ---
    const cookedDate = new Date(cookedAt);
    const now = new Date();

    if (isNaN(cookedDate.getTime())) {
      setErrorMsg('Please specify a valid cooked time.');
      return;
    }

    if (cookedDate > now) {
      setErrorMsg('Cooked time cannot be in the future.');
      return;
    }

    // Check item values
    for (const item of foodItems) {
      if (!item.name.trim()) {
        setErrorMsg('Each food item must have a name.');
        return;
      }
      if (isNaN(item.quantity) || item.quantity <= 0) {
        setErrorMsg('Quantity must be a positive number.');
        return;
      }
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      setErrorMsg('Longitude must be between -180 and 180.');
      return;
    }

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setErrorMsg('Latitude must be between -90 and 90.');
      return;
    }

    if (!address.trim()) {
      setErrorMsg('Pickup address cannot be empty.');
      return;
    }

    setSubmitting(true);

    try {
      const form = new FormData();
      form.append('foodItems', JSON.stringify(foodItems));
      form.append('cookedAt', new Date(cookedAt).toISOString());
      form.append('pickupLocation', JSON.stringify({
        coordinates: [lng, lat],
        address,
      }));
      if (imageFile) {
        form.append('image', imageFile);
      } else {
        form.append('imageUrl', imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500');
      }
      form.append('category', category);
      if (manufacturingDate) {
        form.append('manufacturingDate', new Date(manufacturingDate).toISOString());
      }
      form.append('storageMethod', storageMethod);
      form.append('temperature', parseFloat(temperature));
      form.append('humidity', parseFloat(humidity));
      form.append('packagingType', packagingType);
      form.append('freshnessScore', parseInt(freshnessScore));

      const res = await api.post('/donations', form);
      const { donation, qrCodeImage } = res.data.data;
      
      setActiveQrCode(qrCodeImage);
      setActiveSecret(donation.qrCodeSecret);
      setShowQrModal(true);

      // Reset form
      setFoodItems([{ name: '', quantity: 1, unit: 'kg', foodType: 'veg' }]);
      setCookedAt('');
      setManufacturingDate('');
      setTemperature(22.0);
      setHumidity(50.0);
      setImageFile(null);
      fetchDonationHistory();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit donation.');
    } finally {
      setSubmitting(false);
    }
  };

  const getLiveShelfLife = () => {
    // Base shelf lives (Days)
    const baseDays = {
      'Vegetable': 5,
      'Fruit': 6,
      'Dairy': 5,
      'Bakery': 3,
      'Cooked Food': 4,
      'Meat': 2,
      'Beverage': 10
    }[category] || 4;

    // Storage method multiplier
    const storageMult = {
      'Freezer': 15,
      'Refrigerator': 3.5,
      'Room Temperature': 1
    }[storageMethod] || 1;

    // Packaging type multiplier
    const packMult = {
      'Vacuum Packed': 2.0,
      'Sealed': 1.3,
      'Open': 1.0
    }[packagingType] || 1.0;

    // Freshness score multiplier
    const freshMult = freshnessScore / 6.0;

    // Calculate predicted days
    let predictedDays = baseDays * storageMult * packMult * freshMult;
    predictedDays = Math.max(0.5, Math.round(predictedDays * 10) / 10);

    // Spoilage Risk
    let spoilageRisk = 'Low';
    if (predictedDays <= 1.5) {
      spoilageRisk = 'High';
    } else if (predictedDays <= 4.0) {
      spoilageRisk = 'Medium';
    }

    // Recommendation
    let recommendation = 'Safe to Donate';
    if (spoilageRisk === 'High') {
      recommendation = 'Discard';
    } else if (predictedDays <= 2.0) {
      recommendation = 'Consume Immediately';
    } else if (predictedDays <= 4.0) {
      recommendation = 'Donate Within 24 Hours';
    }

    return { predictedDays, spoilageRisk, recommendation };
  };

  return (
    <div className="min-h-screen bg-[#05070c] py-8 px-4 md:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Navigation / User bar */}
        <header className="flex justify-between items-center card-glass p-6">
          <div className="flex items-center gap-3.5">
            <img src={logoImg} alt="Logo" className="w-14 h-14 rounded-xl border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.08)] object-contain bg-[#05070c]/50" />
            <div>
              <h1 className="text-2xl font-bold text-white">Donor Control Center</h1>
              <p className="text-gray-400 text-xs mt-1">Logged in as {user?.email}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              to="/"
              className="btn-secondary !py-2 !px-4 text-sm flex items-center gap-1.5 border border-white/10"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
            </Link>
            <button
              onClick={logout}
              className="btn-secondary !py-2 !px-4 text-sm"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Dashboard Main Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-8">
          
          {/* Create Donation Form */}
          <div className="sm:col-span-5 card-glass p-6 self-start border border-white/5 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-6 tracking-wide flex items-center gap-2">
              <Plus className="w-5 h-5 text-pink-500" /> List New Surplus Food
            </h2>
            
            {errorMsg && (
              <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateDonation} className="space-y-4">
              
              {/* Food items loop */}
              <div>
                <label className="text-gray-300 text-xs font-extrabold tracking-wider uppercase flex items-center gap-1.5 mb-2">
                  <ClipboardList className="w-4 h-4 text-pink-500" /> Food Items
                </label>
                <div className="space-y-3">
                  {foodItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center bg-slate-900/60 p-3 rounded-xl border border-white/5 shadow-inner">
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                          placeholder="e.g. Rice, Pizza slices"
                          className="input-field !text-xs !py-1.5"
                          required
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                            className="input-field !text-xs !py-1"
                            placeholder="Qty"
                            min="1"
                            required
                          />
                          <select
                            value={item.unit}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                            className="input-field !text-xs !py-1 bg-slate-950"
                          >
                            <option value="kg">kg</option>
                            <option value="portions">portions</option>
                            <option value="boxes">boxes</option>
                          </select>
                          <select
                            value={item.foodType}
                            onChange={(e) => handleItemChange(index, 'foodType', e.target.value)}
                            className="input-field !text-xs !py-1 bg-slate-950"
                          >
                            <option value="veg">Veg</option>
                            <option value="non-veg">Non-Veg</option>
                            <option value="vegan">Vegan</option>
                            <option value="mixed">Mixed</option>
                          </select>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="mt-3 text-xs text-pink-400 hover:text-pink-300 font-bold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Food Component
                </button>
              </div>

              {/* Cooked Time */}
              <div>
                <label className="text-gray-300 text-xs font-extrabold tracking-wider uppercase flex items-center gap-1.5 mb-2">
                  <Clock className="w-4 h-4 text-pink-500" /> Cooked / Preparation Time
                </label>
                <input
                  type="datetime-local"
                  value={cookedAt}
                  onChange={(e) => setCookedAt(e.target.value)}
                  className="input-field !text-xs !py-2.5"
                  required
                />
              </div>

              {/* Food Image Upload */}
              <div>
                <label className="text-gray-300 text-xs font-extrabold tracking-wider uppercase flex items-center gap-1.5 mb-2">
                  <UploadCloud className="w-4 h-4 text-pink-500" /> Food Photo (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  className="input-field !text-xs !py-2 file:bg-pink-500/10 file:border-0 file:text-pink-400 file:font-bold file:rounded file:px-2.5 file:py-1 file:mr-2 cursor-pointer hover:file:bg-pink-500/20"
                />
              </div>

              {/* AI Shelf Life Parameters */}
              <div className="border-t border-white/5 pt-4 space-y-4">
                <span className="text-xs font-extrabold text-pink-500 flex items-center gap-1.5 uppercase tracking-wider">
                  <Activity className="w-4 h-4 animate-pulse" /> AI Shelf-life Parameters
                </span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-300 text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1 mb-1.5">
                      <Box className="w-3.5 h-3.5 text-pink-500" /> Food Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="input-field !text-xs !py-2.5 bg-slate-950"
                    >
                      <option value="Vegetable">Vegetable</option>
                      <option value="Fruit">Fruit</option>
                      <option value="Dairy">Dairy</option>
                      <option value="Bakery">Bakery</option>
                      <option value="Cooked Food">Cooked Food</option>
                      <option value="Meat">Meat / Poultry</option>
                      <option value="Beverage">Beverage</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-300 text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1 mb-1.5">
                      <Calendar className="w-3.5 h-3.5 text-pink-500" /> Mfg. Date
                    </label>
                    <input
                      type="date"
                      value={manufacturingDate}
                      onChange={(e) => setManufacturingDate(e.target.value)}
                      className="input-field !text-xs !py-2.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-300 text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1 mb-1.5">
                      <Info className="w-3.5 h-3.5 text-pink-500" /> Storage Method
                    </label>
                    <select
                      value={storageMethod}
                      onChange={(e) => setStorageMethod(e.target.value)}
                      className="input-field !text-xs !py-2.5 bg-slate-950"
                    >
                      <option value="Room Temperature">Room Temperature</option>
                      <option value="Refrigerator">Refrigerator</option>
                      <option value="Freezer">Freezer</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-300 text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1 mb-1.5">
                      <Package className="w-3.5 h-3.5 text-pink-500" /> Packaging Type
                    </label>
                    <select
                      value={packagingType}
                      onChange={(e) => setPackagingType(e.target.value)}
                      className="input-field !text-xs !py-2.5 bg-slate-950"
                    >
                      <option value="Open">Open Box / Unsealed</option>
                      <option value="Sealed">Sealed Container</option>
                      <option value="Vacuum Packed">Vacuum Packed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-gray-300 text-[9px] font-extrabold tracking-wider uppercase flex items-center gap-0.5 mb-1">
                      <Thermometer className="w-3.5 h-3.5 text-pink-500" /> Temp (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="input-field !text-xs !py-2"
                    />
                  </div>
                  <div>
                    <label className="text-gray-300 text-[9px] font-extrabold tracking-wider uppercase flex items-center gap-0.5 mb-1">
                      <Droplets className="w-3.5 h-3.5 text-pink-500" /> Humid (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={humidity}
                      onChange={(e) => setHumidity(parseFloat(e.target.value))}
                      className="input-field !text-xs !py-2"
                    />
                  </div>
                  <div>
                    <label className="text-gray-300 text-[9px] font-extrabold tracking-wider uppercase flex items-center gap-0.5 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-pink-500" /> Fresh (1-10)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={freshnessScore}
                      onChange={(e) => setFreshnessScore(parseInt(e.target.value))}
                      className="input-field !text-xs !py-2"
                    />
                  </div>
                </div>

                {/* Live AI Optimization Preview */}
                {(() => {
                  const preview = getLiveShelfLife();
                  return (
                    <div className="bg-[#04060c] border border-pink-500/30 p-4 rounded-xl space-y-4 mt-4 shadow-lg glow-rose relative overflow-hidden">
                      <div className="flex justify-between items-center pb-2 border-b border-white/5">
                        <div className="flex items-center gap-1.5">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-pink-500"></span>
                          </span>
                          <span className="text-[10px] uppercase tracking-wider font-extrabold text-pink-400">Live AI Estimation Preview</span>
                        </div>
                        <span className="text-[9px] text-gray-500 font-mono">Random Forest Regressor</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-gray-400 text-[10px] block font-bold uppercase tracking-wider">Estimated Shelf-life</span>
                          <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-300 block tracking-tight font-mono">
                            {preview.predictedDays} <span className="text-xs text-gray-400 font-sans font-normal">Days</span>
                          </span>
                          <span className="text-gray-500 text-[9px] block">({Math.round(preview.predictedDays * 24)} Hours remaining)</span>
                        </div>
                        
                        <div className="space-y-1">
                          <span className="text-gray-400 text-[10px] block font-bold uppercase tracking-wider">Spoilage Risk</span>
                          <span className={`font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded inline-block border ${
                            preview.spoilageRisk === 'High' ? 'bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.1)]' :
                            preview.spoilageRisk === 'Medium' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
                            'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                          }`}>
                            {preview.spoilageRisk} Risk
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-900/50 p-2.5 rounded-lg border border-white/5">
                        <span className="text-gray-500 text-[9px] block uppercase font-bold tracking-wider mb-1">Redistribution Guidance</span>
                        <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                          💡 {preview.recommendation}
                        </p>
                      </div>

                      {/* Timeline visualization */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] text-gray-500">
                          <span>Current Freshness</span>
                          <span>Spoilage Danger</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              preview.spoilageRisk === 'High' ? 'bg-red-500' :
                              preview.spoilageRisk === 'Medium' ? 'bg-orange-500' :
                              'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, (preview.predictedDays / 10) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>

              {/* Location parameters */}
              <div>
                <label className="text-gray-300 text-xs font-extrabold tracking-wider uppercase flex items-center gap-1.5 mb-2">
                  <MapPin className="w-4 h-4 text-pink-500" /> Pickup Location Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="input-field !text-xs !py-2.5"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold">Longitude</span>
                  <input type="number" step="0.0001" value={lng} onChange={(e) => setLng(parseFloat(e.target.value))} className="input-field !text-xs !py-1.5 mt-1" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold">Latitude</span>
                  <input type="number" step="0.0001" value={lat} onChange={(e) => setLat(parseFloat(e.target.value))} className="input-field !text-xs !py-1.5 mt-1" />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full !py-3 text-sm mt-4 shadow-lg"
              >
                {submitting ? 'Creating Donation...' : 'Create & Generate QR'}
              </button>
            </form>
          </div>

          {/* Donation History */}
          <div className="sm:col-span-7 card-glass p-6 flex flex-col h-full border border-white/5 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-cyan-400" /> Listings History
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {donations.length} total
              </span>
            </div>
            
            {loadingHistory ? (
              <div className="flex-1 flex items-center justify-center py-12 text-gray-400 text-sm">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mr-2" /> Loading histories...
              </div>
            ) : donations.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-12 text-gray-505 text-sm border border-dashed border-white/5 rounded-2xl">
                No donations logged yet. Create your first listing.
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto max-h-[720px] pr-1 scrollbar-thin">
                {donations.map((d) => (
                  <div key={d._id} className="card-glass-interactive p-4 border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-cyan-500/20 transition-all duration-300">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-white text-sm font-extrabold tracking-wide">
                          {d.foodItems.map(item => `${item.quantity} ${item.unit} ${item.name}`).join(', ')}
                        </span>
                        <span className={`text-[9px] uppercase font-extrabold px-2.5 py-0.5 rounded-full border ${
                          d.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]' :
                          d.status === 'pending' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.15)]' :
                          'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                        }`}>
                          {d.status}
                        </span>
                      </div>
                      
                      <div className="text-[11px] text-gray-400 space-y-1 font-medium">
                        <div className="flex items-start gap-1.5 text-gray-300">
                          <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                          <span>{d.pickupLocation.address}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Calendar className="w-3.5 h-3.5 text-cyan-500" />
                          <span>Expiry: {new Date(d.expiryTime).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* AI Prediction badges */}
                      <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-white/5">
                        <span className="text-[9px] bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Award className="w-3 h-3 text-red-400" /> Class: {d.aiClassification}
                        </span>
                        <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-emerald-400" /> Shelf-life: {d.aiPredictedShelfLifeDays || Math.round((d.aiShelfLifeHours || 24) / 24 * 10) / 10} Days
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                          d.aiSpoilageRisk === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          d.aiSpoilageRisk === 'Medium' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                          'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          <ShieldAlert className="w-3 h-3" /> Risk: {d.aiSpoilageRisk || 'Low'}
                        </span>
                        <span className="text-[9px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-md">
                          Rec: {d.aiRecommendation || 'Safe to Donate'}
                        </span>
                        <span className="text-[9px] bg-pink-500/10 border border-pink-500/20 text-pink-400 px-2 py-0.5 rounded-md font-mono">
                          Conf: {Math.round((d.aiConfidence || 0.85) * 100)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col gap-2 shrink-0 w-full md:w-auto">
                      <button
                        onClick={async () => {
                          setActiveQrCode(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(d.qrCodeSecret)}`);
                          setActiveSecret(d.qrCodeSecret);
                          setShowQrModal(true);
                        }}
                        className="btn-secondary !py-1.5 !px-3 text-xs flex-1 md:flex-none flex items-center justify-center gap-1"
                      >
                        <QrCode className="w-3.5 h-3.5" /> View QR
                      </button>
                      {d.status === 'delivered' && (
                        <button
                          onClick={() => {
                            setReviewDonation(d);
                            setShowReviewModal(true);
                          }}
                          className="btn-primary !py-1.5 !px-3 text-xs flex-1 md:flex-none flex items-center justify-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 hover:text-white hover:border-amber-400 transition-all duration-300"
                        >
                          <Star className="w-3 h-3 fill-amber-400" /> Rate NGO
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* QR Code Verification Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="card-glass max-w-sm w-full p-6 text-center relative">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-2">Donation Verification Code</h3>
            <p className="text-gray-400 text-xs mb-6">Ask the volunteer to scan this QR code on pickup or delivery.</p>

            <div className="bg-[#0b0f19] border border-cyan-500/30 p-4 rounded-2xl inline-block mb-4 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
              {activeQrCode ? (
                <img src={activeQrCode} alt="Verification QR" className="w-48 h-48 mx-auto rounded-lg" />
              ) : (
                <div className="w-48 h-48 flex flex-col justify-center items-center bg-[#0f1422] border border-red-500/30 rounded-xl text-red-400 text-xs font-bold p-4">
                  <ShieldAlert className="w-8 h-8 text-red-500 mb-2 animate-pulse" />
                  No QR Code URL.
                  <div className="mt-2 bg-red-950/40 border border-red-500/20 px-2.5 py-1.5 rounded-lg text-red-300 font-mono tracking-wider break-all select-all text-[10px]">
                    {activeSecret}
                  </div>
                </div>
              )}
            </div>

            <div className="text-gray-400 text-xs font-mono select-all select-text bg-slate-900/60 p-2.5 rounded-lg border border-white/5 mt-2">
              <span className="text-[10px] uppercase block text-gray-500 font-bold mb-1">Backup Code Payload</span>
              {activeSecret}
            </div>
          </div>
        </div>
      )}

      {/* Review Modal (Donor rates NGO) */}
      {showReviewModal && reviewDonation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="card-glass max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowReviewModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" /> Rate NGO Partner
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Share your feedback for NGO <span className="text-white font-bold">{reviewDonation.assignedNgoId?.name || 'NGO Partner'}</span>.
            </p>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-xs font-bold mb-2">Rating (1 to 5 Stars)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-1 text-amber-400 hover:scale-110 transition-transform"
                    >
                      <Star className={`w-8 h-8 ${star <= rating ? 'fill-amber-400' : 'text-gray-600'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-xs font-bold mb-1.5">Comments / Review Notes</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="input-field !text-xs !p-3 h-24 resize-none"
                  placeholder="e.g. NGO representative claimed the items promptly and responded nicely."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submittingReview}
                className="btn-primary w-full !py-2.5 text-xs shadow-lg"
              >
                {submittingReview ? 'Submitting Review...' : 'Submit Review'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonorDashboard;
