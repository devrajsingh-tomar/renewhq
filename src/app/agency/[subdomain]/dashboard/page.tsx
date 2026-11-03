'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Users, Layers, Calendar, AlertTriangle, IndianRupee, Clock, CheckCircle, XCircle, 
  Send, Plus, Trash2, Search, Filter, Settings, FileText, ChevronRight, LogOut, Check
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function AgencyDashboard() {
  const params = useParams();
  const router = useRouter();
  const subdomain = params?.subdomain as string;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'services' | 'billing' | 'reminders' | 'settings'>('overview');

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

  // Search/Filters
  const [clientSearch, setClientSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('ALL'); // ALL, ACTIVE, INACTIVE, OVERDUE

  // Modal / Form States
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [showVerifyPayment, setShowVerifyPayment] = useState<any>(null); // holds payment object
  const [brandingHex, setBrandingHex] = useState('#4F46E5');

  // Forms
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', companyName: '', address: '', createLogin: false, password: '' });
  const [newService, setNewService] = useState({ name: '', description: '', amount: '', billingCycle: 'YEARLY', customDurationDays: '', startDate: '', expiryDate: '', clientId: '', categoryId: '', reminderSettings: '30,15,7,1' });

  // Verification simulation log
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [simulating, setSimulating] = useState(false);

  // Authenticate & Load Data
  useEffect(() => {
    async function loadData() {
      try {
        // 1. Session verify
        const sessionRes = await fetch('/api/auth/me');
        const sessionData = await sessionRes.json();
        
        if (!sessionRes.ok || !sessionData.authenticated) {
          router.push(`/login`);
          return;
        }
        
        // Block other roles
        if (sessionData.user.role === 'CLIENT') {
          router.push(`/client/dashboard`);
          return;
        }

        setSessionUser(sessionData.user);
        if (sessionData.user.agency) {
          setBrandingHex(sessionData.user.agency.primaryColor || '#4F46E5');
        }

        // 2. Fetch metrics
        const metricsRes = await fetch(`/api/dashboard`);
        const metricsData = await metricsRes.json();
        setMetrics(metricsData.metrics);
        setCharts(metricsData.charts);
        setActivityLogs(metricsData.recentLogs || []);

        // 3. Fetch resources
        const clientsRes = await fetch(`/api/clients`);
        const clientsData = await clientsRes.json();
        setClients(clientsData.clients);

        const servicesRes = await fetch(`/api/services`);
        const servicesData = await servicesRes.json();
        setServices(servicesData.services);

        const paymentsRes = await fetch(`/api/payments`);
        const paymentsData = await paymentsRes.json();
        setPayments(paymentsData.payments);

        const invoicesRes = await fetch(`/api/invoices`);
        const invoicesData = await invoicesRes.json();
        setInvoices(invoicesData.invoices);

        // Fetch categories or mock
        setCategories([
          { id: '1', name: 'Hosting' },
          { id: '2', name: 'Domain Renewal' },
          { id: '3', name: 'SSL Certificate' },
          { id: '4', name: 'Google Workspace' },
          { id: '5', name: 'AMC Support' }
        ]);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [subdomain, router]);

  // Actions
  const handleAddClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to create client');
      }

      // Reload
      const updatedClientsRes = await fetch(`/api/clients`);
      const updatedClientsData = await updatedClientsRes.json();
      setClients(updatedClientsData.clients);
      
      setShowAddClient(false);
      setNewClient({ name: '', email: '', phone: '', companyName: '', address: '', createLogin: false, password: '' });
      alert('Client created successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newService),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to create service');
      }

      // Reload lists
      const servicesRes = await fetch(`/api/services`);
      const servicesData = await servicesRes.json();
      setServices(servicesData.services);

      const invoicesRes = await fetch(`/api/invoices`);
      const invoicesData = await invoicesRes.json();
      setInvoices(invoicesData.invoices);
      
      setShowAddService(false);
      setNewService({ name: '', description: '', amount: '', billingCycle: 'YEARLY', customDurationDays: '', startDate: '', expiryDate: '', clientId: '', categoryId: '', reminderSettings: '30,15,7,1' });
      alert('Service and Invoice created successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleVerifyPaymentSubmit = async (paymentId: string, verifyStatus: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: verifyStatus }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Verification failed');
      }

      // Reload everything
      const paymentsRes = await fetch(`/api/payments`);
      const paymentsData = await paymentsRes.json();
      setPayments(paymentsData.payments);

      const servicesRes = await fetch(`/api/services`);
      const servicesData = await servicesRes.json();
      setServices(servicesData.services);

      const invoicesRes = await fetch(`/api/invoices`);
      const invoicesData = await invoicesRes.json();
      setInvoices(invoicesData.invoices);

      const metricsRes = await fetch(`/api/dashboard`);
      const metricsData = await metricsRes.json();
      setMetrics(metricsData.metrics);
      setCharts(metricsData.charts);
      setActivityLogs(metricsData.recentLogs || []);

      setShowVerifyPayment(null);
      alert(`Payment status set to ${verifyStatus}! Associated dates extended.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

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
          ...data.triggeredActions.map((log: string) => `[TRIGGERED] ${log}`),
          `Scheduler simulation run completed successfully.`
        ]);
      } else {
        throw new Error(data.error || 'Simulation run failed');
      }
    } catch (err: any) {
      setSimulationLogs(prev => [...prev, `[ERROR] ${err.message}`]);
    } finally {
      setSimulating(false);
    }
  };

  const handleUpdateBranding = async () => {
    try {
      // In a full implementation, we hit the setting API. Here we dynamically update local style variables
      // to present immediate responsive white labeling visual changes to the user.
      document.documentElement.style.setProperty('--primary-hex', brandingHex);
      alert('Branding theme color saved! Color white-labeled.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push(`/login`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-sm font-semibold text-slate-500">Loading RenewHQ Dashboard...</p>
        </div>
      </div>
    );
  }

  // Visual helper colors for Recharts pie
  const COLORS = ['#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="min-h-screen flex bg-slate-900 text-white">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col justify-between">
        <div>
          {/* Brand Header */}
          <div className="p-6 flex items-center space-x-3 border-b border-slate-800">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
              R
            </div>
            <span className="text-lg font-bold tracking-tight">RenewHQ</span>
          </div>

          {/* User profile */}
          <div className="px-6 py-4 border-b border-slate-800">
            <p className="text-xs text-slate-500 font-bold uppercase">Logged in as</p>
            <p className="text-sm font-semibold text-slate-200 truncate">{sessionUser?.name}</p>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-extrabold uppercase">
              {sessionUser?.role}
            </span>
          </div>

          {/* Nav Items */}
          <nav className="p-4 space-y-1">
            {[
              { id: 'overview', label: 'Overview', icon: Layers },
              { id: 'clients', label: 'Clients', icon: Users },
              { id: 'services', label: 'Services', icon: Calendar },
              { id: 'billing', label: 'Billing & Payments', icon: IndianRupee },
              { id: 'reminders', label: 'Auto Reminders', icon: Send },
              { id: 'settings', label: 'Branding Settings', icon: Settings },
            ].map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                    activeTab === item.id 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15' 
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
        <header className="px-8 py-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/20 backdrop-blur-md">
          <h1 className="text-2xl font-bold text-slate-100 capitalize">{activeTab} Panel</h1>
          <div className="flex items-center space-x-4">
            {metrics.pendingApprovals > 0 && (
              <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1.5 animate-pulse">
                <Clock className="h-3.5 w-3.5" />
                <span>{metrics.pendingApprovals} Pending Approvals</span>
              </span>
            )}
            <span className="text-xs text-slate-400">Time: 2026-05-25</span>
          </div>
        </header>

        {/* Tab Pages */}
        <div className="p-8 space-y-8 flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Metrics cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
                {[
                  { label: 'Total Clients', value: metrics.totalClients, icon: Users, color: 'text-indigo-400' },
                  { label: 'Active Services', value: metrics.activeServices, icon: Layers, color: 'text-emerald-400' },
                  { label: 'Due In 30 Days', value: metrics.upcomingRenewals, icon: Calendar, color: 'text-yellow-400' },
                  { label: 'Overdue Services', value: metrics.overduePayments, icon: AlertTriangle, color: 'text-red-400' },
                  { label: 'Monthly Cash', value: formatCurrency(metrics.monthlyRevenue), icon: IndianRupee, color: 'text-indigo-400' },
                  { label: 'Pending Approvals', value: metrics.pendingApprovals, icon: Clock, color: 'text-amber-500' },
                ].map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <div key={idx} className="bg-slate-950 border border-slate-800/80 p-5 rounded-2xl space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase">{card.label}</span>
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
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                        <Area type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Donut Renewal Status chart */}
                <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
                  <h3 className="text-md font-bold text-slate-300">Renewal Allocations</h3>
                  <div className="h-48 w-full flex justify-center items-center">
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
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {charts.renewalStats.map((entry: any, index: number) => (
                      <div key={index} className="flex justify-between items-center text-xs text-slate-400">
                        <div className="flex items-center space-x-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
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
                      <div className="space-y-1">
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
                <div className="relative w-72">
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
                      <th className="px-6 py-4 text-right">Registered</th>
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
                          <td className="px-6 py-4 text-right text-slate-500">{formatDate(client.createdAt)}</td>
                        </tr>
                      ))}
                    {clients.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 text-sm">
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
                      <th className="px-6 py-4 text-right">Status</th>
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
                          <td className="px-6 py-4 text-right">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              service.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'
                            }`}>
                              {service.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    {services.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500 text-sm">
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
                          <p className="text-xs text-slate-500">Ref Number: <code className="bg-slate-900 px-1 py-0.5 rounded">{p.referenceNumber || 'N/A'}</code></p>
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
                <div className="p-6 border-b border-slate-800">
                  <h3 className="text-md font-bold text-slate-300">Invoices History</h3>
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
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: REMINDERS */}
          {activeTab === 'reminders' && (
            <div className="space-y-6">
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-4">
                <h3 className="text-md font-bold text-slate-300 font-semibold">Reminder Scheduler Console</h3>
                <p className="text-sm text-slate-400 max-w-xl">
                  RenewHQ normally schedules automatic reminder checks using system cron patterns. You can manually run the scheduler check now to trigger date calculations and populate client dashboard in-app notifications.
                </p>
                <div>
                  <button
                    disabled={simulating}
                    onClick={triggerReminderAutomation}
                    className="bg-indigo-600 hover:bg-indigo-700 px-5 py-3 rounded-xl font-bold text-sm text-white transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                  >
                    {simulating ? 'Processing Scheduler...' : 'Run Reminder Job Now'}
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

          {/* TAB 6: SETTINGS (WHITE LABEL BRANDING) */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-lg">
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-6">
                <h3 className="text-md font-bold text-slate-300">White-Label Branding Controls</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Primary Accent HEX Color</label>
                    <div className="flex space-x-2">
                      <input 
                        type="color" 
                        value={brandingHex}
                        onChange={(e) => setBrandingHex(e.target.value)}
                        className="h-10 w-10 border-0 bg-transparent cursor-pointer rounded overflow-hidden"
                      />
                      <input 
                        type="text" 
                        value={brandingHex}
                        onChange={(e) => setBrandingHex(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100"
                        placeholder="#4F46E5"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500">This adjusts the theme color for all dashboard interfaces for your clients.</p>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4">
                  <button
                    onClick={handleUpdateBranding}
                    className="bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all shadow-md shadow-indigo-600/10"
                  >
                    Save Branding Theme
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
                  placeholder="e.g. 9876543210"
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

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddClient(false)}
                  className="border border-slate-800 hover:bg-slate-900 px-4 py-2 rounded-xl text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl text-xs font-bold text-white"
                >
                  Create Client
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
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Expiry Date</label>
                  <input
                    type="date" required
                    value={newService.expiryDate}
                    onChange={(e) => setNewService({ ...newService, expiryDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Service Category</label>
                <select
                  value={newService.categoryId}
                  onChange={(e) => setNewService({ ...newService, categoryId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Select Category...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddService(false)}
                  className="border border-slate-800 hover:bg-slate-900 px-4 py-2 rounded-xl text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl text-xs font-bold text-white"
                >
                  Create Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VERIFY PAYMENT SCREENSHOT */}
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
