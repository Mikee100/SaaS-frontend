"use client";
import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/api';
import { FaCog, FaShieldAlt, FaGlobe, FaEnvelope, FaTools, FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash, FaSearch, FaDownload, FaRedo, FaExclamationTriangle } from 'react-icons/fa';

interface ConfigurationItem {
  key: string;
  value: string;
  description?: string;
  category: 'security' | 'api' | 'external_services' | 'email' | 'general';
  isEncrypted: boolean;
  isPublic: boolean;
}

interface Category {
  value: string;
  label: string;
}

export default function ConfigurationsPage() {
  const [configurations, setConfigurations] = useState<ConfigurationItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ConfigurationItem>>({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<Partial<ConfigurationItem>>({});
  const [showEncryptedValues, setShowEncryptedValues] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConfigs, setSelectedConfigs] = useState<string[]>([]);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const categoryIcons = {
    security: FaShieldAlt,
    api: FaGlobe,
    external_services: FaTools,
    email: FaEnvelope,
    general: FaCog,
  };

  const fetchConfigurations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const endpoint = selectedCategory === 'all'
        ? '/admin/configurations'
        : `/admin/configurations/category/${selectedCategory}`;
      const data = await apiGet(endpoint);
      setConfigurations(data as ConfigurationItem[]);
    } catch (error) {
      console.error('Failed to fetch configurations:', error);
      setError('Failed to load configurations');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await apiGet('/admin/configurations/categories/list');
      setCategories(data as Category[]);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, []);

  useEffect(() => {
    fetchConfigurations();
    fetchCategories();
  }, [fetchConfigurations, fetchCategories]);

  const handleEdit = (config: ConfigurationItem) => {
    setEditingKey(config.key);
    setEditForm({
      value: config.isEncrypted ? '' : config.value,
      description: config.description,
      category: config.category,
      isEncrypted: config.isEncrypted,
      isPublic: config.isPublic,
    });
  };

  const handleSave = async () => {
    if (!editingKey) return;
    
    try {
      setError(null);
      await apiPut(`/admin/configurations/${editingKey}`, editForm);
      setEditingKey(null);
      setEditForm({});
      fetchConfigurations();
      setSuccess('Configuration updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to update configuration:', error);
      setError('Failed to update configuration');
    }
  };

  const handleCreate = async () => {
    if (!createForm.key || !createForm.value || !createForm.category) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setError(null);
      await apiPost('/admin/configurations', createForm);
      setShowCreateForm(false);
      setCreateForm({});
      fetchConfigurations();
      setSuccess('Configuration created successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to create configuration:', error);
      setError('Failed to create configuration');
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm('Are you sure you want to delete this configuration? This action cannot be undone.')) return;
    
    try {
      setError(null);
      await apiDelete(`/admin/configurations/${key}`);
      fetchConfigurations();
      setSuccess('Configuration deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to delete configuration:', error);
      setError('Failed to delete configuration');
    }
  };

  const initializeDefaults = async () => {
    if (!confirm('This will initialize default configurations. Any existing configurations will be preserved. Continue?')) return;
    
    try {
      setError(null);
      await apiPost('/admin/configurations/initialize', {});
      fetchConfigurations();
      setSuccess('Default configurations initialized successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to initialize configurations:', error);
      setError('Failed to initialize configurations');
    }
  };

  const exportConfigurations = async () => {
    try {
      const data = await apiGet('/admin/configurations');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `configurations-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export configurations:', error);
      setError('Failed to export configurations');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedConfigs.length) return;
    if (!confirm(`Are you sure you want to delete ${selectedConfigs.length} configuration(s)?`)) return;
    
    try {
      setError(null);
      for (const key of selectedConfigs) {
        await apiDelete(`/admin/configurations/${key}`);
      }
      setSelectedConfigs([]);
      fetchConfigurations();
      setSuccess(`${selectedConfigs.length} configuration(s) deleted successfully`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to delete configurations:', error);
      setError('Failed to delete some configurations');
    }
  };

  const getCategoryIcon = (category: string) => {
    const IconComponent = categoryIcons[category as keyof typeof categoryIcons] || FaCog;
    return <IconComponent className="w-4 h-4" />;
  };

  const filteredConfigurations = configurations.filter(config => 
    config.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    config.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    config.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FaCog className="text-blue-600 text-2xl" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Configurations</h1>
            <p className="text-gray-600 mt-1">Manage all system settings and configurations</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Advanced Options
          </button>
          <button
            onClick={() => setShowEncryptedValues(!showEncryptedValues)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {showEncryptedValues ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
            {showEncryptedValues ? 'Hide' : 'Show'} Encrypted
          </button>
          <button
            onClick={initializeDefaults}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
          >
            Initialize Defaults
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <FaPlus className="w-4 h-4" />
            Add Configuration
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-800">
            <FaCog className="w-4 h-4" />
            {success}
          </div>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <FaExclamationTriangle className="w-4 h-4" />
            {error}
          </div>
        </div>
      )}

      {/* Advanced Options */}
      {showAdvancedOptions && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Advanced Operations</h3>
          <div className="flex gap-4">
            <button
              onClick={exportConfigurations}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 flex items-center gap-2"
            >
              <FaDownload className="w-4 h-4" />
              Export All
            </button>
            <button
              onClick={fetchConfigurations}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 flex items-center gap-2"
            >
              <FaRedo className="w-4 h-4" />
              Refresh
            </button>
            {selectedConfigs.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2"
              >
                <FaTrash className="w-4 h-4" />
                Delete Selected ({selectedConfigs.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search configurations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Categories ({configurations.length})
          </button>
          {categories.map((category) => {
            const count = configurations.filter(c => c.category === category.value).length;
            return (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                  selectedCategory === category.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {getCategoryIcon(category.value)}
                {category.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Configurations List */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedConfigs.length === filteredConfigurations.length && filteredConfigurations.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedConfigs(filteredConfigurations.map(c => c.key));
                      } else {
                        setSelectedConfigs([]);
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Key
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Properties
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredConfigurations.map((config) => (
                <tr key={config.key} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedConfigs.includes(config.key)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedConfigs([...selectedConfigs, config.key]);
                        } else {
                          setSelectedConfigs(selectedConfigs.filter(k => k !== config.key));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {config.key}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {editingKey === config.key ? (
                      <input
                        type="text"
                        value={editForm.value || ''}
                        onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
                        className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      <span className="font-mono text-xs">
                        {config.isEncrypted && !showEncryptedValues ? '[ENCRYPTED]' : config.value}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(config.category)}
                      <span className="capitalize">{config.category.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {editingKey === config.key ? (
                      <input
                        type="text"
                        value={editForm.description || ''}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      config.description || '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex gap-1">
                      {config.isEncrypted && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Encrypted</span>
                      )}
                      {config.isPublic && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Public</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {editingKey === config.key ? (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          className="text-green-600 hover:text-green-900"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingKey(null);
                            setEditForm({});
                          }}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(config)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <FaEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(config.key)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredConfigurations.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'No configurations match your search.' : 'No configurations found.'}
          </div>
        )}
      </div>

      {/* Create Configuration Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add New Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key *</label>
                <input
                  type="text"
                  value={createForm.key || ''}
                  onChange={(e) => setCreateForm({ ...createForm, key: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="CONFIG_KEY"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value *</label>
                <input
                  type="text"
                  value={createForm.value || ''}
                  onChange={(e) => setCreateForm({ ...createForm, value: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Configuration value"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={createForm.category || ''}
                  onChange={(e) => setCreateForm({ ...createForm, category: e.target.value as ConfigurationItem['category'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={createForm.description || ''}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Optional description"
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={createForm.isEncrypted || false}
                    onChange={(e) => setCreateForm({ ...createForm, isEncrypted: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Encrypted</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={createForm.isPublic || false}
                    onChange={(e) => setCreateForm({ ...createForm, isPublic: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Public</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setCreateForm({});
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}