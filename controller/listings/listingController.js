const RentalItem = require("../../model/listings/RentalItemModel");
const Facilities = require("../../model/listings/facilitiesModel");
const Image = require("../../model/listings/ImagesModel");
const Location = require("../../model/listings/LocationModel");
const Video = require("../../model/listings/VediosModel");
const Bidding = require("../../model/listings/biddingModel");
const User = require("../../model/user/userModel")

const path = require("path");
const logger = require("../../utils/logger");
const fs = require("fs");
const AppError = require("../../utils/AppError");
const { ERROR_MESSAGE } = require("../../messages/error");
const { RESPONCE_MESSAGE, LISTINGS, } = require("../../messages/response");
const { STATUS } = require("../../messages/status");
const { BOOLEAN } = require("../../utils/Roles");
const { CreateNotification } = require("../../controller/notification/notification")
const { enabled: cloudinaryEnabled, uploadFile } = require("../../utils/cloudinary");


exports.uploadMedia = async (req, res, next) => {
    try {
        // Handle image uploads
        let images = [];
        if (req.files && req.files['images']) {
            const imagePromises = req.files['images'].map(file => {
                const image = new Image({
                    url: `/uploads/media/${req.body.owner}/${file.filename}`,
                    caption: ""
                });
                return image.save();
            });
            const savedImages = await Promise.all(imagePromises);
            images = savedImages.map(img => img._id); // Store image ObjectIDs
        }

        // Handle video uploads
        let videos = [];
        if (req.files && req.files['videos']) {
            const videoPromises = req.files['videos'].map(file => {
                const video = new Video({
                    url: `/uploads/media/${req.body.owner}/${file.filename}`,
                    caption: ""
                });
                return video.save();
            });
            const savedVideos = await Promise.all(videoPromises);
            videos = savedVideos.map(vid => vid._id); 
        }
        return res.status(STATUS.SUCCESS).json({
            message: LISTINGS.MEDIA_UPLOAD_SUCCESS,
            images,
            videos
        });
    } catch (error) {
        next(error);
    }
};

