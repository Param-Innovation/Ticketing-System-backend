import express from "express";
const router = express.Router();
import passport from "passport";

router.get("/login/success", async(req, res) => {
  // console.log("reqqq",req.user)
  if (req.user) {
    try {
      res.status(200).json({
        error: false,
        message: "Successfully Loged In",
        user: req.user,
      });
    } catch (err) {
      res.status(403).json({ error: true, message: err });
    }
  } else {
    res.status(403).json({ success: false, message: "Not Authorized" });
  }
});

router.get("/login/failed", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Log in failure",
  });
});

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    successRedirect: `${process.env.CLIENT_URL}/user`,
    failureRedirect: "/login/failed",
  })
);

router.get("/logout", (req, res) => {
  req.logout();
  res.redirect(process.env.CLIENT_URL);
});

export default router;
