const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../model/user.model');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const googleId = profile.id;
        const avatarUrl = profile.photos[0]?.value;

        // Tìm user theo google_id hoặc email
        let user = await User.findOne({ $or: [ { google_id: googleId }, { email: email } ] });

        if (user) {
          // User đã tồn tại, cập nhật google_id nếu chưa có
          if (!user.google_id) {
            user.google_id = googleId;
            user.email_verified = true;
            user.avatar_url = avatarUrl || user.avatar_url;
            user.is_active = true;
            await user.save();
          }
        } else {
          // Tạo user mới từ Google account
          user = new User({
            email,
            google_id: googleId,
            email_verified: true,
            avatar_url: avatarUrl,
            is_active: true
          });
          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Serialize user (lưu vào session)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user (lấy từ session)
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
