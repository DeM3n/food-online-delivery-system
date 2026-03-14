const authService = require('../services/authService');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({
      success: true,
      data: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        full_name: result.user.full_name,
        phone_number: result.user.phone_number,
        token: result.token,
        profile: result.profile
      }
    });
  } catch (error) {
    console.error(error);
    const statusCode = error.message === 'User already exists' ? 400 : 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json({
      success: true,
      data: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        full_name: result.user.full_name,
        phone_number: result.user.phone_number,
        token: result.token,
        profile: result.profile
      }
    });
  } catch (error) {
    console.error(error);
    const statusCode = error.message === 'Invalid email or password' ? 401 : 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await authService.getProfile(req.user.id);
    res.json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    const statusCode = error.message === 'User not found' ? 404 : 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const updatedUser = await authService.updateProfile(req.user.id, req.body);
    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error(error);
    const statusCode = error.message === 'User not found' ? 404 : 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};
