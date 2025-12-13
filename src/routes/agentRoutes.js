const express = require("express");
const AgentController = require("../controller/agentController");
const {userModel} = require("../models/userModel");
const UserController = require("../controller/userController");
const { agentModel, agentStatuses, availabilityStatuses } = require("../models/agentModel");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
const agentController = new AgentController(agentModel);
const userController = new UserController(userModel);
router.post("/", protect ,async (req, res) => {
  try {
    const agent = await agentController.createAgent(req.body);
    res.status(201).json({ success: true, message: "Agent created successfully", data: agent });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get("/", protect,async (req, res) => {
  try {
    const { page, limit, sort, ...filters } = req.query;
    const agentsQuery = await agentController.getAgents(filters, { page, limit, sort });
    const agents = await agentsQuery;
    res.status(200).json({ success: true, message: "Agents fetched successfully", data: agents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
router.patch("/:id" ,protect,async (req, res) => {
  try {
    const {id}=req.params;
    const agent = await agentController.changeStatus(id,req.body);
    
    res.status(201).json({ success: true, message: "Agent status changed successfully", data: agent });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get("/:id",protect, async (req, res) => {
  try {
    const agent = await agentController.getAgentById(req.params.id);
    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent not found" });
    }
    res.status(200).json({ success: true, message: "Agent fetched successfully", data: agent });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
router.put("/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, status, availability } = req.body;

    // 1) Update agent
    const agent = await agentController.updateAgent(id, req.body);
  
    if (!agent) {
      return res
        .status(404)
        .json({ success: false, message: "Agent not found" });
    }

    // 2) Update related user if firstName is provided
    if (firstName) {
      await userController.updateUser(
          agent?.userId,
          { firstName }
      );
    }

    // 3) Send response
    return res.status(200).json({
      success: true,
      message: "Agent updated successfully",
      data: agent,
    });
  } catch (error) {
    console.error("Error updating agent:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message || "Something went wrong" });
  }
});

router.delete("/:id", protect,async (req, res) => {
  try {
    const agent = await agentController.deleteAgent(req.params.id);
    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent not found" });
    }
    res.status(200).json({ success: true, message: "Agent deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/meta/enums", (req, res) => {
  res.status(200).json({ success: true, data: { agentStatuses, availabilityStatuses } });
});

module.exports = router;
