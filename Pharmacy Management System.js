import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';

// --- MANDATORY GLOBAL VARIABLE INITIALIZATION ---
// This ensures the app connects to the correct Canvas Firebase instance.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Enable Firestore debug logging
// import { setLogLevel } from 'firebase/firestore';
// setLogLevel('debug'); 

/**
 * Utility function to handle Firestore path generation.
 * We use a public path for collaborative inventory management.
 */
const getInventoryCollectionRef = () => {
  return collection(db, 'artifacts', appId, 'public', 'data', 'inventory');
};

const getSalesCollectionRef = () => {
  return collection(db, 'artifacts', appId, 'public', 'data', 'sales');
};

// --- Custom Components ---

const Card = ({ title, children, className = '' }) => (
  <div className={`bg-white shadow-xl rounded-xl p-6 ${className}`}>
    <h2 className="text-2xl font-bold text-indigo-700 mb-4 border-b pb-2">{title}</h2>
    {children}
  </div>
);

const IconButton = ({ children, onClick, className = '' }) => (
  <button
    onClick={onClick}
    className={`p-2 rounded-lg transition duration-150 ease-in-out ${className}`}
  >
    {children}
  </button>
);

const InputField = ({ label, id, type = 'text', value, onChange, placeholder = '' }) => (
  <div className="mb-4">
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <input
      type={type}
      id={id}
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150"
      min={type === 'number' ? 0 : undefined}
    />
  </div>
);

// --- Inventory Manager Component ---

