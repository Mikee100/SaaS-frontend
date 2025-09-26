"use client";
import { useState} from 'react';

interface SectionLogo {
  url: string;
  altText?: string;
  width?: number;
  height?: number;
}

interface SectionConfig {
  [key: string]: {
    logo: SectionLogo | null;
    enabled: boolean;
    position: string;
    dimensions: {
      width?: number;
      height?: number;
    };
  };
}

export default function SectionLogosPage() {
  const [sections] = useState<SectionConfig>({
    login: {
      logo: null,
      enabled: true,
      position: 'center',
      dimensions: { width: 200, height: 50 }
    },
    dashboard: {
      logo: null,
      enabled: true,
      position: 'left',
      dimensions: { width: 180, height: 45 }
    },
    email: {
      logo: null,
      enabled: true,
      position: 'center',
      dimensions: { width: 200, height: 50 }
    },
    mobile: {
      logo: null,
      enabled: true,
      position: 'center',
      dimensions: { width: 120, height: 30 }
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Section Logos</h3>
        <p className="text-sm text-muted-foreground">
          Customize logos for different sections of your application
        </p>
      </div>

      <pre>{JSON.stringify(sections, null, 2)}</pre>
    </div>
  );
}