// Updated_One-&-Latest
exports.CreateListings = async (req, res, next) => {
    try {
        const parseArray = (value) => {
            if (Array.isArray(value)) return value;
            if (typeof value !== 'string' || !value.trim()) return [];
            try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; }
            catch { return []; }
        };
        const amenities = parseArray(req.body.amenities);
        const rules = parseArray(req.body.rules);

        const { owner, title, description, price, category, priceUnit,
            location, minimumBid, bidIncrement, bidEndDate
        } = req.body;

        let biddingEnabled = req.body.biddingEnabled === 'true'; // changed

        const listingId = req.listingId
        const missingFields = [];
        if (!owner) missingFields.push("owner");
        if (!title) missingFields.push("title");
        if (!description) missingFields.push("description");
        if (!price) missingFields.push("price");
        if (!category) missingFields.push("category");
        if (!priceUnit) missingFields.push("priceUnit");
        if (!location) missingFields.push("location");
        if (missingFields.length) {
            return res.status(STATUS.BAD_REQUEST).json({
                error: `${LISTINGS.ERROR_MISSING_REQUIRED_FIELDS} ${missingFields.join(", ")}. ${LISTINGS.PLEASE_PROVIDE_ALL_REQUIRED_FIELDS}`.trim()
            });
        }
        if (process.env.VERCEL === '1' && req.files && (req.files.images?.length || req.files.videos?.length) && !cloudinaryEnabled) {
            return next(new AppError(BOOLEAN.FALSE, "Cloudinary storage is not configured for media uploads", STATUS.INTERNAL_SERVER_ERROR));
        }
        let images = [];
        if (req.files && req.files['images']) {
            try {
                const imagePromises = req.files['images'].map(async file => {
                    const uploaded = cloudinaryEnabled ? await uploadFile(file, `rentwise/listings/${listingId}`) : null;
                    const image = new Image({
                        url: uploaded?.secure_url || `/uploads/media/${listingId}/${file.filename}`,
                        caption: ""
                    });
                    return image.save();
                });
                const savedImages = await Promise.all(imagePromises);
                images = savedImages.map(img => img._id);
            } catch (error) {
                return next(new AppError(BOOLEAN.FALSE, LISTINGS.ERROR_UPLOADING_IMAGES, STATUS.BAD_REQUEST));
            }
        }

        let videos = [];
        if (req.files && req.files['videos']) {
            try {
                const videoPromises = req.files['videos'].map(async file => {
                    const uploaded = cloudinaryEnabled ? await uploadFile(file, `rentwise/listings/${listingId}`) : null;
                    const video = new Video({
                        url: uploaded?.secure_url || `/uploads/media/${listingId}/${file.filename}`,
                        caption: ""
                    });
                    return video.save();
                });
                const savedVideos = await Promise.all(videoPromises);
                videos = savedVideos.map(vid => vid._id);
            } catch (error) {
                return next(new AppError(BOOLEAN.FALSE, LISTINGS.ERROR_UPLOADING_VIDEOS, STATUS.BAD_REQUEST));
            }
        }

        let facilities = null;
        if (category === 'house' || category === 'hostel') {
            const { bedrooms, bathrooms } = req.body;
            facilities = await Facilities.create({
                bedrooms: bedrooms,
                bathrooms: bathrooms
            })
        }


let parsedLocation;
if (typeof location === 'string') {
  try {
    parsedLocation = JSON.parse(location);
  } catch (err) {
    return next(new AppError(false, "Invalid location JSON format", STATUS.BAD_REQUEST));
  }
} else {
  parsedLocation = location;
}
const { address, state, country, zipCode, coordinates } = parsedLocation;
if (!address || !state || !country || !coordinates || !coordinates.latitude || !coordinates.longitude) {
  return next(new AppError(false, "Invalid location format", STATUS.BAD_REQUEST));
}

const newLocation = await Location.create(parsedLocation);


        const newRentalItem = new RentalItem({
            _id: listingId,
            owner,
            title,
            description,
            price,
            category,
            priceUnit,
            amenities,
            rules,
            images,
            videos,
            listingStatus: "active",
            facilities: facilities ? facilities._id : null,
            location: newLocation._id
        });

       
        if (biddingEnabled === BOOLEAN.TRUE) {
            if (!minimumBid || !bidEndDate) {
              return next(new AppError(
                false,
                LISTINGS.BIDDING_ERROR_MISSING_REQUIRED_FIELDS,
                STATUS.BAD_REQUEST
              ));
            }
            const bidding = new Bidding({
                rentalItem: newRentalItem._id,
                enabled: biddingEnabled,
                minimumBid: minimumBid,
                bidIncrement: bidIncrement,
                bidEndDate: bidEndDate,
            });

            const savedBidding = await bidding.save();
            newRentalItem.bidding = savedBidding._id;
        }
        await newRentalItem.save();
        return res.status(STATUS.SUCCESS).json({
            rentalItem: newRentalItem,
            message: LISTINGS.LISTING_CREATED,
        });

    } catch (error) {
        next(error)
    }
};

