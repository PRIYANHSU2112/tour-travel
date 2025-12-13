const express = require("express");
const TourController = require("../controller/tourController");
const { tourModel, transportTypes, tourStatuses } = require("../models/tourModel");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
const tourController = new TourController(tourModel);

router.post("/",protect, async (req, res) => {
  try {
    const tour = await tourController.createTour(req.body);
    res.status(201).json({ success: true, message: "Tour created successfully", data: tour });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});
router.patch('/toggle/:id',protect,async (req,res)=>{
    try {
      const {id}=req.params
    const tour = await tourController.toggleDisable(id);
    res.status(201).json({ success: true, message: "successfull ", data: tour });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
})

router.get("/", async (req, res) => {
  try {
    const { page, limit, sort, ...filters } = req.query;
    const tours = await tourController.getTours(filters, { page, limit, sort });
    res
      .status(200)
      .json({ success: true, message: "Tours fetched successfully", data: await tours });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const tour = await tourController.getTourById(req.params.id);
    if (!tour) {
      return res.status(404).json({ success: false, message: "Tour not found" });
    }
    res.status(200).json({ success: true, message: "Tour fetched successfully", data: tour });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/:id",protect, async (req, res) => {
  try {
    console.log(req.body)
    const tour = await tourController.updateTour(req.params.id, req.body);
    if (!tour) {
      return res.status(404).json({ success: false, message: "Tour not found" });
    }
    res.status(200).json({ success: true, message: "Tour updated successfully", data: tour });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.patch("/:id/status",protect, async (req, res) => {
  try {
    const { status } = req.body;
    if (!tourStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    const tour = await tourController.updateStatus(req.params.id, status);
    if (!tour) {
      return res.status(404).json({ success: false, message: "Tour not found" });
    }

    res.status(200).json({ success: true, message: "Tour status updated", data: tour });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete("/:id",protect, async (req, res) => {
  try {
    const tour = await tourController.deleteTour(req.params.id);
    if (!tour) {
      return res.status(404).json({ success: false, message: "Tour not found" });
    }
    res.status(200).json({ success: true, message: "Tour deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/meta/enums", (req, res) => {
  res.status(200).json({ success: true, data: { transportTypes, tourStatuses } });
});

module.exports = router;
