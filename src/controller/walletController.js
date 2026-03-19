const { agentModel } = require("../models/agentModel");
const { userModel } = require("../models/userModel");
const Transaction = require("../models/transactionModel");
const mongoose = require("mongoose");

// Get Wallet Balance and Transaction History
exports.getWalletDetails = async (req, res) => {
    try {

        const userId = req.user.userId;
        // Assuming userId is passed or extracted from token
        // If using middleware to extract user, req.user._id could be used
        console.log(req.user)
        console.log(userId)
        const agent = await agentModel.findOne({ userId: userId });

        if (!agent) {
            return res.status(404).json({
                success: false,
                message: "Agent not found",
            });
        }

        const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            walletBalance: agent.wallet,
            transactions,
        });
    } catch (error) {
        console.error("Error fetching wallet details:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch wallet details",
            error: error.message,
        });
    }
};

// Get Distributor Wallet Balance and Transaction History
exports.getDistributorWalletDetails = async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await userModel.findById(userId);

        if (!user || user.role !== "Distributor") {
            return res.status(404).json({
                success: false,
                message: "Distributor not found",
            });
        }

        const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            walletBalance: user.wallet,
            creditBalance: user.credit_money,
            data: transactions,
        });
    } catch (error) {
        console.error("Error fetching distributor wallet details:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch wallet details",
            error: error.message,
        });
    }
};

// Request Withdrawal
exports.requestWithdrawal = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { amount, withdrawalMethod } = req.body;
        const userId = req.user.userId;

        if (!amount || amount <= 0) {
            throw new Error("Invalid withdrawal amount");
        }

        if (!withdrawalMethod || !["Bank", "UPI"].includes(withdrawalMethod)) {
            throw new Error("Please select a valid withdrawal method: Bank or UPI");
        }

        const agent = await agentModel.findOne({ userId }).session(session);

        if (!agent) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: "Agent not found",
            });
        }

        // Validate if selected method details exist
        if (withdrawalMethod === "Bank" && (!agent.bankDetails || !agent.bankDetails.accountNumber)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: "Bank details not found in profile. Please update bank details first.",
            });
        }

        if (withdrawalMethod === "UPI" && !agent.upiId) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: "UPI ID not found in profile. Please update UPI ID first.",
            });
        }


        if (agent.wallet < amount) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: "Insufficient wallet balance",
            });
        }

        // Deduct amount from wallet immediately
        agent.wallet -= amount;
        await agent.save({ session });

        // Create Transaction Record
        const transaction = await Transaction.create(
            [
                {
                    userId,
                    amount, // Store as positive number, type 'Debit' implies deduction
                    type: "Debit",
                    category: "Withdrawal",
                    status: "Pending",
                    description: `Withdrawal request via ${withdrawalMethod}`,
                    withdrawalMethod,
                    bankDetails: withdrawalMethod === "Bank" ? agent.bankDetails : undefined,
                    upiId: withdrawalMethod === "UPI" ? agent.upiId : undefined,
                    createdBy: userId,
                },
            ],
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: "Withdrawal request submitted successfully",
            transaction: transaction[0],
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error requesting withdrawal:", error);
        res.status(500).json({
            success: false,
            message: "Failed to request withdrawal",
            error: error.message,
        });
    }
};

// Request Distributor Withdrawal
exports.requestDistributorWithdrawal = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { amount, withdrawalMethod } = req.body;
        const userId = req.user.userId;

        if (!amount || amount <= 0) {
            throw new Error("Invalid withdrawal amount");
        }

        if (!withdrawalMethod || !["Bank", "UPI"].includes(withdrawalMethod)) {
            throw new Error("Please select a valid withdrawal method: Bank or UPI");
        }

        const user = await userModel.findById(userId).session(session);
        console.log(user)
        if (!user || user.role !== "Distributor") {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: "Distributor not found",
            });
        }

        // Validate if selected method details exist
        if (withdrawalMethod === "Bank" && (!user.bankDetails || !user.bankDetails.accountNumber)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: "Bank details not found in profile. Please update bank details first.",
            });
        }

        if (withdrawalMethod === "UPI" && !user.upiId) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: "UPI ID not found in profile. Please update UPI ID first.",
            });
        }


        if (user.wallet < amount) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: "Insufficient wallet balance",
            });
        }

        // Deduct amount from wallet immediately
        user.wallet -= amount;
        await user.save({ session });

        // Create Transaction Record
        const transaction = await Transaction.create(
            [
                {
                    userId,
                    amount, // Store as positive number, type 'Debit' implies deduction
                    type: "Debit",
                    category: "Withdrawal",
                    status: "Pending",
                    description: `Withdrawal request via ${withdrawalMethod}`,
                    withdrawalMethod,
                    bankDetails: withdrawalMethod === "Bank" ? user.bankDetails : undefined,
                    upiId: withdrawalMethod === "UPI" ? user.upiId : undefined,
                    createdBy: userId,
                },
            ],
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: "Withdrawal request submitted successfully",
            transaction: transaction[0],
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error requesting distributor withdrawal:", error);
        res.status(500).json({
            success: false,
            message: "Failed to request withdrawal",
            error: error.message,
        });
    }
};

