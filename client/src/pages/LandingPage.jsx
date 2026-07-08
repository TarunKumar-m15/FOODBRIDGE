import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Heart, Truck, Users, ArrowRight } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../services/api';
import logoImg from '../assets/logo.png';

const LandingPage = () => {
  const [stats, setStats] = useState({
    activeVolunteers: 0,
    mealsRecovered: 0,
    avgDeliveryDurationMins: 35,
    verifiedHandoffsPercent: 100,
  });

  useEffect(() => {
    const fetchPublicStats = async () => {
      try {
        const res = await api.get('/donations/public-stats');
        setStats(res.data.data);
      } catch (err) {
        console.error('Failed to load landing stats, using placeholders:', err.message);
      }
    };
    fetchPublicStats();

    // Connect socket to refresh stats in real time
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');

    socket.on('donation_created', () => {
      fetchPublicStats();
    });

    socket.on('donation_status_changed', () => {
      fetchPublicStats();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#05070c]">
      {/* Header */}
      <header className="w-full py-5 px-6 md:px-12 flex justify-between items-center card-glass !rounded-none border-b border-white/5 sticky top-0 z-50">
        <div className="flex items-center gap-3.5">
          <img src={logoImg} alt="Logo" className="w-14 h-14 rounded-xl border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.08)] object-contain bg-[#05070c]/50" />
          <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-red-400 bg-clip-text text-transparent">
            Zero Hunger
          </span>
        </div>
        <nav className="flex items-center gap-6">
          <Link to="/login" className="text-gray-300 hover:text-white font-semibold transition-colors">
            Sign In
          </Link>
          <Link
            to="/register"
            className="btn-primary !py-2.5 !px-5 text-sm shadow-md"
          >
            Join Platform
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        <div className="flex flex-col gap-6 text-left">
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-1.5 rounded-full text-xs font-bold w-max">
            <span>✨ Zero Waste. Zero Hunger.</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight text-white">
            Redistribute Surplus Food <br />
            <span className="text-gradient-gold">
              Feed Communities.
            </span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-lg">
            A real-time, QR-secured logistics platform bridging the gap between food donors, local NGOs, and volunteers. Track donations transparently from pickup to plate.
          </p>
          <div className="flex flex-wrap gap-4 mt-4">
            <Link
              to="/register"
              className="btn-primary !px-8 !py-4 shadow-xl"
            >
              Start Donating Now <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="btn-secondary !px-8 !py-4"
            >
              NGO / Volunteer Portal
            </Link>
          </div>
        </div>

        {/* Graphics / Stats Section */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card-glass-interactive p-6 flex flex-col justify-between h-40 border-l-4 border-red-500">
            <Users className="w-8 h-8 text-red-400" />
            <div>
              <span className="text-3xl font-extrabold text-white block">
                {stats.activeVolunteers > 0 ? stats.activeVolunteers : '0'}
              </span>
              <span className="text-gray-400 text-xs uppercase font-bold tracking-wider">Active Volunteers</span>
            </div>
          </div>
          <div className="card-glass-interactive p-6 flex flex-col justify-between h-40 transform translate-y-6 border-l-4 border-emerald-500">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            <div>
              <span className="text-3xl font-extrabold text-white block">
                {stats.verifiedHandoffsPercent}%
              </span>
              <span className="text-gray-400 text-xs uppercase font-bold tracking-wider">QR Verified Handoffs</span>
            </div>
          </div>
          <div className="card-glass-interactive p-6 flex flex-col justify-between h-40 border-l-4 border-orange-500">
            <Heart className="w-8 h-8 text-orange-400" />
            <div>
              <span className="text-3xl font-extrabold text-white block">
                {stats.mealsRecovered} kg
              </span>
              <span className="text-gray-400 text-xs uppercase font-bold tracking-wider">Meals Recovered</span>
            </div>
          </div>
          <div className="card-glass-interactive p-6 flex flex-col justify-between h-40 transform translate-y-6 border-l-4 border-cyan-500">
            <Truck className="w-8 h-8 text-cyan-400" />
            <div>
              <span className="text-3xl font-extrabold text-white block">
                {stats.avgDeliveryDurationMins} mins
              </span>
              <span className="text-gray-400 text-xs uppercase font-bold tracking-wider">Avg Delivery Duration</span>
            </div>
          </div>
        </div>
      </main>

      {/* Feature Section */}
      <section className="bg-[#030509] py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center flex flex-col gap-12">
          <div className="flex flex-col gap-3">
            <span className="text-red-400 text-sm font-bold uppercase tracking-wider">How it works</span>
            <h2 className="text-4xl font-extrabold text-white">Three Roles, One Shared Purpose</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="card-glass p-8 flex flex-col gap-4 text-left">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 font-extrabold text-xl">
                1
              </div>
              <h3 className="text-xl font-bold text-white">Donors list surplus</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Restaurants, caterers, and households post surplus food, inputting cooked time, expiry estimates, and photo details.
              </p>
            </div>
            <div className="card-glass p-8 flex flex-col gap-4 text-left">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-extrabold text-xl">
                2
              </div>
              <h3 className="text-xl font-bold text-white">NGOs request & assign</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Registered non-profits browse active food coordinates, claim matching lists, and route them to delivery coordinators.
              </p>
            </div>
            <div className="card-glass p-8 flex flex-col gap-4 text-left">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-extrabold text-xl">
                3
              </div>
              <h3 className="text-xl font-bold text-white">Volunteers verify transport</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Transporters trace automated GPS directions, Scanning security QR codes at checkpoints to ensure absolute transparency.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[#010204] text-center border-t border-white/5 text-gray-500 text-sm">
        <p>© 2026 Zero Hunger (FoodBridge) redistribution network. Powered by MERN + AI.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
