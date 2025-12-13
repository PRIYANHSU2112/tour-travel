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
    const query = this.model
      .find(filter)
      .populate("assignedAgent", "firstName lastName email phone")
      .populate("createdBy", "firstName lastName email")
      .populate("updatedBy", "firstName lastName email");

    if (options.sort) {
      query.sort(options.sort);
    }

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
