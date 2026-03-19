const fs = require("fs");
const path = require("path");

class InvoiceHelper {
  static getInvoiceHTML(booking) {
    const templatePath = path.join(__dirname, "../templates/invoice.html");
    let html = fs.readFileSync(templatePath, "utf8");

    const formatCurrency = (amount) => {
      return (amount || 0).toLocaleString("en-IN");
    };

    const formatDate = (date) => {
      if (!date) return "-";
      return new Date(date).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    };
    const statusColor =
      booking.paymentStatus === "Paid"
        ? "#27AE60"
        : booking.paymentStatus === "Partial"
        ? "#F39C12"
        : booking.paymentStatus === "Failed"
        ? "#E74C3C"
        : "#3498DB";

    let packageInfo = "";
    if (booking.selectedPackageId) {
      packageInfo = `
        <div class="trip-info-item">
          <h4>Package</h4>
          <p>${booking.selectedPackageId.title || "Package Tour"}</p>
        </div>
      `;
    } else if (booking.selectedTourId) {
      packageInfo = `
        <div class="trip-info-item">
          <h4>Tour</h4>
          <p>${booking.selectedTourId.title || "Group Tour"}</p>
        </div>
      `;
    }

    let travelerRows = "";
    if (booking.travelerDetails && booking.travelerDetails.length > 0) {
      booking.travelerDetails.forEach((traveler, index) => {
        travelerRows += `
          <tr>
            <td style="text-align: center;">${index + 1}</td>
            <td>${traveler.name || "N/A"}</td>
            <td>${traveler.age || "-"}</td>
            <td>${traveler.gender || "-"}</td>
          </tr>
        `;
      });
    }

    const hasAddOns = booking.addOnsTotal && booking.addOnsTotal > 0;
    let amountDue = booking.finalAmount || 0;
    if (booking.paymentStatus === "Paid") {
      amountDue = 0;
    } else if (booking.paymentStatus === "Partial") {
      amountDue = booking.finalAmount || 0;
    }

    const statusBadgeHTML = `<div class="status-badge" style="background: ${statusColor};">${
      booking.paymentStatus || "Pending"
    }</div>`;

    // Calculate totals
    const adultPrice = booking?.selectedPackageId?.basePricePerPerson || 0;
    const childPrice = booking?.selectedPackageId?.childPrice || 0;
    const adultCount = booking.adults || 0;
    const childCount = booking.children || 0;
    const adultTotal = adultPrice * adultCount;
    const childTotal = childPrice * childCount;

    const replacements = {
      "{{invoiceNumber}}": booking.invoiceNumber || "-",
      "{{invoiceDate}}": formatDate(booking.createdAt),
      "{{bookingId}}": booking.bookingId || "-",
      "{{paymentStatus}}": booking.paymentStatus || "Pending",
      "{{statusBadgeHTML}}": statusBadgeHTML,
      "{{bookingStatus}}": booking.bookingStatus || "Pending",
      "{{customerName}}": booking.customerName || "-",
      "{{mobileNumber}}": booking.mobileNumber || "-",
      "{{email}}": booking.email || "Not provided",
      "{{userType}}": booking.userType || "App User",
      "{{bookingType}}": booking.bookingType || "-",
      "{{travelStartDate}}": formatDate(booking.travelStartDate),
      "{{travelEndDate}}": formatDate(booking.travelEndDate),
      "{{durationInDays}}": booking.durationInDays || 0,
      "{{numberOfTravelers}}": booking.numberOfTravelers || 0,
      "{{adultPrice}}": formatCurrency(adultPrice),
      "{{childPrice}}": formatCurrency(childPrice),
      "{{adultCount}}": adultCount,
      "{{childCount}}": childCount,
      "{{adultTotal}}": formatCurrency(adultTotal),
      "{{childTotal}}": formatCurrency(childTotal),
      "{{packageCostPerPerson}}": formatCurrency(
        booking.packageCostPerPerson || 0
      ),
      "{{totalAmount}}": formatCurrency(booking.totalAmount || 0),
      "{{discountAmount}}": formatCurrency(booking.discountAmount || 0),
      "{{finalAmount}}": formatCurrency(amountDue),
      "{{addOnsTotal}}": formatCurrency(booking.addOnsTotal || 0),
      "{{paymentMethod}}": booking.paymentMethod || "N/A",
      "{{transactionId}}": booking.transactionId || "N/A",
      "{{generatedDate}}": new Date().toLocaleString("en-IN"),
      "{{packageInfo}}": packageInfo,
      "{{travelerRows}}": travelerRows,
    };

    for (const [key, value] of Object.entries(replacements)) {
      if (html.includes(key)) {
        html = html.split(key).join(value);
      }
    }

    const hasTravelerDetails =
      booking.travelerDetails && booking.travelerDetails.length > 0;
    html = html.replace(
      /\{\{#if travelerDetails\}\}([\s\S]*?)\{\{\/if\}\}/g,
      hasTravelerDetails ? "$1" : ""
    );

    html = html.replace(
      /\{\{#if paymentMethod\}\}([\s\S]*?)\{\{\/if\}\}/g,
      booking.paymentMethod ? "$1" : ""
    );

    html = html.replace(
      /\{\{#if transactionId\}\}([\s\S]*?)\{\{\/if\}\}/g,
      booking.transactionId ? "$1" : ""
    );

    const hasDiscount = booking.discountAmount && booking.discountAmount > 0;
    html = html.replace(
      /\{\{#if hasDiscount\}\}([\s\S]*?)\{\{\/if\}\}/g,
      hasDiscount ? "$1" : ""
    );

    html = html.replace(
      /\{\{#if addOns\}\}([\s\S]*?)\{\{\/if\}\}/g,
      hasAddOns ? "$1" : ""
    );

    return html;
  }
}

module.exports = InvoiceHelper;
