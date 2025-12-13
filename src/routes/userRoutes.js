const express = require("express");
const UserController = require("../controller/userController");
const { userModel, userRoles, userStatuses } = require("../models/userModel");
const { protect } = require("../middleware/authMiddleware");
const { uploadSingle } = require("../middleware/s3Upload");
const multer = require("multer");

const router = express.Router();
const userController = new UserController(userModel);

router.post("/",protect, async (req, res) => {
  try {
    console.log(req.user);
    const userId=req.user.userId;
    console.log("Requesting User ID:", userId);
    const user = await userController.registerUser(req.body,userId);
    res.status(201).json({ success: true, message: "User created successfully", data: user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});
router.post("/register", async (req, res) => {
  try {
    const user = await userController.registerAdmin(req.body);
    res.status(201).json({ success: true, message: "Admin created successfully", data: user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});
router.post("/login", async (req, res) => {
  try {
    const user = await userController.loginAdmin(req.body);
    res.status(201).json({ success: true, message: "Admin created successfully", data: user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/phone/send-otp", async (req, res) => {
  try {
    const result = await userController.sendPhoneOtpByPhone(req.body || {});

    res.status(200).json({
      success: true,
      message: "OTP generated successfully",
      data: {
        userId: result.userId,
        phone: result.phone,
        role:result.role,
        expiresAt: result.expiresAt,
        otp: process.env.NODE_ENV === "development" ? result.otp : undefined,
        created: result.created,
        needsProfileUpdate: result.needsProfileUpdate,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/phone/verify-otp", async (req, res) => {
  try {
    const result = await userController.verifyPhoneOtpByPhone(req.body || {});
    if (!result) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "Phone number verified successfully",
      data: result,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get("/", protect, async (req, res) => {
  try {

    const { page, limit, sort, ...filters } = req.query;
    const result = await userController.getUsers(filters, { page, limit, sort });
    res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const user = await userController.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, message: "User fetched successfully", data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/:id",
  (req, res, next) => {
    uploadSingle("profileUrl")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: err.message })
      } else if (err) {
        return res.status(500).json({ success: false, message: err.message })
      }
      next()
    })
  },protect, async (req, res) => {
  try {
    const { id:userId } = req.params
    const realUserId = req.user.userId;
    if (req.user.role !== 'Admin' && realUserId !== userId) {
      return res.status(403).json({ success: false, message: "Forbidden: You don't have permission to update the user." });
    }
    // ise dekhna h
    req.body.avatarUrl=req?.file?.location
    const user = await userController.updateUser(userId, req.body);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, message: "User updated successfully", data: user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.patch("/:id/disable", protect, async (req, res) => {
  try {
    const { updatedBy } = req.body || {};

    const user = await userController.setUserDisabled(req.params.id, { updatedBy });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: user?.isDisabled ? "User disabled successfully" : "User enabled successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});



module.exports = router;
