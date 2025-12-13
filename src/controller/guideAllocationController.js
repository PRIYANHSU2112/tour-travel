const { guideAllocationModel } = require("../models/guideAllocationModel");

class GuideAllocationController {
  constructor(model = guideAllocationModel) {
    this.model = model;
  }

  async createAllocation(payload) {

    let checkOr = [];

    if (payload.tourId) {
      checkOr.push({ tourId: payload.tourId });
    }

    if (payload.bookingId) {
      checkOr.push({ bookingId: payload.bookingId });
    }

    const isExist = await this.model.findOne(
      { $or: checkOr }
    );

    console.log("check", isExist)
    let allocation = []
    if (isExist) {
       allocation = await this.model.findOneAndReplace(
        { _id: isExist._id },
        payload,
        { new: true }
      );

    } else {
      allocation = await this.model.create(payload);


    }
    console.log(allocation)
    return allocation
  }

  async getAllocations(filter = {}, options = {}) {
    const query = this.model
      .find(filter)
      .populate("guideId", "fullName email phone")
      .populate("tourId")
      .populate("bookingId")
      .populate("assignedBy", "firstName lastName email");

    // if (options.sort) {
    //   query.sort(options.sort);
    // }

    let sort = options.sort || options.sortBy;
    if (typeof sort === "string" && sort.trim()) {
      const order = options.sortOrder || options.order;
      const direction = typeof order === "string" && order.toLowerCase() === "desc" ? -1 : 1;
      query.sort({ [sort]: direction });
    } else {
      query.sort({ createdAt: -1 });
    }


    // if (!sort) {
    //   query.sort = { createdAt: -1 };
    // }
    // console.log(query.sort)
    if (options.limit) {
      const limit = parseInt(options.limit, 10);
      if (!Number.isNaN(limit)) {
        query.limit(limit);
      }
    }

    if (options.page && options.limit) {
      const page = Math.max(parseInt(options.page, 10), 1);
      const limit = parseInt(options.limit, 10);
      if (!Number.isNaN(page) && !Number.isNaN(limit)) {
        query.skip((page - 1) * limit);
      }
    }

    return query;
  }

  async getAllocationById(id) {
    return this.model
      .findById(id)
      .populate("guideId", "fullName email phone")
      .populate("tourId")
      .populate("bookingId")
      .populate("assignedBy", "firstName lastName email");
  }

  async updateAllocation(id, payload) {
    return this.model.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  }

  async deleteAllocation(id) {
    return this.model.findByIdAndDelete(id);
  }

  async transferGuide(id, transferPayload) {
    const allocation = await this.model.findById(id);
    if (!allocation) {
      return null;
    }

    if (!transferPayload || !transferPayload.toGuideId) {
      throw new Error("toGuideId is required for guide transfer");
    }

    const transferRecord = {
      fromGuideId: allocation.guideId,
      toGuideId: transferPayload.toGuideId,
      reason: transferPayload.reason,
      transferredBy: transferPayload.transferredBy,
      transferredAt: new Date(),
    };

    allocation.transferHistory.push(transferRecord);
    allocation.guideId = transferPayload.toGuideId;
    allocation.lastTransferredAt = transferRecord.transferredAt;

    if (transferPayload.status) {
      allocation.status = transferPayload.status;
    }

    if (transferPayload.notes) {
      allocation.notes = transferPayload.notes;
    }
    await allocation.save();
    return allocation;
  }
}

module.exports = GuideAllocationController;
