const mongoose = require("mongoose");

// Connect to MongoDB with error handling
mongoose.connect("mongodb://127.0.0.1/AuthenticationSystemDb")
  .then(() => console.log("✓ MongoDB connected successfully"))
  .catch(err => console.log("✗ MongoDB connection error:", err));

const userSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true
    },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  profilepic:{
    type: String,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String
  },
  verificationTokenExpiry: {
    type: Date
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpiry: {
    type: Date
  },
  createdAt:{
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model("User", userSchema);

module.exports = User;

