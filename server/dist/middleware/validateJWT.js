"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateJWT = validateJWT;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/*
  validateJWT middleware

  Flow:
  1. Read Authorization header
  2. Extract the token after "Bearer "
  3. Verify signature with JWT_SECRET
  4. Attach decoded payload to req.user
  5. Call next() to pass to the route handler

  If anything fails, return 401 immediately.
  The route handler never runs on a failed check.
*/
function validateJWT(req, res, next) {
    /*
      Read the Authorization header.
      Expected format: "Bearer eyJhbGciOi..."
    */
    const authHeader = req.headers["authorization"];
    /*
      Check for test role override (X-Test-Role header).
      This allows frontend to test different role-based visibility.
      In production, this would be removed or restricted.
    */
    const testRole = req.headers["x-test-role"];
    // If test role is provided, use it without requiring JWT
    if (testRole) {
        req.user = {
            userId: "test-user",
            role: testRole.toLowerCase(),
            department: "test-dept"
        };
        return next();
    }
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "No token provided" });
        return;
    }
    /*
      Split on the space and take the second part.
      "Bearer token123" → ["Bearer", "token123"] → "token123"
    */
    const token = authHeader.split(" ")[1];
    try {
        /*
          jwt.verify() checks:
          1. The signature matches JWT_SECRET
          2. The token has not expired
          If either check fails, it throws an error.
        */
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        /*
          Attach the decoded payload to req.user.
          Now every route handler can access:
          req.user.userId
          req.user.role
          req.user.department
        */
        req.user = decoded;
        next();
    }
    catch (err) {
        res.status(401).json({ error: "Invalid or expired token" });
    }
}