exports.placeBid = async (req, res, next) => {
    try {
        const { rentalItemId, bidAmount } = req.body;
        const userId = req.user.id;
        const bidding = await Bidding.findOne({ rentalItem: rentalItemId });
        if (!bidding || !bidding.enabled) {
            return next(new AppError(BOOLEAN.FALSE, LISTINGS.BIDDING_NOT_ENABLED, STATUS.BAD_REQUEST));
        }
        const rentelItemOwner = await RentalItem.findOne({ bidding: bidding._id }).populate('owner')
        if (new Date() > bidding.bidEndDate) {
            return next(new AppError(BOOLEAN.FALSE, LISTINGS.BIDDING_ENDED, STATUS.BAD_REQUEST));
        }

        const minimumAllowedBid = bidding.highestBid ? bidding.highestBid + bidding.bidIncrement : bidding.minimumBid;
        if (bidAmount < minimumAllowedBid) {

            return res.status(STATUS.BAD_GATEWAY).json({
                error: `Bid must be at least ${minimumAllowedBid}.`,
            });
        }

        bidding.highestBid = bidAmount;
        bidding.highestBidder = userId;

        bidding.bids.push({
            user: userId,
            bidAmount,
        });

        await bidding.save();


        let message = `A new bid of ${bidAmount} has been placed on your ${rentelItemOwner.title} listing`;
        CreateNotification(rentelItemOwner.owner, userId, "system", message, next)
        return res.status(STATUS.SUCCESS).json({ message: LISTINGS.BID_PLACED, highestBid: bidding.highestBid });
        // return res.status(STATUS.SUCCESS).json({ message: LISTINGS.BID_PLACED });
    } catch (error) {
        next(error);
    }
};


exports.toggleFavoriteListing = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;


        const listing = await RentalItem.findById(id);
        if (!listing) {
            return res.status(STATUS.BAD_REQUEST).json({
                success: BOOLEAN.FALSE,
                message: LISTINGS.LISTING_NOT_FOUND,
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(STATUS.BAD_REQUEST).json({
                success: BOOLEAN.FALSE,
                message: RESPONCE_MESSAGE.USER_NOT_FOUND_PLEASE_LOGIN,
            });
        }

        const isFavorited = user.favoriteListings.includes(id);
        if (isFavorited) {
            user.favoriteListings = user.favoriteListings.filter(
                (listingId) => listingId.toString() !== id.toString()
            );
            await user.save();
            return res.status(STATUS.SUCCESS).json({
                success: BOOLEAN.TRUE,
                message: LISTINGS.LISING_REMOVE_TO_FAV,
            });
        } else {
            user.favoriteListings.push(id);
            await user.save();
            return res.status(STATUS.SUCCESS).json({
                success: BOOLEAN.TRUE,
                message: LISTINGS.LISING_ADDED_TO_FAV,
            });
        }
    } catch (error) {
        next(error);
    }
};


exports.getFavoriteListings = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // const user = await User.findById(userId).populate("favoriteListings");
        const user = await User.findById(userId).populate({
            path: "favoriteListings",
            populate: [
                {
                    path: "owner",
                    select: "name email imageUrl"
                },
                {
                    path: "images",
                    select: "url caption"
                },
            ]
        });
        if (!user) {
            return res.status(STATUS.BAD_REQUEST).json({
                success: BOOLEAN.FALSE,
                message: RESPONCE_MESSAGE.USER_NOT_FOUND_PLEASE_LOGIN,
            });
        }

        return res.status(STATUS.SUCCESS).json({
            success: BOOLEAN.TRUE,
            favoriteListings: user.favoriteListings,
        });
    } catch (error) {
        next(error);
    }
};



const removeFile = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                console.warn(`File not found, skipping delete: ${filePath}`);
                return resolve(); // Resolve even if the file is missing
            }
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error(`Error deleting file: ${filePath}`, err);
                    return reject(err);
                }
                resolve();
            });
        });
    });
};

const cleanUpUnreferencedMedia = async (listingId, next) => {
    try {
        const listing = await RentalItem.findById(listingId)
            .populate(['images', 'videos']);

        const referencedFiles = [
            ...listing.images.map(img => path.basename(img.url)),
            ...listing.videos.map(vid => path.basename(vid.url))
        ];

        const mediaDirPath = path.resolve(`uploads/media/${listingId}`);

        const allFiles = await fs.promises.readdir(mediaDirPath);
        const unreferencedFiles = allFiles.filter(file => !referencedFiles.includes(file));

        for (const file of unreferencedFiles) {
            const filePath = path.join(mediaDirPath, file);
            await fs.promises.unlink(filePath);
        }
    } catch (error) {
        console.error("Cleanup error:", error);
    }
};

