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


// Route: GET /invoice
router.get('/invoice', async (req, res) => {
  const { id } = req.query;
  console.log("hit ====================== ===");

  if (!id) {
    return res.status(400).json({ message: "Invoice ID required" });
  }

  // API hit karo
  const response = await axios.get(
    `https://api.zunjarraoyatra.com/api/checkout/invoice?bookingId=${id}`
  );

  // invoiceUrl nikalo response se
  const invoiceUrl = response.data.invoiceUrl; //  field name confirm karo

  // S3 PDF pe redirect karo
  return res.redirect(invoiceUrl);
});

module.exports = router;

