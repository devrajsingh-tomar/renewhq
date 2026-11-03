'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, ArrowRight, AlertCircle, Building2, UserCheck, Users, Sparkles } from 'lucide-react';

export default function TenantLoginPage() {
  const router = useRouter();
  const params = useParams();
  const subdomain = params?.subdomain as string;

  const [agencyName, setAgencyName] = useState('Agency Portal');
  const [logoUrl, setLogoUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (subdomain) {
      setAgencyName(subdomain.charAt(0).toUpperCase() + subdomain.slice(1) + ' Studios');
    }
  }, [subdomain]);

  const fillQuick = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
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
        body: JSON.stringify({ email, password, subdomain }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      const role = data.user.role;
      const host = window.location.host;
      const isSubdomainHost = host.includes('.localhost') || host.includes('.renewhq.com');
      const agencyPrefix = isSubdomainHost ? '' : `/agency/${subdomain}`;

      if (role === 'SUPER_ADMIN') {
        router.push('/super-admin');
      } else if (role === 'CLIENT') {
        router.push(`${agencyPrefix}/client/dashboard`);
      } else {
        router.push(`${agencyPrefix}/dashboard`);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 text-slate-100 selection:bg-indigo-500 selection:text-white">
      <div className="max-w-md w-full space-y-8 bg-slate-900/90 border border-slate-800 p-8 rounded-2xl shadow-2xl backdrop-blur-xl">
        <div className="text-center">
          {logoUrl ? (
            <img className="mx-auto h-12 w-auto" src={logoUrl} alt={agencyName} />
          ) : (
            <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-600/30">
              {agencyName.charAt(0)}
            </div>
          )}
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
            Welcome to {agencyName}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Sign in to manage client renewals, services, and billing.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3 text-red-400 text-sm">
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
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pixeladmin@pixelcraft.com"
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
                name="password"
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
                <span>Sign In to Agency</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Switcher */}
        <div className="pt-6 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Demo Accounts</span>
            </span>
            <span className="text-[10px] text-slate-500">Click to fill</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillQuick('pixeladmin@pixelcraft.com', 'pixel123')}
              className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:bg-slate-800 hover:border-indigo-500 text-left transition-all group"
            >
              <div className="flex items-center space-x-1 text-xs font-bold text-white mb-0.5">
                <Building2 className="h-3 w-3 text-indigo-400" />
                <span>Admin</span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate">pixeladmin@</span>
            </button>

            <button
              type="button"
              onClick={() => fillQuick('staff@pixelcraft.com', 'staff123')}
              className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:bg-slate-800 hover:border-emerald-500 text-left transition-all group"
            >
              <div className="flex items-center space-x-1 text-xs font-bold text-white mb-0.5">
                <Users className="h-3 w-3 text-emerald-400" />
                <span>Staff</span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate">staff@</span>
            </button>

            <button
              type="button"
              onClick={() => fillQuick('client1@acmax.com', 'client123')}
              className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:bg-slate-800 hover:border-amber-500 text-left transition-all group"
            >
              <div className="flex items-center space-x-1 text-xs font-bold text-white mb-0.5">
                <UserCheck className="h-3 w-3 text-amber-400" />
                <span>Client</span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate">client1@</span>
            </button>
          </div>
        </div>

        <div className="text-center pt-2">
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            ← Back to RenewHQ Home
          </Link>
        </div>
      </div>
    </div>
  );
}
