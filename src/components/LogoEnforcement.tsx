"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";
import { FaExclamationTriangle, FaCheckCircle, FaInfoCircle, FaUpload } from 'react-icons/fa';
import Link from "next/link";

interface LogoCompliance {
  compliant: boolean;
  missing: string[];
  recommendations: string[];
}

interface LogoStatistics {
  totalLogos: number;
  requiredLogos: number;
  optionalLogos: number;
  complianceScore: number;
}

interface LogoEnforcementProps {
  showBanner?: boolean;
  showStats?: boolean;
  redirectToSettings?: boolean;
  className?: string;
}

export default function LogoEnforcement({ 
  showBanner = true, 
  showStats = false, 
  redirectToSettings = true,
  className = "" 
}: LogoEnforcementProps) {
  const [compliance, setCompliance] = useState<LogoCompliance | null>(null);
  const [statistics, setStatistics] = useState<LogoStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompliance = async () => {
      try {
        const [complianceData, statsData] = await Promise.all([
          apiGet<LogoCompliance>("/tenant/logo/compliance"),
          showStats ? apiGet<LogoStatistics>("/tenant/logo/statistics") : null
        ]);
        
        setCompliance(complianceData);
        if (statsData) setStatistics(statsData);
      } catch (err) {
        console.error("Error fetching logo compliance:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompliance();
  }, [showStats]);

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (!compliance) {
    return null;
  }

  const isNonCompliant = !compliance.compliant && compliance.missing.length > 0;

  return (
    <div className={className}>
      {/* Compliance Banner */}
      {showBanner && isNonCompliant && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <FaExclamationTriangle className="text-yellow-600 text-lg mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800 mb-1">
                Logo Compliance Required
              </h3>
              <p className="text-sm text-yellow-700 mb-2">
                Your business is missing required logos for compliance:
              </p>
              <ul className="text-sm text-yellow-700 mb-3">
                {compliance.missing.map((item, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></span>
                    {item}
                  </li>
                ))}
              </ul>
              {redirectToSettings && (
                <Link 
                  href="/settings/logo" 
                  className="inline-flex items-center gap-2 text-sm font-medium text-yellow-800 hover:text-yellow-900 bg-yellow-100 hover:bg-yellow-200 px-3 py-1.5 rounded-md transition"
                >
                  <FaUpload className="w-3 h-3" />
                  Upload Required Logos
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Compliance Success */}
      {showBanner && compliance.compliant && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <FaCheckCircle className="text-green-600 text-lg mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-green-800 mb-1">
                Logo Compliance Complete
              </h3>
              <p className="text-sm text-green-700">
                All required logos are uploaded and your business is compliant.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      {showStats && statistics && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-800 mb-3">Logo Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{statistics.totalLogos}</div>
              <div className="text-xs text-gray-600">Total Logos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{statistics.requiredLogos}</div>
              <div className="text-xs text-gray-600">Required</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{statistics.optionalLogos}</div>
              <div className="text-xs text-gray-600">Optional</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{statistics.complianceScore}%</div>
              <div className="text-xs text-gray-600">Compliance</div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {compliance.recommendations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <FaInfoCircle className="text-blue-600 text-lg mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Recommendations</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                {compliance.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for checking logo compliance
export function useLogoCompliance() {
  const [compliance, setCompliance] = useState<LogoCompliance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompliance = async () => {
      try {
        const data = await apiGet<LogoCompliance>("/tenant/logo/compliance");
        setCompliance(data);
      } catch (err) {
        console.error("Error fetching logo compliance:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompliance();
  }, []);

  return { compliance, loading };
}

// Component for showing compliance status in headers/navbars
export function LogoComplianceBadge() {
  const { compliance, loading } = useLogoCompliance();

  if (loading || !compliance) {
    return null;
  }

  if (compliance.compliant) {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <FaCheckCircle className="w-3 h-3" />
        <span className="text-xs font-medium">Compliant</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-yellow-600">
      <FaExclamationTriangle className="w-3 h-3" />
      <span className="text-xs font-medium">Action Required</span>
    </div>
  );
} 