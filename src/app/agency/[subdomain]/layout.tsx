import React from 'react';
import { notFound } from 'next/navigation';
import db from '@/lib/db';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ subdomain: string }>;
}

export default async function TenantLayout({ children, params }: LayoutProps) {
  const { subdomain } = await params;

  let agency = null;
  try {
    agency = await db.agency.findUnique({
      where: { subdomain },
    });
  } catch (err) {
    console.warn("Database offline. Falling back to mock demo agency metadata.", err);
    if (subdomain === 'pixelcraft') {
      agency = {
        id: 'mock-pixelcraft-id',
        name: 'Pixelcraft Studios',
        subdomain: 'pixelcraft',
        logoUrl: '',
        primaryColor: '#4F46E5',
        customDomain: null,
        status: 'ACTIVE',
        planId: 'professional-plan',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  if (!agency) {
    notFound();
  }

  if (agency.status === 'BLOCKED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-red-100 p-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Agency Suspended</h2>
          <p className="text-slate-600">
            The agency portal for <strong>{agency.name}</strong> is currently locked. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  const primaryColor = agency.primaryColor || '#4F46E5';

  // We convert hex to HSL format so it works cleanly with our globals.css hsl() format
  // For simplicity, we can also inject raw style overrides for tailwind classes or override --primary directly
  return (
    <div
      style={{
        '--primary': '242 78% 60%', // fallback base hsl
        '--primary-hex': primaryColor,
      } as React.CSSProperties}
      className="min-h-screen bg-slate-50/50 text-slate-900"
    >
      {/* We inject style override to force custom primary color dynamically */}
      <style dangerouslySetInnerHTML={{__html: `
        :root {
          --primary: ${hexToHsl(primaryColor)};
          --ring: ${hexToHsl(primaryColor)};
        }
      `}} />
      {children}
    </div>
  );
}

// Helper to convert HEX to HSL values for Tailwind v4 compatibility
function hexToHsl(hex: string): string {
  // Remove hash
  hex = hex.replace('#', '');
  
  // Parse r, g, b
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
