const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const reportRoutes = require('./routes/reportRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const safePlaceRoutes = require('./routes/safePlaceRoutes');
const routeRoutes = require('./routes/routeRoutes');
const contactRoutes = require('./routes/contactRoutes');
const profileRoutes = require('./routes/profileRoutes');

const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Saarthi API is running',
  });
});

app.use('/api/reports', reportRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/safe-places', safePlaceRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/profile', profileRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Server error',
    error: err.message,
  });
});

const startServer = async () => {
  try {
    console.log('Starting Saarthi backend...');

    await connectDB();

    app.listen(PORT, () => {
      console.log(`Saarthi server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
