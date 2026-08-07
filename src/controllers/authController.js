const authService = require('../services/authService');
const { successResponse } = require('../utils/apiResponse');

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    return res.status(201).json(successResponse(result, 'User registered successfully'));
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    return res.status(200).json(successResponse(result, 'Login successful'));
  } catch (error) {
    next(error);
  }
}

async function adminLogin(req, res, next) {
  try {
    const result = await authService.adminLogin(req.body);
    return res.status(200).json(successResponse(result, 'Admin login successful'));
  } catch (error) {
    next(error);
  }
}

async function getMe(req, res, next) {
  try {
    return res.status(200).json(successResponse({ user: req.user }, 'Authenticated user'));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  adminLogin,
  getMe
};
