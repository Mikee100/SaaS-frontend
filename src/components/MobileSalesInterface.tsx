"use client";
import { useState, useEffect } from 'react';
import { FaPlus, FaMinus, FaTrash, FaCalculator, FaCreditCard, FaMoneyBillWave, FaMobile } from 'react-icons/fa';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category?: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface MobileSalesInterfaceProps {
  products: Product[];
  cart: CartItem[];
  onAddToCart: (product: Product) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onCheckout: () => void;
  total: number;
  isOffline?: boolean;
}

export default function MobileSalesInterface({
  products,
  cart,
  onAddToCart,
  onUpdateQuantity,
  onRemoveFromCart,
  onCheckout,
  total,
  isOffline = false
}: MobileSalesInterfaceProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCart, setShowCart] = useState(false);

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedCategory === 'all' || product.category === selectedCategory)
  );

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category || '').filter(Boolean)))];

  return (
    <div className="lg:hidden">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Sales</h1>
          <button
            onClick={() => setShowCart(!showCart)}
            className="relative p-2 bg-blue-600 text-white rounded-lg"
          >
            <FaCalculator className="w-5 h-5" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="mt-3">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category Filter */}
        <div className="mt-3 flex space-x-2 overflow-x-auto">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {category === 'all' ? 'All' : category}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-32 pb-20 px-4">
        {/* Products Grid */}
        <div className="grid grid-cols-2 gap-4">
          {filteredProducts.map(product => (
            <div
              key={product.id}
              className={`bg-white border rounded-lg p-4 ${
                product.stock > 0 ? 'border-gray-200' : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2">
                  {product.name}
                </h3>
                <p className="text-lg font-bold text-blue-600 mb-2">
                  ${product.price.toFixed(2)}
                </p>
                <p className={`text-xs mb-3 ${
                  product.stock > 5 ? 'text-green-600' : 
                  product.stock > 0 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                </p>
                <button
                  onClick={() => onAddToCart(product)}
                  disabled={product.stock === 0}
                  className={`w-full py-3 rounded-lg font-medium text-sm transition-colors ${
                    product.stock > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Cart Overlay */}
      {showCart && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50">
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Cart ({cart.length} items)</h2>
                <button
                  onClick={() => setShowCart(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FaCalculator className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Your cart is empty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-600">${item.price.toFixed(2)} each</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center"
                        >
                          <FaMinus className="w-3 h-3" />
                        </button>
                        
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center"
                        >
                          <FaPlus className="w-3 h-3" />
                        </button>
                        
                        <button
                          onClick={() => onRemoveFromCart(item.id)}
                          className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center"
                        >
                          <FaTrash className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-medium text-gray-900">Total:</span>
                <span className="text-2xl font-bold text-blue-600">${total.toFixed(2)}</span>
              </div>
              
              {isOffline && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <FaMobile className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      Offline mode - sale will sync when online
                    </span>
                  </div>
                </div>
              )}
              
              <button
                onClick={onCheckout}
                disabled={cart.length === 0}
                className={`w-full py-4 rounded-lg font-bold text-lg transition-colors ${
                  cart.length > 0
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {cart.length > 0 ? 'Proceed to Checkout' : 'Cart Empty'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 