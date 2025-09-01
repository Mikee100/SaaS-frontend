"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";
import { FaExclamationTriangle, FaUpload } from "react-icons/fa";
import Link from "next/link";

interface LogoComplianceGuardProps {
  children: React.ReactNode;
  requiredLogos?: string[];
  showWarning?: boolean;
  redirectToSettings?: boolean;
}

interface ComplianceData {
  compliant: boolean;
  missing: string[];
  recommendations: string[];
}

export default function LogoComplianceGuard({ 
  children, 
  requiredLogos = ['mainLogo'],
  showWarning = true,
  redirectToSettings = true 
}: LogoComplianceGuardProps) {
  const [compliance, setCompliance] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompliance = async () => {
      try {
        const data = await apiGet<ComplianceData>("/tenant/logo/compliance");
        setCompliance(data);
      } catch (err) {
        console.error("Error fetching logo compliance:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompliance();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>;
  }

  if (!compliance) {
    return <>{children}</>;
  }

  // Check if any required logos are missing
  const hasMissingRequiredLogos = requiredLogos.some(logoType => 
    compliance.missing.some(missing => 
      missing.toLowerCase().includes(logoType.toLowerCase())
    )
  );

  if (!compliance.compliant && hasMissingRequiredLogos && showWarning) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <FaExclamationTriangle className="text-yellow-600 text-2xl" />
            <h2 className="text-xl font-bold text-gray-900">Logo Compliance Required</h2>
          </div>
          
          <p className="text-gray-600 mb-4">
            This page requires certain logos to be uploaded for proper functionality and compliance.
          </p>
          
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Missing Logos:</h3>
            <ul className="space-y-1">
              {compliance.missing.map((logo, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                  {logo}
                </li>
              ))}
            </ul>
          </div>
          
          {redirectToSettings && (
            <div className="space-y-3">
              <Link 
                href="/settings/logo"
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <FaUpload className="w-4 h-4" />
                Upload Required Logos
              </Link>
              <button 
                onClick={() => window.history.back()}
                className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition"
              >
                Go Back
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Hook for checking if logos are required for current page
export function useLogoRequirements() {
  const [requirements, setRequirements] = useState<{
    required: string[];
    optional: string[];
  } | null>(null);

  useEffect(() => {
    const checkRequirements = async () => {
      try {
        const data = await apiGet("/tenant/logo/validation");
        setRequirements({
          required: data.requirements ? Object.keys(data.requirements).filter(key => data.requirements[key]) : [],
          optional: data.requirements ? Object.keys(data.requirements).filter(key => !data.requirements[key]) : []
        });
      } catch (err) {
        console.error("Error checking logo requirements:", err);
      }
    };

    checkRequirements();
  }, []);

  return requirements;
} 