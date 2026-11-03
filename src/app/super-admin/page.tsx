'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, CreditCard, ShieldAlert, IndianRupee, LogOut, CheckCircle, 
  XCircle, Lock, Mail, ArrowRight, ShieldCheck, Activity, Layers, Sparkles, AlertCircle
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<any>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'agencies' | 'plans' | 'logs'>('agencies');
  
  // Dashboard states
  const [metrics, setMetrics] = useState({ totalAgencies: 0, activeSubscriptions: 0, mrr: 0, expiringCount: 0 });
  const [agencies, setAgencies] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [expiring, setExpiring] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Inline Super Admin Login State
  const [loginEmail, setLoginEmail] = useState('admin@renewhq.com');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const loadSuperAdminData = async () => {
    try {
      const sessionRes = await fetch('/api/auth/me');
      const sessionData = await sessionRes.json();

      if (!sessionRes.ok || !sessionData.authenticated || sessionData.user?.role !== 'SUPER_ADMIN') {
        setSessionUser(null);
        setLoading(false);
        return;
      }

      setSessionUser(sessionData.user);

      // Fetch dashboard data
      const res = await fetch('/api/super-admin/dashboard');
      const data = await res.json();
      
      setMetrics(data.metrics || { totalAgencies: 0, activeSubscriptions: 0, mrr: 0, expiringCount: 0 });
      setAgencies(data.agencies || []);
      setPlans(data.plans || []);
      setExpiring(data.expiringAgencies || []);
    } catch (err) {
      console.error('Super Admin fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuperAdminData();
  }, []);

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/super-admin/activity-logs');
      const data = await res.json();
      setActivityLogs(data.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      if (data.user?.role !== 'SUPER_ADMIN') {
        throw new Error('This account does not have Super Admin platform permissions.');
      }

      await loadSuperAdminData();
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

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
    setSessionUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent mx-auto" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Connecting to platform...</p>
        </div>
      </div>
    );
  }

  // Not authenticated: Show dedicated Super Admin login screen
  if (!sessionUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 text-slate-100 selection:bg-rose-500 selection:text-white">
        <div className="max-w-md w-full space-y-8 bg-slate-900/90 border border-slate-800 p-8 rounded-2xl shadow-2xl backdrop-blur-xl">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-lg shadow-rose-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Super Admin Console</h2>
            <p className="mt-1 text-xs text-slate-400">
              Platform administration, revenue analytics, and agency governance.
            </p>
          </div>

          {loginError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3 text-red-400 text-sm">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleInlineLogin}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@renewhq.com"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm transition-all"
                />
                <Mail className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm transition-all"
                />
                <Lock className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-rose-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loginLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>Sign In as Super Admin</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800 text-center">
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              ← Return to Main Website
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      {/* Header bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 sm:px-8 py-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-rose-600 flex items-center justify-center font-black text-white shadow-md shadow-rose-600/30">
            S
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-white block">RenewHQ Super Admin</span>
            <span className="text-[10px] text-rose-400 font-semibold uppercase tracking-wider">Platform Governance</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-xs text-slate-400 hidden sm:inline">
            Logged in: <strong className="text-slate-200">{sessionUser?.email}</strong>
          </span>
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-xs font-bold text-slate-400 hover:text-white transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-6 sm:px-8 py-8 space-y-8 flex-1 w-full">
        {/* Metric widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Agencies', value: metrics.totalAgencies, icon: Building2, color: 'text-indigo-400' },
            { label: 'Active Subscriptions', value: metrics.activeSubscriptions, icon: CreditCard, color: 'text-emerald-400' },
            { label: 'Platform MRR', value: formatCurrency(metrics.mrr), icon: IndianRupee, color: 'text-rose-400' },
            { label: 'Expiring in 30 Days', value: metrics.expiringCount, icon: ShieldAlert, color: 'text-amber-400' }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
                  <Icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <p className="text-2xl font-black text-white">{item.value}</p>
              </div>
            );
          })}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 space-x-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('agencies')}
            className={`pb-3 transition-colors border-b-2 flex items-center space-x-2 ${
              activeTab === 'agencies'
                ? 'border-rose-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Agencies ({agencies.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('plans')}
            className={`pb-3 transition-colors border-b-2 flex items-center space-x-2 ${
              activeTab === 'plans'
                ? 'border-rose-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Platform Plans ({plans.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('logs'); loadLogs(); }}
            className={`pb-3 transition-colors border-b-2 flex items-center space-x-2 ${
              activeTab === 'logs'
                ? 'border-rose-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Platform Audit Logs</span>
          </button>
        </div>

        {/* Tab 1: Agencies */}
        {activeTab === 'agencies' && (
          <div className="space-y-6">
            {expiring.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl space-y-2">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wide">Agencies Expiring Soon</h3>
                <ul className="text-xs text-slate-300 divide-y divide-slate-800">
                  {expiring.map((exp, idx) => (
                    <li key={idx} className="py-2 flex justify-between items-center">
                      <span>Agency <strong>{exp.agency?.name}</strong> ({exp.agency?.subdomain})</span>
                      <span className="font-semibold text-amber-400">Ends {formatDate(exp.endDate)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-5 border-b border-slate-800 flex justify-between items-center">
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Registered Tenants</h2>
                <span className="text-xs text-slate-400">{agencies.length} total</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs font-bold text-slate-400 uppercase bg-slate-950/40">
                      <th className="px-6 py-3.5">Agency</th>
                      <th className="px-6 py-3.5">Subdomain & Portal</th>
                      <th className="px-6 py-3.5">Plan</th>
                      <th className="px-6 py-3.5">Admin Email</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-sm">
                    {agencies.map((agency) => (
                      <tr key={agency.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4 font-bold text-white">{agency.name}</td>
                        <td className="px-6 py-4">
                          <Link 
                            href={`/agency/${agency.subdomain}/login`}
                            target="_blank"
                            className="font-mono text-xs text-indigo-400 hover:text-indigo-300 underline"
                          >
                            /agency/{agency.subdomain}/login
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-slate-300 font-semibold">{agency.plan?.name}</td>
                        <td className="px-6 py-4 text-slate-400 text-xs font-mono">{agency.users?.[0]?.email || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            agency.status === 'ACTIVE' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {agency.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {agency.status === 'ACTIVE' ? (
                            <button
                              onClick={() => handleUpdateStatus(agency.id, 'BLOCKED')}
                              className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                            >
                              Suspend Agency
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus(agency.id, 'ACTIVE')}
                              className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                            >
                              Activate Agency
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Plans */}
        {activeTab === 'plans' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              let features: string[] = [];
              try {
                features = JSON.parse(plan.features);
              } catch (e) {
                features = [plan.features];
              }

              return (
                <div key={plan.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-bold text-white">{plan.name}</span>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold">
                        {plan.clientLimit} Clients
                      </span>
                    </div>
                    <div className="text-3xl font-black text-white mb-4">
                      {formatCurrency(plan.monthlyPrice)}
                      <span className="text-xs text-slate-400 font-normal"> / mo</span>
                    </div>
                    <ul className="space-y-2 text-xs text-slate-300 mb-6">
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                        <span>Staff limit: {plan.staffLimit} users</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                        <span>Storage: {plan.storageLimit} MB</span>
                      </li>
                      {features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-center space-x-2">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-4 border-t border-slate-800 text-xs text-slate-500 text-center font-mono">
                    Yearly: {formatCurrency(plan.yearlyPrice)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 3: Platform Audit Logs */}
        {activeTab === 'logs' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">System Audit Trail</h2>
              <span className="text-xs text-slate-400">Latest 50 events</span>
            </div>
            {logsLoading ? (
              <div className="p-8 text-center text-slate-500 text-xs font-semibold">Loading audit logs...</div>
            ) : activityLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">No audit logs recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs font-bold text-slate-400 uppercase bg-slate-950/40">
                      <th className="px-6 py-3.5">Timestamp</th>
                      <th className="px-6 py-3.5">Action</th>
                      <th className="px-6 py-3.5">Agency</th>
                      <th className="px-6 py-3.5">User</th>
                      <th className="px-6 py-3.5">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs">
                    {activityLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-3.5 text-slate-400 font-mono">{formatDate(log.createdAt)}</td>
                        <td className="px-6 py-3.5 font-bold text-indigo-400">{log.action}</td>
                        <td className="px-6 py-3.5 text-slate-300">{log.agency?.name || 'Platform'}</td>
                        <td className="px-6 py-3.5 text-slate-400">{log.user?.name || log.user?.email || 'System'}</td>
                        <td className="px-6 py-3.5 text-slate-300">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