exports.UpdateListings = async (req, res, next) => {
    const { id } = req.params;
    const {
        title,
        description,
        price,
        category,
        priceUnit,
        location,
        availability,
        averageRating,
        listingStatus,
        bedrooms, bathrooms,
        biddingEnabled, minimumBid, bidIncrement, bidEndDate
    } = req.body;


    const parsedRemovedImages = JSON.parse(req.body.removedImages || '[]');
    const parsedRemovedVideos = JSON.parse(req.body.removedVideos || '[]');
    const parsedExistingImages = JSON.parse(req.body.existingImages || '[]');
    const parsedExistingVideos = JSON.parse(req.body.existingVideos || '[]');
    const amenities = JSON.parse(req.body.amenities || '[]');
    const rules = JSON.parse(req.body.rules || '[]');
   


    const missingFields = [];
    if (!title) missingFields.push("title");
    if (!description) missingFields.push("description");
    if (!price) missingFields.push("price");
    if (!category) missingFields.push("category");
    if (!priceUnit) missingFields.push("priceUnit");
    if (!location) missingFields.push("location");

    if (missingFields.length) {
        return next(new AppError(BOOLEAN.FALSE, `Missing required fields: ${missingFields.join(", ")}`, STATUS.BAD_REQUEST));
    }
    const uploadedFilePaths = [];

    try {
        const existingListing = await RentalItem.findById(id).populate("images").populate("videos").populate("facilities").populate("bidding");
        if (!existingListing) {
            return next(new AppError(BOOLEAN.FALSE, LISTINGS.LISTING_NOT_FOUND, STATUS.NOT_FOUND));
        }
        for (const imageObj of parsedRemovedImages) {
            await Image.findByIdAndDelete(imageObj._id);
            const filePath = path.resolve(`uploads/media/${id}/${path.basename(imageObj.url)}`);
            await removeFile(filePath);
        }

        for (const videoObj of parsedRemovedVideos) {
            await Video.findByIdAndDelete(videoObj._id);
            const filePath = path.resolve(`uploads/media/${id}/${path.basename(videoObj.url)}`);
            await removeFile(filePath);
        }

        let finalImageIds = parsedExistingImages.map(img => img._id);
        let finalVideoIds = parsedExistingVideos.map(vid => vid._id);
        let facilitiesId = null;

        try {
            if (req.files?.['images']) {
                const newImages = await Image.insertMany(
                    req.files['images'].map(file => {
                        const filePath = `/uploads/media/${id}/${file.filename}`;
                        uploadedFilePaths.push(filePath);  
                        return { url: filePath, caption: "" };
                    })
                );
                finalImageIds = [...finalImageIds, ...newImages.map(img => img._id)];
            }

            if (req.files?.['videos']) {
                const newVideos = await Video.insertMany(
                    req.files['videos'].map(file => {
                        const filePath = `/uploads/media/${id}/${file.filename}`;
                        uploadedFilePaths.push(filePath); 
                        return { url: filePath, caption: "" };
                    })
                );
                finalVideoIds = [...finalVideoIds, ...newVideos.map(vid => vid._id)];
            }
        } catch (mediaError) {
            await Promise.all(uploadedFilePaths.map(filePath => removeFile(path.resolve(filePath))));
            return next(new AppError(BOOLEAN.FALSE, LISTINGS.MEDIA_UPLOAD_ERR, STATUS.INTERNAL_SERVER_ERROR));
        }

        if (
            (existingListing.category === 'house' || existingListing.category === 'hostel') &&
            (category !== 'house' && category !== 'hostel')
        ) {
            await Facilities.deleteOne({ _id: existingListing.facilities });
            facilitiesId = null;
        }


        if (category === 'house' || category === 'hostel') {
            facilitiesId = await manageFacilities(
                category,
                bedrooms, bathrooms,
                existingListing.facilities?._id || null,
                next
            );

        }
        let newBidding = null;

        if (existingListing.bidding == null) {

            newBidding = await Bidding.create({
                rentalItem: existingListing._id,
                enabled: biddingEnabled,
                minimumBid: minimumBid,
                bidIncrement: bidIncrement,
                bidEndDate: bidEndDate,
            });

        } else {
            newBidding = await Bidding.findByIdAndUpdate(existingListing.bidding._id, {
                rentalItem: existingListing._id,
                enabled: biddingEnabled,
                minimumBid: minimumBid,
                bidIncrement: bidIncrement,
                bidEndDate: bidEndDate,
            })

            newBidding.save()
        }
          let updatedLocationId = existingListing.location;

          try {
              const parsedLocation = JSON.parse(req.body.location);
          
              if (existingListing.location) {
                  await Location.findByIdAndUpdate(
                      existingListing.location,
                      {
                          address: parsedLocation.address,
                          city: parsedLocation.city,
                          state: parsedLocation.state,
                          country: parsedLocation.country,
                          zipCode: parsedLocation.zipCode,
                          coordinates: {
                              latitude: parsedLocation.coordinates.latitude,
                              longitude: parsedLocation.coordinates.longitude
                          }
                      },
                      { new: true, runValidators: true }
                  );
              } else {
                  const newLoc = await Location.create({
                      address: parsedLocation.address,
                      city: parsedLocation.city,
                      state: parsedLocation.state,
                      country: parsedLocation.country,
                      zipCode: parsedLocation.zipCode,
                      coordinates: {
                          latitude: parsedLocation.coordinates.latitude,
                          longitude: parsedLocation.coordinates.longitude
                      }
                  });
                  updatedLocationId = newLoc._id;
              }
          } catch (locErr) {
              return next(new AppError(false, "Invalid location data", 400));
          }
        const updatedListing = await RentalItem.findByIdAndUpdate(
            id,
            {
                title,
                description,
                price,
                category,
                priceUnit,
                location: updatedLocationId,
                amenities,
                rules,
                availability,
                images: finalImageIds,
                videos: finalVideoIds,
                averageRating,
                listingStatus,
                facilities: facilitiesId,
                bidding: newBidding._id,
                updatedAt: Date.now(),
            },
            { new: BOOLEAN.TRUE, runValidators: BOOLEAN.TRUE }
        );
        await cleanUpUnreferencedMedia(id, next);
        res.json(updatedListing);
    } catch (error) {
        next(error)
    }
};



