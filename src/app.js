const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

dotenv.config();

const connectDB = require("./db/db");

const cityRoutes = require("./routes/cityRoutes");
const stateRoutes = require("./routes/stateRoutes");
const countryRoutes = require("./routes/countryRoutes");
const placeRoutes = require("./routes/placeRoutes");
const packageRoutes = require("./routes/packageRoutes");
const tourRoutes = require("./routes/tourRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const blogRoutes = require("./routes/blogRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const userRoutes = require("./routes/userRoutes");
const agentRoutes = require("./routes/agentRoutes");
const guideAllocationRoutes = require("./routes/guideAllocationRoutes");
const leadRoutes = require("./routes/leadRoutes");
const ivrRoutes = require("./routes/ivrRoutes");
const companyRoutes = require('./routes/companyRoutes')
const contactUsRoutes = require('./routes/contactUsRoutes')
const wishlistRoutes = require('./routes/wishlistRoutes')
const reviewRoutes=require('./routes/reviewRoutes')
const bannerRoutes=require('./routes/bannerRoutes')
const offerRoutes=require('./routes/offerRoutes')
const faqRoutes=require('./routes/faqRoutes')
const cartRoutes=require('./routes/cartRoutes')
const aboutUs=require('./routes/aboutUsRoutes')
const invoiceRoutes=require('./routes/invoiceRoutes')
const checkoutRoutes=require('./routes/checkoutRoutes')
const guideRoutes=require('./routes/guideRoutes')
const razorpayRoutes=require('./routes/razorpayRoutes')
const galleryRoutes=require('./routes/galleryRoutes')

const app = express();

app.use(express.json());
app.use(cors());

app.use("/api/cities", cityRoutes);
app.use("/api/states", stateRoutes);
app.use("/api/countries", countryRoutes);
app.use("/api/places", placeRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/tours", tourRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/guide-allocations", guideAllocationRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/ivr", ivrRoutes);
app.use("/api/company",companyRoutes)
app.use('/api/contactUs',contactUsRoutes)
app.use('/api/wishlist',wishlistRoutes)
app.use('/api/review',reviewRoutes)
app.use('/api/banner',bannerRoutes)
app.use('/api/offer',offerRoutes)
app.use('/api/faq',faqRoutes)
app.use('/api/cart',cartRoutes)
app.use('/api/about',aboutUs)
app.use('/api/invoices',invoiceRoutes)
app.use('/api/checkout',checkoutRoutes)
app.use('/api/guide',guideRoutes)
app.use('/api/razorpay',razorpayRoutes)
app.use('/api/gallery',galleryRoutes)

// app.get('/.well-known/assetlinks.json', async (req, res) => {
//   try {
//     const CompanyController = require('./controller/companyController');
//     const companyModel = require('./models/companyModel');
//     const companyController = new CompanyController(companyModel);
//     const data = await companyController.getAndroidAssetLinks();
//     res.status(200).type('application/json').send(JSON.stringify(data));
//   } catch (error) {
//     res.status(500).json({ success:false, message: error.message });
//   }
// });

connectDB();

module.exports = app;
