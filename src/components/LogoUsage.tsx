"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";
import { FaImage } from 'react-icons/fa';

interface LogoUsageProps {
  type: 'main' | 'favicon' | 'receiptLogo' | 'etimsQrCode' | 'watermark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallback?: React.ReactNode;
  showPlaceholder?: boolean;
  alt?: string;
}

interface LogoData {
  mainLogo: string | null;
  favicon: string | null;
  receiptLogo: string | null;
  etimsQrCode: string | null;
  watermark: string | null;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24'
};

const logoTypeMap = {
  main: 'mainLogo',
  favicon: 'favicon',
  receiptLogo: 'receiptLogo',
  etimsQrCode: 'etimsQrCode',
  watermark: 'watermark'
} as const;

export default function LogoUsage({ 
  type, 
  size = 'md', 
  className = "", 
  fallback,
  showPlaceholder = true,
  alt
}: LogoUsageProps) {
  const [logoData, setLogoData] = useState<LogoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchLogos = async () => {
      try {
        const data = await apiGet<LogoData>("/tenant/logo/usage");
        setLogoData(data);
      } catch (err) {
        console.error("Error fetching logo usage:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchLogos();
  }, []);

  if (loading) {
    return (
      <div className={`${sizeClasses[size]} bg-gray-200 rounded animate-pulse ${className}`} />
    );
  }

  if (error || !logoData) {
    return fallback || (
      <div className={`${sizeClasses[size]} bg-gray-100 rounded flex items-center justify-center ${className}`}>
        <FaImage className="text-gray-400 w-4 h-4" />
      </div>
    );
  }

  const logoUrl = logoData[logoTypeMap[type]];
  
  if (!logoUrl) {
    if (showPlaceholder) {
      return (
        <div className={`${sizeClasses[size]} bg-gray-100 rounded flex items-center justify-center ${className}`}>
          <FaImage className="text-gray-400 w-4 h-4" />
        </div>
      );
    }
    return null;
  }

  return (
    <img
      src={logoUrl}
      alt={alt || `${type} logo`}
      className={`${sizeClasses[size]} object-contain ${className}`}
      onError={() => setError(true)}
    />
  );
}

// Specialized components for common use cases
export function MainLogo({ size = 'md', className = "" }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  return <LogoUsage type="main" size={size} className={className} alt="Main logo" />;
}

export function ReceiptLogo({ size = 'md', className = "" }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  return <LogoUsage type="receiptLogo" size={size} className={className} alt="Receipt logo" />;
}

export function EtimsQrCode({ size = 'md', className = "" }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  return <LogoUsage type="etimsQrCode" size={size} className={className} alt="KRA eTIMS QR Code" />;
}

export function Favicon({ size = 'sm', className = "" }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  return <LogoUsage type="favicon" size={size} className={className} alt="Favicon" />;
}

export function Watermark({ size = 'lg', className = "" }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  return <LogoUsage type="watermark" size={size} className={className} alt="Watermark" />;
}

// Hook for getting logo data
export function useLogoData() {
  const [logoData, setLogoData] = useState<LogoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogos = async () => {
      try {
        const data = await apiGet<LogoData>("/tenant/logo/usage");
        setLogoData(data);
      } catch (err) {
        console.error("Error fetching logo data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogos();
  }, []);

  return { logoData, loading };
} 