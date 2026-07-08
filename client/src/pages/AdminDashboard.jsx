import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import { ShieldAlert, Check, X, RefreshCw, BarChart2, ShieldCheck, Users, Heart, Download, ArrowLeft } from 'lucide-react';
import logoImg from '../assets/logo.png';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    return (
      <div className="card-glass !bg-[#05070c]/90 !backdrop-blur-md p-3 border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)] text-xs rounded-xl">
        <p className="font-extrabold text-white mb-1.5 uppercase tracking-wider text-[10px]">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
          <p className="text-gray-300 font-medium">
            Listings: <span className="text-white font-bold">{val}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalDonations: 0,
    activeDonationsCount: 0,
    completedDonationsCount: 0,
    totalQuantityKg: 0,
  });
  
  const [chartData, setChartData] = useState([]);
  const [pendingNGOs, setPendingNGOs] = useState([]);
  const [fraudLogs, setFraudLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);

  const handleDownloadImpactReport = async () => {
    try {
      const response = await api.get('/reports/impact', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `foodbridge-system-impact-report.pdf`;
      link.click();
    } catch (err) {
      alert('Failed to generate system-wide PDF report.');
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1) Fetch analytics
      const resStats = await api.get('/admin/analytics');
      const dataStats = resStats.data.data;
      setMetrics(dataStats.metrics);
      
      // Transform donationsByStatus into chart-friendly array
      const formattedChart = dataStats.donationsByStatus.map(item => ({
        name: item._id,
        count: item.count,
      }));
      setChartData(formattedChart);

      // 2) Fetch pending NGOs
      const resNGOs = await api.get('/admin/ngo-pending');
      setPendingNGOs(resNGOs.data.data.pendingNGOs);

      // 3) Fetch safety/fraud warnings
      const resFraud = await api.get('/admin/fraud-logs');
      setFraudLogs(resFraud.data.data.logs);
    } catch (err) {
      console.error('Failed to load admin stats:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyNGO = async (userId, approve) => {
    setVerifyingId(userId);
    try {
      await api.post('/admin/ngo-verify', { userId, approve });
      fetchDashboardData(); // Refresh list
    } catch (err) {
      alert(err.response?.data?.message || 'Verification update failed.');
    } finally {
      setVerifyingId(null);
    }
  };

  const COLORS = ['#ef4444', '#f97316', '#06b6d4', '#10b981', '#6366f1'];

  return (
    <div className="min-h-screen bg-[#05070c] py-8 px-4 md:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="flex justify-between items-center card-glass p-6">
          <div className="flex items-center gap-3.5">
            <img src={logoImg} alt="Logo" className="w-14 h-14 rounded-xl border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.08)] object-contain bg-[#05070c]/50" />
            <div>
              <h1 className="text-2xl font-bold text-white bg-gradient-to-r from-white to-red-400 bg-clip-text text-transparent">
                Admin Control Room
              </h1>
              <p className="text-gray-400 text-xs mt-1">Logged in as {user?.email} (Global Administrator)</p>
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
              onClick={handleDownloadImpactReport}
              className="btn-secondary !py-2 !px-4 text-xs flex items-center gap-1.5 border border-white/10"
            >
              <Download className="w-3.5 h-3.5" /> PDF Impact Report
            </button>
            <button
              onClick={fetchDashboardData}
              className="btn-secondary !p-2.5"
              title="Reload stats"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={logout}
              className="btn-secondary !py-2 !px-4 text-sm"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Dashboard KPI Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card-glass p-6 relative overflow-hidden group hover:border-cyan-500/20 transition-all duration-300">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl group-hover:bg-cyan-500/10 transition-colors"></div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Total Members</span>
                <span className="text-3xl font-extrabold text-white block mt-2">{metrics.totalUsers}</span>
              </div>
              <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-2">
              <span className="text-emerald-400 font-bold">100%</span> verified registration ledger
            </div>
          </div>

          <div className="card-glass p-6 relative overflow-hidden group hover:border-red-500/20 transition-all duration-300">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-red-500/5 rounded-full blur-xl group-hover:bg-red-500/10 transition-colors"></div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Food Redirected</span>
                <span className="text-3xl font-extrabold text-white block mt-2">{metrics.totalQuantityKg.toFixed(1)} <span className="text-sm font-normal text-gray-500">Kg</span></span>
              </div>
              <div className="p-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.15)] animate-pulse">
                <Heart className="w-5 h-5 text-red-400 fill-red-400" />
              </div>
            </div>
            <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-2">
              <span className="text-emerald-400 font-bold">+18%</span> monthly saved growth
            </div>
          </div>

          <div className="card-glass p-6 relative overflow-hidden group hover:border-orange-500/20 transition-all duration-300">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-orange-500/5 rounded-full blur-xl group-hover:bg-orange-500/10 transition-colors"></div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Active Listings</span>
                <span className="text-3xl font-extrabold text-white block mt-2">{metrics.activeDonationsCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.15)]">
                <RefreshCw className="w-5 h-5 text-orange-400" />
              </div>
            </div>
            <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-2">
              <span className="text-amber-400 font-bold">Pending</span> logistics pickup routing
            </div>
          </div>

          <div className="card-glass p-6 relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-colors"></div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Completed Deliveries</span>
                <span className="text-3xl font-extrabold text-white block mt-2">{metrics.completedDonationsCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-2">
              <span className="text-emerald-400 font-bold">100%</span> verified QR handoffs
            </div>
          </div>
        </div>

        {/* Analytics & Approval Panels Grid */}
        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* Recharts Analytics chart */}
          <div className="lg:col-span-8 card-glass p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                <BarChart2 className="w-5 h-5 text-red-400" /> Donation Status Distribution
              </h2>
            </div>
            <div className="h-64 w-full">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500 text-xs">No chart statistics available.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff007f" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ff007f" stopOpacity={0.15}/>
                      </linearGradient>
                      <linearGradient id="colorAccepted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.15}/>
                      </linearGradient>
                      <linearGradient id="colorPickingUp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#00f0ff" stopOpacity={0.15}/>
                      </linearGradient>
                      <linearGradient id="colorPickedUp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.15}/>
                      </linearGradient>
                      <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#39ff14" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#39ff14" stopOpacity={0.15}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }} content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={45}>
                      {chartData.map((entry, index) => {
                        const status = entry.name.toLowerCase();
                        let fillUrl = "url(#colorPending)";
                        if (status.includes("pending")) fillUrl = "url(#colorPending)";
                        else if (status.includes("accepted")) fillUrl = "url(#colorAccepted)";
                        else if (status.includes("picking")) fillUrl = "url(#colorPickingUp)";
                        else if (status.includes("picked")) fillUrl = "url(#colorPickedUp)";
                        else if (status.includes("delivered")) fillUrl = "url(#colorDelivered)";
                        return <Cell key={`cell-${index}`} fill={fillUrl} className="transition-all duration-300 hover:opacity-100 opacity-90 cursor-pointer" />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Pending NGO Approvals Queue */}
          <div className="lg:col-span-4 card-glass p-6 self-stretch flex flex-col">
            <h2 className="text-base font-bold text-white mb-4">NGO Verification Queue ({pendingNGOs.length})</h2>
            
            {pendingNGOs.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-505 text-xs text-center p-6 border border-dashed border-white/5 rounded-xl">
                No NGOs awaiting verification.
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-64 pr-1">
                {pendingNGOs.map((ngo) => (
                  <div key={ngo.user._id} className="p-3 bg-slate-900/40 rounded-xl border border-white/5 space-y-3">
                    <div>
                      <span className="font-bold text-white text-xs block">{ngo.profile?.registrationNumber || 'NGO Account'}</span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">Contact: {ngo.user.name}</span>
                    </div>

                    <div className="flex gap-2">
                      <a
                        href={ngo.profile?.documentUrl || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary !py-1 !px-3 text-[10px] leading-tight"
                      >
                        View Doc
                      </a>
                      <button
                        onClick={() => handleVerifyNGO(ngo.user._id, true)}
                        disabled={verifyingId === ngo.user._id}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded-lg transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleVerifyNGO(ngo.user._id, false)}
                        disabled={verifyingId === ngo.user._id}
                        className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-lg transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Safety & Fraud Detection Logs */}
        <div className="card-glass p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" /> Platform Food Safety Warnings
          </h2>

          {fraudLogs.length === 0 ? (
            <div className="p-6 text-center text-gray-505 text-xs border border-dashed border-white/5 rounded-xl">
              All active listings meet platform shelf-life safety standards. No alerts.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-gray-500 uppercase tracking-wider border-b border-white/5">
                    <th className="pb-3">Listed Items</th>
                    <th className="pb-3">Donor Org</th>
                    <th className="pb-3">Flag Reason</th>
                    <th className="pb-3 text-right">Risk Factor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {fraudLogs.map((log, index) => (
                    <tr key={index} className="text-gray-300">
                      <td className="py-3.5 font-bold text-white">{log.items}</td>
                      <td className="py-3.5">{log.donor?.name || 'Partner Donor'}</td>
                      <td className="py-3.5 text-gray-400">{log.reason}</td>
                      <td className="py-3.5 text-right">
                        <span className={`px-2.5 py-0.5 rounded font-extrabold text-[10px] ${
                          log.riskScore === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                        }`}>
                          {log.riskScore}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
