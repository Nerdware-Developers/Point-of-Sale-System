import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Search, DollarSign, Calendar, User, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function CreditSales() {
  const [creditSales, setCreditSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCreditSale, setSelectedCreditSale] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSaleDetails, setSelectedSaleDetails] = useState(null);

  useEffect(() => {
    fetchCreditSales();
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterSales();
  }, [creditSales, searchQuery, statusFilter]);

  const fetchCreditSales = async () => {
    try {
      const response = await api.get('/credit-sales');
      setCreditSales(response.data);
    } catch (error) {
      toast.error('Failed to load credit sales');
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data);
    } catch (error) {
      console.error('Failed to load customers');
    }
  };

  const filterSales = () => {
    let filtered = creditSales;

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (sale) =>
          sale.sale_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sale.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((sale) => sale.status === statusFilter);
    }

    setFilteredSales(filtered);
  };

  const handleAddPayment = (sale) => {
    setSelectedCreditSale(sale);
    setPaymentAmount('');
    setPaymentMethod('cash');
    setShowPaymentModal(true);
  };

  const handleSubmitPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    if (parseFloat(paymentAmount) > selectedCreditSale.balance) {
      toast.error('Payment amount cannot exceed balance');
      return;
    }

    try {
      await api.post(`/credit-sales/${selectedCreditSale.id}/payments`, {
        amount: parseFloat(paymentAmount),
        payment_method: paymentMethod,
      });
      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      fetchCreditSales();
      if (selectedSaleDetails?.id === selectedCreditSale.id) {
        fetchSaleDetails(selectedCreditSale.id);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to record payment');
    }
  };

  const fetchSaleDetails = async (id) => {
    try {
      const response = await api.get(`/credit-sales/${id}`);
      setSelectedSaleDetails(response.data);
      setShowDetailsModal(true);
    } catch (error) {
      toast.error('Failed to load sale details');
    }
  };

  const totalDebt = creditSales.reduce((sum, sale) => sum + parseFloat(sale.balance || 0), 0);
  const pendingCount = creditSales.filter((sale) => sale.status === 'pending').length;
  const partialCount = creditSales.filter((sale) => sale.status === 'partial').length;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Credit Sales & Debt Tracking</h1>
        <p className="text-gray-600">Manage customer credit sales and track outstanding debts</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Outstanding</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDebt)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Payments</p>
              <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Partial Payments</p>
              <p className="text-2xl font-bold text-yellow-600">{partialCount}</p>
            </div>
            <Calendar className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Credits</p>
              <p className="text-2xl font-bold text-blue-600">{creditSales.length}</p>
            </div>
            <User className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by sale ID or customer name..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* Credit Sales Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredSales.map((sale) => (
              <tr key={sale.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">{sale.sale_id}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <p className="font-medium">{sale.customer_name || 'N/A'}</p>
                    {sale.customer_phone && (
                      <p className="text-sm text-gray-500">{sale.customer_phone}</p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-semibold">{formatCurrency(sale.total_amount)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-green-600">{formatCurrency(sale.paid_amount || 0)}</td>
                <td className="px-6 py-4 whitespace-nowrap font-bold text-red-600">{formatCurrency(sale.balance)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {sale.due_date ? format(new Date(sale.due_date), 'MMM dd, yyyy') : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      sale.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : sale.status === 'partial'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {sale.status?.toUpperCase() || 'PENDING'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchSaleDetails(sale.id)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                    >
                      Details
                    </button>
                    {sale.balance > 0 && (
                      <button
                        onClick={() => handleAddPayment(sale)}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                      >
                        Pay
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredSales.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <p>No credit sales found</p>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedCreditSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Record Payment</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Customer: {selectedCreditSale.customer_name}</p>
                <p className="text-sm text-gray-600">Sale ID: {selectedCreditSale.sale_id}</p>
                <p className="text-lg font-semibold mt-2">
                  Balance: <span className="text-red-600">{formatCurrency(selectedCreditSale.balance)}</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payment Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="Enter amount"
                  max={selectedCreditSale.balance}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mobile">Mobile Payment</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSubmitPayment}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Record Payment
                </button>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedSaleDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Credit Sale Details</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Sale ID</p>
                  <p className="font-semibold">{selectedSaleDetails.sale_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Customer</p>
                  <p className="font-semibold">{selectedSaleDetails.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="font-semibold">{formatCurrency(selectedSaleDetails.total_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Balance</p>
                  <p className="font-semibold text-red-600">{formatCurrency(selectedSaleDetails.balance)}</p>
                </div>
              </div>

              {selectedSaleDetails.payments && selectedSaleDetails.payments.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Payment History</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium">Amount</th>
                          <th className="px-4 py-2 text-left text-xs font-medium">Method</th>
                          <th className="px-4 py-2 text-left text-xs font-medium">Recorded By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedSaleDetails.payments.map((payment) => (
                          <tr key={payment.id}>
                            <td className="px-4 py-2">
                              {format(new Date(payment.payment_date), 'MMM dd, yyyy HH:mm')}
                            </td>
                            <td className="px-4 py-2 font-semibold">{formatCurrency(payment.amount)}</td>
                            <td className="px-4 py-2">{payment.payment_method}</td>
                            <td className="px-4 py-2">{payment.created_by_name || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

