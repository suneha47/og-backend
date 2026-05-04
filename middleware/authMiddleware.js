const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token. Access denied." });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();

  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = protect;
