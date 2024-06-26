const enhanceUserContext = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.userId);
      req.userType = "Registered"; // Adjust as needed
    } catch (error) {
      console.log("Invalid token", error);
    }
  } else if (req.isAuthenticated()) {
    req.user = req.user; // Passport should handle this
    req.userType = "Registered"; // This could be adjusted based on your application's logic
  }
  next();
};

export default enhanceUserContext;
