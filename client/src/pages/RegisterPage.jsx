import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, Loader, Navigation, ArrowLeft } from 'lucide-react';

const RegisterPage = () => {
  const [role, setRole] = useState('donor');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    organizationName: '',
    donorType: 'restaurant',
    taxId: '',
    registrationNumber: '',
    documentUrl: '',
    contactPerson: '',
    vehicleType: 'bicycle',
    address: '',
    lng: -122.4194, // Default SF coordinates
    lat: 37.7749,
  });

  const [locating, setLocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [documentFile, setDocumentFile] = useState(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAutoLocate = () => {
    setLocating(true);
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const longitude = parseFloat(position.coords.longitude.toFixed(5));
        const latitude = parseFloat(position.coords.latitude.toFixed(5));
        
        let resolvedAddress = `Coordinates: ${latitude}, ${longitude}`;
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (response.ok) {
            const data = await response.json();
            resolvedAddress = data.display_name || resolvedAddress;
          }
        } catch (err) {
          console.warn('Reverse geocoding failed, using coordinates');
        }

        setFormData((prev) => ({
          ...prev,
          lng: longitude,
          lat: latitude,
          address: resolvedAddress,
        }));
        setLocating(false);
      },
      (err) => {
        // Fallback mock coordinates if permission denied
        setFormData((prev) => ({
          ...prev,
          lng: -122.4194 + (Math.random() - 0.5) * 0.1,
          lat: 37.7749 + (Math.random() - 0.5) * 0.1,
          address: 'Simulated Address (Downtown)',
        }));
        setLocating(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // --- FRONTEND VALIDATIONS ---
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    const phoneRegex = /^\+?[1-9]\d{1,14}$/; // Basic international E.164 phone check
    const cleanPhone = formData.phone.replace(/[\s\-\(\)]/g, ''); // strip spaces/brackets
    if (cleanPhone.length < 7 || isNaN(cleanPhone)) {
      setErrorMsg('Please enter a valid phone number (digits only, minimum 7 numbers).');
      return;
    }

    if (isNaN(formData.lng) || formData.lng < -180 || formData.lng > 180) {
      setErrorMsg('Longitude must be a number between -180 and 180.');
      return;
    }

    if (isNaN(formData.lat) || formData.lat < -90 || formData.lat > 90) {
      setErrorMsg('Latitude must be a number between -90 and 90.');
      return;
    }

    if (role === 'donor' && !formData.organizationName.trim()) {
      setErrorMsg('Please specify an organization name.');
      return;
    }

    if (role === 'ngo' && !formData.registrationNumber.trim()) {
      setErrorMsg('Please specify your NGO registration number.');
      return;
    }

    setSubmitting(true);

    const form = new FormData();
    form.append('name', formData.name);
    form.append('email', formData.email);
    form.append('password', formData.password);
    form.append('role', role);
    form.append('phone', formData.phone);
    form.append('location', JSON.stringify({
      coordinates: [formData.lng, formData.lat],
      address: formData.address || 'San Francisco, CA',
    }));

    if (role === 'donor') {
      form.append('organizationName', formData.organizationName);
      form.append('donorType', formData.donorType);
      form.append('taxId', formData.taxId);
    } else if (role === 'ngo') {
      form.append('registrationNumber', formData.registrationNumber);
      form.append('contactPerson', formData.contactPerson);
      if (documentFile) {
        form.append('document', documentFile);
      } else {
        form.append('documentUrl', formData.documentUrl || 'https://res.cloudinary.com/mock-ngo.pdf');
      }
    } else if (role === 'volunteer') {
      form.append('vehicleType', formData.vehicleType);
    }

    const res = await register(form);
    setSubmitting(false);

    if (res.success) {
      if (role === 'ngo') {
        setErrorMsg('Registration successful! Please wait for Admin approval.');
      } else {
        navigate('/dashboard');
      }
    } else {
      setErrorMsg(res.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#05070c] py-12 px-4">
      <div className="w-full max-w-xl p-8 card-glass shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 to-pink-500"></div>

        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>

        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
            <Heart className="w-6 h-6 text-red-500 fill-red-500 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Create Account</h2>
          <p className="text-gray-400 text-xs mt-1">Join the fight against hunger</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-white/5 border border-red-500/20 text-red-400 text-sm font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Role selector */}
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">Select Your Role</label>
            <div className="grid grid-cols-3 gap-3">
              {['donor', 'ngo', 'volunteer'].map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRole(r)}
                  className={`py-3 rounded-xl font-bold border capitalize transition-all ${
                    role === r
                      ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/15'
                      : 'bg-slate-900/40 text-gray-400 border-white/5 hover:border-white/20'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Common fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Sarah Connor"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">Phone Number</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="input-field"
                placeholder="+1 555-0199"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="input-field"
                placeholder="sarah@kitchen.com"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-bold mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="input-field"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {/* Location fields for GPS lookup */}
          <div className="p-4 rounded-xl bg-slate-900/30 border border-white/5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm font-bold">Address & Geolocation</span>
              <button
                type="button"
                onClick={handleAutoLocate}
                disabled={locating}
                className="bg-white/5 border border-white/10 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-gray-300 hover:text-white transition-all disabled:opacity-50"
              >
                {locating ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                Auto Detect Location
              </button>
            </div>

            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className="w-full bg-slate-900/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-red-500"
              placeholder="123 Food Street, City Center"
              required
            />

            <div className="grid grid-cols-2 gap-3 text-xs text-gray-400">
              <div>Longitude: <span className="text-gray-200">{formData.lng}</span></div>
              <div>Latitude: <span className="text-gray-200">{formData.lat}</span></div>
            </div>
          </div>

          {/* Role specific forms */}
          {role === 'donor' && (
            <div className="space-y-4 border-t border-white/5 pt-4">
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">Organization Name</label>
                <input
                  type="text"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Sarah's Kitchen Bistro"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-bold mb-2">Donor Type</label>
                  <select
                    name="donorType"
                    value={formData.donorType}
                    onChange={handleInputChange}
                    className="input-field"
                  >
                    <option value="restaurant">Restaurant</option>
                    <option value="hotel">Hotel / Catering</option>
                    <option value="corporate">Corporate Office</option>
                    <option value="household">Household</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-bold mb-2">Tax ID (Optional)</label>
                  <input
                    type="text"
                    name="taxId"
                    value={formData.taxId}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="TX-88220-B"
                  />
                </div>
              </div>
            </div>
          )}

          {role === 'ngo' && (
            <div className="space-y-4 border-t border-white/5 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-bold mb-2">NGO Reg Number</label>
                  <input
                    type="text"
                    name="registrationNumber"
                    value={formData.registrationNumber}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="NGO-993-82"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-bold mb-2">Contact Person</label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Liaisons Manager"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">Verification Document (PDF or Image)</label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setDocumentFile(e.target.files[0])}
                  className="input-field py-2"
                  required
                />
              </div>
            </div>
          )}

          {role === 'volunteer' && (
            <div className="space-y-4 border-t border-white/5 pt-4">
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">Vehicle Type</label>
                <select
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="bicycle">Bicycle</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="car">Car / Delivery Van</option>
                  <option value="walk">On Foot</option>
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full !py-4"
          >
            {submitting ? <Loader className="w-5 h-5 animate-spin" /> : 'Register'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-400">
          Already registered?{' '}
          <Link to="/login" className="text-red-400 font-semibold hover:underline">
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