// Get Withdrawals (Admin)
exports.getWithdrawals = async (req, res) => {
    try {
        const { status, search } = req.query;
        const filter = { category: "Withdrawal", status: "Pending" };

        if (status) {
            filter.status = status;
        }
        if (status == 'All') {
            filter.status = { $in: ["Pending", "Approved", "Rejected", "Completed"] };
        }

        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');
            const matchingUsers = await userModel.find({
                $or: [
                    { firstName: searchRegex },
                    { lastName: searchRegex }
                ]
            }).select('_id');
            const matchingIds = matchingUsers.map(u => u._id);

            if (matchingIds.length > 0) {
                filter.userId = { $in: matchingIds };
            } else {
                // force empty result if search doesn't match any users
                filter._id = null;
            }
        }

        const withdrawals = await Transaction.find(filter)
            .populate("userId", "firstName lastName email role") // Added role here
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: withdrawals,
        });
    } catch (error) {
        console.error("Error fetching withdrawals:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch withdrawals",
            error: error.message,
        });
    }
};

// Approve Withdrawal (Admin)
exports.approveWithdrawal = async (req, res) => {
    try {
        const { id } = req.params; // Transaction ID
        const { paymentTransactionId } = req.body; // Manual transaction ID from bank/payment gateway

        if (!paymentTransactionId) {
            return res.status(400).json({
                success: false,
                message: "Payment Transaction ID is required",
            });
        }

        const transaction = await Transaction.findById(id);

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: "Transaction not found",
            });
        }

        if (transaction.status !== "Pending") {
            return res.status(400).json({
                success: false,
                message: `Transaction is already ${transaction.status}`,
            });
        }

        transaction.status = "Completed";
        transaction.paymentTransactionId = paymentTransactionId;
        transaction.transactionId = paymentTransactionId; // Map manual ID to transactionId as well
        await transaction.save();

        res.status(200).json({
            success: true,
            message: "Withdrawal approved successfully",
            transaction,
        });
    } catch (error) {
        console.error("Error approving withdrawal:", error);
        res.status(500).json({
            success: false,
            message: "Failed to approve withdrawal",
            error: error.message,
        });
    }
};

// Reject Withdrawal (Admin)
exports.rejectWithdrawal = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params; // Transaction ID
        const { reason } = req.body;

        const transaction = await Transaction.findById(id).session(session).populate("userId");

        if (!transaction) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: "Transaction not found",
            });
        }

        if (transaction.status !== "Pending") {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: `Transaction is already ${transaction.status}`,
            });
        }

        // Refund based on role
        const user = transaction.userId;
        if (user.role === "Agent") {
            await agentModel.findOneAndUpdate(
                { userId: user._id },
                { $inc: { wallet: transaction.amount } },
                { session }
            );
        } else if (user.role === "Distributor") {
            await userModel.findByIdAndUpdate(
                user._id,
                { $inc: { wallet: transaction.amount } },
                { session }
            );
        }

        transaction.status = "Rejected";
        transaction.description = reason ? `Rejected: ${reason}` : "Rejected by Admin";
        await transaction.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: "Withdrawal rejected and amount refunded",
            transaction,
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error rejecting withdrawal:", error);
        res.status(500).json({
            success: false,
            message: "Failed to reject withdrawal",
            error: error.message,
        });
    }
};
// Get Agent Withdrawal Transactions
exports.getAgentWithdrawals = async (req, res) => {
    try {
        const userId = req.user.userId;

        const transactions = await Transaction.find({
            userId,
            category: "Withdrawal"
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: transactions,
        });
    } catch (error) {
        console.error("Error fetching agent withdrawals:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch withdrawal transactions",
            error: error.message,
        });
    }
};

