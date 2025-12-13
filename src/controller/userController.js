const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { userModel } = require("../models/userModel");
const { generateNumericOtp, getExpiryDate, sendOtpViaMSG91 } = require("../utils/otpHelper");

const OTP_SALT_ROUNDS = parseInt(
  process.env.PHONE_OTP_SALT_ROUNDS || process.env.BCRYPT_SALT_ROUNDS || "10",
  10
);
const roles = ["Admin", "Agent", "Traveler", "Guest"];
const MAX_OTP_ATTEMPTS = parseInt(process.env.PHONE_OTP_MAX_ATTEMPTS || "10", 10);
const JWT_SECRET = process.env.JWT_SECRET || "set-a-secure-jwt-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const DEFAULT_PAGE_SIZE = parseInt(process.env.DEFAULT_PAGE_SIZE || "20", 10);

class UserController {
  constructor(model = userModel) {
    this.model = model;
  }

  async registerUser(payload = {}) {
    const { phone, email } = payload;
    const query = [];
    if (phone) {
      query.push({ phone });
    }
    if (email) {
      query.push({ email });
    }

    let user;
    if (query.length) {
      user = await this.model.findOne({ $or: query }).select("+password");
    }

    if (user) {
      const updatableFields = [
        "firstName",
        "lastName",
        "email",
        "phone",
        "avatarUrl",
        "bio",
        "preferences",
        "role",
        "status",
      ];

      updatableFields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(payload, field)) {
          user[field] = payload[field];
        }
      });

      if (payload.password) {
        user.password = payload.password;
      }
      if (payload.address) {
        user.address = {
          ...user.address,
          ...payload.address
        };
      }

      await user.save();
      return user;
    }

    const newUser = new this.model(payload);
    return newUser.save();
  }

  async registerAdmin(payload = {}) {


    const { email, password } = payload;

    const existingAdmin = await this.model.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      throw new Error('admin already exist')
    }

    // const saltRounds = 12;
    // const hashedPassword = await bcrypt.hash(password, saltRounds);
    // console.log(password)
    const newAdmin = await this.model.create({
      email: email.toLowerCase(),
      password,
      role: 'Admin'
    });
    const tokenPayload = {
      userId: newAdmin._id,
      role: newAdmin.role

    };

    const token = jwt.sign(tokenPayload, JWT_SECRET);

    return {

      userId: newAdmin._id,
      email: newAdmin.email,
      token

    };


  }

  async loginAdmin(payload = {}) {

    const { email, password } = payload


    const admin = await this.model.findOne({
      email: email.toLowerCase()
    }).select('+password');


    if (!admin) {
      throw new Error("Invalid credentials")
    }


    const isPasswordValid = await admin.comparePassword(password);

    if (!isPasswordValid) {
      throw new Error("invalid credentials")
    }

    if (admin.isDisabled === true) {
      throw new Error("account has been deactivated")
    }

    const tokenPayload = {
      userId: admin._id,
      role: admin.role
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET);



    return {


      userId: admin._id,
      name: admin.name,
      email: admin.email,
      token

    }


  }

  async getUsers(filter = {}, options = {}) {
    const normalizedFilter = { ...filter };

    if (Object.prototype.hasOwnProperty.call(normalizedFilter, "isDisabled")) {
      const raw = normalizedFilter.isDisabled;
      if (typeof raw === "string") {
        normalizedFilter.isDisabled = raw === "true";
      }
    }

    const parsedPage = parseInt(options.page, 10);
    const parsedLimit = parseInt(options.limit, 10);

    const pageSize = !Number.isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : DEFAULT_PAGE_SIZE;
    const currentPage = !Number.isNaN(parsedPage) && parsedPage > 0 ? parsedPage : 1;

    const query = this.model.find(normalizedFilter).select("-password");

    if (options.sort) {
      query.sort(options.sort);
    }

    query.skip((currentPage - 1) * pageSize).limit(pageSize);

    const [items, totalItems] = await Promise.all([
      query.exec(),
      this.model.countDocuments(normalizedFilter),
    ]);

    const totalPages = Math.max(Math.ceil(totalItems / pageSize) || 1, 1);

    return {
      data: items,
      pagination: {
        totalItems,
        totalPages,
        pageSize,
        currentPage,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      },
    };
  }

  async getUserById(id) {
    return this.model.findById(id).select("-password").populate('agents');
  }

  async updateUser(id, payload) {
    const { email } = payload;
    if (email) {
      const existingUser = await this.model.findOne({
        email,
        _id: { $ne: id }
      });

      if (existingUser) {
        throw new Error("Email already in use by another user");
      }
    }
    return this.model
      .findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
      })
      .select("-password");
  }

  async deleteUser(id) {
    return this.model.findByIdAndDelete(id);
  }

  async setUserDisabled(id, options = {}) {
    const existing = await this.model.findById(id).select("isDisabled");
    if (!existing) {
      return null;
    }

    let { updatedBy } = options;
    let isDisabled = !existing.isDisabled;

    if (typeof isDisabled === "undefined") {
      isDisabled = !existing.isDisabled;
    } else {
      isDisabled = Boolean(isDisabled);
    }

    const update = {
      isDisabled,
    };

    if (updatedBy) {
      update.updatedBy = updatedBy;
    }

    return this.model
      .findByIdAndUpdate(
        id,
        {
          $set: update,
        },
        {
          new: true,
          runValidators: true,
        }
      )
      .select("-password");
  }

  
  async sendPhoneOtpByPhone(payload = {}) {
    const { phone, firstName, lastName, email, role } = payload;
    
    if(!roles.includes(role)){
      throw new Error('Please select the role')
    }
    if (!phone) {
      throw new Error("Phone number is required to send OTP");
    }

    let user = await this.model.findOne({ phone }).select("+phoneOtp.codeHash");
    if(user && user.role!==role  && user.isPhoneVerified){
           throw new Error(`this number is login as ${user.role} please choose the ${user.role} `);
      
    }
    let created = false;

    if (!user) {
      const randomPassword = crypto.randomBytes(12).toString("hex");
      user = new this.model({
        phone,
        firstName: firstName || "Guest",
        lastName,
        email,
        role,
        password: randomPassword,
      });
      created = true;
    } else {
      if (firstName) {
        user.firstName = firstName;
      }
      if (lastName) {
        user.lastName = lastName;
      }
      if (email) {
        user.email = email;
      }
      if(role){
        user.role=role
      }

    }
    const now = new Date();
    if (user.phoneOtp?.lastSentAt) {
      const timeSinceLastOtp = now - new Date(user.phoneOtp.lastSentAt);
      const cooldownPeriod = 60 * 1000;

      if (timeSinceLastOtp < cooldownPeriod) {
        const waitTime = Math.ceil((cooldownPeriod - timeSinceLastOtp) / 1000);
        throw new Error(`Please wait ${waitTime} seconds before requesting another OTP`);

      }
    }
    if (user.phoneOtp?.attempts >= MAX_OTP_ATTEMPTS) {
      const lastAttemptDate = new Date(user.phoneOtp.lastSentAt);
      const hoursSinceLastAttempt = (now - lastAttemptDate) / (1000 * 60 * 60);

      if (hoursSinceLastAttempt < 24) {
        throw new Error(`Daily OTP limit reached. Please try again after 24 hours`);

      } else {
        user.phoneOtp.attempts = 0;
      }
    }

    const otp = "123456" ||  generateNumericOtp();
 //   const sendOtp = await sendOtpViaMSG91(phone, otp);
    const expiresAt = getExpiryDate();
  //  const parsed = JSON.parse(sendOtp);

 //   if (parsed?.type == 'success') {

      const hashedOtp = await bcrypt.hash(otp, OTP_SALT_ROUNDS);
      const attempts = (user?.phoneOtp?.attempts) || 1;
      user.phoneOtp = {
        codeHash: hashedOtp,
        expiresAt,
        attempts: attempts + 1,
        lastSentAt: new Date(),
      };
      user.isPhoneVerified = false;
      await user.save();
 //   } else {
  //    throw new Error(`failed to send otp`);
  //  }



    const needsProfileUpdate = !user.firstName || user.firstName === "Guest" || !user.email;

    return {
      userId: user.id,
      phone: user.phone,
      role,
      expiresAt,
      created,
      needsProfileUpdate,
    };
  }

  async verifyPhoneOtpByPhone(payload = {}) {
    const { phone, otp: otpCode } = payload;
    if (!phone) {
      throw new Error("Phone number is required to verify OTP");
    }

    const user = await this.model.findOne({ phone }).select("+phoneOtp.codeHash").populate('agents');
    if (!user) {
      return null;
    }

    if (!user.phoneOtp || !user.phoneOtp.codeHash) {
      throw new Error("No OTP is pending verification for this user");
    }

    const { codeHash, expiresAt, attempts = 0 } = user.phoneOtp;

    // if (attempts >= MAX_OTP_ATTEMPTS) {
    //   throw new Error("Maximum OTP attempts exceeded. Please request a new OTP");
    // }

    if (expiresAt && expiresAt < new Date()) {
      throw new Error("OTP has expired. Please request a new OTP");
    }

    const normalizedOtp = String(otpCode || "").trim();
    if (!normalizedOtp) {
      throw new Error("OTP is required");
    }

    if (!codeHash) {
      throw new Error("No OTP hash found. Please request a new OTP");
    }

    const isMatch = await bcrypt.compare(normalizedOtp, codeHash);

    if (!isMatch) {
      user.phoneOtp.attempts = attempts + 1;
      await user.save();
      throw new Error("Invalid OTP. Please try again");
    }

    user.isPhoneVerified = true;
    user.phoneOtp = undefined;
    await user.save();


    let shouldCompleteProfile = true;
    let isVerified = false;
    if (user.role === 'Agent') {
      if (user?.agents) {
        shouldCompleteProfile = false;
      }
      if (user?.agents?.verificationStatus === 'Verified') {
        isVerified = true;
      }

    } else {

      shouldCompleteProfile = !user.firstName || user.firstName === "Guest" || !user.email;
    }
    const tokenPayload = {
      userId: user.id,
      role: user.role,
      phone: user.phone,
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return {
      userId: user.id,
      phone: user.phone,
      verified: true,
      role: user.role,
      needsProfileUpdate: shouldCompleteProfile,
      token,
      isVerified: isVerified
    };

  }

}

module.exports = UserController;