async function manageFacilities(category, bedrooms, bathrooms, existingFacilitiesId = null, next) {
    if (category !== 'house' && category !== 'hostel') {
        return null;
    }

    if ((category === 'house' || category === 'hostel') && (!bedrooms || !bathrooms)) {
        return next(new AppError(BOOLEAN.FALSE, "Bedrooms and bathrooms are required", STATUS.BAD_REQUEST));
    }

    if (existingFacilitiesId) {
        // Update existing facilities
        const updatedFacilities = await Facilities.findByIdAndUpdate(
            existingFacilitiesId,
            { bedrooms, bathrooms },
            { new: true }
        );
        return updatedFacilities._id;
    } else {
        // Create new facilities
        const newFacilities = await Facilities.create({
            bedrooms,
            bathrooms
        });
        return newFacilities._id;
    }
}


exports.DeleteListings = async (req, res, next) => {
    const { id } = req.params;

    try {
        // Find the rental item by ID
        const rentalItem = await RentalItem.findById(id);

        if (!rentalItem) {
            return next(new AppError(BOOLEAN.FALSE, LISTINGS.LISTING_NOT_FOUND, STATUS.NOT_FOUND));
        }

        // Delete images
        for (const image of rentalItem.images) {
            const filePath = path.join(__dirname, "../../..", image.url);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath); // Deletes the file from the filesystem
            }
            await Image.findByIdAndDelete(image._id); // Delete image from database
        }

        // Delete videos
        for (const video of rentalItem.videos) {
            const filePath = path.join(__dirname, "../../..", video.url);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath); // Deletes the file from the filesystem
            }
            await Video.findByIdAndDelete(video._id); // Delete video from database
        }

        // Delete the rental item from the database
        await RentalItem.findByIdAndDelete(id);

        res.status(STATUS.SUCCESS).json({ message: LISTINGS.RENTAL_ITEM_AND_ASSOCIATED_FILES_DELETED_SUCCESSFULLY });
    } catch (error) {
        next(error)
    }
}

