const { tourModel } = require("../models/tourModel");

class TourController {
  constructor(model = tourModel) {
    this.model = model;
  }

  async createTour(payload) {
    if (payload.totalSeats !== undefined && payload.bookedSeats !== undefined) {
      if (payload.bookedSeats > payload.totalSeats) {
        throw new Error("Booked seats cannot exceed total seats");
      }
      payload.remainingSeats = payload.totalSeats - payload.bookedSeats;
    }

    payload.remainingSeats = payload.totalSeats - payload.bookedSeats;
    const tour = new this.model(payload);
    return tour.save();
  }

  async getTours(filter = {}, options = {}) {
    const query = this.model.find(filter).populate("cityId packageId")
      .populate({
        path: "GuideAllocation",
        populate: {
          path: "guideId"
        }
      });
    if (options.sort) {
      query.sort(options.sort);
    }

    if (options.limit) {
      query.limit(parseInt(options.limit, 10));
    }

    if (options.page && options.limit) {
      const page = Math.max(parseInt(options.page, 10), 1);
      const limit = parseInt(options.limit, 10);
      const skip = (page - 1) * limit;
      query.skip(skip);
    }

    return query;
  }

  async getTourById(id) {
    return this.model.findById(id).populate("cityId");
  }

  async updateTour(id, payload) {
    if (payload.bookedSeats !== undefined) {
      const tour = await this.model.findById(id);
      if (payload.bookedSeats > payload.totalSeats) {
        throw new Error("Booked seats cannot exceed total seats");
      }
    }
    if (payload.bookedSeats !== undefined && payload.totalSeats !== undefined) {
      if (payload.bookedSeats > payload.totalSeats) {
        throw new Error("Booked seats cannot exceed total seats");
      }
    }
    payload.remainingSeats = payload.totalSeats - payload.bookedSeats;
    return this.model.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
  }

  async deleteTour(id) {
    return this.model.findByIdAndDelete(id);
  }
  async toggleDisable(id) {
    const getDisabled = await this.model.findById(id).select('isDisabled')
    const isDisabled = !getDisabled.isDisabled
    return this.model.findByIdAndUpdate(id, {
      isDisabled
    },{new:true})

  }
  async updateStatus(id, status) {
    return this.model.findByIdAndUpdate(
      id,
      { status },
      {
        new: true,
        runValidators: true,
      }
    );
  }
}

module.exports = TourController;
