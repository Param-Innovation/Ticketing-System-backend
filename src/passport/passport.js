import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID, // Your Credentials here.
      clientSecret: process.env.GOOLE_CLIENT_SECRET, // Your Credentials here.
      callbackURL: "/auth/google/callback",
      passReqToCallback: true,
      scope: ["profile", "email"],
    },
    function (request, accessToken, refreshToken, profile, done) {
      return done(null, profile);
    }
  )
);
