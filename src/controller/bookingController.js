const { bookingModel } = require("../models/bookingModel");

const DEFAULT_PAGE_SIZE = parseInt(process.env.DEFAULT_PAGE_SIZE || "20", 10);

class BookingController {
  constructor(model = bookingModel) {
    this.model = model;
  }

  async createBooking(payload) {
    const booking =  this.model(payload);
    return booking.save();
  }

  async getBookings(filter = {}, options = {}) {
    const normalizedFilter = { ...filter };
         

    if (Object.prototype.hasOwnProperty.call(normalizedFilter, "isDisabled")) {
      const raw = normalizedFilter.isDisabled;
      if (typeof raw === "string") {
        normalizedFilter.isDisabled = raw === "true";
      } else {
        normalizedFilter.isDisabled = Boolean(raw);
      }
    } else {
      const includeDisabled =
        typeof options.includeDisabled === "string"
          ? options.includeDisabled === "true"
          : Boolean(options.includeDisabled);
      if (!includeDisabled) {
        normalizedFilter.isDisabled = false;
      }
    }

    if (Object.prototype.hasOwnProperty.call(normalizedFilter, "search")) {
      const value = normalizedFilter.search;
      if (value && value.trim()) {
        const regex = { $regex: value.trim(), $options: "i" };
        normalizedFilter.$or = [
          { customerName: regex },
          { mobileNumber: regex },
          { bookingId: regex },
          { invoiceNumber: regex },
        ];
      }
      delete normalizedFilter.search;
    }

    const parsedPage = parseInt(options.page, 10);
    const parsedLimit = parseInt(options.limit, 10);

    const pageSize = !Number.isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : DEFAULT_PAGE_SIZE;
    const currentPage = !Number.isNaN(parsedPage) && parsedPage > 0 ? parsedPage : 1;

    const query = this.model
      .find(normalizedFilter)
      .populate("selectedPackageId")
      .populate("selectedTourId")
      .populate("cityId")
      .populate("assignedAgent", "firstName lastName email");

    let sort = options.sort || options.sortBy;
    if (typeof sort === "string" && sort.trim()) {
      const order = options.sortOrder || options.order;
      const direction = typeof order === "string" && order.toLowerCase() === "desc" ? -1 : 1;
      sort = { [sort]: direction };
    }

    if (!sort) {
      sort = { createdAt: -1 };
    }

    query.sort(sort);
    query.skip((currentPage - 1) * pageSize).limit(pageSize);
    const [items, totalItems] = await Promise.all([
      query.exec(),
      this.model.countDocuments(normalizedFilter),
    ]);

    const totalPages = Math.max(Math.ceil(totalItems / pageSize) || 1, 1);

    return {
      data: items,
      pagination: {
        totalItems,
        totalPages,
        pageSize,
        currentPage,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      },
    };
  }
  async getBookingsByUser(filter = {}, options = {}) {
    const normalizedFilter = { ...filter };

     
         normalizedFilter.userId=options.userId;
         console.log(options.userId)

    if (Object.prototype.hasOwnProperty.call(normalizedFilter, "isDisabled")) {
      const raw = normalizedFilter.isDisabled;
      if (typeof raw === "string") {
        normalizedFilter.isDisabled = raw === "true";
      } else {
        normalizedFilter.isDisabled = Boolean(raw);
      }
    } else {
      const includeDisabled =
        typeof options.includeDisabled === "string"
          ? options.includeDisabled === "true"
          : Boolean(options.includeDisabled);
      if (!includeDisabled) {
        normalizedFilter.isDisabled = false;
      }
    }

    if (Object.prototype.hasOwnProperty.call(normalizedFilter, "search")) {
      const value = normalizedFilter.search;
      if (value && value.trim()) {
        const regex = { $regex: value.trim(), $options: "i" };
        normalizedFilter.$or = [
          { customerName: regex },
          { mobileNumber: regex },
          { bookingId: regex },
          { invoiceNumber: regex },
        ];
      }
      delete normalizedFilter.search;
    }

    const parsedPage = parseInt(options.page, 10);
    const parsedLimit = parseInt(options.limit, 10);

    const pageSize = !Number.isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : DEFAULT_PAGE_SIZE;
    const currentPage = !Number.isNaN(parsedPage) && parsedPage > 0 ? parsedPage : 1;

    const query = this.model
      .find(normalizedFilter)
      .populate("selectedPackageId")
      .populate("selectedTourId")
      .populate("cityId")
      .populate("assignedAgent", "firstName lastName email");

    let sort = options.sort || options.sortBy;
    if (typeof sort === "string" && sort.trim()) {
      const order = options.sortOrder || options.order;
      const direction = typeof order === "string" && order.toLowerCase() === "desc" ? -1 : 1;
      sort = { [sort]: direction };
    }

    if (!sort) {
      sort = { createdAt: -1 };
    }

    query.sort(sort);
    query.skip((currentPage - 1) * pageSize).limit(pageSize);
    const [items, totalItems] = await Promise.all([
      query.exec(),
      this.model.countDocuments(normalizedFilter),
    ]);

    const totalPages = Math.max(Math.ceil(totalItems / pageSize) || 1, 1);

    return {
      data: items,
      pagination: {
        totalItems,
        totalPages,
        pageSize,
        currentPage,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      },
    };
  }

  async getBookingById(id) {
    return this.model
      .findById(id)
      .populate("selectedPackageId")
      .populate("selectedTourId")
      .populate("cityId")
      .populate("assignedAgent", "firstName lastName email");
  }

  async updateBooking(id, payload) {
    return this.model.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
  }

  async setBookingDisabled(id, options = {}) {
    const existing = await this.model.findById(id).select("isDisabled");
    if (!existing) {
      return null;
    }

    let { isDisabled } = options;

    if (typeof isDisabled === "string") {
      isDisabled = isDisabled === "true";
    }

    if (typeof isDisabled === "undefined") {
      isDisabled = !existing.isDisabled;
    } else {
      isDisabled = Boolean(isDisabled);
    }

    return this.model.findByIdAndUpdate(
      id,
      {
        $set: {
          isDisabled,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );
  }
  async deleteBooking(id) {
  
    return this.model.findByIdAndDelete(id)

  }
}

module.exports = BookingController;
