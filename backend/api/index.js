const app = require('../server');
const connectDB = require('../config/db');

module.exports = async (req, res) => {
  try {
    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error('Serverless DB error:', error);

    return res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
};