// Get Distributor Withdrawal Transactions
exports.getDistributorWithdrawals = async (req, res) => {
    try {
        const userId = req.user.userId;

        const transactions = await Transaction.find({
            userId,
            category: "Withdrawal"
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: transactions,
        });
    } catch (error) {
        console.error("Error fetching distributor withdrawals:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch withdrawal transactions",
            error: error.message,
        });
    }
};

// Request Transfer from Distributor (Agent)
exports.requestTransferFromDistributor = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { amount } = req.body;
        const agentId = req.user.userId;

        if (!amount || amount <= 0) {
            throw new Error("Invalid transfer amount");
        }

        const agent = await agentModel.findOne({ userId: agentId }).session(session);

        if (!agent) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: "Agent not found",
            });
        }

        const distributorId = agent.createdBy;

        if (!distributorId) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: "No associated distributor found for this agent",
            });
        }

        const distributor = await userModel.findOne({ _id: distributorId, role: "Distributor" }).session(session);

        if (!distributor) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: "Associated distributor not found",
            });
        }

        // Create transaction request
        const transaction = await Transaction.create(
            [
                {
                    userId: agentId,
                    distributorId: distributorId,
                    amount,
                    type: "Credit", // It's a credit to the agent's wallet
                    category: "Transfer",
                    status: "Pending",
                    description: `Transfer request from distributor ${distributor.firstName}`,
                    createdBy: agentId,
                }
            ],
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: "Transfer request submitted successfully",
            transaction: transaction[0],
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error requesting transfer:", error);
        res.status(500).json({
            success: false,
            message: "Failed to request transfer",
            error: error.message,
        });
    }
};

// Get Agent Transfer Requests
exports.getAgentTransferRequests = async (req, res) => {
    try {
        const agentId = req.user.userId;

        const requests = await Transaction.find({
            userId: agentId,
            category: "Transfer"
        }).populate("distributorId", "firstName lastName email").sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: requests,
        });
    } catch (error) {
        console.error("Error fetching transfer requests:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch transfer requests",
            error: error.message,
        });
    }
};

// Get Distributor Transfer Requests
exports.getDistributorTransferRequests = async (req, res) => {
    try {
        const distributorId = req.user.userId;
        const { status } = req.query;

        const filter = {
            distributorId: distributorId,
            category: "Transfer"
        };

        if (status && status !== 'All') {
            filter.status = status;
        }

        const requests = await Transaction.find(filter)
            .populate("userId", "firstName lastName email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: requests,
        });
    } catch (error) {
        console.error("Error fetching transfer requests:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch transfer requests",
            error: error.message,
        });
    }
};

// Approve Transfer Request (Distributor)
exports.approveTransferRequest = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params; // Transaction ID
        const distributorId = req.user.userId;

        const transaction = await Transaction.findOne({ _id: id, distributorId: distributorId }).session(session);

        if (!transaction) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: "Transfer request not found or unauthorized",
            });
        }

        if (transaction.status !== "Pending") {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: `Transfer request is already ${transaction.status}`,
            });
        }

        const distributor = await userModel.findById(distributorId).session(session);

        if (distributor.credit_money < transaction.amount) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: "Insufficient credit money balance to approve this transfer",
            });
        }

        // Deduct from distributor
        distributor.credit_money -= transaction.amount;
        await distributor.save({ session });

        // Credit to agent
        await agentModel.findOneAndUpdate(
            { userId: transaction.userId },
            { $inc: { wallet: transaction.amount } },
            { session }
        );

        // Update transaction logic for distributor deduction
        await Transaction.create(
            [
                {
                    userId: distributorId,
                    amount: transaction.amount,
                    type: "Debit",
                    category: "Transfer",
                    status: "Completed",
                    description: `Approved transfer to agent`,
                    createdBy: distributorId,
                }
            ],
            { session }
        );

        transaction.status = "Approved";
        await transaction.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: "Transfer request approved successfully",
            transaction,
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error approving transfer:", error);
        res.status(500).json({
            success: false,
            message: "Failed to approve transfer request",
            error: error.message,
        });
    }
};


