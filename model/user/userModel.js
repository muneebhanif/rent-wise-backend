const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = mongoose.Schema;

const userSchema = new UserSchema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/\S+@\S+\.\S+/, "is invalid"],
  },
  password: {
    type: String,
    minlength: 8,
    maxlength: 80,
    validate: {
      validator: function (v) {
        if (!this.googleId && !this.facebookId) {
          return v && v.length >= 8;
        }
        return true;
      },
      message: "Password must be at least 8 characters long.",
    },
  },
  role: {
    type: String,
    enum: ["owner", "user", "admin"],
    default: "user",
    required: true,
  },
  phoneNumber: {
    type: String,
    trim: true,
    default: "",
  },
  bio: {
    type: String,
    trim: true,
    default: "",
  },
  NotificationSetting: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserSettings",
    default: null,
  },

  // userReview:
  //   [
  //     {
  //       reviewId: { type: mongoose.Schema.Types.ObjectId, ref: "ProfileReview" , default:null },
  //       canReview: { type: Boolean, default: false }
  //     }
  //   ],

  favoriteListings: [{ type: mongoose.Schema.Types.ObjectId, ref: "RentalItem" }],

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  imageUrl: {
    type: String,
    default:
      "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
  },
  googleId: {
    type: String,
    default: null,
  },
  facebookId: {
    type: String,
    default: null,
  },
});

userSchema.pre("save", function (next) {
  if (!this.googleId && !this.facebookId && !this.password) {
    return next(
      new Error(
        "Password is required if not authenticating via Google or Facebook"
      )
    );
  }
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);
module.exports = User;
