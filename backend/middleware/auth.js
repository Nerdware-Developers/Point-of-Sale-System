// Authentication disabled - all routes are publicly accessible
// Set req.user to a default admin user for compatibility with existing code
export const authenticate = async (req, res, next) => {
  // Set a default user object for compatibility
  req.user = {
    id: 1,
    username: 'admin',
    email: 'admin@pos.com',
    role: 'admin',
    full_name: 'Administrator'
  };
  next();
};

export const authorize = (...roles) => {
  // Authorization disabled - always allow access
  return (req, res, next) => {
    next();
  };
};

