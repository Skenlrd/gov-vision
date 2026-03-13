import { Request, Response, NextFunction } from "express"

/*
  requireRole is a middleware factory.

  Usage in routes:
  router.get("/something", validateJWT, requireRole(["admin", "manager"]), handler)

  How it works:
  - Takes an array of allowed roles
  - Returns a middleware function
  - That middleware checks req.user.role against the array
  - If the role is in the array → call next()
  - If not → return 403 Forbidden

  Always use AFTER validateJWT — req.user must exist first.
*/

export function requireRole(allowedRoles: string[]) {

  return (req: Request, res: Response, next: NextFunction): void => {

    /*
      req.user is set by validateJWT.
      If it doesn't exist here, validateJWT was not applied.
    */
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" })
      return
    }

    /*
      Check if the user's role is in the allowed list.
      includes() is case-sensitive — make sure roles are
      stored consistently in your JWT payload.
    */
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: "Access denied",
        required: allowedRoles,
        yourRole: req.user.role
      })
      return
    }

    next()

  }

}