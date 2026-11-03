'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ShieldCheck, Building2, UserCheck, Users, Lock, Mail, ArrowRight, AlertCircle, Sparkles 
} from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    role: 'SUPER_ADMIN',
    label: 'Super Admin',
    desc: 'Platform owner, agencies & revenue',
    email: 'admin@renewhq.com',
    password: 'admin123',
    icon: ShieldCheck,
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  },
  {
    role: 'AGENCY_ADMIN',
    label: 'Agency Admin',
    desc: 'Full agency client & service control',
    email: 'pixeladmin@pixelcraft.com',
    password: 'pixel123',
    icon: Building2,
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  },
  {
    role: 'STAFF',
    label: 'Agency Staff',
    desc: 'Assigned clients & renewals',
    email: 'staff@pixelcraft.com',
    password: 'staff123',
    icon: Users,
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  {
    role: 'CLIENT',
    label: 'Client Portal',
    desc: 'Invoices, renewals & UPI payments',
    email: 'client1@acmax.com',
    password: 'client123',
    icon: UserCheck,
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
];

export default function UniversalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fillDemo = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      const user = data.user;
      const host = window.location.host;
      const isSubdomainHost = host.includes('.localhost') || host.includes('.renewhq.com');
      const agencySubdomain = user.subdomain || 'pixelcraft';
      const agencyPrefix = isSubdomainHost ? '' : `/agency/${agencySubdomain}`;

      if (user.role === 'SUPER_ADMIN') {
        router.push('/super-admin');
      } else if (user.role === 'CLIENT') {
        router.push(`${agencyPrefix}/client/dashboard`);
      } else {
        router.push(`${agencyPrefix}/dashboard`);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <Link href="/" className="inline-flex items-center space-x-3 group">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
            R
          </div>
          <span className="text-2xl font-black tracking-tight text-white">RenewHQ</span>
        </Link>
        <h2 className="mt-4 text-3xl font-extrabold text-white tracking-tight">
          Sign In to Your Workspace
        </h2>
        <p className="mt-2 text-xs text-slate-400">
          Access your agency management console, staff portal, or client renewals.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 border border-slate-800 py-8 px-6 sm:px-10 rounded-2xl shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3 text-red-400 text-sm">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@renewhq.com"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
                />
                <Mail className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-500" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
                />
                <Lock className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                <span>Instant Demo Accounts</span>
              </span>
              <span className="text-[10px] text-slate-500">1-Click Auto Fill</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                const isSelected = email === acc.email;
                return (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => fillDemo(acc)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected 
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md' 
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">{acc.label}</span>
                      <Icon className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                    <span className="text-[10px] text-slate-400 truncate font-mono">
                      {acc.email}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-400">
            New agency?{' '}
            <Link href="/#register" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
              Create an agency account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
