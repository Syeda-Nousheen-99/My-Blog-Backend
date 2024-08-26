// const express = require('express');
// const app = express();
// const cors = require('cors');
// const fileUpload = require('express-fileupload'); // Import express-fileupload
// const {connect} = require('mongoose')
// require('dotenv').config()


// app.use(cors());

// const userRoutes = require('./routes/userRoutes');
// const postRoutes = require('./routes/postRoutes');
// const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// app.use(express.json({ extended: true }));
// app.use(express.urlencoded({ extended: true }));
// app.use(cors({ credentials: true, origin: "http://localhost:3000" }));

// // Add express-fileupload middleware before defining routes
// app.use(fileUpload());

// app.use('/api/users', userRoutes);
// app.use('/api/posts', postRoutes);

// app.use(notFound);
// app.use(errorHandler);

// connect(process.env.MONGO_URI).then(() => {
//     app.listen(process.env.PORT || 5000, () => {
//       console.log(`Server Started on Port ${process.env.PORT}`);
//     });
//   }).catch(error => {
//     console.error("MongoDB connection error:", error);
//   });



const express = require('express');
const app = express();
const cors = require('cors');
const fileUpload = require('express-fileupload'); // Import express-fileupload
const { connect } = require('mongoose');
require('dotenv').config();

// Correct CORS configuration with credentials
const corsOptions = {
  origin: "http://localhost:5173", // Use the correct frontend origin
  credentials: true, // Allow cookies and other credentials
};
app.use(cors(corsOptions)); // Apply CORS middleware

app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }));

// Add express-fileupload middleware before defining routes
app.use(fileUpload());

const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

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
