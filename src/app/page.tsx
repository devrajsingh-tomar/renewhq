'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function RootLandingPage() {
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('Starter');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registeredSubdomain, setRegisteredSubdomain] = useState('');

  const plans = [
    { name: 'Free', price: '₹0', cycle: 'month', desc: 'Ideal for getting started', features: ['5 Clients', '100MB Storage', 'Basic Reminders', '1 Staff User'], cta: 'Get Started' },
    { name: 'Starter', price: '₹1,499', cycle: 'month', desc: 'Perfect for small agencies', features: ['25 Clients', '1GB Storage', 'WhatsApp Redirect Link', '3 Staff Accounts'], cta: 'Start Trial' },
    { name: 'Professional', price: '₹3,499', cycle: 'month', desc: 'Designed for growing teams', features: ['100 Clients', '5GB Storage', 'Advanced Reminders', '10 Staff Accounts', 'White-Label Branding'], cta: 'Go Pro' },
    { name: 'Enterprise', price: '₹9,999', cycle: 'month', desc: 'For scaling corporations', features: ['Unlimited Clients', '50GB Storage', 'Custom Domain Support', 'Priority Support', 'Full White-Label'], cta: 'Contact Sales' }
  ];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, subdomain, email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      setSuccess(true);
      setRegisteredSubdomain(data.agency.subdomain);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/30">
            R
          </div>
          <span className="text-xl font-bold tracking-tight">RenewHQ</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="#pricing" className="text-slate-400 hover:text-white text-sm font-semibold transition-colors">
            Pricing
          </Link>
          <Link 
            href="/login" 
            className="text-sm font-semibold text-slate-300 hover:text-white px-4 py-2 border border-slate-700 rounded-xl hover:bg-slate-800 transition-all"
          >
            Sign In
          </Link>
          <Link 
            href="/agency/pixelcraft/login" 
            className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 px-4 py-2 border border-indigo-500/30 rounded-xl hover:bg-indigo-500/10 transition-all"
          >
            Demo Agency
          </Link>
          <Link 
            href="#register" 
            className="text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/20"
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-20 lg:py-32 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/25 px-3 py-1.5 rounded-full text-xs font-semibold text-indigo-400">
            <span>🚀</span> <span>RenewHQ v1.0 is Live!</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
            Stop losing revenue on <span className="text-indigo-500">expired client services</span>.
          </h1>
          <p className="text-slate-400 text-lg sm:text-xl max-w-xl">
            RenewHQ is the premium multi-tenant SaaS that helps modern agencies manage client hosting, SSLs, domains, Workspace, and custom contracts. Automatically notify clients, display UPI QR codes, and approve payments via WhatsApp redirects.
          </p>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            <Link href="#register" className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3.5 text-center font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all">
              Register Your Agency
            </Link>
            <Link href="#pricing" className="border border-slate-700 hover:border-slate-500 hover:bg-slate-800 px-6 py-3.5 text-center font-semibold rounded-xl transition-all">
              View Plans
            </Link>
          </div>
        </div>

        {/* Dashboard Preview Image Block */}
        <div className="lg:col-span-5 relative">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 opacity-20 blur-xl"></div>
          <div className="relative bg-slate-950 rounded-2xl border border-slate-800 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span className="text-xs text-slate-500">agency.renewhq.com</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <span className="text-xs text-slate-500">Overdue Payments</span>
                <p className="text-2xl font-bold text-red-500">₹14,500</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <span className="text-xs text-slate-500">Pending Approvals</span>
                <p className="text-2xl font-bold text-yellow-500">4</p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-indigo-400 font-semibold">Workspace Renewal</span>
                <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded font-bold text-[10px]">DUE IN 2d</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Pricing Section */}
      <section id="pricing" className="border-t border-slate-800 py-20 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold">Simple, transparent pricing</h2>
          <p className="text-slate-400 max-w-xl mx-auto">Choose a plan that fits your agency's client limits and management scale.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-12">
            {plans.map((p, idx) => (
              <div 
                key={idx} 
                className={`border rounded-2xl p-6 text-left space-y-6 transition-all ${
                  p.name === 'Starter' 
                    ? 'border-indigo-600 bg-slate-900 shadow-xl shadow-indigo-600/5' 
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                }`}
              >
                <div>
                  <h3 className="text-lg font-bold text-indigo-400">{p.name}</h3>
                  <div className="flex items-baseline space-x-1 mt-2">
                    <span className="text-3xl font-extrabold">{p.price}</span>
                    <span className="text-slate-500 text-sm">/{p.cycle}</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-2">{p.desc}</p>
                </div>
                
                <ul className="space-y-3 text-sm text-slate-300 border-t border-slate-800 pt-4">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-center space-x-2">
                      <span className="text-indigo-400 font-bold">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link 
                  href="#register" 
                  onClick={() => setSelectedPlan(p.name)}
                  className={`block w-full py-2.5 text-center font-bold text-sm rounded-xl transition-all ${
                    p.name === 'Starter'
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                      : 'border border-slate-700 hover:border-slate-500 text-slate-200 hover:text-white'
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Register Agency Onboarding Section */}
      <section id="register" className="border-t border-slate-800 py-20 bg-slate-900">
        <div className="max-w-md mx-auto px-6">
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-3xl font-bold">Register Your Agency</h2>
            <p className="text-slate-400 text-sm">Register your multi-tenant portal and deploy in seconds</p>
          </div>

          {success ? (
            <div className="bg-indigo-500/10 border border-indigo-500/30 p-8 rounded-2xl text-center space-y-6 shadow-xl">
              <div className="h-12 w-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto text-2xl">
                ✓
              </div>
              <h3 className="text-xl font-bold text-indigo-400">Portal Created Successfully!</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Your portal for <strong>{name}</strong> is ready. You can now access your tenant isolated environment.
              </p>
              <div>
                <a 
                  href={`http://${registeredSubdomain}.localhost:3000/login`}
                  className="inline-block bg-indigo-600 hover:bg-indigo-700 px-6 py-3 font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/20 transition-all text-white"
                >
                  Access Your Portal Dashboard
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="bg-slate-950 p-8 rounded-2xl border border-slate-800 space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/25 p-3 rounded-lg text-red-400 text-xs font-semibold">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Agency Name</label>
                <input 
                  type="text" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                  placeholder="Pixelcraft Studios"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Preferred Subdomain</label>
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-4 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-600">
                  <input 
                    type="text" 
                    required 
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1 bg-transparent border-0 py-3 text-sm focus:outline-none focus:ring-0"
                    placeholder="pixelcraft"
                  />
                  <span className="text-slate-500 text-xs font-bold font-mono">.localhost:3000</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Admin Account Email</label>
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                  placeholder="admin@pixelcraft.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Admin Password</label>
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 text-center font-bold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                {loading ? 'Registering...' : `Create Portal & Start Free`}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-12 border-t border-slate-800 text-center text-slate-500 text-xs space-y-4">
        <div className="flex flex-wrap justify-center gap-6 text-slate-400 font-semibold">
          <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
          <Link href="/agency/pixelcraft/login" className="hover:text-white transition-colors">Demo Agency Portal</Link>
          <Link href="/super-admin" className="hover:text-white transition-colors">Super Admin Portal</Link>
          <Link href="/forgot-password" className="hover:text-white transition-colors">Forgot Password</Link>
        </div>
        <p>© 2026 RenewHQ. All rights reserved.</p>
        <p className="text-slate-600">Built for agencies to automate subscription renewal cycles.</p>
      </footer>
    </div>
  );
}
