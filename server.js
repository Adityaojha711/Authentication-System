const express = require("express");
const bcrypt = require("bcrypt");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const path = require("path");
const crypto = require("crypto");
const User = require("./Models/user.Model.js");  // Capital U - it's a class!
const upload = require("./utils/multer.js");

const app = express();
app.use(cookieParser());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const port = 3000;

app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.get("/Register", (req, res) => {
  res.render("Registration.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.post("/Register", upload.single("profilepic"), async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate file upload
    if (!req.file) {
      return res.status(400).json({ message: "Profile picture is required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Validate password strength (min 6 characters)
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      profilepic: req.file.filename,
      isVerified: false,
    });

    // Save user to database
    const savedUser = await newUser.save();

    // Generate JWT token
    const token = jwt.sign({ email, name }, process.env.JWT_SECRET || "secret");
    res.cookie("token", token, { httpOnly: true, maxAge: 3600000 });

    res.status(201).json({ 
      message: "User registered successfully", 
      user: { name: savedUser.name, email: savedUser.email, id: savedUser._id } 
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

app.get("/profile", IsLoggedIn, (req, res) => {
  res.send(req.user);
});

function IsLoggedIn(req, res, next) {
  let token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "Please login first" });
  } else {
    try {
      let user = jwt.verify(token, process.env.JWT_SECRET || "secret");
      console.log(user);
      req.user = user;
      next();
    } catch (error) {
      console.log(error);
      return res.status(401).json({ message: "Invalid token" });
    }
  }
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