// Reject Transfer Request (Distributor)
exports.rejectTransferRequest = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params; // Transaction ID
        const distributorId = req.user.userId;
        const { reason } = req.body;

        const transaction = await Transaction.findOne({ _id: id, distributorId: distributorId }).session(session);

        if (!transaction) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: "Transfer request not found or unauthorized",
            });
        }

        if (transaction.status !== "Pending") {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: `Transfer request is already ${transaction.status}`,
            });
        }

        transaction.status = "Rejected";
        transaction.description = reason ? `Rejected: ${reason}` : "Rejected by Distributor";
        await transaction.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: "Transfer request rejected successfully",
            transaction,
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error rejecting transfer:", error);
        res.status(500).json({
            success: false,
            message: "Failed to reject transfer request",
            error: error.message,
        });
    }
};


exports.requestTransferFromAdmin = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { amount, isCreditMoney } = req.body;
        const distributorId = req.user.userId;

        if (!amount || amount <= 0) {
            throw new Error("Invalid transfer amount");
        }

        const distributor = await userModel.findOne({ _id: distributorId, role: "Distributor" }).session(session);

        if (!distributor) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: "Distributor not found",
            });
        }


        const transaction = await Transaction.create(
            [
                {
                    userId: distributorId,
                    amount,
                    type: "Credit",
                    category: "Transfer",
                    status: "Pending",
                    isCreditMoney: isCreditMoney || false,
                    description: `Transfer request to Admin from distributor ${distributor.firstName || ''}`,
                    createdBy: distributorId,
                }
            ],
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: "Transfer request submitted successfully",
            transaction: transaction[0],
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error requesting transfer from admin:", error);
        res.status(500).json({
            success: false,
            message: "Failed to request transfer",
            error: error.message,
        });
    }
};


exports.getDistributorAdminTransferRequests = async (req, res) => {
    try {
        const distributorId = req.user.userId;

        const requests = await Transaction.find({
            userId: distributorId,
            category: "Transfer",
            distributorId: { $exists: false }
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: requests,
        });
    } catch (error) {
        console.error("Error fetching transfer requests:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch transfer requests",
            error: error.message,
        });
    }
};

exports.getAdminTransferRequests = async (req, res) => {
    try {
        const { status, search } = req.query;

        const filter = {
            category: "Transfer",
            distributorId: { $exists: false }
        };

        if (status && status !== 'All') {
            filter.status = status;
        }

        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');
            const matchingUsers = await userModel.find({
                $or: [
                    { firstName: searchRegex },
                    { lastName: searchRegex },
                    { email: searchRegex }
                ]
            }).select('_id');
            const matchingIds = matchingUsers.map(u => u._id);

            if (matchingIds.length > 0) {
                filter.userId = { $in: matchingIds };
            } else {
                // force empty result if search doesn't match any users
                filter._id = null;
            }
        }

        const requests = await Transaction.find(filter)
            .populate("userId", "firstName lastName email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: requests,
        });
    } catch (error) {
        console.error("Error fetching admin transfer requests:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch transfer requests",
            error: error.message,
        });
    }
};

// Approve Admin Transfer Request (Admin)
exports.approveAdminTransferRequest = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params; // Transaction ID

        const transaction = await Transaction.findOne({ _id: id, category: "Transfer", distributorId: { $exists: false } }).session(session);

        if (!transaction) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: "Transfer request not found or unauthorized",
            });
        }

        if (transaction.status !== "Pending") {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: `Transfer request is already ${transaction.status}`,
            });
        }

        // Credit to distributor
        const updateField = transaction.isCreditMoney ? 'credit_money' : 'wallet';
        await userModel.findOneAndUpdate(
            { _id: transaction.userId },
            { $inc: { [updateField]: transaction.amount } },
            { session }
        );

        transaction.status = "Approved";
        await transaction.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: "Transfer request approved successfully",
            transaction,
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error approving transfer:", error);
        res.status(500).json({
            success: false,
            message: "Failed to approve transfer request",
            error: error.message,
        });
    }
};


exports.rejectAdminTransferRequest = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const { reason } = req.body;

        const transaction = await Transaction.findOne({ _id: id, category: "Transfer", distributorId: { $exists: false } }).session(session);

        if (!transaction) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: "Transfer request not found or unauthorized",
            });
        }

        if (transaction.status !== "Pending") {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: `Transfer request is already ${transaction.status}`,
            });
        }

        transaction.status = "Rejected";
        transaction.description = reason ? `Rejected: ${reason}` : "Rejected by Admin";
        await transaction.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: "Transfer request rejected successfully",
            transaction,
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error rejecting transfer:", error);
        res.status(500).json({
            success: false,
            message: "Failed to reject transfer request",
            error: error.message,
        });
    }
};
