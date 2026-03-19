const express = require("express");
const {
  createBookingsFromCart,
  confirmPayment,
  createAgentPaidOrder,
  confirmAgentPayment,
  createAgentPaidOrderDynamic,
  confirmAgentPaymentDynamic,
  getAgentPaidTransactions,
} = require("../controller/checkoutController");
const { protect } = require("../middleware/authMiddleware");

const { bookingModel } = require("../models/bookingModel");

const router = express.Router();

router.post("/verify", protect, confirmPayment);

// Agent paid subscription (company fixed fee)
router.post("/agent-pay/verify", protect, confirmAgentPayment);
router.post("/agent-pay/:agentId", protect, createAgentPaidOrder);

// Agent paid subscription (distributor dynamic pricing)
router.post("/agent-pay-dynamic/verify", protect, confirmAgentPaymentDynamic);
router.post("/agent-pay-dynamic/:agentId", protect, createAgentPaidOrderDynamic);

// Agent paid transactions
router.get("/agent-pay/transactions/:agentId", protect, getAgentPaidTransactions);

router.post("/:userId", createBookingsFromCart);


router.get('/invoice', async (req, res) => {
  const bookingId = req.query.bookingId;

  try {
    const booking = await bookingModel.findOne({ bookingId: bookingId }); // your DB model
    if (!booking || !booking.invoiceUrl) {
      return res.status(404).send('Invoice not found');
    }

    console.log("BookingUrl:", booking.invoiceUrl);

    // Redirects to your DigitalOcean PDF URL
    res.redirect(302, booking.invoiceUrl);

  } catch (error) {
    console.error("Redirect error:", error);
    res.status(500).send('Something went wrong');
  }
});

module.exports = router;

