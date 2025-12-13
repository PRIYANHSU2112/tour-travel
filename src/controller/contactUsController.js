const contactUsModel = require('../models/contactUsModel')
class ContactUsController {
    constructor(model = contactUsModel) {
        this.model = model;
    }

    async createContactUs(payload) {

        const contactUs = new this.model(payload);
        return contactUs.save();
    }

    async getContactUsById(id) {
        const contactUs = this.model.findById(id)
        return contactUs;
    }
    async getContactUs(filter = {}, options = {}) {

        const query = this.model.find(filter);

        if (options.sort) {
            query.sort(options.sort);
        }

        const parsedLimit = parseInt(options.limit, 10);
        const shouldPaginate = !Number.isNaN(parsedLimit) && parsedLimit > 0;

        let currentPage = 1;
        if (shouldPaginate) {
            currentPage = parseInt(options.page, 10);
            if (Number.isNaN(currentPage) || currentPage < 1) {
                currentPage = 1;
            }

            const skip = (currentPage - 1) * parsedLimit;
            query.skip(skip).limit(parsedLimit);
        }

        const [data, totalItems] = await Promise.all([
            query.exec(),
            this.model.countDocuments(filter),
        ]);

        let pagination = null;
        if (shouldPaginate) {
            const totalPages = Math.max(Math.ceil(totalItems / parsedLimit), 1);
            pagination = {
                totalItems,
                totalPages,
                currentPage,
                pageSize: parsedLimit,
                hasNextPage: currentPage < totalPages,
                hasPrevPage: currentPage > 1,
            };
        }

        return { data, pagination };


    }

    // return this.model.findByIdAndUpdate(id, payload,{ new: true, runValidators: true });


}

module.exports = ContactUsController;
