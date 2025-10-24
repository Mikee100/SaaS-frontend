"use client";
import { useState, useEffect } from 'react';
import { FaUser, FaPhone, FaHistory, FaPlus, FaSearch, FaTimes, FaEdit, FaTrash } from 'react-icons/fa';
import { apiGet, apiPost } from '@/utils/api';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  totalSpent: number;
  lastVisit: string;
  visitCount: number;
}

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: Customer) => void;
  selectedCustomer?: Customer | null;
}

export default function CustomerModal({ isOpen, onClose, onSelectCustomer, selectedCustomer }: CustomerModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
    }
  }, [isOpen]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await apiGet('/users/customers');
      setCustomers(data as Customer[]);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async () => {
    try {
      setLoading(true);
      const customer = await apiPost('/users/customers', newCustomer) as Customer;
      setCustomers(prev => [customer, ...prev]);
      setNewCustomer({ name: '', phone: '', email: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add customer:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white bg-opacity-95 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <FaUser className="text-blue-600" />
            Customer Management
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Search and Add */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <FaPlus className="w-4 h-4" />
              Add Customer
            </button>
          </div>

          {/* Add Customer Form */}
          {showAddForm && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-3">Add New Customer</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Name</label>
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Customer name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Phone number"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Email address"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleAddCustomer}
                  disabled={loading || !newCustomer.name || !newCustomer.phone}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Customer'}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Customers List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading customers...</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FaUser className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No customers found</p>
                {searchTerm && <p className="text-sm">Try adjusting your search</p>}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCustomers.map(customer => (
                  <div
                    key={customer.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedCustomer?.id === customer.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                    onClick={() => onSelectCustomer(customer)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-800">{customer.name}</h4>
                          {selectedCustomer?.id === customer.id && (
                            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                              Selected
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <FaPhone className="w-3 h-3" />
                            {customer.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <FaHistory className="w-3 h-3" />
                            {customer.visitCount} visits
                          </span>
                          <span className="text-green-600 font-medium">
                            ${customer.totalSpent.toFixed(2)} spent
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Edit customer
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          <FaEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Delete customer
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            {selectedCustomer && (
              <button
                onClick={() => {
                  onSelectCustomer(selectedCustomer);
                  onClose();
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Select Customer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 