const mongoose = require("mongoose");
const { generateSlug, ensureUniqueSlug } = require("../utils/slugHelper");

const transportTypes = [
  "Bus",
  "Train",
  "Flight",
  "Cruise",
  "Private",
  "Tempo Traveller",
  "Car",
  "Boat",
  "Mixed",
];
const tourStatuses = ["Draft", "Upcoming", "Ongoing", "Completed", "Cancelled"];

const tourSchema = new mongoose.Schema(
  {
    tourCode: {
      type: String,
      unique: true,
      trim: true,
    },
    tourName: {
      type: String,
      required: true,
      trim: true,
    },
    tourCategory: {
      type: String,
      trim: true,
    },
    cityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      required: true,
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      
    },
    tourPlaces: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Place",
      },
    ],
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    durationInDays: {
      type: Number,
      min: 1,
    },
    transportType: {
      type: String,
      enum: transportTypes,
    },
    guideName: {
      type: String,
      trim: true,
    },
    guideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guide",
    },
    totalSeats: {
      type: Number,
      min: 1,
    },
    bookedSeats: {
      type: Number,
      default: 0,
      min: 0
     
    },
    remainingSeats: {
      type: Number,
      min: 0,
    },
    perPersonCost: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: tourStatuses,
      default: "Draft",
    },
    inclusions: {
      type: [String],
      default: [],
    },
    exclusions: {
      type: [String],
      default: [],
    },
    meetingPoint: {
      type: String,
      trim: true,
    },
    pickupTime: {
      type: String,
      trim: true,
    },
    dropPoint: {
      type: String,
      trim: true,
    },
    coverImage: {
      type: String,
      trim: true,
    },
    galleryImages: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
    },
    videoLink: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
    },
    metaTitle: {
      type: String,
      trim: true,
    },
    metaDescription: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isDisabled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

tourSchema.virtual('GuideAllocation', {
  ref: 'GuideAllocation',
  localField: '_id',
  foreignField: 'tourId'
});
tourSchema.set('toObject', { virtuals: true });
tourSchema.set('toJSON', { virtuals: true });

async function ensureUniqueValue(model, field, value, excludeId) {
  if (!value) {
    return value;
  }

  let uniqueValue = value;
  let counter = 1;
  const baseValue = value;

  const query = { [field]: uniqueValue };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  // eslint-disable-next-line no-constant-condition
  while (await model.exists(query)) {
    uniqueValue = `${baseValue}-${counter++}`;
    query[field] = uniqueValue;
  }

  return uniqueValue;
}

function autoDuration(doc) {
  if (!doc.startDate || !doc.endDate) {
    return;
  }

  const start = new Date(doc.startDate);
  const end = new Date(doc.endDate);

  if (end < start) {
    throw new Error("End date cannot be before start date");
  }

  const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  doc.durationInDays = diff;
}

function autoRemainingSeats(doc) {
  if (typeof doc.totalSeats === "number" && typeof doc.bookedSeats === "number") {
    doc.remainingSeats = Math.max(doc.totalSeats - doc.bookedSeats, 0);
  }
}

function ensureStatus(doc) {
  const now = new Date();
  if (["Draft", "Cancelled"].includes(doc.status)) {
    return;
  }

  if (doc.startDate && doc.endDate) {
    if (now < doc.startDate) {
      doc.status = "Upcoming";
    } else if (now >= doc.startDate && now <= doc.endDate) {
      doc.status = "Ongoing";
    } else if (now > doc.endDate) {
      doc.status = "Completed";
    }
  }
}

async function populateSlugAndCode(doc) {
  const Tour = doc.constructor;

  if (!doc.slug || doc.isModified("slug") || doc.isModified("tourName")) {
    const rawSlug = doc.slug ? generateSlug(doc.slug) : generateSlug(doc.tourName);
    doc.slug = await ensureUniqueSlug(Tour, rawSlug, doc._id);
  }

  if (!doc.tourCode) {
    const baseCode = doc.tourName ? doc.tourName.slice(0, 3).toUpperCase() : "TOUR";
    const initialCode = `${baseCode}-${Date.now().toString().slice(-6)}`;
    doc.tourCode = await ensureUniqueValue(Tour, "tourCode", initialCode, doc._id);
  }
}

function handlePreSave(next) {
  autoDuration(this);
  autoRemainingSeats(this);
  ensureStatus(this);
  populateSlugAndCode(this)
    .then(() => next())
    .catch((error) => next(error));
}

tourSchema.pre("save", handlePreSave);

tourSchema.pre("findOneAndUpdate", async function (next) {
  try {
    const update = this.getUpdate();
    if (!update) {
      return next();
    }

    const payload = update.$set ? update.$set : update;

    if (payload.startDate || payload.endDate) {
      if (!payload.startDate || !payload.endDate) {
        const existing = await this.model.findOne(this.getQuery());
        payload.startDate = payload.startDate || existing.startDate;
        payload.endDate = payload.endDate || existing.endDate;
      }
      autoDuration(payload);
      ensureStatus(payload);
    }

    if (typeof payload.totalSeats === "number" || typeof payload.bookedSeats === "number") {
      const existing = await this.model.findOne(this.getQuery());
      const totalSeats =
        typeof payload.totalSeats === "number" ? payload.totalSeats : existing.totalSeats;
      const bookedSeats =
        typeof payload.bookedSeats === "number" ? payload.bookedSeats : existing.bookedSeats;

      if (bookedSeats > totalSeats) {
        throw new Error("Booked seats cannot exceed total seats");
      }

      payload.remainingSeats = Math.max(totalSeats - bookedSeats, 0);
    }

    if (payload.tourName || payload.slug) {
      const Tour = mongoose.model("Tour");
      const rawSlug = payload.slug ? generateSlug(payload.slug) : generateSlug(payload.tourName);
      payload.slug = await ensureUniqueValue(Tour, "slug", rawSlug, this.getQuery()._id);
    }

    next();
  } catch (error) {
    next(error);
  }
});
const tourModel = mongoose.model("Tour", tourSchema);

module.exports = {
  tourModel,
  transportTypes,
  tourStatuses,
};
