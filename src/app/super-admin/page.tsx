'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, CreditCard, ShieldAlert, IndianRupee, LogOut, CheckCircle, Slash, XCircle
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<any>(null);
  
  // Dashboard states
  const [metrics, setMetrics] = useState({ totalAgencies: 0, activeSubscriptions: 0, mrr: 0, expiringCount: 0 });
  const [agencies, setAgencies] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [expiring, setExpiring] = useState<any[]>([]);

  useEffect(() => {
    async function loadSuperAdminData() {
      try {
        const sessionRes = await fetch('/api/auth/me');
        const sessionData = await sessionRes.json();

        if (!sessionRes.ok || !sessionData.authenticated || sessionData.user.role !== 'SUPER_ADMIN') {
          router.push('/');
          return;
        }

        setSessionUser(sessionData.user);

        // Fetch dashboard data
        const res = await fetch('/api/super-admin/dashboard');
        const data = await res.json();
        
        setMetrics(data.metrics);
        setAgencies(data.agencies || []);
        setPlans(data.plans || []);
        setExpiring(data.expiringAgencies || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadSuperAdminData();
  }, [router]);

  const handleUpdateStatus = async (agencyId: string, newStatus: 'ACTIVE' | 'BLOCKED') => {
    try {
      const res = await fetch(`/api/super-admin/agencies/${agencyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Status update failed');

      // Refresh agency list
      const freshRes = await fetch('/api/super-admin/dashboard');
      const freshData = await freshRes.json();
      setAgencies(freshData.agencies);
      setMetrics(freshData.metrics);
      alert(`Agency status updated to ${newStatus}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="text-sm font-semibold text-slate-500">Loading Super Admin console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header bar */}
      <header className="bg-slate-950 border-b border-slate-800 px-8 py-5 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
            S
          </div>
          <span className="text-md font-bold tracking-tight text-indigo-400">RenewHQ Super Admin Panel</span>
        </div>
        <div className="flex items-center space-x-6">
          <span className="text-xs text-slate-400">Admin Account: <strong className="text-slate-200">{sessionUser?.email}</strong></span>
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-900 text-xs font-bold text-slate-400 hover:text-white transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-8 py-10 space-y-8 flex-1 w-full">
        {/* Metric widgets */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Registered Agencies', value: metrics.totalAgencies, icon: Building2, color: 'text-indigo-400' },
            { label: 'Active Subscriptions', value: metrics.activeSubscriptions, icon: CreditCard, color: 'text-emerald-400' },
            { label: 'Monthly Cash Flow (MRR)', value: formatCurrency(metrics.mrr), icon: IndianRupee, color: 'text-indigo-400' },
            { label: 'Expiring In 30 Days', value: metrics.expiringCount, icon: ShieldAlert, color: 'text-red-400' }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="bg-slate-950 border border-slate-800/80 p-5 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">{item.label}</span>
                  <Icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <p className="text-2xl font-extrabold text-slate-100">{item.value}</p>
              </div>
            );
          })}
        </div>

        {/* Expiring agency alerts */}
        {expiring.length > 0 && (
          <div className="bg-red-950/20 border border-red-500/25 p-5 rounded-2xl space-y-2">
            <h3 className="text-sm font-bold text-red-400 uppercase tracking-wide">Expiring Agency Trials/Packages</h3>
            <ul className="text-xs text-slate-300 divide-y divide-red-900/50">
              {expiring.map((exp, idx) => (
                <li key={idx} className="py-2 flex justify-between items-center">
                  <span>Agency <strong>{exp.agency?.name}</strong> subdomain <strong>{exp.agency?.subdomain}</strong></span>
                  <span className="font-bold text-red-400">Ends {formatDate(exp.endDate)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Agencies Management Table */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-md font-bold text-slate-300">Registered Agency Tenants</h2>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-900 text-xs font-bold text-slate-500 uppercase bg-slate-950/50">
                <th className="px-6 py-4">Agency Name</th>
                <th className="px-6 py-4">Subdomain Portal</th>
                <th className="px-6 py-4">Active Plan</th>
                <th className="px-6 py-4">Owner Email</th>
                <th className="px-6 py-4">Branding Accent</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {agencies.map((agency) => (
                <tr key={agency.id} className="hover:bg-slate-900/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-200">{agency.name}</td>
                  <td className="px-6 py-4 font-mono text-indigo-400">
                    <a href={`http://${agency.subdomain}.localhost:3000/login`} target="_blank" className="hover:underline">
                      {agency.subdomain}.localhost
                    </a>
                  </td>
                  <td className="px-6 py-4 text-slate-400 capitalize">{agency.plan?.name}</td>
                  <td className="px-6 py-4 text-slate-400">{agency.users?.[0]?.email || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 rounded" style={{ backgroundColor: agency.primaryColor }}></div>
                      <span className="text-slate-500 font-mono text-xs">{agency.primaryColor}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      agency.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {agency.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {agency.status === 'ACTIVE' ? (
                      <button
                        onClick={() => handleUpdateStatus(agency.id, 'BLOCKED')}
                        className="bg-red-600/10 hover:bg-red-600/25 border border-red-500/25 text-red-400 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      >
                        Block Tenant
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateStatus(agency.id, 'ACTIVE')}
                        className="bg-emerald-600/10 hover:bg-emerald-600/25 border border-emerald-500/25 text-emerald-400 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      >
                        Approve Tenant
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