const InventoryManager = ({ inventory, userId, db, authReady }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [price, setPrice] = useState(0);
  const [expiryDate, setExpiryDate] = useState('');

  const resetForm = () => {
    setCurrentItem(null);
    setName('');
    setQuantity(0);
    setPrice(0);
    setExpiryDate('');
  };

  const openModal = (item = null) => {
    if (item) {
      setCurrentItem(item);
      setName(item.name);
      setQuantity(item.quantity);
      setPrice(item.price);
      setExpiryDate(item.expiryDate || '');
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const saveItem = async (e) => {
    e.preventDefault();
    if (!name || quantity < 0 || price < 0 || !db || !authReady) return;

    const data = {
      name: name.trim(),
      quantity: Number(quantity),
      price: Number(price).toFixed(2),
      expiryDate: expiryDate || null,
      lastUpdated: serverTimestamp(),
      updatedBy: userId,
    };

    try {
      if (currentItem) {
        // Update existing item
        await updateDoc(doc(getInventoryCollectionRef(), currentItem.id), data);
        console.log("Document successfully updated!");
      } else {
        // Add new item
        await addDoc(getInventoryCollectionRef(), data);
        console.log("Document successfully written!");
      }
      closeModal();
    } catch (error) {
      console.error("Error saving document: ", error);
      // In a real app, show a user-friendly error message here.
    }
  };

  const deleteItem = async (id) => {
    if (window.confirm('Are you sure you want to delete this medicine from inventory?')) {
      try {
        await deleteDoc(doc(getInventoryCollectionRef(), id));
        console.log("Document successfully deleted!");
      } catch (error) {
        console.error("Error deleting document: ", error);
      }
    }
  };

  const lowStock = inventory.filter(item => item.quantity <= 10);
  const expiringSoon = inventory.filter(item => {
    if (!item.expiryDate) return false;
    const today = new Date();
    const expiry = new Date(item.expiryDate);
    const diffTime = Math.abs(expiry - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 60; // Less than 60 days to expiry
  });

  return (
    <Card title="Inventory Management" className="col-span-1 lg:col-span-2">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-600">Current Stock ({inventory.length} items)</h3>
        <button
          onClick={() => openModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150"
        >
          + Add New Medicine
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-100 p-3 rounded-lg border-l-4 border-yellow-500">
          <p className="text-sm font-medium text-yellow-700">Low Stock Alert</p>
          <p className="text-xl font-bold text-yellow-900">{lowStock.length} items</p>
        </div>
        <div className="bg-red-100 p-3 rounded-lg border-l-4 border-red-500">
          <p className="text-sm font-medium text-red-700">Expiring Soon</p>
          <p className="text-xl font-bold text-red-900">{expiringSoon.length} items</p>
        </div>
      </div>

      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medicine Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Qty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price (GHC)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inventory.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No inventory items found. Add some!</td>
              </tr>
            ) : (
              inventory.map((item) => (
                <tr key={item.id} className={item.quantity <= 10 ? 'bg-yellow-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.quantity} {item.quantity <= 10 && <span className="text-red-500 font-bold ml-2">(LOW)</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">GHC {item.price}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.expiryDate || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <IconButton onClick={() => openModal(item)} className="text-indigo-600 hover:text-indigo-900 bg-indigo-100 mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </IconButton>
                    <IconButton onClick={() => deleteItem(item.id)} className="text-red-600 hover:text-red-900 bg-red-100">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </IconButton>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6 m-4">
            <h3 className="text-xl font-semibold text-indigo-700 mb-4">{currentItem ? 'Edit Medicine' : 'Add New Medicine'}</h3>
            <form onSubmit={saveItem}>
              <InputField
                label="Medicine Name"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Paracetamol, Amoxicillin"
              />
              <InputField
                label="Stock Quantity"
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="0"
              />
              <InputField
                label="Unit Price (GHC)"
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
              <InputField
                label="Expiry Date (Optional)"
                id="expiryDate"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition duration-150"
                >
                  {currentItem ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </form>
            <IconButton onClick={closeModal} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </IconButton>
          </div>
        </div>
      )}
    </Card>
  );
};

// --- Sales Point Component ---

const SalesPoint = ({ inventory, userId, db, authReady }) => {
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');

  const filteredInventory = useMemo(() => {
    if (!searchTerm) return inventory;
    return inventory.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [inventory, searchTerm]);

  const addToCart = useCallback((item) => {
    setMessage('');
    const existingCartItemIndex = cart.findIndex(i => i.id === item.id);

    if (existingCartItemIndex > -1) {
      const updatedCart = cart.map((i, index) =>
        index === existingCartItemIndex
          ? { ...i, quantity: i.quantity + 1 }
          : i
      );
      // Check stock limit
      if (updatedCart[existingCartItemIndex].quantity > item.quantity) {
        setMessage(`Cannot add more. Only ${item.quantity} in stock.`);
        return;
      }
      setCart(updatedCart);
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  }, [cart]);

  const updateCartQuantity = useCallback((id, newQuantity) => {
    setMessage('');
    const itemInInventory = inventory.find(i => i.id === id);
    if (!itemInInventory) return;

    if (newQuantity <= 0) {
      setCart(cart.filter(i => i.id !== id));
    } else if (newQuantity > itemInInventory.quantity) {
      setMessage(`Cannot add more. Only ${itemInInventory.quantity} in stock.`);
    } else {
      setCart(cart.map(i => (i.id === id ? { ...i, quantity: newQuantity } : i)));
    }
  }, [cart, inventory]);

  const removeItemFromCart = useCallback((id) => {
    setMessage('');
    setCart(cart.filter(i => i.id !== id));
  }, [cart]);

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);
  }, [cart]);

  const processSale = async () => {
    if (cart.length === 0 || !db || !authReady) {
      setMessage("Cart is empty.");
      return;
    }

    try {
      // 1. Record the Sale
      const saleData = {
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        total: totalAmount,
        timestamp: serverTimestamp(),
        cashierId: userId,
      };

      await addDoc(getSalesCollectionRef(), saleData);

      // 2. Update Inventory (Deduct Stock)
      const inventoryUpdates = cart.map(cartItem => {
        const stockItem = inventory.find(i => i.id === cartItem.id);
        if (stockItem) {
          const newQuantity = stockItem.quantity - cartItem.quantity;
          return updateDoc(doc(getInventoryCollectionRef(), stockItem.id), {
            quantity: newQuantity,
            lastUpdated: serverTimestamp(),
            updatedBy: userId,
          });
        }
        return Promise.resolve(); // Should not happen if stock check is right
      });

      await Promise.all(inventoryUpdates);

      setMessage(`Sale processed successfully! Total: GHC ${totalAmount}`);
      setCart([]);
      setSearchTerm('');
    } catch (error) {
      console.error("Error processing sale: ", error);
      setMessage("Error processing sale. Check console for details.");
    }
  };

  return (
    <Card title="Sales Point (POS)" className="col-span-1 lg:col-span-1 flex flex-col h-full">
      <div className="flex-grow">
        <h3 className="text-xl font-semibold mb-3 text-gray-800">New Transaction</h3>
        
        {/* Cart Display */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4 h-64 overflow-y-auto border border-gray-200">
          <p className="font-bold text-lg mb-2 text-indigo-600">Cart ({cart.length} items)</p>
          {cart.length === 0 ? (
            <p className="text-gray-500 italic">No items in cart.</p>
          ) : (
            <ul className="space-y-3">
              {cart.map(item => (
                <li key={item.id} className="flex justify-between items-center text-sm border-b pb-2">
                  <div className="flex-grow">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-gray-600">GHC {item.price} x {item.quantity}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateCartQuantity(item.id, parseInt(e.target.value) || 0)}
                      min="1"
                      className="w-12 text-center border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <IconButton onClick={() => removeItemFromCart(item.id)} className="text-red-500 hover:text-red-700 bg-transparent">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3" /></svg>
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Total and Checkout */}
        <div className="mt-4 border-t pt-4">
          <div className="flex justify-between font-bold text-2xl text-indigo-700 mb-4">
            <span>Total:</span>
            <span>GHC {totalAmount}</span>
          </div>
          <button
            onClick={processSale}
            disabled={cart.length === 0}
            className={`w-full py-3 font-bold text-white rounded-lg shadow-lg transition duration-150 ${
              cart.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
            }`}
          >
            Process Sale
          </button>
          {message && (
            <p className={`mt-2 p-2 rounded text-sm text-center ${message.startsWith('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {message}
            </p>
          )}
        </div>

        {/* Search & Add Panel */}
        <div className="mt-6 border-t pt-4">
          <h4 className="font-semibold text-lg mb-2 text-gray-800">Add Item</h4>
          <InputField
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search medicine name..."
          />
          <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg">
            {searchTerm && filteredInventory.map(item => (
              <div
                key={item.id}
                className="flex justify-between items-center p-2 hover:bg-indigo-50 cursor-pointer transition duration-100"
                onClick={() => addToCart(item)}
              >
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-gray-500">GHC {item.price} | Stock: {item.quantity}</p>
                </div>
                <IconButton className="text-indigo-600 hover:text-white hover:bg-indigo-600 bg-indigo-100 p-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                </IconButton>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

// --- Dashboard Component ---
const Dashboard = ({ inventory, sales }) => {
  const totalStockValue = inventory.reduce((acc, item) => acc + (item.quantity * item.price), 0).toFixed(2);
  const totalSalesRevenue = sales.reduce((acc, sale) => acc + parseFloat(sale.total), 0).toFixed(2);
  const totalItemsSold = sales.reduce((acc, sale) => acc + sale.items.length, 0);

  const StatCard = ({ title, value, icon, color }) => (
    <div className={`bg-white p-5 rounded-xl shadow-md border-l-4 ${color}`}>
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${color.replace('border-l-4 border-', 'bg-').replace('-500', '-100')} mr-4`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  return (
    <Card title="Pharmacy Overview Dashboard" className="col-span-1 lg:col-span-3">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Medicines" 
          value={inventory.length} 
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 13v-3m0 0v-3m0 3h-3m3 0h3m-3 0l-1.414 1.414M15 13l-1.414 1.414M15 10l1.414-1.414M12 3v1m0 16v1m-7-9h1m16 0h1M4.22 4.22l.707.707m14.346 14.346l.707.707M4.22 19.78l.707-.707m14.346-14.346l.707-.707" /></svg>}
          color="border-indigo-500"
        />
        <StatCard 
          title="Stock Value (GHC)" 
          value={`GHC ${totalStockValue}`} 
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m0 0l-2.293 2.293a1 1 0 00.707 1.707H17m-7 0a2 2 0 11-4 0 2 2 0 014 0zm7 0a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
          color="border-green-500"
        />
        <StatCard 
          title="Total Revenue (GHC)" 
          value={`GHC ${totalSalesRevenue}`} 
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V9m0 3v-2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.894 13.376a2 2 0 001.106-1.75V9.5h-2.25A1.75 1.75 0 0118 7.75V5h-2.25a1.75 1.75 0 01-1.75-1.75V1.5H12v2.25A1.75 1.75 0 0110.25 5H8a2 2 0 00-2 2v2.75H3.106a2 2 0 00-1.106 1.75v1.876a2 2 0 001.106 1.75h17.788z" /></svg>}
          color="border-yellow-500"
        />
        <StatCard 
          title="Total Sales Transactions" 
          value={sales.length} 
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
          color="border-red-500"
        />
      </div>

      <h3 className="text-xl font-bold text-gray-800 mt-8 mb-4 border-b pb-2">Recent Sales Activity</h3>
      
      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items Count</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount (GHC)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cashier ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sales.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No sales transactions recorded yet.</td>
              </tr>
            ) : (
              // Display only the last 5 transactions
              sales.slice(0, 5).map((sale) => (
                <tr key={sale.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate" title={sale.id}>{sale.id.substring(0, 8)}...</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sale.items.length}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-bold">GHC {sale.total}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate" title={sale.cashierId}>{sale.cashierId.substring(0, 8)}...</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sale.timestamp?.toDate().toLocaleTimeString() || '...'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};


// --- Main Application Component ---

const App = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [userId, setUserId] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Firebase Authentication Effect
  useEffect(() => {
    // 1. Authenticate using custom token or anonymously
    const authenticate = async () => {
      try {
        if (initialAuthToken) {
          await signInWithCustomToken(auth, initialAuthToken);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Firebase Auth Error:", error);
      }
    };

    // 2. Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
      setAuthReady(true);
      setIsLoading(false);
    });

    authenticate();
    return () => unsubscribe();
  }, []); // Run only on component mount

  // 2. Firestore Data Subscription Effect (Runs after Auth is ready)
  useEffect(() => {
    if (!authReady || !userId) return;

    // A. Inventory Listener
    const inventoryQuery = query(getInventoryCollectionRef(), orderBy('name'));
    const unsubscribeInventory = onSnapshot(inventoryQuery, (snapshot) => {
      const inventoryList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setInventory(inventoryList);
    }, (error) => {
      console.error("Inventory Snapshot Error: ", error);
    });

    // B. Sales Listener (Order by timestamp descending)
    const salesQuery = query(getSalesCollectionRef(), orderBy('timestamp', 'desc'));
    const unsubscribeSales = onSnapshot(salesQuery, (snapshot) => {
      const salesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSales(salesList);
    }, (error) => {
      console.error("Sales Snapshot Error: ", error);
    });

    // Clean up listeners on unmount
    return () => {
      unsubscribeInventory();
      unsubscribeSales();
    };
  }, [authReady, userId]); // Depend on auth readiness

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center p-20">
          <p className="text-xl text-indigo-500 font-semibold">Loading system data...</p>
        </div>
      );
    }
    if (!userId) {
      return (
        <div className="text-center p-20 bg-red-50 rounded-lg m-10 shadow-lg">
          <p className="text-xl text-red-700 font-semibold">Authentication failed. Please check the console for errors.</p>
        </div>
      );
    }

    switch (currentView) {
      case 'dashboard':
        return <Dashboard inventory={inventory} sales={sales} />;
      case 'inventory':
        return <InventoryManager inventory={inventory} userId={userId} db={db} authReady={authReady} />;
      case 'sales':
        return <SalesPoint inventory={inventory} userId={userId} db={db} authReady={authReady} />;
      default:
        return <Dashboard inventory={inventory} sales={sales} />;
    }
  };

  const NavItem = ({ view, label, icon }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`flex flex-col items-center p-2 md:p-4 rounded-xl transition duration-200 ${
        currentView === view
          ? 'bg-indigo-600 text-white shadow-lg'
          : 'text-indigo-800 hover:bg-indigo-100'
      }`}
    >
      {icon}
      <span className="text-xs md:text-sm font-medium mt-1 hidden sm:block">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-white shadow-lg p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-extrabold text-indigo-700">PharmTrack</h1>
          <div className="flex space-x-2 md:space-x-4">
            <NavItem 
              view="dashboard" 
              label="Dashboard" 
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h4" /></svg>}
            />
            <NavItem 
              view="inventory" 
              label="Inventory" 
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10M8 7v10M12 7v10M16 7v10M20 7v10M6 5H4a2 2 0 00-2 2v10a2 2 0 002 2h2M18 5h2a2 2 0 012 2v10a2 2 0 01-2 2h-2" /></svg>}
            />
            <NavItem 
              view="sales" 
              label="Sales POS" 
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
            />
          </div>
          <div className="text-right text-xs text-gray-500 hidden sm:block">
            <p className="font-bold">User ID:</p>
            <p className="truncate w-24" title={userId}>{userId || 'Authenticating...'}</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;