const { agentModel } = require("../models/agentModel");

class AgentController {
  constructor(model = agentModel) {
    this.model = model;
  }

async createAgent(payload) {
  const { email, phone } = payload;

  const exists = await this.model.findOne({
    $or: [{ email }, { phone }]
  });

  if (exists) {
    throw new Error('Email or phone already exists');
  }

  const agent = new this.model(payload);
  return agent.save();
}


  async getAgents(filter = {}, options = {}) {
    const query = this.model.find(filter);

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

  async getAgentById(id) {
    return this.model.findById(id);
  }

  async updateAgent(id, payload) {
    return this.model.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  }

  async changeStatus(id,payload){
    const check=await this.model.findOne({
      _id:id
    })
    console.log(check,id)
      return this.model.findByIdAndUpdate(id, {
        $set:payload
      }, { new: true, runValidators: true });
  }
  async deleteAgent(id) {
    return this.model.findByIdAndDelete(id);
  }
}

module.exports = AgentController;
