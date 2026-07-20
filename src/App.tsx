/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, FormEvent } from 'react';
import { 
  Plus, 
  Trash2, 
  Send, 
  Phone, 
  User, 
  Banknote,
  Search,
  X,
  TrendingDown, TrendingUp,
  ChevronLeft,
  Edit2,
  Check,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Debt, DebtFormData } from './types';

interface CustomerGroup {
  name: string;
  phone: string;
  total: number;
  latestDate: string;
  debts: Debt[];
}

type View = 'dashboard' | 'details';

const HighlightMatch = ({ text, query }: { text: string; query: string }) => {
  if (!query.trim()) return <>{text}</>;
  
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  
  return (
    <>
      {parts.map((part, index) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <span 
            key={index} 
            className="text-indigo-600 font-bold"
          >
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
};

export default function App() {
  const [debts, setDebts] = useState<Debt[]>(() => {
    const saved = localStorage.getItem('smart-tracker-debts');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedCustomerKey, setSelectedCustomerKey] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<DebtFormData>({
    customerName: '',
    phoneNumber: '',
    amount: '',
    reason: '',
    entryType: 'debt'
  });
  const [customerModalData, setCustomerModalData] = useState<DebtFormData>({
    customerName: '',
    phoneNumber: '',
    amount: '',
    reason: '',
    entryType: 'debt'
  });

  // Edit Customer State
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');

  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [confirmingCustomerDelete, setConfirmingCustomerDelete] = useState<string | null>(null);

  // Edit Debt State
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editDate, setEditDate] = useState('');

  useEffect(() => {
    localStorage.setItem('smart-tracker-debts', JSON.stringify(debts));
  }, [debts]);

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Small delay to allow the keyboard to start appearing and viewport to resize
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };
    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, []);

  useEffect(() => {
    if (!isModalOpen) {
      setFormError(null);
      setPhoneError(null);
    }
  }, [isModalOpen]);

  // Group debts by customer (using name + phone as key)
  const customerGroups = useMemo(() => {
    const groups: Record<string, CustomerGroup> = {};
    
    debts.forEach(debt => {
      const key = `${debt.customerName.toLowerCase()}-${debt.phoneNumber}`;
      if (!groups[key]) {
        groups[key] = {
          name: debt.customerName,
          phone: debt.phoneNumber,
          total: 0,
          latestDate: debt.date,
          debts: []
        };
      }
      if (debt.entryType === 'payment') {
        groups[key].total -= debt.amount;
      } else {
        groups[key].total += debt.amount;
      }
      groups[key].debts.push(debt);
      if (new Date(debt.date) > new Date(groups[key].latestDate)) {
        groups[key].latestDate = debt.date;
      }
    });

    // Sort debts within each group
    Object.values(groups).forEach(group => {
      group.debts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    return groups;
  }, [debts]);

  const filteredCustomerKeys = useMemo(() => {
    return Object.keys(customerGroups).filter(key => {
      const group = customerGroups[key];
      const searchLower = searchQuery.toLowerCase();
      return group.name.toLowerCase().includes(searchLower) ||
             group.phone.includes(searchQuery);
    }).sort((a, b) => new Date(customerGroups[b].latestDate).getTime() - new Date(customerGroups[a].latestDate).getTime());
  }, [customerGroups, searchQuery]);

  const totalDebt = useMemo(() => {
    return debts.reduce((sum, debt) => {
      return debt.entryType === 'payment' ? sum - debt.amount : sum + debt.amount;
    }, 0);
  }, [debts]);

  const [formError, setFormError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const handleAddDebt = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (!formData.customerName) {
      setFormError('Customer name is required');
      return;
    }
    if (!formData.phoneNumber || formData.phoneNumber.length !== 10) {
      setPhoneError(null);
      setTimeout(() => {
        setPhoneError('Please enter a valid 10-digit mobile number.');
      }, 10);
      return;
    }

    // Check if phone number already exists
    const existingCustomer = (Object.values(customerGroups) as CustomerGroup[]).find(g => g.phone === formData.phoneNumber);
    if (existingCustomer) {
      setPhoneError(null);
      setTimeout(() => {
        setPhoneError(`This phone number is already registered with '${existingCustomer.name}'.`);
      }, 10);
      return;
    }

    if (!formData.amount) {
      setFormError('Amount is required');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setFormError('Please enter a valid amount greater than 0');
      return;
    }

    if (formData.entryType === 'payment') {
      const key = `${formData.customerName.toLowerCase()}-${formData.phoneNumber}`;
      const currentTotal = customerGroups[key]?.total || 0;
      if (amount > currentTotal) {
        setFormError(`Payment exceeds debt (Max: ₹${currentTotal.toLocaleString()})`);
        return;
      }
    }

    const newDebt: Debt = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      customerName: formData.customerName,
      phoneNumber: formData.phoneNumber,
      amount: amount,
      date: new Date().toISOString(),
      reason: formData.reason,
      entryType: formData.entryType
    };

    setDebts([newDebt, ...debts]);
    setFormData({ customerName: '', phoneNumber: '', amount: '', reason: '', entryType: 'debt' });
    setIsModalOpen(false);
  };

  const handleAddCustomerDebt = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!customerModalData.amount) return;

    const amount = parseFloat(customerModalData.amount);
    if (isNaN(amount) || amount <= 0) {
      setFormError('Please enter a valid amount greater than 0');
      return;
    }
    const customer = customerGroups[selectedCustomerKey!];
    if (!customer) return;

    if (customerModalData.entryType === 'payment') {
      if (amount > customer.total) {
        setFormError(`Payment exceeds debt (Max: ₹${customer.total.toLocaleString()})`);
        return;
      }
    }

    const newDebt: Debt = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      customerName: customer.name,
      phoneNumber: customer.phone,
      amount: amount,
      date: new Date().toISOString(),
      reason: customerModalData.reason,
      entryType: customerModalData.entryType
    };

    setDebts([newDebt, ...debts]);
    setCustomerModalData({ customerName: '', phoneNumber: '', amount: '', reason: '', entryType: 'debt' });
    setIsCustomerModalOpen(false);
  };

  const deleteDebt = (id: string) => {
    setDebts(debts.filter(d => d.id !== id));
    setConfirmingDelete(null);
  };

  const shareOnWhatsApp = (name: string, phone: string, total: number) => {
    const key = `${name.toLowerCase()}-${phone}`;
    const customerData = customerGroups[key];
    if (!customerData) return;

    const totalBorrowed = customerData.debts
      .filter(d => d.entryType !== 'payment')
      .reduce((sum, d) => sum + d.amount, 0);
    
    const totalPaid = customerData.debts
      .filter(d => d.entryType === 'payment')
      .reduce((sum, d) => sum + d.amount, 0);

    const dateStr = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    let message = `*SMART TRACKER - OFFICIAL BILL*\n\n`;
    message += `Dear ${name},\n\n`;
    message += `• Total Borrowed: *₹${totalBorrowed.toLocaleString()}*\n`;
    message += `• Total Paid: *₹${totalPaid.toLocaleString()}*\n`;
    message += `• Current Status: *DUE: ₹${total.toLocaleString()}*\n`;
    message += `• Date: ${dateStr}\n`;
    message += `• Phone: ${phone || 'N/A'}\n\n`;
    
    message += `*★ Transaction Details:*\n`;
    message += `----------------------------\n`;

    // Sort by date to show timeline correctly
    const sortedDebts = [...customerData.debts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedDebts.slice(-10).forEach(debt => {
      const d = new Date(debt.date);
      const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const dStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      
      const symbol = debt.entryType === 'payment' ? '-' : '+';
      const typeLabel = debt.entryType === 'payment' ? 'Paid' : 'Added';
      const reason = debt.reason || (debt.entryType === 'payment' ? 'Received' : 'Debt entry');
      
      message += `${symbol} *₹${debt.amount.toLocaleString()}* - ${typeLabel}: ${reason} (${dStr}, ${timeStr})\n`;
    });

    if (customerData.debts.length > 10) {
      message += `...and more transactions available in app\n`;
    }

    message += `\n— *Thank you*`;

    const encodedMessage = encodeURIComponent(message);
    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
    const whatsappUrl = `https://wa.me/${finalPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleUpdateCustomer = () => {
    if (!selectedCustomerKey || !editCustomerName) return;

    const updatedDebts = debts.map(debt => {
      const key = `${debt.customerName.toLowerCase()}-${debt.phoneNumber}`;
      if (key === selectedCustomerKey) {
        return { ...debt, customerName: editCustomerName, phoneNumber: editCustomerPhone };
      }
      return debt;
    });

    setDebts(updatedDebts);
    setSelectedCustomerKey(`${editCustomerName.toLowerCase()}-${editCustomerPhone}`);
    setIsEditingCustomer(false);
  };

  const handleUpdateDebt = (id: string) => {
    const debtToUpdate = debts.find(d => d.id === id);
    if (!debtToUpdate) return;

    const newAmount = parseFloat(editAmount);
    const key = `${debtToUpdate.customerName.toLowerCase()}-${debtToUpdate.phoneNumber}`;
    const group = customerGroups[key];

    if (debtToUpdate.entryType === 'payment') {
      const projectedTotal = (group?.total || 0) + debtToUpdate.amount - newAmount;
      if (projectedTotal < 0) {
        alert(`Payment amount cannot exceed total debt. Maximum allowed: ₹${((group?.total || 0) + debtToUpdate.amount).toLocaleString()}`);
        return;
      }
    } else {
      const projectedTotal = (group?.total || 0) - debtToUpdate.amount + newAmount;
      if (projectedTotal < 0) {
        alert(`Total debt cannot be less than total payments. Minimum required: ₹${(debtToUpdate.amount - (group?.total || 0)).toLocaleString()}`);
        return;
      }
    }

    setDebts(debts.map(debt => {
      if (debt.id === id) {
        return { ...debt, amount: newAmount, reason: editReason, date: new Date(editDate).toISOString() };
      }
      return debt;
    }));
    setEditingDebtId(null);
  };

  const startEditingDebt = (debt: Debt) => {
    setEditingDebtId(debt.id);
    setEditAmount(debt.amount.toString());
    setEditReason(debt.reason || '');
    setEditDate(new Date(debt.date).toISOString().slice(0, 16));
  };

  const openDetails = (key: string) => {
    const group = customerGroups[key];
    setSelectedCustomerKey(key);
    setEditCustomerName(group.name);
    setEditCustomerPhone(group.phone);
    setCurrentView('details');
  };

  const deleteCustomer = (key: string) => {
    setDebts(debts.filter(debt => `${debt.customerName.toLowerCase()}-${debt.phoneNumber}` !== key));
    setConfirmingCustomerDelete(null);
    setCurrentView('dashboard');
  };

  const [dashScrollY, setDashScrollY] = useState(0);
  const [detailScrollY, setDetailScrollY] = useState(0);

  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden   transition-colors duration-300">
      <div className="max-w-2xl mx-auto h-full px-4 md:px-0">
        <AnimatePresence mode="wait">
          {currentView === 'dashboard' ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full overflow-y-auto no-scrollbar momentum-scroll"
            >
              <div className="pt-4 px-1">
                <div className="flex justify-between items-center mb-6 mt-2">
                  <div className="flex flex-col">
                    <h1 className="text-2xl md:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-indigo-400 tracking-tight flex items-center gap-3">
                      <div className="bg-indigo-100 p-2 rounded-xl shadow-sm">
                        <Banknote className="w-6 h-6 text-indigo-600" />
                      </div>
                      Smart Tracker
                    </h1>
                    <p className="text-[13px] text-slate-500 font-semibold ml-1 mt-1.5 uppercase tracking-wider">Financial Management</p>
                  </div>
                </div>

                {/* Summary Card */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-[#4B49FF] shadow-[0_8px_30px_rgb(75,73,255,0.25)]'} rounded-[1.75rem] p-7 text-white mb-6 relative overflow-hidden`}
                >
                  <div className="relative z-10">
                    <p className="text-white/80 text-[11px] font-bold mb-2.5 uppercase tracking-[0.1em]">Total Outstanding Due</p>
                    <h2 className="text-[52px] leading-[1] font-bold flex items-baseline tracking-tight">
                      <span className="text-[32px] mr-1.5 font-semibold">₹</span>
                      {totalDebt.toLocaleString()}
                    </h2>
                  </div>
                  <TrendingDown className="absolute right-[-10px] bottom-[-20px] w-64 h-64 text-white/10 -rotate-12" strokeWidth={2.5} />
                </motion.div>

                {/* Search Bar */}
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search by name or number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white  border border-slate-200  rounded-2xl py-3.5 pl-12 pr-12 focus:outline-none focus:border-indigo-500/30 transition-all shadow-sm  text-[16px] placeholder:text-slate-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100  rounded-full text-slate-400 transition-all"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              </div>

              {/* Customer List */}
              <div 
                className="space-y-4 pb-32 relative overflow-y-auto no-scrollbar momentum-scroll px-1"
                style={{ height: 'calc(100dvh - 280px)' }}
              >
                {searchQuery && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 mb-2 px-1"
                  >
                    <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Search Results</p>
                  </motion.div>
                )}

                <AnimatePresence mode="popLayout">
                  {filteredCustomerKeys.length > 0 ? (
                    filteredCustomerKeys.map((key) => {
                      const group = customerGroups[key];
                      return (
                        <motion.div
                          key={key}
                          layout
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          onClick={() => openDetails(key)}
                          className="bg-white  rounded-[1.25rem] p-5 shadow-sm border border-slate-200/60  flex justify-between items-center hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                        >
                          <div className="flex flex-col gap-1.5 min-w-0">
                            <div className="flex items-center gap-2.5">
                              <User size={18} className="text-[#4B49FF]" />
                              <h3 className="font-bold text-slate-900 text-[18px] tracking-tight break-words">
                                <HighlightMatch text={group.name} query={searchQuery} />
                              </h3>
                            </div>
                            {group.phone && (
                              <div className="flex items-center gap-2.5 text-slate-500">
                                <Phone size={15} className="text-slate-400" />
                                <span className="text-[14px] font-medium tracking-tight break-words">
                                  <HighlightMatch text={group.phone} query={searchQuery} />
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-5 shrink-0 pl-3">
                            <div className="text-right">
                              <p className="text-[#4B49FF]  font-bold text-[22px] tracking-tight leading-none mb-1.5">
                                ₹{group.total.toLocaleString()}
                              </p>
                              <p className="text-[10px] text-slate-400  font-bold uppercase tracking-wider">Total Owed</p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmingCustomerDelete(key);
                              }}
                              className="p-1.5"
                              title="Delete Contact"
                            >
                              <Trash2 size={20} className="text-rose-500 hover:text-rose-600 transition-colors" />
                            </button>
                          </div>

                          {/* Inline Delete Confirmation Overlay for Dashboard */}
                          <AnimatePresence>
                            {confirmingCustomerDelete === key && (
                              <motion.div
                                initial={{ opacity: 0, x: '100%' }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: '100%' }}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute inset-0 bg-rose-500 flex items-center justify-between px-6 text-white z-20"
                              >
                                <span className="font-medium">Delete this contract?</span>
                                <div className="flex gap-3">
                                  <button 
                                    onClick={() => setConfirmingCustomerDelete(null)}
                                    className="px-4 py-1.5 bg-rose-600 rounded-lg text-sm font-semibold hover:bg-rose-700 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    onClick={() => deleteCustomer(key)}
                                    className="px-4 py-1.5 bg-white text-rose-600 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors shadow-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-12 text-slate-400"
                    >
                      {searchQuery ? "No matching contracts found" : "No contracts yet. Click '+' to start tracking."}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Floating Action Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsModalOpen(true)}
                className="fixed bottom-8 right-8 md:right-[calc(50%-20rem)] lg:right-[calc(50%-20rem)] bg-[#4B49FF] text-white p-4 rounded-full shadow-lg shadow-indigo-200  hover:bg-indigo-700 transition-colors z-40"
              >
                <Plus size={28} />
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full overflow-y-auto no-scrollbar momentum-scroll"
            >
              <div className="pt-4 mb-2">
                <button 
                  onClick={() => {
                    setCurrentView('dashboard');
                    setDetailScrollY(0);
                  }}
                  className="mb-4 -ml-2 p-2 hover:bg-slate-100  rounded-full transition-colors inline-flex items-center gap-2 text-slate-600  group"
                >
                  <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                  <span className="text-sm font-medium">Back to Dashboard</span>
                </button>

                <h1 className="text-xs font-black text-indigo-600 uppercase tracking-[0.3em] mb-6 border-b border-indigo-100  pb-3">
                  Customer Details
                </h1>
                {/* Detail Header - Sticks at top */}
                <div className="sticky top-0 z-30 bg-white/80  backdrop-blur-md flex items-center gap-4 py-5 mb-6 border-b border-slate-100 ">
                  <div className="flex-1 min-w-0 overflow-hidden">
                    {isEditingCustomer ? (
                      <div className="flex flex-col gap-1 w-full px-1">
                        <input
                          autoFocus
                          value={editCustomerName}
                          onChange={(e) => setEditCustomerName(e.target.value)}
                          className="bg-white  border-b-2 border-indigo-500 text-3xl font-black px-1 py-1 focus:outline-none w-full truncate  tracking-tight"
                        />
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-indigo-600  text-sm font-black tracking-widest">+91</span>
                          <input
                            value={editCustomerPhone}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                              setEditCustomerPhone(val);
                            }}
                            className="bg-white  border-b border-slate-200  text-slate-500  text-base px-1 py-1 focus:outline-none w-full truncate font-bold"
                            placeholder="Phone Number"
                            maxLength={10}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start flex-1 min-w-0 pr-4 px-1">
                        <div className="flex-1 min-w-0">
                          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-1 break-words">{customerGroups[selectedCustomerKey!]?.name}</h2>
                          <p className="text-slate-500 text-base font-bold">
                            {customerGroups[selectedCustomerKey!]?.phone ? 
                              (customerGroups[selectedCustomerKey!]?.phone.length === 10 ? '+91 ' : '') + customerGroups[selectedCustomerKey!]?.phone : 
                              'No phone number'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0 px-1">
                    {isEditingCustomer ? (
                      <button 
                        onClick={handleUpdateCustomer}
                        className="bg-emerald-500 text-white p-3 rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-colors"
                      >
                        <Check size={24} />
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={() => setIsEditingCustomer(true)}
                          className="bg-slate-100  text-slate-600  p-3 rounded-2xl hover:bg-slate-200  transition-colors"
                        >
                          <Edit2 size={24} />
                        </button>
                        <div className="relative">
                          <button 
                            onClick={() => setConfirmingCustomerDelete(selectedCustomerKey)}
                            className="bg-rose-50  text-rose-500  p-3 rounded-2xl hover:bg-rose-100  transition-colors"
                          >
                            <Trash2 size={24} />
                          </button>
                          
                          <AnimatePresence>
                            {confirmingCustomerDelete === selectedCustomerKey && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                className="absolute right-0 top-16 bg-white  shadow-2xl border border-slate-100  rounded-2xl p-4 z-30 min-w-[220px]"
                              >
                                <p className="text-sm font-black text-slate-800  mb-4 text-center tracking-tight">Confirm Deletion?</p>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => setConfirmingCustomerDelete(null)}
                                    className="flex-1 text-xs py-3 bg-slate-100  text-slate-600  rounded-xl font-black uppercase tracking-widest"
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    onClick={() => deleteCustomer(selectedCustomerKey!)}
                                    className="flex-1 text-xs py-3 bg-rose-500 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-rose-200"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Details Content */}
              <div className="space-y-4 pb-24 px-0.5">

                {/* Prominent Total Due Card */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${customerGroups[selectedCustomerKey!]?.total >= 0 ? 'bg-[#4B49FF] shadow-[0_8px_30px_rgb(75,73,255,0.25)]' : 'bg-emerald-500 shadow-[0_8px_30px_rgb(16,185,129,0.25)]'} mx-4 sm:mx-8 rounded-[1.75rem] p-6 text-white mb-8 relative overflow-hidden`}
                >
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <p className="text-white/80 text-[11px] font-bold mb-2.5 uppercase tracking-[0.1em]">Total Due</p>
                    <h2 className="text-[52px] leading-[1] font-bold flex items-baseline tracking-tight justify-center">
                      <span className="text-[32px] mr-1.5 font-semibold">₹</span>
                      {(customerGroups[selectedCustomerKey!]?.total || 0).toLocaleString()}
                    </h2>
                  </div>
                  {customerGroups[selectedCustomerKey!]?.total >= 0 ? (
                    <TrendingDown className="absolute right-[-10px] bottom-[-20px] w-64 h-64 text-white/10 -rotate-12" strokeWidth={2.5} />
                  ) : (
                    <TrendingUp className="absolute right-[-10px] bottom-[-20px] w-64 h-64 text-white/10 -rotate-12" strokeWidth={2.5} />
                  )}
                </motion.div>

                {/* Actions Section */}
                <div className="flex justify-center gap-8 mb-10">
                  <div className="flex flex-col items-center gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => shareOnWhatsApp(customerGroups[selectedCustomerKey!]?.name, customerGroups[selectedCustomerKey!]?.phone, customerGroups[selectedCustomerKey!]?.total)}
                      className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-200 transition-all"
                    >
                      <Send size={28} />
                    </motion.button>
                    <span className="text-sm font-bold text-slate-600 ">Share Bill</span>
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setCustomerModalData({ 
                          customerName: customerGroups[selectedCustomerKey!]?.name || '', 
                          phoneNumber: customerGroups[selectedCustomerKey!]?.phone || '', 
                          amount: '', 
                          reason: '', 
                          entryType: 'payment' 
                        });
                        setIsCustomerModalOpen(true);
                      }}
                      className="w-16 h-16 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-amber-200 transition-all"
                    >
                      <Check size={28} />
                    </motion.button>
                    <span className="text-sm font-bold text-slate-600 ">Mark Paid</span>
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setCustomerModalData({ 
                          customerName: customerGroups[selectedCustomerKey!]?.name || '', 
                          phoneNumber: customerGroups[selectedCustomerKey!]?.phone || '', 
                          amount: '', 
                          reason: '', 
                          entryType: 'debt' 
                        });
                        setIsCustomerModalOpen(true);
                      }}
                      className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-indigo-200 transition-all"
                    >
                      <Plus size={28} />
                    </motion.button>
                    <span className="text-sm font-bold text-slate-600 ">Add Debt</span>
                  </div>
                </div>

              {/* Transactions List */}
              <div className="bg-white  rounded-2xl p-6 shadow-sm border border-slate-100 ">
                <h3 className="text-lg font-bold text-slate-800  mb-6 flex items-center gap-2">
                  <Banknote size={18} className="text-indigo-500 " />
                  Debt History
                </h3>
                <div className="space-y-6 max-h-[400px] overflow-y-auto no-scrollbar pr-1 relative">
                  {customerGroups[selectedCustomerKey!]?.debts.map((debt, index) => (
                    <div key={debt.id} className="relative flex justify-between group">
                      {index !== (customerGroups[selectedCustomerKey!]?.debts.length - 1) && (
                        <div className="absolute left-[7px] top-[24px] bottom-[-24px] w-[2px] bg-slate-100  z-0" />
                      )}
                      <div className="flex gap-4 z-10 flex-1 pr-4">
                        <div className={`w-4 h-4 rounded-full border-4 border-white shadow-sm mt-1.5 shrink-0 z-10 ${debt.entryType === 'payment' ? 'bg-emerald-500' : 'bg-indigo-100'}`} />
                        <div className="flex-1">
                          {editingDebtId === debt.id ? (
                            <div className="space-y-2 bg-slate-50  p-3 rounded-lg border border-indigo-100 ">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400">₹</span>
                                <input
                                  type="number"
                                  value={editAmount}
                                  onChange={(e) => setEditAmount(e.target.value)}
                                  className="w-full bg-white  border border-slate-200  rounded px-2 py-1 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 "
                                />
                              </div>
                              <input
                                type="datetime-local"
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                className="w-full bg-white  border border-slate-200  rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 "
                              />
                              <textarea
                                value={editReason}
                                onChange={(e) => setEditReason(e.target.value)}
                                className="w-full bg-white  border border-slate-200  rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[60px] "
                                placeholder="Reason"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleUpdateDebt(debt.id)}
                                  className="flex-1 bg-indigo-600 text-white text-[10px] font-bold py-1 rounded hover:bg-indigo-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingDebtId(null)}
                                  className="flex-1 bg-slate-200  text-slate-600  text-[10px] font-bold py-1 rounded hover:bg-slate-300"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <p className={`font-bold ${debt.entryType === 'payment' ? 'text-emerald-600' : 'text-slate-800'}`}>
                                  {debt.entryType === 'payment' ? '-' : ''}₹{debt.amount.toLocaleString()}
                                </p>
                                {debt.entryType === 'payment' && (
                                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50   px-1.5 rounded">Paid</span>
                                )}
                              </div>
                              {debt.reason && (
                                <p className="text-xs text-indigo-600  font-medium mb-1 line-clamp-2">
                                  {debt.reason}
                                </p>
                              )}
                              <p className="text-xs text-slate-400 ">
                                {new Date(debt.date).toLocaleDateString(undefined, { 
                                  day: 'numeric', 
                                  month: 'short', 
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start gap-1">
                        {editingDebtId !== debt.id && (
                          <>
                            {confirmingDelete === debt.id ? (
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => setConfirmingDelete(null)}
                                  className="text-xs font-bold text-slate-400 hover:text-slate-600  px-2 py-1"
                                >
                                  No
                                </button>
                                <button 
                                  onClick={() => deleteDebt(debt.id)}
                                  className="text-xs font-bold text-rose-500 hover:text-rose-700 px-2 py-1 bg-rose-50  rounded"
                                >
                                  Yes, Delete
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-1">
                                <button 
                                  onClick={() => startEditingDebt(debt)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-500  transition-colors rounded hover:bg-slate-50 "
                                  title="Edit Debt"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  onClick={() => setConfirmingDelete(debt.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-500  transition-colors rounded hover:bg-slate-50 "
                                  title="Delete Debt"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Debt Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="fixed inset-0 bg-slate-900/20 "
              />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white  w-full max-w-md rounded-2xl shadow-2xl p-6 my-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800 ">
                  {formData.entryType === 'payment' ? 'Mark Paid' : 'Add New Debt'}
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600  transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddDebt} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700  mb-1">Customer Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      required
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      className="w-full bg-slate-50  border border-slate-200  rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all "
                      placeholder="e.g. John Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700  mb-1">Phone Number *</label>
                  <motion.div 
                    animate={phoneError ? { 
                      borderColor: ["#e2e8f0", "#ef4444", "#e2e8f0", "#ef4444", "#e2e8f0"],
                      boxShadow: [
                        "0 0 0px rgba(239, 68, 68, 0)", 
                        "0 0 15px rgba(239, 68, 68, 0.4)", 
                        "0 0 0px rgba(239, 68, 68, 0)",
                        "0 0 15px rgba(239, 68, 68, 0.4)",
                        "0 0 0px rgba(239, 68, 68, 0)"
                      ],
                    } : {}}
                    transition={{ duration: 0.5 }}
                    className={`relative flex items-center bg-slate-50 border ${phoneError ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'} rounded-xl transition-all overflow-hidden`}
                  >
                    <div className="pl-3 flex items-center gap-2 border-r border-slate-200  pr-3 py-3 bg-slate-100/50 ">
                      <Phone className="text-slate-400" size={18} />
                      <span className="text-slate-600  font-bold text-sm">+91</span>
                    </div>
                    <input
                      required
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData({ ...formData, phoneNumber: val });
                        
                        if (val.length === 10) {
                          const existing = (Object.values(customerGroups) as CustomerGroup[]).find(g => g.phone === val);
                          if (existing) {
                            setPhoneError(`This phone number is already registered with '${existing.name}'.`);
                          } else {
                            setPhoneError(null);
                          }
                        } else {
                          // Clear specific "already registered" error if number is no longer 10 digits
                          if (phoneError && phoneError.includes('already registered')) {
                            setPhoneError(null);
                          }
                        }
                      }}
                      className="w-full bg-transparent py-3 px-4 focus:outline-none font-medium tracking-wider "
                      placeholder="9876543210"
                      maxLength={10}
                    />
                  </motion.div>
                  <AnimatePresence>
                    {phoneError && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-2 text-[10px] font-bold text-red-500 uppercase tracking-wider flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {phoneError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700  mb-1">Amount *</label>
                  <motion.div 
                    animate={formError ? { 
                      boxShadow: ["0 0 0px rgba(239, 68, 68, 0)", "0 0 15px rgba(239, 68, 68, 0.4)", "0 0 0px rgba(239, 68, 68, 0)"],
                      borderColor: ["#e2e8f0", "#ef4444", "#e2e8f0"]
                    } : {}}
                    transition={{ repeat: formError ? Infinity : 0, duration: 1.5 }}
                    className="relative rounded-xl overflow-hidden"
                  >
                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => {
                        setFormData({ ...formData, amount: e.target.value });
                        if (formError) setFormError(null);
                      }}
                      className={`w-full bg-slate-50 border ${formError ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'} rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-lg`}
                      placeholder="0.00"
                    />
                  </motion.div>
                  <AnimatePresence>
                    {formError && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-2 text-xs font-bold text-red-500 bg-red-50  p-3 rounded-lg border border-red-100  flex items-center gap-2 shadow-sm"
                      >
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                        {formError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700  mb-1">Reason / Purpose</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 text-slate-400" size={18} />
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      className="w-full bg-slate-50  border border-slate-200  rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all min-h-[100px] resize-none "
                      placeholder="e.g. For business stock, Personal loan, etc."
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all"
                  >
                    {formData.entryType === 'payment' ? 'Confirm Payment' : 'Track Debt'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Customer Specific Add Modal */}
      <AnimatePresence>
        {isCustomerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCustomerModalOpen(false)}
              className="fixed inset-0 bg-slate-900/20 "
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white  w-full max-w-md rounded-2xl shadow-2xl p-6 my-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 ">
                    {customerModalData.entryType === 'payment' ? 'Mark Paid' : 'Add Debt'}
                  </h2>
                  <p className="text-sm text-slate-500 ">For {customerGroups[selectedCustomerKey!]?.name}</p>
                </div>
                <button 
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600  transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddCustomerDebt} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700  mb-1">Amount *</label>
                  <motion.div 
                    animate={formError ? { 
                      boxShadow: ["0 0 0px rgba(239, 68, 68, 0)", "0 0 15px rgba(239, 68, 68, 0.4)", "0 0 0px rgba(239, 68, 68, 0)"],
                      borderColor: ["#e2e8f0", "#ef4444", "#e2e8f0"]
                    } : {}}
                    transition={{ repeat: formError ? Infinity : 0, duration: 1.5 }}
                    className="relative rounded-xl overflow-hidden"
                  >
                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
                    <input
                      required
                      autoFocus
                      type="number"
                      step="0.01"
                      value={customerModalData.amount}
                      onChange={(e) => {
                        setCustomerModalData({ ...customerModalData, amount: e.target.value });
                        if (formError) setFormError(null);
                      }}
                      className={`w-full bg-slate-50 border ${formError ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'} rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-lg`}
                      placeholder="0.00"
                    />
                  </motion.div>
                  <AnimatePresence>
                    {formError && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-2 text-xs font-bold text-red-500 bg-red-50  p-3 rounded-lg border border-red-100  flex items-center gap-2 shadow-sm"
                      >
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                        {formError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700  mb-1">Reason / Purpose</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 text-slate-400" size={18} />
                    <textarea
                      value={customerModalData.reason}
                      onChange={(e) => setCustomerModalData({ ...customerModalData, reason: e.target.value })}
                      className="w-full bg-slate-50  border border-slate-200  rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all min-h-[100px] resize-none "
                      placeholder={customerModalData.entryType === 'payment' ? 'e.g. Cash received, Online transfer' : 'e.g. New purchase, Service fee'}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className={`w-full ${customerModalData.entryType === 'payment' ? 'bg-amber-500 shadow-amber-200 hover:bg-amber-600' : 'bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700'} text-white font-bold py-3 rounded-xl shadow-lg active:scale-[0.98] transition-all`}
                  >
                    {customerModalData.entryType === 'payment' ? 'Confirm Payment' : 'Track Debt'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
