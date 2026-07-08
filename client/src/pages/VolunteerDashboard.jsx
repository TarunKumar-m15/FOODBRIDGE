import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Truck, MapPin, RefreshCw, QrCode, Navigation, ShieldCheck, Search, Star, Calendar, CheckCircle, ArrowLeft, Filter, Weight, Clock } from 'lucide-react';
import logoImg from '../assets/logo.png';

const DeliveryRouteMap = ({ donorCoords, ngoCoords }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!window.L || !donorCoords || !donorCoords.length) return;

    const donorLat = donorCoords[1];
    const donorLng = donorCoords[0];
    
    // Fallback if NGO coordinates are missing (add simulated offset)
    const ngoLat = ngoCoords && ngoCoords[1] ? ngoCoords[1] : donorLat + 0.008;
    const ngoLng = ngoCoords && ngoCoords[0] ? ngoCoords[0] : donorLng + 0.012;

    const donorPoint = [donorLat, donorLng];
    const ngoPoint = [ngoLat, ngoLng];

    if (!mapInstanceRef.current && mapContainerRef.current) {
      const centerLat = (donorLat + ngoLat) / 2;
      const centerLng = (donorLng + ngoLng) / 2;
      
      const map = window.L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([centerLat, centerLng], 14);

      // Cyberpunk dark-mode tiles
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing layers
    map.eachLayer((layer) => {
      if (layer instanceof window.L.Marker || layer instanceof window.L.Polyline) {
        map.removeLayer(layer);
      }
    });

    // Custom CSS-based pulsing Markers for Donor and NGO
    const customIconA = window.L.divIcon({
      html: `<div class="w-7 h-7 rounded-full bg-cyan-500 text-black flex items-center justify-center font-extrabold text-[10px] border-2 border-white shadow-[0_0_15px_#00f0ff]">A</div>`,
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const customIconB = window.L.divIcon({
      html: `<div class="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center font-extrabold text-[10px] border-2 border-white shadow-[0_0_15px_#ef4444]">B</div>`,
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    window.L.marker(donorPoint, { icon: customIconA }).addTo(map).bindPopup("<b>Pickup:</b> Donor Location");
    window.L.marker(ngoPoint, { icon: customIconB }).addTo(map).bindPopup("<b>Delivery:</b> NGO Location");

    // Route connection line
    window.L.polyline([donorPoint, ngoPoint], {
      color: '#ff007f', // electric neon pink route line
      weight: 3.5,
      opacity: 0.9,
      dashArray: '6, 8 animate-dash' // animated look
    }).addTo(map);

    const bounds = window.L.latLngBounds([donorPoint, ngoPoint]);
    map.fitBounds(bounds, { padding: [40, 40] });

  }, [donorCoords, ngoCoords]);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-48 rounded-2xl border border-white/10 overflow-hidden bg-slate-950 shadow-inner mt-3 relative z-10"
      style={{ minHeight: '192px' }}
    />
  );
};

const VolunteerDashboard = () => {
  const { user, logout } = useAuth();
  
  const [availableJobs, setAvailableJobs] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [myCompletedTasks, setMyCompletedTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [minQuantity, setMinQuantity] = useState('');
  const [sortBy, setSortBy] = useState('expiry');

  // Scan modal simulation states
  const [showScanModal, setShowScanModal] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [scannedSecret, setScannedSecret] = useState('');
  const [scanType, setScanType] = useState('pickup'); // 'pickup' or 'delivery'
  const [scanMessage, setScanMessage] = useState('');

  // Review Modal states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewDonation, setReviewDonation] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, [categoryFilter, sortBy]);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
    socket.emit('join_room', 'volunteer');

    socket.on('donation_created', () => {
      fetchJobs();
    });

    socket.on('donation_status_changed', () => {
      fetchJobs();
    });

    return () => {
      socket.disconnect();
    };
  }, [searchTerm, categoryFilter, minQuantity, sortBy]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      // 1) Fetch available jobs with filters
      let availableUrl = `/donations?status=accepted`;
      if (searchTerm) availableUrl += `&search=${encodeURIComponent(searchTerm)}`;
      if (categoryFilter) availableUrl += `&category=${encodeURIComponent(categoryFilter)}`;
      if (minQuantity) availableUrl += `&minQuantity=${encodeURIComponent(minQuantity)}`;
      if (sortBy) availableUrl += `&sortBy=${encodeURIComponent(sortBy)}`;

      const resAccepted = await api.get(availableUrl);
      setAvailableJobs(resAccepted.data.data.donations);

      // 2) Fetch active and completed tasks
      const resAll = await api.get('/donations');
      const allDonations = resAll.data.data.donations;

      const active = allDonations.filter(
        (t) =>
          (t.assignedVolunteerId?._id === user?.id || t.assignedVolunteerId === user?.id) &&
          ['picking_up', 'picked_up'].includes(t.status)
      );
      setMyTasks(active);

      const completed = allDonations.filter(
        (t) =>
          (t.assignedVolunteerId?._id === user?.id || t.assignedVolunteerId === user?.id) &&
          t.status === 'delivered'
      );
      setMyCompletedTasks(completed);

    } catch (err) {
      console.error('Failed to load volunteer jobs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimJob = async (id) => {
    setProcessingId(id);
    try {
      await api.patch(`/donations/${id}/pickup`);
      fetchJobs();
    } catch (err) {
      alert(err.response?.data?.message || 'Error claiming pickup task.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleVerifyScan = async (e) => {
    e.preventDefault();
    setScanMessage('');

    try {
      const endpoint = scanType === 'pickup' ? '/verify/scan-pickup' : '/verify/scan-delivery';
      const res = await api.post(endpoint, {
        donationId: activeTask._id,
        qrCodeSecret: scannedSecret.trim()
      });

      setScanMessage(res.data.message);
      setTimeout(() => {
        setShowScanModal(false);
        setScannedSecret('');
        fetchJobs();
      }, 2000);
    } catch (err) {
      setScanMessage(`❌ Error: ${err.response?.data?.message || 'Verification failed.'}`);
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
      fetchJobs();
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
              <h1 className="text-2xl font-bold text-white bg-gradient-to-r from-white to-red-400 bg-clip-text text-transparent">
                Volunteer Transit Hub
              </h1>
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
              onClick={logout}
              className="btn-secondary !py-2 !px-4 text-sm"
            >
              Sign Out
            </button>
          </div>
        </header>        {/* Live Active Delivery Tasks */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 tracking-wide">
            <Navigation className="w-5 h-5 text-emerald-400 animate-pulse" /> My Active Deliveries ({myTasks.length})
          </h2>

          {myTasks.length === 0 ? (
            <div className="p-8 text-center card-glass border border-white/5 rounded-2xl text-gray-500 text-sm">
              You have no active transit tasks. Claim a job below to start.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {myTasks.map((task) => (
                <div key={task._id} className="card-glass-interactive p-6 space-y-5 relative overflow-hidden hover:border-emerald-500/25 transition-all duration-300">
                  <div className={`absolute top-0 right-0 border-l border-b border-white/5 text-[9px] uppercase font-extrabold px-3 py-1 rounded-bl-xl shadow-md ${
                    task.status === 'picking_up' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/10 animate-pulse' :
                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/10'
                  }`}>
                    {task.status === 'picking_up' ? 'Assigned' : 'In Transit'}
                  </div>

                  <div>
                    <h3 className="text-white font-extrabold text-sm leading-snug">
                      {task.foodItems.map(item => `${item.quantity} ${item.unit} ${item.name}`).join(', ')}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 font-medium">NGO Recipient: <span className="text-white font-bold">{task.assignedNgoId?.name || 'NGO Recipient'}</span></p>
                  </div>

                  {/* Route details with step-by-step progress connector */}
                  <div className="relative pl-6 space-y-4 border-l border-dashed border-white/10 ml-2 py-1">
                    <div className="relative">
                      <div className={`absolute -left-[30px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px] ${
                        task.status === 'picking_up' ? 'bg-cyan-500 text-black shadow-[0_0_10px_#00f0ff]' : 'bg-gray-800 text-gray-400'
                      }`}>
                        A
                      </div>
                      <div className="font-medium text-xs">
                        <span className="font-extrabold text-white text-[11px] block uppercase tracking-wider">Donor Pickup Address</span>
                        <span className="text-gray-400 mt-0.5 block">{task.pickupLocation.address}</span>
                        <span className="text-[10px] text-gray-500 mt-1 block font-mono">Contact: {task.donorId?.phone || 'No Phone'}</span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className={`absolute -left-[30px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px] ${
                        task.status === 'picked_up' ? 'bg-emerald-500 text-black shadow-[0_0_10px_#39ff14]' : 'bg-gray-800 text-gray-400'
                      }`}>
                        B
                      </div>
                      <div className="font-medium text-xs">
                        <span className="font-extrabold text-white text-[11px] block uppercase tracking-wider">Delivery NGO Address</span>
                        <span className="text-gray-400 mt-0.5 block">Main Distribution Center (Simulated)</span>
                      </div>
                    </div>
                  </div>

                  {/* Route Map */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-500 uppercase font-extrabold tracking-wider block">Live Delivery Route Map</span>
                    <DeliveryRouteMap 
                      donorCoords={task.pickupLocation?.coordinates} 
                      ngoCoords={task.ngoLocation?.coordinates} 
                    />
                  </div>

                  {/* QR Action Buttons */}
                  <div className="flex gap-3">
                    {task.status === 'picking_up' ? (
                      <button
                        onClick={() => {
                          setActiveTask(task);
                          setScanType('pickup');
                          setShowScanModal(true);
                        }}
                        className="btn-primary flex-1 !py-2.5 text-xs shadow-md flex items-center justify-center gap-1.5"
                      >
                        <QrCode className="w-4 h-4" /> Scan QR at Donor
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setActiveTask(task);
                          setScanType('delivery');
                          setShowScanModal(true);
                        }}
                        className="btn-primary !from-emerald-500 !to-emerald-600 flex-1 !py-2.5 text-xs shadow-md flex items-center justify-center gap-1.5 border border-emerald-500/20"
                      >
                        <ShieldCheck className="w-4 h-4" /> Scan QR at NGO
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Claimable Jobs Board with filters */}
        <div className="space-y-4">
          <div className="flex flex-col gap-4 bg-slate-950/20 card-glass p-5 border border-white/5 shadow-xl">
            <div className="flex justify-between items-center pb-2.5 border-b border-white/5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 tracking-wide">
                <RefreshCw className="w-5 h-5 text-red-500 animate-spin-slow" /> Open Pickups Board
              </h2>
              <button
                onClick={fetchJobs}
                className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Board
              </button>
            </div>

            {/* Filter controls */}
            <div className="grid md:grid-cols-4 gap-3">
              <div>
                <label className="text-gray-300 text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1 mb-1.5">
                  <Search className="w-3.5 h-3.5 text-red-500" /> Search Keywords
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pizza"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field !text-xs !py-1.5 bg-slate-950"
                />
              </div>
              <div>
                <label className="text-gray-300 text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1 mb-1.5">
                  <Filter className="w-3.5 h-3.5 text-red-500" /> Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="input-field !text-xs !py-1.5 bg-slate-950"
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
                  <Weight className="w-3.5 h-3.5 text-red-500" /> Min Weight (Kg)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 2"
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(e.target.value)}
                  className="input-field !text-xs !py-1.5 bg-slate-950"
                />
              </div>
              <div>
                <label className="text-gray-300 text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-red-500" /> Sorting
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="input-field !text-xs !py-1.5 bg-slate-950"
                >
                  <option value="expiry">Soonest Expiry</option>
                  <option value="quantity">Largest Quantity</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin text-red-500 mx-auto mb-2" /> Refreshing board...
            </div>
          ) : availableJobs.length === 0 ? (
            <div className="p-12 text-center card-glass border border-white/5 rounded-2xl text-gray-500 text-sm">
              No open collections match your search filter criteria.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableJobs.map((job) => (
                <div key={job._id} className="card-glass-interactive p-5 flex flex-col justify-between hover:border-red-500/20 transition-all duration-300 group">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] uppercase font-extrabold px-2.5 py-0.5 rounded border ${
                        job.foodItems[0]?.foodType === 'veg' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        job.foodItems[0]?.foodType === 'non-veg' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                      }`}>
                        {job.foodItems[0]?.foodType || 'veg'}
                      </span>
                      <span className="text-[10px] text-gray-500 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3 text-red-500" /> Expiry: {new Date(job.expiryTime).toLocaleTimeString()}
                      </span>
                    </div>

                    <h3 className="text-white font-extrabold text-sm leading-snug group-hover:text-red-400 transition-colors">
                      {job.foodItems.map(item => `${item.quantity} ${item.unit} ${item.name}`).join(', ')}
                    </h3>

                    <p className="text-xs text-gray-400 flex items-start gap-1 font-medium">
                      <MapPin className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span>{job.pickupLocation.address}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => handleClaimJob(job._id)}
                    disabled={processingId === job._id}
                    className="btn-secondary w-full !py-2 text-xs mt-4 hover:border-red-500 hover:text-red-400 shadow-[0_0_15px_rgba(255,0,127,0.1)] flex items-center justify-center gap-1 transition-all duration-300"
                  >
                    <Truck className="w-3.5 h-3.5" /> Accept Transit Task
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Deliveries Logs & Review Donors */}
        <div className="space-y-4 border-t border-white/5 pt-8">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" /> Completed Delivery History ({myCompletedTasks.length})
          </h2>

          {myCompletedTasks.length === 0 ? (
            <div className="p-8 text-center card-glass text-gray-500 text-sm">
              Your completed task logs will be stored here. Start delivering to earn trust credentials!
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {myCompletedTasks.map((task) => (
                <div key={task._id} className="card-glass-interactive p-5 space-y-3 hover:border-emerald-500/20 transition-all duration-300">
                  <div className="flex justify-between items-center pb-1.5 border-b border-white/5">
                    <span className="text-xs text-gray-500 font-medium">Date: {new Date(task.updatedAt).toLocaleDateString()}</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold uppercase shadow-sm">
                      Delivered
                    </span>
                  </div>

                  <h4 className="text-sm font-extrabold text-white">
                    {task.foodItems.map(item => `${item.quantity} ${item.unit} ${item.name}`).join(', ')}
                  </h4>

                  <div className="flex justify-between items-center pt-2 border-t border-white/5 gap-2">
                    <span className="text-[10px] text-gray-400 font-medium">Donor: <span className="text-white font-bold">{task.donorId?.name}</span></span>
                    <button
                      onClick={() => {
                        setReviewDonation(task);
                        setShowReviewModal(true);
                      }}
                      className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 hover:border-amber-400 hover:text-white transition-all duration-300 shadow-md"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-400" /> Rate Donor
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* QR Simulation Scan Modal */}
      {showScanModal && activeTask && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="card-glass max-w-md w-full p-6 relative text-center border border-white/5 shadow-2xl">
            <button
              onClick={() => {
                setShowScanModal(false);
                setScannedSecret('');
                setScanMessage('');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded bg-white/5 hover:bg-white/10"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-white mb-2 capitalize">
              Simulate QR scanner ({scanType})
            </h3>
            <p className="text-xs text-gray-400 mb-6 font-medium">
              Paste the donation's security code to simulate scanning the QR badge.
            </p>

            {scanMessage && (
              <div className="mb-4 p-3 rounded-xl text-xs font-bold bg-[#04060c] border border-white/10 text-white">
                {scanMessage}
              </div>
            )}

            <form onSubmit={handleVerifyScan} className="space-y-4">
              <input
                type="text"
                value={scannedSecret}
                onChange={(e) => setScannedSecret(e.target.value)}
                placeholder="Enter or paste secret code payload..."
                className="input-field font-mono !text-xs"
                required
              />

              <div className="text-[10px] text-gray-400 text-left bg-slate-900/60 p-3 rounded-xl border border-white/5 space-y-1 font-medium">
                <span className="font-extrabold text-white block uppercase tracking-wider text-[9px]">Testing Tip:</span>
                <p>Copy the code secret from the Donor's dashboard and paste it here to authenticate transit status.</p>
              </div>

              <button
                type="submit"
                className="btn-primary w-full !py-2.5 text-xs shadow-lg"
              >
                Authenticate Handoff
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal (Volunteer rates Donor) */}
      {showReviewModal && reviewDonation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="card-glass max-w-md w-full p-6 relative border border-white/5 shadow-2xl">
            <button
              onClick={() => setShowReviewModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded bg-white/5 hover:bg-white/10"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400 animate-pulse" /> Rate Donor Partner
            </h3>
            <p className="text-xs text-gray-400 mb-4 font-medium">
              Share your feedback for donor <span className="text-white font-extrabold">{reviewDonation.donorId?.name}</span>.
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
                  className="input-field !text-xs !p-3 h-24 resize-none bg-slate-950"
                  placeholder="e.g. Food was perfectly packed, ready at the pickup counter on time."
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

export default VolunteerDashboard;
