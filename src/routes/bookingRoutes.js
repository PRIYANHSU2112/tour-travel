const express = require("express");
const BookingController = require("../controller/bookingController");
const {
  bookingModel,
  bookingTypes,
  bookingStatuses,
  paymentStatuses,
  paymentMethods,
  userTypes,
} = require("../models/bookingModel");
const { protect } = require("../middleware/authMiddleware");
const {
  checkEligibilityAndGetDiscount,
  consumeDiscount,
  incrementCompletedYatras,
} = require("../controller/yatraLoyaltyController");

const router = express.Router();
const bookingController = new BookingController(bookingModel);

router.post("/", async (req, res) => {
  try {
    console.log("Request Body:", req.body);

    const payload = { ...req.body };

    // ── Yatra Loyalty: auto-apply discount on 5th Group Tour booking ──
    const isGroupTour = payload.bookingType === "Group Tour";
    const userId = payload.userId;
    let loyaltyDiscountApplied = null;

    if (isGroupTour && userId) {
      const eligibility = await checkEligibilityAndGetDiscount(userId);
      if (eligibility.isEligible) {
        loyaltyDiscountApplied = eligibility;
        // Discount will be applied; totalAmount is computed by the pre-save hook.
        // We set discountAmount here so computeAmounts() factors it in.
        if (eligibility.discountType === "free") {
          // Mark as free — pre-save will compute finalAmount = 0 after discount
          payload._loyaltyFreeDiscount = true;
        } else {
          // Flat discount
          const existing = payload.discountAmount || 0;
          payload.discountAmount = existing + eligibility.discountValue;
        }
      }
    }

    const booking = await bookingController.createBooking(payload);

    // If "free" type, set discountAmount = totalAmount after save
    if (loyaltyDiscountApplied && loyaltyDiscountApplied.discountType === "free") {
      await bookingController.updateBooking(booking._id, {
        $set: { discountAmount: booking.totalAmount },
      });
    }

    // Consume the loyalty discount record
    if (loyaltyDiscountApplied) {
      await consumeDiscount(
        userId,
        booking._id,
        loyaltyDiscountApplied.discountType,
        loyaltyDiscountApplied.discountType === "free"
          ? booking.totalAmount
          : loyaltyDiscountApplied.discountValue
      );
    }

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: booking,
      loyaltyDiscountApplied: loyaltyDiscountApplied
        ? {
            discountType: loyaltyDiscountApplied.discountType,
            discountValue: loyaltyDiscountApplied.discountValue,
          }
        : null,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    const {
      page,
      limit,
      sort,
      sortBy,
      sortOrder,
      order,
      includeDisabled,
      ...filters
    } = req.query || {};

    const bookings = await bookingController.getBookings(filters, {
      page,
      limit,
      sort,
      sortBy,
      sortOrder,
      order,
      includeDisabled,
    });

    res.status(200).json({
      success: true,
      message: "Bookings fetched successfully",
      data: bookings.data,
      pagination: bookings.pagination,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
router.get("/user", protect, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      page,
      limit,
      sort,
      sortBy,
      sortOrder,
      order,
      includeDisabled,
      ...filters
    } = req.query || {};

    const bookings = await bookingController.getBookingsByUser(filters, {
      page,
      limit,
      sort,
      sortBy,
      sortOrder,
      order,
      userId,
      includeDisabled,
    });

    res.status(200).json({
      success: true,
      message: "Bookings fetched successfully",
      data: bookings.data,
      pagination: bookings.pagination,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


router.put("/:id", protect, async (req, res) => {
  try {
    // ── Yatra Loyalty: increment counter when Group Tour reaches Completed ──
    if (req.body.bookingStatus === "Completed") {
      // Fetch existing booking to check prior status and read booking details
      const existing = await bookingController.getBookingById(req.params.id);

      // Only count if the booking was NOT already Completed (prevents double-count)
      const wasAlreadyCompleted = existing && existing.bookingStatus === "Completed";

      if (
        !wasAlreadyCompleted &&
        existing &&
        existing.bookingType === "Group Tour" &&
        existing.userId &&
        existing.numberOfTravelers > 1
      ) {
        // Non-blocking: loyalty update should not fail the booking update
        incrementCompletedYatras(
          existing.userId.toString(),
          existing._id
        ).catch((err) =>
          console.error("[YatraLoyalty] incrementCompletedYatras error:", err.message)
        );
      }
    }

    const booking = await bookingController.updateBooking(
      req.params.id,
      req.body,
    );
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }
    res.status(200).json({
      success: true,
      message: "Booking updated successfully",
      data: booking,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.patch("/:id/disable", protect, async (req, res) => {
  try {
    const { isDisabled } = req.body || {};

    const booking = await bookingController.setBookingDisabled(req.params.id, {
      isDisabled,
    });
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    res.status(200).json({
      success: true,
      message: booking.isDisabled
        ? "Booking disabled successfully"
        : "Booking enabled successfully",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/meta/enums", (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      bookingTypes,
      bookingStatuses,
      paymentStatuses,
      paymentMethods,
      userTypes,
    },
  });
});

router.delete("/:id", protect, async (req, res) => {
  try {
    const booking = await bookingController.deleteBooking(req.params.id);
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }
    res.status(200).json({
      success: true,
      message: "Booking deleted successfully",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/admin/table", protect, async (req, res) => {
  try {
    const data = await bookingController.getBookingsForAdminTable(req.query);

    res.status(200).json({
      success: true,
      ...data,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// router.get("/admin/export", protect, async (req, res) => {
//   try {
//     await bookingController.exportBookingsExcel(req, res);
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// });



router.get("/export-bookings", protect, async (req, res) => {
  try {
    await bookingController.exportBookingsExcel(req, res);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.get("/invoice-url/:bookingId", async (req, res) => {
  try {
    const booking = await bookingController.getBookingInvoiceUrlById(req.params.bookingId);
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }
    res.status(200).json({
      success: true,
      message: "Invoice URL fetched successfully",
      invoiceUrl: booking.invoiceUrl || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const booking = await bookingController.getBookingById(req.params.id);
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }
    res.status(200).json({
      success: true,
      message: "Booking fetched successfully",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
