const { leadModel } = require("../models/leadModel");

class LeadController {
  constructor(model = leadModel) {
    this.model = model;
  }

  async createLead(payload) {
    const lead = new this.model(payload);
    return lead.save();
  }

  async getLeads(filter = {}, options = {}) {
    if (filter.search) {
      const searchRegex = new RegExp(filter.search.trim(), "i");
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { source: searchRegex }
      ];
      delete filter.search;
    }

    const page = Math.max(parseInt(options.page, 10) || 1, 1);
    const limit = Math.max(parseInt(options.limit, 10) || 10, 1);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .populate("assignedAgent", "firstName lastName email phone")
        .populate("createdBy", "firstName lastName email")
        .populate("updatedBy", "firstName lastName email")
        .sort(options.sort || { createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.model.countDocuments(filter)
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getLeadById(id) {
    return this.model
      .findById(id)
      .populate("assignedAgent", "firstName lastName email phone")
      .populate("createdBy", "firstName lastName email")
      .populate("updatedBy", "firstName lastName email");
  }

  async updateLead(id, payload) {
    return this.model.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  }

  async deleteLead(id) {
    return this.model.findByIdAndDelete(id);
  }
}

module.exports = LeadController;
