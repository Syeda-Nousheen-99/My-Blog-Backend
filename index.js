const express = require('express');
const app = express();
const cors = require('cors');
const fileUpload = require('express-fileupload');
const { connect } = require('mongoose');
require('dotenv').config();

// CORS Configuration
app.use(cors({
  credentials: true,
  origin: ["http://localhost:5173"]
}));

app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

// Root route to handle '/'
app.get('/', (req, res) => {
  res.send('API is running...');
});

app.use(notFound);
app.use(errorHandler);

connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server Started on Port ${process.env.PORT || 5000}`);
    });
  })
  .catch(error => {
    console.error("MongoDB connection error:", error);
  });

module.exports = app;
