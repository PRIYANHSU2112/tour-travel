const express = require("express");
const { createBookingsFromCart, confirmPayment } = require("../controller/checkoutController");
 
const router = express.Router();
 
 
router.post("/verify",confirmPayment)
router.post("/:userId", createBookingsFromCart)

module.exports = router;