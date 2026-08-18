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

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:5173',
  'https://safe-route-dun.vercel.app',
  'https://safe-route-aciewq3l7-printflow-app.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());
app.use(express.json({ limit: '10mb' }));


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
if (require.main === module) {
  startServer();
}

module.exports = app;