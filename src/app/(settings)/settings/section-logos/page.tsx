"use client";
import { useState, useEffect } from 'react';

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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sections, setSections] = useState<SectionConfig>({
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

  useEffect(() => {
    fetchSectionLogos();
  }, []);

  const fetchSectionLogos = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/tenant/section-logos');
      if (!response.ok) {
        throw new Error('Failed to fetch section logos');
      }
      const data = await response.json();
      setSections(prev => ({
        ...prev,
        ...data
      }));
    } catch (error) {
      console.error('Error fetching section logos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, section: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('width', sections[section].dimensions.width?.toString() || '200');
    formData.append('height', sections[section].dimensions.height?.toString() || '50');
    formData.append('altText', `Logo for ${section} section`);

    try {
      setIsLoading(true);
      const response = await fetch(`/api/tenant/section-logos/upload/${section}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload logo');
      }

      const data = await response.json();
      
      setSections(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          logo: data
        }
      }));

    } catch (error) {
      console.error('Error uploading logo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateConfig = async (section: string, updates: Partial<SectionConfig[string]>) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/tenant/section-logos/${section}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update section configuration');
      }

      setSections(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          ...updates
        }
      }));

    } catch (error) {
      console.error('Error updating section config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveLogo = async (section: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/tenant/section-logos/${section}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove logo');
      }

      setSections(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          logo: null
        }
      }));

    } catch (error) {
      console.error('Error removing logo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDimensionChange = (section: string, dimension: 'width' | 'height', value: string) => {
    const numValue = parseInt(value, 10) || 0;
    const newDimensions = {
      ...sections[section].dimensions,
      [dimension]: numValue > 0 ? numValue : undefined
    };

    handleUpdateConfig(section, {
      dimensions: newDimensions
    });
  };

  const handlePositionChange = (section: string, position: string) => {
    handleUpdateConfig(section, { position });
  };

  const handleToggleEnabled = (section: string, enabled: boolean) => {
    handleUpdateConfig(section, { enabled });
  };

  const sectionTabs = [
    { id: 'login', label: 'Login Page' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'email', label: 'Email Templates' },
    { id: 'mobile', label: 'Mobile App' },
  ];

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