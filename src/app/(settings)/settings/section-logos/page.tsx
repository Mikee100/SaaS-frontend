"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Icons } from '@/components/icons';
import { Loader } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<string>('login');
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
      toast('Error: Failed to load section logos');
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

      toast('Logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast('Error: Failed to upload logo');
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

      toast('Section configuration updated');
    } catch (error) {
      console.error('Error updating section config:', error);
      toast('Error: Failed to update section configuration');
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

      toast('Logo removed successfully');
    } catch (error) {
      console.error('Error removing logo:', error);
      toast('Error: Failed to remove logo');
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

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          {sectionTabs.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {sectionTabs.map(tab => {
          const section = sections[tab.id];
          if (!section) return null;

          return (
            <TabsContent key={tab.id} value={tab.id} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{tab.label} Logo</CardTitle>
                  <CardDescription>
                    Customize the logo that appears in the {tab.label.toLowerCase()} section
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="relative w-32 h-16 bg-muted rounded-md overflow-hidden flex items-center justify-center">
                      {section.logo?.url ? (
                        <img
                          src={section.logo.url}
                          alt={section.logo.altText || `${tab.id} logo`}
                          className="max-w-full max-h-full object-contain"
                          style={{
                            width: section.dimensions?.width ? `${section.dimensions.width}px` : '100%',
                            height: section.dimensions?.height ? `${section.dimensions.height}px` : '100%',
                            objectFit: 'contain',
                            objectPosition: section.position || 'center'
                          }}
                        />
                      ) : (
                        <div className="text-muted-foreground text-sm">
                          No logo uploaded
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isLoading}
                          onClick={() => document.getElementById(`file-upload-${tab.id}`)?.click()}
                        >
                          {isLoading ? (
                            <Loader className="mr-2 h-4 w-4 animate-spin" />
                          ) : section.logo?.url ? (
                            'Change Logo'
                          ) : (
                            'Upload Logo'
                          )}
                        </Button>
                        <input
                          id={`file-upload-${tab.id}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, tab.id)}
                          disabled={isLoading}
                        />
                        {section.logo?.url && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isLoading}
                            onClick={() => handleRemoveLogo(tab.id)}
                            
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Recommended size: {section.dimensions?.width || 200}×{section.dimensions?.height || 50}px
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`${tab.id}-width`}>Width (px)</Label>
                      <Input
                        id={`${tab.id}-width`}
                        type="number"
                        value={section.dimensions?.width || ''}
                        onChange={(e) => handleDimensionChange(tab.id, 'width', e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${tab.id}-height`}>Height (px)</Label>
                      <Input
                        id={`${tab.id}-height`}
                        type="number"
                        value={section.dimensions?.height || ''}
                        onChange={(e) => handleDimensionChange(tab.id, 'height', e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Position</Label>
                    <div className="flex space-x-2">
                      {['left', 'center', 'right'].map((pos) => (
                        <Button
                          key={pos}
                          variant={section.position === pos ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePositionChange(tab.id, pos)}
                          disabled={isLoading}
                        >
                          {pos.charAt(0).toUpperCase() + pos.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`${tab.id}-enabled`}
                      checked={section.enabled}
                      onChange={(e) => handleToggleEnabled(tab.id, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      disabled={isLoading}
                    />
                    <Label htmlFor={`${tab.id}-enabled`} className="text-sm font-medium">
                      Show {tab.label} Logo
                    </Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}