

const { wishlistModel } = require("../models/wishlistModel");
const DEFAULT_PAGE_SIZE = parseInt(process.env.DEFAULT_PAGE_SIZE || "20", 10);
class WishlistController {
    constructor(model = wishlistModel) {
        this.model = model;
    }
    async addWishlist(payload) {
        const { userId, placeId, packageId, tourId } = payload

        let wishlistDocument = await this.model.findOne({ userId })

        if (!wishlistDocument) {
            wishlistDocument = await this.model.create({
                userId,
                placeId: placeId ? [placeId] : [],
                packageId: packageId ? [packageId] : [],
                tourId: tourId ? [tourId] : []
            })
            return wishlistDocument
        }

        const update = {};
        if (placeId) {
            const alreadyExists = wishlistDocument.placeId.includes(placeId)
            if (alreadyExists) {
                update.$pull = { ...update.$pull, placeId: placeId }
            } else {
                update.$addToSet = { ...update.$addToSet, placeId: placeId }
            }

        }
        if (packageId) {
            const alreadyExists = wishlistDocument.packageId.includes(packageId)
            if (alreadyExists) {
                update.$pull = { ...update.$pull, packageId: packageId }
            } else {
                update.$addToSet = { ...update.$addToSet, packageId: packageId }
            }
        }


        // const update = alreadyExists
        //     ? { $pull: { placeId: placeId } }
        //     : { $addToSet: { placeId: placeId } }

        return this.model.findOneAndUpdate({ userId }, update, { new: true })
    }

    async getWishlist(id, options = {}, filters = {}) {

        const parsedPage = parseInt(options.page, 10);
        const parsedLimit = parseInt(options.limit, 10);

        const pageSize = !Number.isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : DEFAULT_PAGE_SIZE;
        const currentPage = !Number.isNaN(parsedPage) && parsedPage > 0 ? parsedPage : 1;

        const checkDocument = await this.model.findOne({ userId: id })
        if (!checkDocument) {
            return {
                data: [],
                pagination: {
                    realTotalTime: 0,
                    totalPages: 0,
                    pageSize: 0,
                    currentPage: 0,
                    hasNextPage: false,
                    hasPrevPage: false,
                },
            };
        }
        const query = this.model.findOne({ userId: id })
            .populate({
                path: 'placeId',
                match: { placeName: { $regex: filters.search || '', $options: 'i' } },
                options: {
                    sort: { _id: -1 },
                    skip: (currentPage - 1) * pageSize,
                    limit: pageSize
                }
            })
            .populate({
                path: 'packageId',
                match: { packageName: { $regex: filters.search || '', $options: 'i' } },
                options: {
                    sort: { _id: -1 },
                    skip: (currentPage - 1) * pageSize,
                    limit: pageSize
                }
            })





        const [items, totalItems] = await Promise.all([
            query.exec(),
            this.model.findOne({ userId: id }),
        ]);
        const realTotalTime = totalItems.placeId.length
        const totalPages = Math.max(Math.ceil(realTotalTime / pageSize) || 1, 1);

        return {
            data: items,
            pagination: {
                realTotalTime,
                totalPages,
                pageSize,
                currentPage,
                hasNextPage: currentPage < totalPages,
                hasPrevPage: currentPage > 1,
            },
        };

    }


    async removeWishlist(id, payload) {
        const { userId } = payload
        const update = {}
        update.$pull = {
            wishlist: id
        }


        return this.model.findByIdAndUpdate(userId, update, { new: true, runValidators: true });

    }

}
module.exports = WishlistController;