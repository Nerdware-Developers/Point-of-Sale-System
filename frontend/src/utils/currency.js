/**
 * Format a number as Kenyan Shillings currency
 * @param {number} amount - The amount to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted currency string (e.g., "Ksh 1,234.56")
 */
export const formatCurrency = (amount, decimals = 2) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Ksh 0.00';
  }
  return `Ksh ${parseFloat(amount).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

/**
 * Format a number as Kenyan Shillings currency (compact version without comma separators)
 * @param {number} amount - The amount to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted currency string (e.g., "Ksh 1234.56")
 */
export const formatCurrencyCompact = (amount, decimals = 2) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Ksh 0.00';
  }
  return `Ksh ${parseFloat(amount).toFixed(decimals)}`;
};

