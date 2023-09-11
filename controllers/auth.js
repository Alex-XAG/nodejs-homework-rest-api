const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const gravatar = require("gravatar");
const path = require("path");
const fs = require("fs/promises");
const Jimp = require("jimp");
const { nanoid } = require("nanoid");

const { User, schemas } = require("../models/user");

const { HttpError, sendEmail } = require("../helpers");
const { error } = require("console");

const { SECRET_KEY, BASE_URL } = process.env;

const avatarsDir = path.join(__dirname, "../", "public", "avatars");

const register = async (req, res, next) => {
  try {
    const { error } = schemas.registerSchema.validate(req.body);
    if (error) {
      const missingFieldName = error.details[0].message;

      throw HttpError(400, missingFieldName);
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      throw HttpError(409, "Email in use");
    }

    const hashPassword = await bcrypt.hash(password, 10);
    const avatarURL = gravatar.url(email);
    const verificationToken = nanoid();

    const newUser = await User.create({
      ...req.body,
      password: hashPassword,
      avatarURL,
      verificationToken,
    });

    const verifyEmail = {
      to: email,
      subject: "Verify email",
      html: `<a target="_blank" href="${BASE_URL}/users/verify/${verificationToken}">Click verify email</a>`,
    };

    await sendEmail(verifyEmail);

    res.status(201).json({
      user: {
        email: newUser.email,
        subscription: "Starter",
      },
    });
  } catch (error) {
    next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const { verificationToken } = req.params;

    const user = await User.findOne({ verificationToken });
    if (!user) {
      throw HttpError(404, "User not found");
    }
    await User.findByIdAndUpdate(user._id, {
      verify: true,
      verificationToken: null,
    });

    res.status(200).json({ message: "Verification successful" });
  } catch (error) {
    next(error);
  }
};

const resendVerifyEmail = async (req, res, next) => {
  try {
    const { error } = schemas.emailSchema.validate(req.body);
    if (error) {
      const missingFieldName = error.details[0].message;
      throw HttpError(400, missingFieldName);
    }

    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      throw HttpError(404, "User not found");
    }
    if (user.verify) {
      throw HttpError(400, "Verification has already been passed");
    }

    const verifyEmail = {
      to: email,
      subject: "Verify email",
      html: `<a target="_blank" href="${BASE_URL}/users/verify/${user.verificationToken}">Click verify email</a>`,
    };
    await sendEmail(verifyEmail);

    res.status(200).json({
      message: "Verification email sent",
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { error } = schemas.loginSchema.validate(req.body);
    if (error) {
      const missingFieldName = error.details[0].message;

      throw HttpError(400, missingFieldName);
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      throw HttpError(401, "Email or password is wrong");
    }

    if (!user.verify) {
      throw HttpError(404, "Please! Verify your email before log in");
    }

    const passwordCompare = await bcrypt.compare(password, user.password);
    if (!passwordCompare) {
      const errMessage = "Email or password is wrong";
      HttpError(401, errMessage);
    }

    const payload = {
      id: user._id,
    };

    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "23h" });
    await User.findByIdAndUpdate(user._id, { token });

    res.status(200).json({
      token: token,
      user: {
        email: email,
        subscription: "starter",
      },
    });
  } catch (error) {
    next(error);
  }
};

const getCurrentUser = (req, res, next) => {
  try {
    const { email, subscription } = req.user;
    console.log(subscription);

    res.json({ email, subscription });
  } catch (error) {
    next(error);
  }
};

const logOut = async (req, res) => {
  const { _id } = req.user;
  await User.findByIdAndUpdate(_id, { token: "" });

  res.status(204).json();
};

const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      const errMessage = "File is required!";
      throw HttpError(400, errMessage);
    }
    const { _id } = req.user;
    const { path: tempUpload, originalname } = req.file;

    const fileName = `${_id}_${originalname}`;

    const resultUpload = path.join(avatarsDir, fileName);
    await fs.rename(tempUpload, resultUpload);
    Jimp.read(resultUpload)
      .then((avatar) => {
        return avatar
          .resize(250, 250) // resize
          .quality(60) // set JPEG quality
          .write(resultUpload); // save
      })
      .catch((err) => {
        console.error(err);
      });

    const avatarURL = path.join("avatars", fileName);
    await User.findByIdAndUpdate(_id, { avatarURL });

    res.json({ avatarURL });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  logOut,
  updateAvatar,
  verifyEmail,
  resendVerifyEmail,
};
