import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import User from "../models/userModel.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID, // Your Credentials here.
      clientSecret: process.env.GOOLE_CLIENT_SECRET, // Your Credentials here.
      callbackURL: "/auth/google/callback",
      scope: ["profile", "email"],
      passReqToCallback: true,
    },
    async (request, accessToken, refreshToken, profile, done) => {
      // console.log(done, profile);
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          user = new User({
            googleId: profile.id,
            username: profile.displayName,
            email: profile.emails[0].value,
            // image: profile.photos[0].value
          });

          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
      done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});

export default passport;
