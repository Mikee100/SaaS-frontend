"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";
import { FaImage, FaSpinner } from 'react-icons/fa';
import { useUser } from "./UserContext";
import Image from 'next/image';

interface LogoUsageProps {
  type?: 'main' | 'favicon' | 'receiptLogo' | 'etimsQrCode' | 'watermark';
  section?: 'login' | 'dashboard' | 'email' | 'mobile' | string;
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
  sectionLogos?: {
    [key: string]: {
      url: string;
      altText?: string;
      width?: number;
      height?: number;
    } | null;
  };
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
} as const;

const logoTypeMap = {
  main: 'mainLogo',
  favicon: 'favicon',
  receiptLogo: 'receiptLogo',
  etimsQrCode: 'etimsQrCode',
  watermark: 'watermark',
} as const;

export default function LogoUsage({ 
  type, 
  section,
  size = 'md', 
  className = "", 
  fallback,
  showPlaceholder = true,
  alt
}: LogoUsageProps) {
  const [logoData, setLogoData] = useState<LogoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { user } = useUser();


  useEffect(() => {
    const fetchLogo = async () => {
      try {
        let url = '/api/tenant/logo/usage';
        if (section) {
          url = `/api/tenant/section-logos/${section}`;
        }
        const data = await apiGet<LogoData>(url);
        setLogoData(data);
      } catch (err) {
        console.error('Error fetching logo:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchLogo();
  }, [section, user?.tenantId]);

  if (loading) {
    return fallback || (
      <div className={`${sizeClasses[size]} bg-gray-100 rounded flex items-center justify-center ${className}`}>
        <FaSpinner className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${sizeClasses[size]} bg-gray-100 rounded flex items-center justify-center ${className}`}>
        <FaImage className="text-gray-400 w-4 h-4" />
      </div>
    );
  }

  // Handle section-based logos
  if (section && logoData?.sectionLogos?.[section]?.url) {
    const sectionLogo = logoData.sectionLogos[section];
    return (
      <Image
        src={sectionLogo.url}
        alt={sectionLogo.altText || alt || `${section} logo`}
        className={`${sizeClasses[size]} object-contain ${className}`}
        width={sectionLogo.width}
        height={sectionLogo.height}
        onError={() => setError(true)}
      />
    );
  }

  // Fall back to type-based logo if section logo not found
  const logoUrl = type && logoData ? logoData[logoTypeMap[type]] : null;
  
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
    <Image
      src={logoUrl}
      alt={alt || `${type} logo`}
      className={`${sizeClasses[size]} object-contain ${className}`}
      onError={() => setError(true)}
      width={64} // or your preferred width
      height={64} // or your preferred height
    />
  );
}

// Specialized components for common use cases
export function MainLogo({ size = 'md', className = "" }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  return <LogoUsage type="main" size={size} className={className} alt="Main logo" />;
}

export function ReceiptLogo({ size = 'md', className = "" }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  return <LogoUsage section="receipt" size={size} className={className} alt="Receipt logo" />;
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