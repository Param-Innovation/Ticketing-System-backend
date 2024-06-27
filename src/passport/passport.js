import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import User from "../models/userModel.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID, // Your Credentials here.
      clientSecret: process.env.GOOLE_CLIENT_SECRET, // Your Credentials here.
      callbackURL: "/api/auth/google/callback",
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
// passport.deserializeUser((id, done) => {
//   User.findById(id, (err, user) => {
//     done(err, user); // Deserialize the user by ID
//   });
// });
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user); // User object will be attached to the request object as req.user in your routes
  } catch (err) {
    done(err, null); // Handle errors
  }
});

export default passport;
