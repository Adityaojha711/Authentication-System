const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const bcrypt = require("bcrypt");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const path = require("path");
const crypto = require("crypto");
const User = require("./Models/user.Model.js");
const upload = require("./utils/multer.js");
const transporter = require("./utils/mail.js");

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

app.post("/login", async (req, res) => {
  const { newemail,  newPassword } = req.body;
  try{
const user = await User.findOne({ email: newemail });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  const isMatch = await bcrypt.compare(newPassword, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });

  }
  const token = jwt.sign({ email: user.email, name: user.name }, process.env.JWT_SECRET || "secret");
  res.cookie("token", token, { httpOnly: true, maxAge: 3600000 });
  res.redirect("/profile")   
  }catch(err){
    res.status(500).json("Internal server error", err.message);
  }
  
});

app.get("/resetpassword", (req, res) => {
  res.render("resetpassword");
});

app.post("/resetpassword", IsLoggedIn, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

app.post("/logout", (req, res) => {
  res.cookie("token", "", { httpOnly: true, expires: new Date(0) });
  res.redirect("/");
});

app.post("/Register", upload.single("profilepic"), async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Profile picture is required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      profilepic: req.file.filename,
      isVerified: false,
    });

    const savedUser = await newUser.save();

    try {
      const mail = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Welcome to Our App!",
        text: `Hi ${name},\n\nThank you for registering! Your account has been created successfully.\n\nBest regards,\nThe Team`,
      });
    } catch (error) {
      console.log("error catched !!!!", error);
    } finally {
      console.log("finally completed");
    }

    const token = jwt.sign({ email, name }, process.env.JWT_SECRET || "secret");
    res.cookie("token", token, { httpOnly: true, maxAge: 3600000 });

    res.status(201).json({
      message: "User registered successfully",
      user: { name: savedUser.name, email: savedUser.email, id: savedUser._id },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

app.get("/profile", IsLoggedIn, async (req, res) => {
  const user = await User.findOne({ email: req.user.email });
  if (user) {
    res.render("profile.ejs", { user });
  }
});

app.get("/forgetpass",(req,res)=>{
res.render("forgetpass")
});

app.post("/forgetPass", async (req, res) => {
  try {
    const email = req.body.Email;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found with this email" });
    }

    const resetToken = crypto.randomBytes(10).toString("hex");
    const resettokenexpiry = Date.now() + 10 * 60 * 1000;

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = resettokenexpiry;
    await user.save();

    const reseturl = `http://localhost:3000/reset-password/${resetToken}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset request!",
      html: `
        <h2>Password Reset</h2>
        <p>You requested a password reset.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${reseturl}">reset password</a>
        <p>This link will expire within 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });

    return res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    console.log("error catched !!!!", error);
    return res.status(500).json({ message: "Failed to send reset email", error: error.message });
  }
});

app.get("/reset-password/:token", async (req, res) => {
  
  res.render("resetpass", { token: req.params.token });

})

app.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;
try{
const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpiry: { $gt: Date.now() },
  });
  console.log(newPassword);
  if (!user) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }else{
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();
    res.render("login.ejs", { message: "Password reset successful. Please log in with your new password." });   
  }
} catch (error) {
  console.error("Password reset error:", error);
  res.status(500).json({ message: "Internal server error", error: error.message });
}

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
