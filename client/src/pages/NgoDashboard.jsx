import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Search, MapPin, CheckSquare, RefreshCw, Calendar, Eye, Phone, Star, Download, FileText, CheckCircle, ArrowLeft, SlidersHorizontal, Navigation, Weight, Filter, Activity, Clock, ShieldAlert, Award } from 'lucide-react';
import logoImg from '../assets/logo.png';

const NgoDashboard = () => {
  const { user, logout } = useAuth();
  const [donations, setDonations] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Coordinates & Filter states
  const [lng, setLng] = useState(-122.4194);
  const [lat, setLat] = useState(37.7749);
  const [radius, setRadius] = useState(15);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [minQuantity, setMinQuantity] = useState('');
  const [sortBy, setSortBy] = useState('expiry');

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [acceptingId, setAcceptingId] = useState(null);

  // Review & Rating Modal states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewDonation, setReviewDonation] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchNearbyDonations();
    fetchMyClaims();
  }, [radius, categoryFilter, sortBy, lng, lat]);

  useEffect(() => {
    // Dynamically retrieve NGO location from GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const longitude = parseFloat(position.coords.longitude.toFixed(5));
          const latitude = parseFloat(position.coords.latitude.toFixed(5));
          setLng(longitude);
          setLat(latitude);
        },
        (error) => {
          console.warn('NGO Geolocation lookup blocked or failed:', error.message);
        }
      );
    }
  }, []);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
    socket.emit('join_room', 'ngo');

    socket.on('donation_created', () => {
      fetchNearbyDonations();
    });

    socket.on('donation_status_changed', () => {
      fetchNearbyDonations();
      fetchMyClaims();
    });

    return () => {
      socket.disconnect();
    };
  }, [lng, lat, radius, searchTerm, categoryFilter, minQuantity, sortBy]);

  const fetchNearbyDonations = async () => {
    setLoading(true);
    try {
      let url = `/donations?lng=${lng}&lat=${lat}&radius=${radius}&status=pending`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (categoryFilter) url += `&category=${encodeURIComponent(categoryFilter)}`;
      if (minQuantity) url += `&minQuantity=${encodeURIComponent(minQuantity)}`;
      if (sortBy) url += `&sortBy=${encodeURIComponent(sortBy)}`;
      
      const res = await api.get(url);
      setDonations(res.data.data.donations);
    } catch (err) {
      console.error('Failed to load listings:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyClaims = async () => {
    try {
      const res = await api.get('/donations');
      const allDons = res.data.data.donations;
      const filteredClaims = allDons.filter(
        (d) => d.assignedNgoId?._id === user?.id || d.assignedNgoId === user?.id
      );
      setMyClaims(filteredClaims);
    } catch (err) {
      console.error('Failed to load NGO claims:', err.message);
    }
  };

  const handleClaimDonation = async (id) => {
    setAcceptingId(id);
    try {
      await api.patch(`/donations/${id}/claim`);
      fetchNearbyDonations();
      fetchMyClaims();
      if (showDetailModal && selectedDonation?._id === id) {
        setShowDetailModal(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error accepting donation.');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleDownloadReport = async () => {
    try {
      const response = await api.get(`/reports/ngo`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `ngo-${user?.name?.toLowerCase().replace(/\s+/g, '-')}-report.pdf`;
      link.click();
    } catch (err) {
      alert('Failed to generate PDF Report.');
    }
  };

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
      fetchMyClaims(); // Refresh list to update review status
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05070c] py-8 px-4 md:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="flex justify-between items-center card-glass p-6">
          <div className="flex items-center gap-3.5">
            <img src={logoImg} alt="Logo" className="w-14 h-14 rounded-xl border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.08)] object-contain bg-[#05070c]/50" />
            <div>
              <h1 className="text-2xl font-bold text-white bg-gradient-to-r from-white to-red-400 bg-clip-text text-transparent">NGO Recovery Portal</h1>
              <p className="text-gray-400 text-xs mt-1">Logged in as {user?.email}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              to="/"
              className="btn-secondary !py-2 !px-4 text-xs flex items-center gap-1.5 border border-white/10"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
            </Link>
            <button
              onClick={handleDownloadReport}
              className="btn-secondary !py-2 !px-4 text-xs flex items-center gap-1.5 border border-white/10"
            >
              <Download className="w-3.5 h-3.5" /> PDF Activity Report
            </button>
            <button
              onClick={logout}
              className="btn-secondary !py-2 !px-4 text-xs border border-white/10"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Proximity & Advance Filters Controls */}
        <div className="card-glass p-6 space-y-5 border border-white/5 shadow-2xl">
          <div className="flex justify-between items-center pb-2.5 border-b border-white/5">
            <h2 className="text-xs font-extrabold text-red-500 uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-red-500 animate-pulse" /> Proximity & Filter Parameters Matrix
            </h2>
            <span className="text-[9px] uppercase text-gray-500 font-mono">Location-Based GPS Geofencing</span>
          </div>

          <div className="grid md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-gray-300 text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1 mb-1.5">
                <Search className="w-3.5 h-3.5 text-red-500" /> Keyword Search
              </label>
              <input
                type="text"
                placeholder="e.g. Rice, Bread"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field !text-xs !py-2 bg-slate-950"
              />
            </div>
            <div>
              <label className="text-gray-300 text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1 mb-1.5">
                <Filter className="w-3.5 h-3.5 text-red-500" /> AI Classification
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input-field !text-xs !py-2 bg-slate-950"
              >
                <option value="">All Categories</option>
                <option value="veg">Veg</option>
                <option value="non-veg">Non-Veg</option>
                <option value="vegan">Vegan</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label className="text-gray-300 text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1 mb-1.5">
                <Weight className="w-3.5 h-3.5 text-red-500" /> Min Quantity (Kg)
              </label>
              <input
                type="number"
                placeholder="e.g. 5"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                className="input-field !text-xs !py-2 bg-slate-950"
              />
            </div>
            <div>
              <label className="text-gray-300 text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-red-500" /> Sort Output By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input-field !text-xs !py-2 bg-slate-950"
              >
                <option value="expiry">Soonest Expiring</option>
                <option value="quantity">Largest Quantity</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4 items-end border-t border-white/5 pt-4">
            <div>
              <label className="text-gray-300 text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1 mb-1.5">
                <Navigation className="w-3.5 h-3.5 text-red-500" /> Center Longitude
              </label>
              <input
                type="number"
                value={lng}
                onChange={(e) => setLng(parseFloat(e.target.value))}
                step="0.001"
                className="input-field !text-xs !py-2 bg-slate-950"
              />
            </div>
            <div>
              <label className="text-gray-300 text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1 mb-1.5">
                <Navigation className="w-3.5 h-3.5 text-red-500" /> Center Latitude
              </label>
              <input
                type="number"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value))}
                step="0.001"
                className="input-field !text-xs !py-2 bg-slate-950"
              />
            </div>
            <div>
              <label className="text-gray-300 text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1 mb-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-500" /> Boundary Radius
              </label>
              <select
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                className="input-field !text-xs !py-2 bg-slate-950"
              >
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={15}>15 km</option>
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
              </select>
            </div>
            <button
              onClick={fetchNearbyDonations}
              className="btn-primary w-full shadow-lg !py-2.5 text-xs flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Scan & Apply Filters
            </button>
          </div>
        </div>

        {/* Nearby Donations Listings Grid */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 tracking-wide">
              <Search className="w-5 h-5 text-red-500" /> Available Surplus Food Nearby ({donations.length})
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-20 text-gray-400 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin text-red-500 mx-auto mb-2" /> Searching coordinates...
            </div>
          ) : donations.length === 0 ? (
            <div className="text-center py-16 card-glass border border-white/5 rounded-2xl text-gray-500 text-sm">
              No active listings found with selected filters. Try broadening your proximity or removing filters.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {donations.map((d) => (
                <div key={d._id} className="card-glass-interactive overflow-hidden flex flex-col justify-between hover:border-red-500/25 transition-all duration-300 group">
                  <div className="h-40 bg-slate-900 relative overflow-hidden">
                    <img
                      src={d.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'}
                      alt="Food Item"
                      className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-red-500/10 text-red-400 text-[9px] uppercase font-extrabold px-2.5 py-0.5 rounded-full border border-red-500/20 backdrop-blur-md">
                      Pending Claim
                    </div>
                  </div>

                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <h3 className="text-sm font-extrabold text-white leading-snug group-hover:text-red-400 transition-colors">
                        {d.foodItems.map(item => `${item.quantity} ${item.unit} ${item.name}`).join(', ')}
                      </h3>
                      <div className="text-[11px] text-gray-400 space-y-1 font-medium">
                        <p className="flex items-start gap-1 text-gray-300">
                          <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                          <span>{d.pickupLocation.address}</span>
                        </p>
                        <p className="flex items-center gap-1 text-[10px] text-gray-500">
                          <Calendar className="w-3.5 h-3.5 text-red-500" />
                          <span>Expiry: {new Date(d.expiryTime).toLocaleDateString()}</span>
                        </p>
                      </div>

                      {/* AI Prediction badges */}
                      <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-white/5">
                        <span className="text-[9px] bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                          <Award className="w-3 h-3" /> Class: {d.aiClassification || 'Food'}
                        </span>
                        <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">
                          ⏱️ Shelf-life: {d.aiPredictedShelfLifeDays || Math.round((d.aiShelfLifeHours || 24)/24*10)/10} Days
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 rounded border font-bold uppercase ${
                          d.aiSpoilageRisk === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]' :
                          d.aiSpoilageRisk === 'Medium' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                          'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                        }`}>
                          Risk: {d.aiSpoilageRisk || 'Low'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-white/5">
                      <button
                        onClick={() => {
                          setSelectedDonation(d);
                          setShowDetailModal(true);
                        }}
                        className="btn-secondary flex-1 !py-1.5 !px-2 text-xs flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </button>
                      <button
                        onClick={() => handleClaimDonation(d._id)}
                        disabled={acceptingId === d._id}
                        className="btn-primary flex-1 !py-1.5 !px-2 text-xs shadow-md flex items-center justify-center gap-1"
                      >
                        <CheckSquare className="w-3.5 h-3.5" /> Claim Food
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Claimed Donations Tracker */}
        <div className="space-y-4 border-t border-white/5 pt-8">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 tracking-wide">
            <CheckCircle className="w-5 h-5 text-emerald-400 animate-pulse" /> Claims & Logistics Tracker ({myClaims.length})
          </h2>

          {myClaims.length === 0 ? (
            <div className="p-8 text-center card-glass border border-white/5 rounded-2xl text-gray-500 text-sm">
              You haven't claimed any donations yet. Listings you claim will appear here for progress monitoring.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {myClaims.map((claim) => (
                <div key={claim._id} className="card-glass-interactive p-5 space-y-4 relative overflow-hidden hover:border-emerald-500/20 transition-all duration-300">
                  <div className={`absolute top-0 right-0 border-l border-b border-white/5 text-[9px] uppercase font-extrabold px-3 py-1 rounded-bl-xl shadow-md ${
                    claim.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10' :
                    claim.status === 'picking_up' || claim.status === 'picked_up' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/10 animate-pulse' :
                    'bg-slate-800 text-gray-300'
                  }`}>
                    {claim.status.replace('_', ' ')}
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-white">
                      {claim.foodItems.map(item => `${item.quantity} ${item.unit} ${item.name}`).join(', ')}
                    </h4>
                    <p className="text-[11px] text-gray-400 flex items-center gap-1.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-red-500" /> {claim.pickupLocation.address}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[10px] text-gray-300 bg-slate-950/60 p-3 rounded-xl border border-white/5 font-medium">
                    <div>
                      <span className="block text-gray-500 font-extrabold uppercase tracking-wider text-[9px] mb-1">Donor partner</span>
                      <span className="text-white font-bold block">{claim.donorId?.name || 'Anonymous'}</span>
                      <span className="text-gray-500 font-mono text-[9px]">{claim.donorId?.phone || 'No Phone'}</span>
                    </div>
                    <div>
                      <span className="block text-gray-500 font-extrabold uppercase tracking-wider text-[9px] mb-1">Delivery courier</span>
                      <span className="text-white font-bold block">{claim.assignedVolunteerId?.name || 'Awaiting Volunteer'}</span>
                      <span className="text-gray-500 text-[9px]">{claim.assignedVolunteerId ? 'In transit georouting' : 'Self-pickup pending'}</span>
                    </div>
                  </div>

                  {claim.status === 'delivered' && (
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-gray-500 font-semibold">✓ Verification complete. Safe arrival.</span>
                      <button
                        onClick={() => {
                          setReviewDonation(claim);
                          setShowReviewModal(true);
                        }}
                        className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 hover:border-amber-400 hover:text-white transition-all duration-300 shadow-md"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400" /> Rate Courier
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Details Modal */}
      {showDetailModal && selectedDonation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="card-glass max-w-lg w-full p-6 relative">
            <button
              onClick={() => setShowDetailModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>

            <h3 className="text-xl font-bold text-white mb-4">Surplus Food Details</h3>
            
            <div className="space-y-4">
              <img
                src={selectedDonation.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'}
                alt="Detail banner"
                className="w-full h-40 object-cover rounded-xl border border-white/5"
              />

              <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 space-y-2">
                <span className="text-xs font-bold text-red-400 block uppercase">Listed Food Inventory</span>
                <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
                  {selectedDonation.foodItems.map((item, idx) => (
                    <li key={idx}>
                      {item.quantity} {item.unit} of <span className="font-bold text-white">{item.name}</span> ({item.foodType})
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
                <div>
                  <span className="block text-gray-500 uppercase font-bold mb-1">Donor Name</span>
                  <span className="text-gray-200 text-sm font-semibold">{selectedDonation.donorId?.name}</span>
                </div>
                <div>
                  <span className="block text-gray-500 uppercase font-bold mb-1">Donor Phone</span>
                  <span className="text-gray-200 text-sm font-semibold flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" /> {selectedDonation.donorId?.phone}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleClaimDonation(selectedDonation._id)}
                disabled={acceptingId === selectedDonation._id}
                className="btn-primary w-full !py-3 mt-4"
              >
                Claim This Donation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
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
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" /> Rate Volunteer Delivery
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Share your feedback for courier <span className="text-white font-bold">{reviewDonation.assignedVolunteerId?.name}</span>.
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
                  placeholder="e.g. Prompt delivery, food arrived safely in excellent conditions."
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

export default NgoDashboard;
