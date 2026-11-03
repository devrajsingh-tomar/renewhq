'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Users, Layers, Calendar, AlertTriangle, IndianRupee, Clock, CheckCircle, XCircle, 
  Send, Plus, Trash2, Search, Filter, Settings, FileText, ChevronRight, LogOut, Check,
  Edit2, MessageSquare, Shield, UserPlus, Phone, Mail, ExternalLink, RefreshCw
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function AgencyDashboard() {
  const params = useParams();
  const router = useRouter();
  const subdomain = params?.subdomain as string;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'services' | 'billing' | 'reminders' | 'staff' | 'settings'>('overview');

  // Loading & State
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>({
    totalClients: 0, activeServices: 0, upcomingRenewals: 0, overduePayments: 0, monthlyRevenue: 0, pendingApprovals: 0
  });
  const [charts, setCharts] = useState<any>({ renewalStats: [], revenueTrends: [], clientGrowth: [] });
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  // Resource lists
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);

  // Search/Filters
  const [clientSearch, setClientSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('ALL'); // ALL, ACTIVE, INACTIVE, OVERDUE

  // Modal / Form States
  const [showAddClient, setShowAddClient] = useState(false);
  const [showEditClient, setShowEditClient] = useState<any>(null);
  const [showAddService, setShowAddService] = useState(false);
  const [showEditService, setShowEditService] = useState<any>(null);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showVerifyPayment, setShowVerifyPayment] = useState<any>(null); // holds payment object
  
  // Settings & Branding
  const [brandingHex, setBrandingHex] = useState('#4F46E5');
  const [agencyName, setAgencyName] = useState('');
  const [agencyLogoUrl, setAgencyLogoUrl] = useState('');

  // Forms
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', companyName: '', address: '', createLogin: false, password: '' });
  const [newService, setNewService] = useState({ name: '', description: '', amount: '', billingCycle: 'YEARLY', customDurationDays: '', startDate: '', expiryDate: '', clientId: '', categoryId: '', reminderSettings: '30,15,7,1' });
  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '' });

  // Verification simulation log
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [simulating, setSimulating] = useState(false);

  // API prefix helper
  const apiBase = `/agency/${subdomain}/api`;

  // Authenticate & Load Data
  useEffect(() => {
    async function loadData() {
      try {
        // 1. Session verify
        const sessionRes = await fetch('/api/auth/me');
        const sessionData = await sessionRes.json();
        
        if (!sessionRes.ok || !sessionData.authenticated) {
          router.push(`/agency/${subdomain}/login`);
          return;
        }
        
        // Block client role from agency admin dashboard
        if (sessionData.user.role === 'CLIENT') {
          router.push(`/agency/${subdomain}/client/dashboard`);
          return;
        }

        setSessionUser(sessionData.user);
        if (sessionData.user.agency) {
          setBrandingHex(sessionData.user.agency.primaryColor || '#4F46E5');
          setAgencyName(sessionData.user.agency.name || '');
          setAgencyLogoUrl(sessionData.user.agency.logoUrl || '');
        }

        // 2. Fetch all resources in parallel
        const promises: Promise<Response>[] = [
          fetch(`${apiBase}/dashboard`),
          fetch(`${apiBase}/clients`),
          fetch(`${apiBase}/services`),
          fetch(`${apiBase}/payments`),
          fetch(`${apiBase}/invoices`),
        ];

        if (sessionData.user.role === 'AGENCY_ADMIN') {
          promises.push(fetch(`${apiBase}/staff`));
        }

        const [mRes, cRes, sRes, pRes, iRes, stRes] = await Promise.all(promises);

        if (mRes && mRes.ok) {
          const metricsData = await mRes.json();
          setMetrics(metricsData.metrics || {});
          setCharts(metricsData.charts || { renewalStats: [], revenueTrends: [] });
          setActivityLogs(metricsData.recentLogs || []);
        }

        if (cRes && cRes.ok) {
          const clientsData = await cRes.json();
          setClients(clientsData.clients || []);
        }

        if (sRes && sRes.ok) {
          const servicesData = await sRes.json();
          setServices(servicesData.services || []);
        }

        if (pRes && pRes.ok) {
          const paymentsData = await pRes.json();
          setPayments(paymentsData.payments || []);
        }

        if (iRes && iRes.ok) {
          const invoicesData = await iRes.json();
          setInvoices(invoicesData.invoices || []);
        }

        if (stRes && stRes.ok) {
          const staffData = await stRes.json();
          setStaffList(staffData.staff || []);
        }

        // Default categories
        setCategories([
          { id: '1', name: 'Hosting' },
          { id: '2', name: 'Domain Renewal' },
          { id: '3', name: 'SSL Certificate' },
          { id: '4', name: 'Google Workspace' },
          { id: '5', name: 'AMC Support' }
        ]);

      } catch (err) {
        console.error('Failed to load agency dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (subdomain) {
      loadData();
    }
  }, [subdomain, router]);

  // Refresh helper
  const reloadData = async () => {
    try {
      const [mRes, cRes, sRes, pRes, iRes] = await Promise.all([
        fetch(`${apiBase}/dashboard`),
        fetch(`${apiBase}/clients`),
        fetch(`${apiBase}/services`),
        fetch(`${apiBase}/payments`),
        fetch(`${apiBase}/invoices`),
      ]);
      if (mRes.ok) {
        const d = await mRes.json();
        setMetrics(d.metrics || {});
        setCharts(d.charts || { renewalStats: [], revenueTrends: [] });
        setActivityLogs(d.recentLogs || []);
      }
      if (cRes.ok) setClients((await cRes.json()).clients || []);
      if (sRes.ok) setServices((await sRes.json()).services || []);
      if (pRes.ok) setPayments((await pRes.json()).payments || []);
      if (iRes.ok) setInvoices((await iRes.json()).invoices || []);
      if (sessionUser?.role === 'AGENCY_ADMIN') {
        const stRes = await fetch(`${apiBase}/staff`);
        if (stRes.ok) setStaffList((await stRes.json()).staff || []);
      }
    } catch (err) {
      console.error('Reload error:', err);
    }
  };

  // CLIENT CRUD
  const handleAddClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiBase}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to create client');

      await reloadData();
      setShowAddClient(false);
      setNewClient({ name: '', email: '', phone: '', companyName: '', address: '', createLogin: false, password: '' });
      alert('Client created successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditClient) return;
    try {
      const res = await fetch(`${apiBase}/clients/${showEditClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(showEditClient),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to update client');

      await reloadData();
      setShowEditClient(null);
      alert('Client updated successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete client "${name}" and all their services/invoices?`)) return;
    try {
      const res = await fetch(`${apiBase}/clients/${id}`, { method: 'DELETE' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to delete client');

      await reloadData();
      alert(`Client "${name}" deleted.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // SERVICE CRUD
  const handleAddServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiBase}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newService),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to create service');

      await reloadData();
      setShowAddService(false);
      setNewService({ name: '', description: '', amount: '', billingCycle: 'YEARLY', customDurationDays: '', startDate: '', expiryDate: '', clientId: '', categoryId: '', reminderSettings: '30,15,7,1' });
      alert('Service contract created successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditService) return;
    try {
      const res = await fetch(`${apiBase}/services/${showEditService.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(showEditService),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to update service');

      await reloadData();
      setShowEditService(null);
      alert('Service contract updated successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteService = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete service "${name}"?`)) return;
    try {
      const res = await fetch(`${apiBase}/services/${id}`, { method: 'DELETE' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to delete service');

      await reloadData();
      alert(`Service "${name}" deleted.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // STAFF MANAGEMENT
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiBase}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStaff),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to create staff member');

      await reloadData();
      setShowAddStaff(false);
      setNewStaff({ name: '', email: '', password: '' });
      alert('Staff member created successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove staff member "${name}"?`)) return;
    try {
      const res = await fetch(`${apiBase}/staff?id=${id}`, { method: 'DELETE' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to delete staff member');

      await reloadData();
      alert(`Staff member "${name}" removed.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // PAYMENT APPROVAL
  const handleVerifyPaymentSubmit = async (paymentId: string, verifyStatus: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`${apiBase}/payments/${paymentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: verifyStatus }),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Verification failed');

      await reloadData();
      setShowVerifyPayment(null);
      alert(`Payment status set to ${verifyStatus}! Service expiry extended automatically.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // SCHEDULER SIMULATION
  const triggerReminderAutomation = async () => {
    setSimulating(true);
    setSimulationLogs(['Initializing reminder scheduler run...']);
    try {
      const res = await fetch(`/api/cron/reminders`);
      const data = await res.json();
      if (data.success) {
        setSimulationLogs(prev => [
          ...prev,
          `Processed ${data.processedCount} active services.`,
          ...(data.triggeredActions || []).map((log: string) => `[TRIGGERED] ${log}`),
          `Scheduler simulation run completed successfully.`
        ]);
        await reloadData();
      } else {
        throw new Error(data.error || 'Simulation run failed');
      }
    } catch (err: any) {
      setSimulationLogs(prev => [...prev, `[ERROR] ${err.message}`]);
    } finally {
      setSimulating(false);
    }
  };

  // SETTINGS & BRANDING SAVE
  const handleUpdateBranding = async () => {
    try {
      const res = await fetch(`${apiBase}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agencyName,
          primaryColor: brandingHex,
          logoUrl: agencyLogoUrl,
        }),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to update settings');

      document.documentElement.style.setProperty('--primary-hex', brandingHex);
      alert('Agency settings and white-label theme saved successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push(`/agency/${subdomain}/login`);
  };

  // WHATSAPP HELPER
  const sendWhatsAppReminder = (phone: string, clientName: string, serviceName: string, expiryDate: string, amount: number) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `Hello ${clientName},\n\nThis is a friendly reminder that your subscription for *${serviceName}* is due for renewal on *${formatDate(expiryDate)}*.\n\nRenewal Amount: ₹${amount.toLocaleString('en-IN')}\n\nPlease log in to your portal to complete the renewal: https://${subdomain}.renewhq.com\n\nThank you!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="text-sm font-semibold text-slate-400">Loading RenewHQ Dashboard...</p>
        </div>
      </div>
    );
  }

  // Visual helper colors for Recharts pie
  const COLORS = ['#10B981', '#F59E0B', '#EF4444'];

  const isStaff = sessionUser?.role === 'STAFF';

  return (
    <div className="min-h-screen flex bg-slate-900 text-white font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand Header */}
          <div className="p-6 flex items-center space-x-3 border-b border-slate-800">
            <div 
              className="h-9 w-9 rounded-xl flex items-center justify-center font-bold text-white shadow-lg"
              style={{ backgroundColor: brandingHex }}
            >
              R
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight block leading-none">{agencyName || 'RenewHQ'}</span>
              <span className="text-[10px] text-slate-500 font-medium">Agency Portal</span>
            </div>
          </div>

          {/* User profile */}
          <div className="px-6 py-4 border-b border-slate-800">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Logged in as</p>
            <p className="text-sm font-semibold text-slate-200 truncate mt-0.5">{sessionUser?.name}</p>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded font-extrabold uppercase">
                {sessionUser?.role}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">@{subdomain}</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="p-4 space-y-1">
            {[
              { id: 'overview', label: 'Overview', icon: Layers, show: true },
              { id: 'clients', label: 'Clients', icon: Users, show: true },
              { id: 'services', label: 'Services', icon: Calendar, show: true },
              { id: 'billing', label: 'Billing & Payments', icon: IndianRupee, show: true },
              { id: 'reminders', label: 'Auto Reminders', icon: Send, show: true },
              { id: 'staff', label: 'Staff Team', icon: Shield, show: !isStaff },
              { id: 'settings', label: 'Branding & Settings', icon: Settings, show: !isStaff },
            ]
              .filter(item => item.show)
              .map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                      activeTab === item.id 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
          </nav>
        </div>

        {/* Logout Bottom */}
        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen bg-slate-900 overflow-y-auto">
        <header className="px-8 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/40 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-slate-100 capitalize">{activeTab} Panel</h1>
            {isStaff && (
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-medium">
                Staff View
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={reloadData}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-all text-xs flex items-center space-x-1"
              title="Refresh Data"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            {metrics.pendingApprovals > 0 && (
              <span 
                onClick={() => setActiveTab('billing')}
                className="bg-amber-500/15 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1.5 animate-pulse cursor-pointer"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>{metrics.pendingApprovals} Pending Approvals</span>
              </span>
            )}
          </div>
        </header>

        {/* Tab Pages */}
        <div className="p-8 space-y-8 flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Metrics cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5">
                {[
                  { label: 'Total Clients', value: metrics.totalClients || 0, icon: Users, color: 'text-indigo-400' },
                  { label: 'Active Services', value: metrics.activeServices || 0, icon: Layers, color: 'text-emerald-400' },
                  { label: 'Due In 30 Days', value: metrics.upcomingRenewals || 0, icon: Calendar, color: 'text-yellow-400' },
                  { label: 'Overdue Services', value: metrics.overduePayments || 0, icon: AlertTriangle, color: 'text-red-400' },
                  { label: 'Monthly Cash', value: formatCurrency(metrics.monthlyRevenue || 0), icon: IndianRupee, color: 'text-indigo-400' },
                  { label: 'Pending Approvals', value: metrics.pendingApprovals || 0, icon: Clock, color: 'text-amber-500' },
                ].map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <div key={idx} className="bg-slate-950 border border-slate-800/80 p-5 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{card.label}</span>
                        <Icon className={`h-4 w-4 ${card.color}`} />
                      </div>
                      <p className="text-2xl font-extrabold text-slate-100">{card.value}</p>
                    </div>
                  );
                })}
              </div>

              {/* Charts grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Revenue trends Area chart */}
                <div className="lg:col-span-2 bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-4">
                  <h3 className="text-md font-bold text-slate-300">Revenue Flow Trend (₹)</h3>
                  <div className="h-64 w-full">
                    {charts.revenueTrends && charts.revenueTrends.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={charts.revenueTrends}>
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="month" stroke="#475569" fontSize={11} tickLine={false} />
                          <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                          <Area type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                        No revenue trend data recorded yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Donut Renewal Status chart */}
                <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
                  <h3 className="text-md font-bold text-slate-300">Renewal Allocations</h3>
                  <div className="h-48 w-full flex justify-center items-center">
                    {charts.renewalStats && charts.renewalStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={charts.renewalStats}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {charts.renewalStats.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-slate-500 text-xs">No renewal metrics available.</div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {(charts.renewalStats || []).map((entry: any, index: number) => (
                      <div key={index} className="flex justify-between items-center text-xs text-slate-400">
                        <div className="flex items-center space-x-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                          <span>{entry.name}</span>
                        </div>
                        <span className="font-semibold text-slate-200">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Activity logs */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-md font-bold text-slate-300">Recent Activity Logs</h3>
                <div className="divide-y divide-slate-800/80">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="py-3 flex justify-between items-center text-sm">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-200">{log.action}</p>
                        <p className="text-xs text-slate-500">{log.details}</p>
                      </div>
                      <span className="text-xs text-slate-500">{formatDate(log.createdAt)}</span>
                    </div>
                  ))}
                  {activityLogs.length === 0 && (
                    <div className="py-6 text-center text-sm text-slate-500">No activities logged yet.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CLIENTS */}
          {activeTab === 'clients' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="relative w-80">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
                    placeholder="Search by name, email, company..."
                  />
                </div>
                <button
                  onClick={() => setShowAddClient(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center space-x-1.5 transition-all text-white shadow-lg shadow-indigo-600/10"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Client</span>
                </button>
              </div>

              {/* Clients Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs font-bold text-slate-500 uppercase bg-slate-950/50">
                      <th className="px-6 py-4">Client Name</th>
                      <th className="px-6 py-4">Company</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Phone</th>
                      <th className="px-6 py-4">Active Services</th>
                      <th className="px-6 py-4">Registered</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-sm">
                    {clients
                      .filter(c => 
                        c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                        (c.companyName || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
                        c.email.toLowerCase().includes(clientSearch.toLowerCase())
                      )
                      .map((client) => (
                        <tr key={client.id} className="hover:bg-slate-900/45 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-200">{client.name}</td>
                          <td className="px-6 py-4 text-slate-400">{client.companyName || 'N/A'}</td>
                          <td className="px-6 py-4 text-slate-400">{client.email}</td>
                          <td className="px-6 py-4 text-slate-400">{client.phone || 'N/A'}</td>
                          <td className="px-6 py-4">
                            <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-xs font-bold">
                              {client.services?.length || 0} services
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500">{formatDate(client.createdAt)}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {client.phone && (
                                <button
                                  onClick={() => sendWhatsAppReminder(client.phone, client.name, 'Services', new Date().toISOString(), 0)}
                                  className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                                  title="Send WhatsApp Message"
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => setShowEditClient(client)}
                                className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all"
                                title="Edit Client"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClient(client.id, client.name)}
                                className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                                title="Delete Client"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {clients.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500 text-sm">
                          No clients registered yet. Click "Add Client" to onboard.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SERVICES */}
          {activeTab === 'services' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex space-x-2 bg-slate-950 p-1 border border-slate-800 rounded-xl">
                  {['ALL', 'ACTIVE', 'PAID', 'UNPAID', 'OVERDUE'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setServiceFilter(filter)}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                        serviceFilter === filter 
                          ? 'bg-indigo-600 text-white' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowAddService(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center space-x-1.5 transition-all text-white shadow-lg shadow-indigo-600/10"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Service Contract</span>
                </button>
              </div>

              {/* Services List Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs font-bold text-slate-500 uppercase bg-slate-950/50">
                      <th className="px-6 py-4">Service Name</th>
                      <th className="px-6 py-4">Client</th>
                      <th className="px-6 py-4">Billing Cycle</th>
                      <th className="px-6 py-4">Cost (INR)</th>
                      <th className="px-6 py-4">Expiry Date</th>
                      <th className="px-6 py-4">Payment Status</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-sm">
                    {services
                      .filter(s => {
                        if (serviceFilter === 'ALL') return true;
                        if (serviceFilter === 'ACTIVE') return s.status === 'ACTIVE';
                        return s.paymentStatus === serviceFilter;
                      })
                      .map((service) => (
                        <tr key={service.id} className="hover:bg-slate-900/45 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-200">{service.name}</td>
                          <td className="px-6 py-4 text-slate-400">{service.client?.name}</td>
                          <td className="px-6 py-4 text-slate-400 capitalize">{service.billingCycle.toLowerCase()}</td>
                          <td className="px-6 py-4 text-slate-200 font-semibold">{formatCurrency(service.amount)}</td>
                          <td className="px-6 py-4 text-slate-400">{formatDate(service.expiryDate)}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              service.paymentStatus === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' :
                              service.paymentStatus === 'UNPAID' ? 'bg-amber-500/10 text-amber-400' :
                              'bg-red-500/10 text-red-400'
                            }`}>
                              {service.paymentStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              service.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'
                            }`}>
                              {service.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {service.client?.phone && (
                                <button
                                  onClick={() => sendWhatsAppReminder(service.client.phone, service.client.name, service.name, service.expiryDate, service.amount)}
                                  className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                                  title="Send WhatsApp Renewal Notice"
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => setShowEditService(service)}
                                className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all"
                                title="Edit Service"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteService(service.id, service.name)}
                                className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                                title="Delete Service"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {services.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500 text-sm">
                          No service contracts configured yet. Click "Create Service Contract" to setup.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: BILLING & APPROVALS */}
          {activeTab === 'billing' && (
            <div className="space-y-8">
              {/* Payment Approvals List */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden p-6 space-y-4">
                <h3 className="text-md font-bold text-slate-300">Manual Payment Approvals Queue</h3>
                
                <div className="divide-y divide-slate-800">
                  {payments
                    .filter(p => p.status === 'PENDING_APPROVAL')
                    .map((p) => (
                      <div key={p.id} className="py-4 flex justify-between items-center text-sm">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-200">{p.client?.name}</p>
                          <p className="text-xs text-slate-500">
                            Service: <span className="text-slate-300 font-semibold">{p.service?.name}</span> | Method: {p.paymentMethod}
                          </p>
                          <p className="text-xs text-slate-500">Ref Number: <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-400 font-mono">{p.referenceNumber || 'N/A'}</code></p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <p className="text-lg font-bold text-slate-100">{formatCurrency(p.amount)}</p>
                          <button
                            onClick={() => setShowVerifyPayment(p)}
                            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-indigo-600/10"
                          >
                            Verify & Approve
                          </button>
                        </div>
                      </div>
                    ))}
                  {payments.filter(p => p.status === 'PENDING_APPROVAL').length === 0 && (
                    <div className="py-6 text-center text-slate-500 text-sm flex flex-col items-center justify-center space-y-2">
                      <CheckCircle className="h-8 w-8 text-emerald-500" />
                      <span>Approvals queue is clear! All payments are processed.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Invoices List */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="text-md font-bold text-slate-300">Invoices History</h3>
                  <span className="text-xs text-slate-500">{invoices.length} invoices generated</span>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs font-bold text-slate-500 uppercase bg-slate-950/50">
                      <th className="px-6 py-4">Invoice #</th>
                      <th className="px-6 py-4">Client</th>
                      <th className="px-6 py-4">Service</th>
                      <th className="px-6 py-4">Total Amount</th>
                      <th className="px-6 py-4">Due Date</th>
                      <th className="px-6 py-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-sm">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-900/45 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-200">{inv.invoiceNumber}</td>
                        <td className="px-6 py-4 text-slate-400">{inv.client?.name}</td>
                        <td className="px-6 py-4 text-slate-400">{inv.service?.name || 'Manual Billing'}</td>
                        <td className="px-6 py-4 text-slate-200 font-semibold">{formatCurrency(inv.totalAmount)}</td>
                        <td className="px-6 py-4 text-slate-400">{formatDate(inv.dueDate)}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            inv.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 text-sm">
                          No invoices generated yet. Invoices are generated automatically on service creation and payments.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: REMINDERS */}
          {activeTab === 'reminders' && (
            <div className="space-y-6">
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h3 className="text-md font-bold text-slate-300">Automated Renewal Reminders Console</h3>
                <p className="text-sm text-slate-400 max-w-xl">
                  RenewHQ schedules automatic reminder checks via Vercel Cron. You can also manually trigger a run right now to calculate upcoming expirations and dispatch in-app notifications.
                </p>
                <div>
                  <button
                    disabled={simulating}
                    onClick={triggerReminderAutomation}
                    className="bg-indigo-600 hover:bg-indigo-700 px-5 py-3 rounded-xl font-bold text-sm text-white transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center space-x-2"
                  >
                    <Send className="h-4 w-4" />
                    <span>{simulating ? 'Processing Scheduler...' : 'Run Reminder Job Now'}</span>
                  </button>
                </div>
              </div>

              {/* Console log box */}
              {simulationLogs.length > 0 && (
                <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl font-mono text-xs text-slate-400 space-y-2 max-h-96 overflow-y-auto">
                  <p className="text-slate-500 font-semibold border-b border-slate-800 pb-2">Scheduler execution logs:</p>
                  {simulationLogs.map((log, i) => (
                    <p key={i} className={log.startsWith('[ERROR]') ? 'text-red-400' : log.startsWith('[TRIGGERED]') ? 'text-indigo-400 font-semibold' : 'text-slate-300'}>
                      {log}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: STAFF TEAM (AGENCY ADMIN ONLY) */}
          {activeTab === 'staff' && !isStaff && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">Agency Staff Members</h3>
                  <p className="text-xs text-slate-400">Manage team members who can access client renewals and payments.</p>
                </div>
                <button
                  onClick={() => setShowAddStaff(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center space-x-1.5 transition-all text-white shadow-lg shadow-indigo-600/10"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Add Staff Member</span>
                </button>
              </div>

              {/* Staff Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs font-bold text-slate-500 uppercase bg-slate-950/50">
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Email Address</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Added Date</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-sm">
                    {staffList.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-900/45 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-200">{st.name}</td>
                        <td className="px-6 py-4 text-slate-400">{st.email}</td>
                        <td className="px-6 py-4">
                          <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-xs font-bold">
                            {st.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{formatDate(st.createdAt)}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteStaff(st.id, st.name)}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                            title="Remove Staff Member"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {staffList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500 text-sm">
                          No staff members added yet. Click "Add Staff Member" to invite your team.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: SETTINGS (WHITE LABEL BRANDING) */}
          {activeTab === 'settings' && !isStaff && (
            <div className="space-y-6 max-w-xl">
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">White-Label Branding Controls</h3>
                  <p className="text-xs text-slate-400 mt-1">Configure your agency name, logo URL, and theme color for all client views.</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Agency Name</label>
                    <input 
                      type="text" 
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100"
                      placeholder="Pixelcraft Studios"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Logo URL (Plain Text)</label>
                    <input 
                      type="text" 
                      value={agencyLogoUrl}
                      onChange={(e) => setAgencyLogoUrl(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100"
                      placeholder="https://example.com/logo.png"
                    />
                    <p className="text-[10px] text-slate-500">Provide an external image URL (no local file storage required).</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Primary Accent Theme Color</label>
                    <div className="flex space-x-3 items-center">
                      <input 
                        type="color" 
                        value={brandingHex}
                        onChange={(e) => setBrandingHex(e.target.value)}
                        className="h-10 w-12 border-0 bg-transparent cursor-pointer rounded overflow-hidden"
                      />
                      <input 
                        type="text" 
                        value={brandingHex}
                        onChange={(e) => setBrandingHex(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100"
                        placeholder="#4F46E5"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4">
                  <button
                    onClick={handleUpdateBranding}
                    className="bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all shadow-md shadow-indigo-600/10"
                  >
                    Save Branding Settings
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL 1: ADD CLIENT */}
      {showAddClient && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100">Add New Client</h3>
            <form onSubmit={handleAddClientSubmit} className="space-y-4 text-sm">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Full Name</label>
                <input
                  type="text" required
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Email Address</label>
                <input
                  type="email" required
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="john@company.com"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Phone Number</label>
                <input
                  type="text"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. +919876543210"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Company Name</label>
                <input
                  type="text"
                  value={newClient.companyName}
                  onChange={(e) => setNewClient({ ...newClient, companyName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Acmax Corp"
                />
              </div>
              
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="createLogin"
                  checked={newClient.createLogin}
                  onChange={(e) => setNewClient({ ...newClient, createLogin: e.target.checked })}
                  className="rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="createLogin" className="text-xs text-slate-300 font-semibold select-none cursor-pointer">
                  Generate Client Portal Account Credentials
                </label>
              </div>

              {newClient.createLogin && (
                <div className="space-y-1 animate-fadeIn">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Client Portal Password</label>
                  <input
                    type="password" required
                    value={newClient.password}
                    onChange={(e) => setNewClient({ ...newClient, password: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="••••••••"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddClient(false)}
                  className="border border-slate-800 hover:bg-slate-900 px-4 py-2 rounded-xl text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-indigo-600/10"
                >
                  Create Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT CLIENT */}
      {showEditClient && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100">Edit Client</h3>
            <form onSubmit={handleEditClientSubmit} className="space-y-4 text-sm">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Full Name</label>
                <input
                  type="text" required
                  value={showEditClient.name}
                  onChange={(e) => setShowEditClient({ ...showEditClient, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Email Address</label>
                <input
                  type="email" required
                  value={showEditClient.email}
                  onChange={(e) => setShowEditClient({ ...showEditClient, email: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Phone Number</label>
                <input
                  type="text"
                  value={showEditClient.phone || ''}
                  onChange={(e) => setShowEditClient({ ...showEditClient, phone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Company Name</label>
                <input
                  type="text"
                  value={showEditClient.companyName || ''}
                  onChange={(e) => setShowEditClient({ ...showEditClient, companyName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Billing Address</label>
                <input
                  type="text"
                  value={showEditClient.address || ''}
                  onChange={(e) => setShowEditClient({ ...showEditClient, address: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditClient(null)}
                  className="border border-slate-800 hover:bg-slate-900 px-4 py-2 rounded-xl text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-indigo-600/10"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD SERVICE */}
      {showAddService && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-100">Create Service Contract</h3>
            <form onSubmit={handleAddServiceSubmit} className="space-y-4 text-sm">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Service Name</label>
                <input
                  type="text" required
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. Cloud Server Linux"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Target Client</label>
                <select
                  required
                  value={newService.clientId}
                  onChange={(e) => setNewService({ ...newService, clientId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100"
                >
                  <option value="">Select a client...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.companyName || 'No Company'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Renewal Cycle</label>
                  <select
                    value={newService.billingCycle}
                    onChange={(e) => setNewService({ ...newService, billingCycle: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="HALF_YEARLY">Half Yearly</option>
                    <option value="YEARLY">Yearly</option>
                    <option value="CUSTOM">Custom Duration</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Amount (INR)</label>
                  <input
                    type="number" required
                    value={newService.amount}
                    onChange={(e) => setNewService({ ...newService, amount: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="899"
                  />
                </div>
              </div>

              {newService.billingCycle === 'CUSTOM' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Custom Duration (Days)</label>
                  <input
                    type="number" required
                    value={newService.customDurationDays}
                    onChange={(e) => setNewService({ ...newService, customDurationDays: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. 45"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Start Date</label>
                  <input
                    type="date" required
                    value={newService.startDate}
                    onChange={(e) => setNewService({ ...newService, startDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Expiry Date</label>
                  <input
                    type="date" required
                    value={newService.expiryDate}
                    onChange={(e) => setNewService({ ...newService, expiryDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Service Category</label>
                <select
                  value={newService.categoryId}
                  onChange={(e) => setNewService({ ...newService, categoryId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100"
                >
                  <option value="">Select Category...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddService(false)}
                  className="border border-slate-800 hover:bg-slate-900 px-4 py-2 rounded-xl text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-indigo-600/10"
                >
                  Create Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT SERVICE */}
      {showEditService && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-100">Edit Service Contract</h3>
            <form onSubmit={handleEditServiceSubmit} className="space-y-4 text-sm">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Service Name</label>
                <input
                  type="text" required
                  value={showEditService.name}
                  onChange={(e) => setShowEditService({ ...showEditService, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Renewal Cycle</label>
                  <select
                    value={showEditService.billingCycle}
                    onChange={(e) => setShowEditService({ ...showEditService, billingCycle: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="HALF_YEARLY">Half Yearly</option>
                    <option value="YEARLY">Yearly</option>
                    <option value="CUSTOM">Custom Duration</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Amount (INR)</label>
                  <input
                    type="number" required
                    value={showEditService.amount}
                    onChange={(e) => setShowEditService({ ...showEditService, amount: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Expiry Date</label>
                  <input
                    type="date" required
                    value={showEditService.expiryDate ? new Date(showEditService.expiryDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setShowEditService({ ...showEditService, expiryDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Payment Status</label>
                  <select
                    value={showEditService.paymentStatus}
                    onChange={(e) => setShowEditService({ ...showEditService, paymentStatus: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100"
                  >
                    <option value="PAID">PAID</option>
                    <option value="UNPAID">UNPAID</option>
                    <option value="OVERDUE">OVERDUE</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Contract Status</label>
                <select
                  value={showEditService.status}
                  onChange={(e) => setShowEditService({ ...showEditService, status: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditService(null)}
                  className="border border-slate-800 hover:bg-slate-900 px-4 py-2 rounded-xl text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-indigo-600/10"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD STAFF MEMBER */}
      {showAddStaff && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100">Add Staff Member</h3>
            <form onSubmit={handleAddStaffSubmit} className="space-y-4 text-sm">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Staff Member Name</label>
                <input
                  type="text" required
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. Alex Smith"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Email Address</label>
                <input
                  type="email" required
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="alex@pixelcraft.com"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Login Password</label>
                <input
                  type="password" required
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="At least 6 characters"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddStaff(false)}
                  className="border border-slate-800 hover:bg-slate-900 px-4 py-2 rounded-xl text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-indigo-600/10"
                >
                  Create Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VERIFY PAYMENT */}
      {showVerifyPayment && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-100">Verify Manual Payment</h3>
              <button onClick={() => setShowVerifyPayment(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <p className="text-slate-500 uppercase font-bold">Client</p>
                <p className="text-slate-200 font-bold text-sm">{showVerifyPayment.client?.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-500 uppercase font-bold">Service Contract</p>
                <p className="text-slate-200 font-bold text-sm">{showVerifyPayment.service?.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-500 uppercase font-bold">Amount Paid</p>
                <p className="text-slate-200 font-bold text-sm">{formatCurrency(showVerifyPayment.amount)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-500 uppercase font-bold">UPI Reference Number</p>
                <p className="text-slate-200 font-mono font-bold text-sm">{showVerifyPayment.referenceNumber || 'N/A'}</p>
              </div>
            </div>

            <div className="border border-slate-800 rounded-xl bg-slate-900/60 p-4 text-xs text-slate-400 leading-relaxed">
              <p className="font-bold text-slate-300 mb-1">Verify payment externally:</p>
              Please check your bank statement or UPI app to verify that the transaction of <span className="text-slate-200 font-bold">{formatCurrency(showVerifyPayment.amount)}</span> with reference ID <code className="bg-slate-950 px-1 py-0.5 rounded text-indigo-400 font-bold">{showVerifyPayment.referenceNumber || 'N/A'}</code> has been credited.
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => handleVerifyPaymentSubmit(showVerifyPayment.id, 'REJECTED')}
                className="bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 px-4 py-2.5 rounded-xl text-xs font-bold text-red-400 transition-all"
              >
                Reject Payment
              </button>
              <button
                onClick={() => handleVerifyPaymentSubmit(showVerifyPayment.id, 'APPROVED')}
                className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-lg shadow-emerald-600/10"
              >
                Approve & Extend Service
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
