const axios = require("axios");

class WhatsAppService {
  constructor() {
    this.enabled = process.env.WHATSAPP_ENABLED === "true";
    this.apiKey = process.env.AISENSY_API_KEY;
    this.baseUrl = "https://backend.aisensy.com/campaign/t1/api/v2";
  }

  async sendMessage(phone, options = {}) {
    if (!this.enabled) return { success: false, message: "WhatsApp disabled" };

    const formattedPhone = this.formatPhone(phone);
    console.log(`WhatsApp → ${formattedPhone}`);

    if (!this.apiKey) {
      return { success: false, message: "Aisensy API key missing" };
    }

    const userName = options.userName || "Customer";

    // 🟢 TEMPLATE
    if (options.templateName) {
      return this.sendTemplate(formattedPhone, options.templateName, options.variables, userName);
    }

    // 🟢 DOCUMENT
    if (options.documentUrl) {
      return this.sendDocument(formattedPhone, options.documentUrl, options.documentName, options.campaignName, userName, options.variables);
    }

    return { success: false, message: "Invalid request" };
  }

  async request(payload) {
    try {
      const { data } = await axios.post(this.baseUrl, payload);
      console.log("Aisensy Response:", data);
      return { success: true, data };
    } catch (err) {
      console.error("Aisensy Error:", err.response?.data || err.message);
      return { success: false, error: err.response?.data || err.message };
    }
  }

  // 🟢 TEMPLATE MESSAGE
  sendTemplate(phone, templateName, variables = [], userName = "Customer") {
    return this.request({
      apiKey: this.apiKey,
      campaignName: templateName, // ✅ exact template name
      destination: phone,
      userName: userName,
      templateParams: variables,
      source: "api"
    });
  }

  // 🟢 DOCUMENT (PDF)
  sendDocument(phone, link, filename = "Invoice.pdf", campaignName, userName = "Customer", variables = []) {
    const payload = {
      apiKey: this.apiKey,
      destination: phone,
      userName: userName,
      source: "api",    
      media: {
        url: link,
        filename: filename
      }
    };
    
    if (campaignName) {
      payload.campaignName = campaignName;
      if (variables && variables.length > 0) {
        payload.templateParams = variables;
      }
    }
    
    return this.request(payload);
  }

  formatPhone(phone) {
    let cleaned = phone.replace(/\D/g, "");

    if (cleaned.length === 10) return `91${cleaned}`;
    if (cleaned.startsWith("0")) return `91${cleaned.slice(1)}`;

    return cleaned;
  }
}

module.exports = WhatsAppService;