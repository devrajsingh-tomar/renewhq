'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

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

  // Fetch agency branding on mount
  useEffect(() => {
    async function fetchBranding() {
      try {
        const res = await fetch(`/api/auth/me`);
        const data = await res.json();
        // Or fetch agency info directly. Let's fetch the current tenant info from the server.
        const agencyRes = await fetch(`/api/auth/me`); // For now we can fetch config, or just query a public path.
        // We will call a helper to get agency name
      } catch (err) {
        // use fallback
      }
    }
    
    // To make it robust and not block, we can parse the subdomain and capitalized it
    if (subdomain) {
      setAgencyName(subdomain.charAt(0).toUpperCase() + subdomain.slice(1) + ' Portal');
    }
  }, [subdomain]);

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
      if (role === 'SUPER_ADMIN') {
        router.push('/super-admin');
      } else if (role === 'CLIENT') {
        router.push(`/client/dashboard`);
      } else {
        router.push(`/dashboard`);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <div>
          {logoUrl ? (
            <img className="mx-auto h-12 w-auto" src={logoUrl} alt={agencyName} />
          ) : (
            <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-600/30">
              {agencyName.charAt(0)}
            </div>
          )}
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
            Welcome to {agencyName}
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500">
            Manage your renewals and billing operations
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email-address" className="text-xs font-semibold text-slate-600 uppercase">
                Email Address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-3 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all sm:text-sm"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-xs font-semibold text-slate-600 uppercase">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-3 border border-slate-200 placeholder-slate-400 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : 'Sign In'}
            </button>
          </div>
        </form>
        
        <div className="text-center mt-4">
          <p className="text-xs text-slate-400">
            For demo: Agency Admin: <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-semibold">pixeladmin@pixelcraft.com</code> / password <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-semibold">pixel123</code>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Client Portal: <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-semibold">client1@acmax.com</code> / password <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-semibold">client123</code>
          </p>
        </div>
      </div>
    </div>
  );
}
