const { default: mongoose } = require("mongoose");
const stateModel = require("../models/stateModel");

const DEFAULT_PAGE_SIZE = parseInt(process.env.DEFAULT_PAGE_SIZE || "20", 10);

class StateController {
  constructor(model = stateModel) {
    this.model = model;
  }

  async createState(payload) {
    const state = new this.model(payload);
    return state.save();
  }

  async getStates(filter = {}, options = {}) {
    const normalizedFilter = { ...filter };

       if (Object.prototype.hasOwnProperty.call(normalizedFilter, "countryId")) {
          const value = normalizedFilter.countryId;
          if (value && mongoose.Types.ObjectId.isValid(value)) {
            normalizedFilter.countryId = new mongoose.Types.ObjectId(value);
          } else {
            delete normalizedFilter.countryId;
          }
        }

        if (Object.prototype.hasOwnProperty.call(normalizedFilter, "search")) {
              const value = normalizedFilter.search;
              if (value && value.trim()) {
                const regex = { $regex: value.trim(), $options: "i" };
                normalizedFilter.$or = [
                  { stateName: regex },
                ];
              }
              delete normalizedFilter.search;
            }
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

    const query = this.model.find(normalizedFilter).populate("countryId");

    let sort = options.sort || options.sortBy;
    if (typeof sort === "string" && sort.trim()) {
      const order = options.sortOrder || options.order;
      const direction = typeof order === "string" && order.toLowerCase() === "desc" ? -1 : 1;
      sort = { [sort]: direction };
    }

    if (!sort) {
      sort = { stateName: 1 };
    }

    query.sort(sort);

    const items = await query.exec();

    return items;
  }

  async getStateById(id) {
    return this.model.findById(id).populate("countryId");
  }

  async updateState(id, payload) {
    return this.model.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  }

  async setStateDisabled(id, options = {}) {
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
    ).populate("countryId");
  }
}

module.exports = StateController;