exports.GetListings = async (req, res, next) => {
    try {
        const listings = await RentalItem.find({ listingStatus: "active" }).populate("owner").populate("images").populate("videos").populate("bidding").populate('facilities');
        res.json(listings);
    } catch (error) {
        next(error)
    }
}


// function to get a single listing by id
exports.GetListingsById = async (req, res, next) => {
    const { id } = req.params;
    try {
        const listing = await RentalItem.findById(id)
            .populate("owner", "name email imageUrl")
            .populate("images", "url caption")
            .populate("videos", "url caption")
            .populate({
                path: 'bidding',
                populate: {
                    path: 'bids.user highestBidder',
                    select: 'name imageUrl'
                }
            })
            .populate('facilities')
            .populate('location'); 
        if (!listing) {
            return next(new AppError(BOOLEAN.FALSE, LISTINGS.LISTING_NOT_FOUND, STATUS.NOT_FOUND));
        }
        res.json(listing);
    } catch (error) {
        next(error)
    }
}


// function to get all the listings by user id
exports.GetListingByUserId = async (req, res, next) => {
    const { id } = req.params;
    try {

        const listing = await RentalItem.find({ owner: id });
        const count = await RentalItem.countDocuments({ owner: id });


        if (!listing) {
            return next(new AppError(BOOLEAN.FALSE, LISTINGS.LISTING_NOT_FOUND, STATUS.NOT_FOUND));
        }
        res.json({ listing, count });
    } catch (error) {
        next(error)
    }
}


exports.GetALLListingByOwners = async (req, res, next) => {

    try {

        const listing = await RentalItem.find().populate("owner", "name email").populate('bidding');
        if (!listing) {
            return next(new AppError(BOOLEAN.FALSE, LISTINGS.LISTING_NOT_FOUND, STATUS.NOT_FOUND));
        }
        res.json(listing);


    } catch (error) {
        next(error)

    }

}
exports.GetALLListingByOwnersId = async (req, res, next) => {

    const { id } = req.params;
    try {

        const listing = await RentalItem.find({ owner: id }).populate("owner", "name email").populate('bidding');
        if (!listing) {
            return next(new AppError(BOOLEAN.FALSE, LISTINGS.LISTING_NOT_FOUND, STATUS.NOT_FOUND));
        }
        res.json(listing);


    } catch (error) {
        next(error)

    }

}
exports.AllDetailWithMedia = async (req, res, next) => {
    try {
        const listing = await RentalItem.find().populate("owner", "name email").populate("images", "url caption ").populate("videos", "url caption");
        if (!listing) {
            return next(new AppError(BOOLEAN.FALSE, LISTINGS.LISTING_NOT_FOUND, STATUS.NOT_FOUND));
        }
        res.json(listing);


    } catch (error) {
        next(error)

    }

}
exports.AllDetailWithMediaWithOwnerID = async (req, res, next) => {
    try {
        const { id } = req.params;
        const listing = await RentalItem.find({ owner: id })
            .populate("owner", "name email")
            .populate("images", "url caption")
            .populate("videos", "url caption");

        if (!listing) {
            return next(new AppError(BOOLEAN.FALSE, LISTINGS.LISTING_NOT_FOUND, STATUS.NOT_FOUND));
        }
        res.json(listing);
    } catch (error) {
        next(error)
    }
};
