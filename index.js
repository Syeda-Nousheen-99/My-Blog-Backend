const express = require('express');
const app = express();
const cors = require('cors');
const fileUpload = require('express-fileupload');
const { connect } = require('mongoose');
require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-adminsdk.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'blog-468a1.appspot.com'
});

const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');



app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// CORS Configuration
// app.use(cors({
//   credentials: true,
//   origin: "http://localhost:5173"
// }));

app.use(cors());

app.get('/', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Hello Backend'
  });
});

app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

app.use(notFound);
app.use(errorHandler);

app.get("/", (req,res) => {
  return res.status(200).json({
    success: true,
    message: 'Hello Backend'
  });
});

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
