// const cartModel = require('../models/cartModel');
const { bookingModel } = require('../models/bookingModel');
const orderModel = require('../models/orderModel');
const { default: mongoose } = require('mongoose');
const { packageModel } = require('../models/packageModel');
const Razorpay = require('razorpay');
const { verifyPayment } = require('../utils/razorpayVerify');
const dotenv =require('dotenv')
dotenv.config()
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});
const createBookingsFromCart = async (req, res) => {
    console.log(process.env.RAZORPAY_KEY_SECRET)
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // const { userId } = req.params;
        const { travelerDetailsMap, customerInfo, userId, packageId, selectedAddOns=[], adults, children, checkInDate } = req.body;


        const previousPendingOrders = await orderModel.find({ userId, orderStatus: 'Pending' }).session(session);

        for (const order of previousPendingOrders) {
            await order.cancelWithBookings(session);
        }

        // const cart = await cartModel.findOne({ userId }).populate('items.packageId').session(session);
        // if (!cart || cart.items.length === 0) {
        //     await session.abortTransaction();
        //     session.endSession();
        //     return res.status(400).json({
        //         success: false,
        //         message: "Cart is empty"
        //     });
        // }

        const bookings = [];
        const packageData = await packageModel.findById(new mongoose.Types.ObjectId(packageId))
  
        // for (const cartItem of cart.items) {
        {
            // const {}

            // const packageData = packageId;
            const travelers = travelerDetailsMap;

            const packageCostPerPerson = packageData.basePricePerPerson || 0;
            const totalTravelers = adults + children;
            const basePrice = packageData.basePricePerPerson;
            const childPrice = packageData.childPrice || basePrice;
            
            const addOnsTotal = selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);
            console.log(addOnsTotal)
            const quantity = 1;

            const totalAmount =
                (basePrice * adults + childPrice * children + addOnsTotal) * quantity;

                console.log(totalAmount)
            const travelEndDate = new Date(checkInDate);
            travelEndDate.setDate(travelEndDate.getDate() + (packageData.duration || 1));

            const newBooking = new bookingModel({
                userId,
                customerName: customerInfo.name,
                mobileNumber: customerInfo.phone,
                email: customerInfo.email,
                userType: "App User",
                bookingType: "Package Tour",
                selectedPackageId: packageData._id,
                cityId: packageData.cityId,
                numberOfTravelers: totalTravelers,
                adults: adults,
                children: children,
                travelStartDate: checkInDate,
                travelEndDate,
                packageCostPerPerson,
                selectedAddOns: selectedAddOns,
                addOnsTotal,
                travelerDetails: travelers,
                specialRequests: customerInfo.specialRequests || '',
                paymentStatus: "Pending",
                bookingStatus: "Pending",
                totalAmount: totalAmount,
                createdBy: userId
            });

            await newBooking.save({ session });
            bookings.push(newBooking);
            // }
        }
console.log(bookings)
        const totalAmount = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
       console.log("last amount",totalAmount)
        const razorpayOrderOptions = {
            amount: totalAmount * 100,
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
            notes: {
                userId: userId,
                customerName: customerInfo.name,
                customerEmail: customerInfo.email,
                bookingType: "Package Tour"
            }
        };

        const razorpayOrder = await razorpay.orders.create(razorpayOrderOptions);

        const newOrder = new orderModel({
            userId,
            bookingIds: bookings.map(b => b.bookingId),
            totalAmount,
            orderId: razorpayOrder.id
        });

        await newOrder.save({ session });

        await bookingModel.updateMany(
            { bookingId: { $in: newOrder.bookingIds } },
            { orderId: newOrder.orderId },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: "Bookings created. Please proceed to payment.",
            orderId: newOrder.orderId,
            bookingIds: newOrder.bookingIds,
            totalAmount: newOrder.totalAmount,
            razorpayOrder: {
                id: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency
            },
           
            razorpayKeyId: process.env.RAZORPAY_KEY_ID
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error creating bookings:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create bookings"
        });
    }
};

const confirmPayment = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        // const { orderId } = req.params;
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
//  console.log("verify payment",orderId)
        session.startTransaction();

        const order = await orderModel.findOne({orderId:razorpay_order_id}).session(session);
        if (!order || order.orderStatus !== 'Pending') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: "Invalid order"
            });
        }
        const valid=verifyPayment(razorpay_order_id,razorpay_payment_id,razorpay_signature)

        if(!valid){
            return res.status(400).json({
                success:false,
                message:"Invalid payment signature"

            })
        }
       const payment = await razorpay.payments.fetch(razorpay_payment_id);
       console.log(payment)
        order.orderStatus = 'Paid';
        order.paymentStatus = 'Completed';
        order.transactionId = payment.razorpay_payment_id;
        order.paymentMethod = payment.method;
        await order.save({ session });

        await bookingModel.updateMany(
            { bookingId: { $in: order.bookingIds } },
            {
                paymentStatus: 'Paid',
                bookingStatus: 'Confirmed',
                transactionId:payment.razorpay_payment_id,
                paymentMethod: payment.method
            },
            { session }
        );

        // await cartModel.findOneAndDelete({ userId: order.userId }).session(session);


        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: "Payment confirmed!",
            order
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error confirming payment:", error);
        res.status(500).json({
            success: false,
            message: "Failed to confirm payment"
        });
    }
};


const webhook=async (req,res)=>{

    return res.status(201).json({
        success:true,
        message:"webhook hit"
    })
}

module.exports = {
    createBookingsFromCart,
    confirmPayment,
    webhook
};