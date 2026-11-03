'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Calendar, CreditCard, Clock, FileText, CheckCircle, AlertTriangle, Send, LogOut, Download
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ClientDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const subdomain = params?.subdomain as string;

  // Loading states
  const [loading, setLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Payment modal state
  const [payingService, setPayingService] = useState<any>(null);
  const [upiRef, setUpiRef] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    async function loadClientData() {
      try {
        // 1. Verify Session
        const sessionRes = await fetch('/api/auth/me');
        const sessionData = await sessionRes.json();
        
        if (!sessionRes.ok || !sessionData.authenticated) {
          router.push(`/login`);
          return;
        }

        if (sessionData.user.role !== 'CLIENT') {
          router.push(`/dashboard`);
          return;
        }

        setSessionUser(sessionData.user);

        // Fetch client details
        // Since we are rewritten to the subdomain, we query from database
        const clientRes = await fetch(`/api/clients?q=${sessionData.user.email}`);
        const clientData = await clientRes.json();
        
        if (clientData.clients && clientData.clients.length > 0) {
          const clientRecord = clientData.clients[0];
          setClient(clientRecord);

          // Get services
          const servicesRes = await fetch(`/api/services?clientId=${clientRecord.id}`);
          const servicesData = await servicesRes.json();
          setServices(servicesData.services);

          // Get invoices
          const invoicesRes = await fetch(`/api/invoices?clientId=${clientRecord.id}`);
          const invoicesData = await invoicesRes.json();
          setInvoices(invoicesData.invoices);

          // Get payments
          const paymentsRes = await fetch(`/api/payments?clientId=${clientRecord.id}`);
          const paymentsData = await paymentsRes.json();
          setPayments(paymentsData.payments);
        }

        // Get in-app alerts
        const notifRes = await fetch(`/api/notifications`);
        const notifData = await notifRes.json();
        setNotifications(notifData.notifications || []);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadClientData();
  }, [subdomain, router]);

  const handlePayNowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingService) return;

    setSubmittingPayment(true);
    try {
      const res = await fetch(`/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: payingService.amount,
          serviceId: payingService.id,
          referenceNumber: upiRef,
          paymentMethod: 'UPI',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment submission failed');

      // Reload lists
      const paymentsRes = await fetch(`/api/payments?clientId=${client.id}`);
      const paymentsData = await paymentsRes.json();
      setPayments(paymentsData.payments);

      const servicesRes = await fetch(`/api/services?clientId=${client.id}`);
      const servicesData = await servicesRes.json();
      setServices(servicesData.services);

      // Trigger WhatsApp redirection
      const whatsappNumber = process.env.NEXT_PUBLIC_DEFAULT_WHATSAPP_NUMBER || '919999999999';
      const text = encodeURIComponent(
        `Hi! I have submitted a manual UPI renewal payment of ₹${payingService.amount} for "${payingService.name}".\n\nTransaction Ref: ${upiRef}\n\nPlease approve and extend my renewal.`
      );
      const waUrl = `https://wa.me/${whatsappNumber}?text=${text}`;

      setPayingService(null);
      setUpiRef('');
      
      alert('Payment submitted for approval! Redirecting you to WhatsApp to confirm with the administrator...');
      window.open(waUrl, '_blank');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await fetch(`/api/notifications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      // Refresh
      const notifRes = await fetch(`/api/notifications`);
      const notifData = await notifRes.json();
      setNotifications(notifData.notifications || []);
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
          <p className="text-sm font-semibold text-slate-500">Loading Client Portal...</p>
        </div>
      </div>
    );
  }

  const unpaidServices = services.filter(s => s.paymentStatus !== 'PAID');

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      {/* Header Bar */}
      <header className="bg-slate-950 border-b border-slate-800 px-8 py-5 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
            R
          </div>
          <span className="text-md font-bold tracking-tight">RenewHQ Client Portal</span>
        </div>
        <div className="flex items-center space-x-6">
          <span className="text-xs text-slate-400">Welcome, <strong className="text-slate-200">{client?.name || sessionUser?.name}</strong></span>
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-850 hover:bg-slate-900 text-xs font-bold text-slate-400 hover:text-white transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-10 space-y-10">
        {/* Alerts Center */}
        {notifications.filter(n => !n.isRead).length > 0 && (
          <div className="bg-indigo-950/20 border border-indigo-500/25 p-5 rounded-2xl flex justify-between items-center">
            <div className="space-y-1">
              <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider">In-App Alerts</span>
              <p className="text-sm text-slate-300">
                You have {notifications.filter(n => !n.isRead).length} unread renewal alerts.
              </p>
            </div>
            <button
              onClick={markAllNotificationsAsRead}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 rounded-lg text-white font-bold transition-colors"
            >
              Mark all as read
            </button>
          </div>
        )}

        {/* Unpaid Services / Action Items */}
        {unpaidServices.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span>Dues & Pending Renewals</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {unpaidServices.map((service) => (
                <div key={service.id} className="bg-slate-950 border border-slate-850 p-6 rounded-2xl space-y-6 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-bold uppercase">
                        {service.paymentStatus}
                      </span>
                      <span className="text-xs text-slate-500">Expires {formatDate(service.expiryDate)}</span>
                    </div>
                    <h3 className="text-md font-bold text-slate-100">{service.name}</h3>
                    <p className="text-xs text-slate-400 truncate">{service.description || 'No description provided.'}</p>
                  </div>
                  
                  <div className="flex justify-between items-center border-t border-slate-900 pt-4 mt-4">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-bold">Cost</span>
                      <span className="text-lg font-extrabold text-slate-200">{formatCurrency(service.amount)}</span>
                    </div>
                    <button
                      onClick={() => setPayingService(service)}
                      className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-indigo-600/15"
                    >
                      Pay & Renew Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabular Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Services List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <span>My Active Contracts</span>
            </h2>
            <div className="bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-xs font-bold text-slate-500 uppercase bg-slate-950/50">
                    <th className="px-6 py-4">Contract Name</th>
                    <th className="px-6 py-4">Billing Cycle</th>
                    <th className="px-6 py-4">Expiry Date</th>
                    <th className="px-6 py-4 text-right">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-sm">
                  {services
                    .filter(s => s.paymentStatus === 'PAID')
                    .map((service) => (
                      <tr key={service.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-200">{service.name}</td>
                        <td className="px-6 py-4 text-slate-400 capitalize">{service.billingCycle.toLowerCase()}</td>
                        <td className="px-6 py-4 text-slate-400">{formatDate(service.expiryDate)}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-xs font-bold">
                            Paid
                          </span>
                        </td>
                      </tr>
                    ))}
                  {services.filter(s => s.paymentStatus === 'PAID').length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500 text-sm">
                        No active paid services found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoices Box */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
              <FileText className="h-5 w-5 text-indigo-400" />
              <span>Invoices History</span>
            </h2>
            <div className="bg-slate-950 border border-slate-850 rounded-2xl p-5 divide-y divide-slate-900">
              {invoices.map((inv) => (
                <div key={inv.id} className="py-3 flex justify-between items-center text-sm">
                  <div className="space-y-1">
                    <p className="font-bold text-slate-200">{inv.invoiceNumber}</p>
                    <p className="text-xs text-slate-500">Due {formatDate(inv.dueDate)}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      inv.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {inv.status}
                    </span>
                    <button 
                      onClick={() => alert('PDF Invoice generation simulated! Check Downloads.')}
                      className="p-1.5 border border-slate-800 hover:bg-slate-900 rounded text-slate-400 hover:text-white transition-colors"
                      title="Download PDF"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {invoices.length === 0 && (
                <div className="py-6 text-center text-slate-500 text-sm">No billing records found.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: UPI PAYMENT QR DISPLAY & SUBMIT */}
      {payingService && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="text-md font-bold text-slate-200">Pay for {payingService.name}</h3>
              <button onClick={() => setPayingService(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Scan the UPI QR code below with any payments app (GPay, PhonePe, Paytm) to complete the transfer of <strong className="text-slate-200">{formatCurrency(payingService.amount)}</strong>. Then paste your transaction reference ID.
              </p>

              {/* Dynamic QR Code Display Simulation */}
              <div className="bg-white p-4 rounded-xl max-w-[200px] mx-auto border border-slate-200 shadow-md flex flex-col items-center justify-center space-y-2">
                {/* Visual mock QR */}
                <div className="h-36 w-36 bg-slate-100 border border-slate-300 rounded flex flex-wrap items-center justify-center p-2">
                  <div className="w-10 h-10 bg-slate-900 m-1"></div>
                  <div className="w-10 h-10 bg-slate-900 m-1"></div>
                  <div className="w-10 h-10 bg-slate-900 m-1"></div>
                  <div className="w-10 h-10 bg-slate-900 m-1"></div>
                  <div className="w-10 h-10 bg-slate-900 m-1"></div>
                  <div className="w-10 h-10 bg-slate-900 m-1"></div>
                </div>
                <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide">UPI: pay@renewhq</span>
              </div>

              <form onSubmit={handlePayNowSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">UPI Reference ID / Transaction Ref</label>
                  <input
                    type="text" required
                    value={upiRef}
                    onChange={(e) => setUpiRef(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. 12-digit UPI reference ID"
                  />
                </div>



                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-850">
                  <button
                    type="button"
                    onClick={() => setPayingService(null)}
                    className="border border-slate-800 hover:bg-slate-900 px-4 py-2 rounded-xl text-xs font-bold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPayment}
                    className="bg-indigo-600 hover:bg-indigo-700 px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-indigo-600/15"
                  >
                    {submittingPayment ? 'Submitting...' : 'Submit Payment & Send WhatsApp Alert'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
