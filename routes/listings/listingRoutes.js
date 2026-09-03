const express = require("express");
const router = express.Router();
const rentalController = require("../../controller/listings/listingController");
const upload = require("../../utils/mediaFile");
const asyncHandler = require("../../middleware/asyncWrapper");
const mongoose = require("mongoose");
const { AuthorizeUser } = require("../../middleware/auth");


// Route to create a new listing with image/video upload
router.post(
  "/create",
  (req, res, next) => {
    const listingId = new mongoose.Types.ObjectId();
    req.listingId = listingId;
    next();
  },
  upload.fields([
    { name: "images", maxCount: 10 }, // Max 10 images
    { name: "videos", maxCount: 5 }, // Max 5 videos
  ]),
  asyncHandler(rentalController.CreateListings)
);



router.post(
  "/uploadMedia",
  upload.fields([
    { name: "images", maxCount: 10 }, // Max 10 images
    { name: "videos", maxCount: 5 }, // Max 5 videos
  ]),
  asyncHandler(rentalController.uploadMedia)
);

// Route to update a listing by ID
router.put(
  "/update/:id",
  (req, res, next) => {
    const listingId = req.params.id
    req.listingId = listingId
    next();
  },

  upload.fields([
    { name: "images", maxCount: 10 }, // Max 10 images
    { name: "videos", maxCount: 5 }, // Max 5 videos
  ]),
  asyncHandler(rentalController.UpdateListings)
);

// router.post(
//   "/updatehtml/:id",
//   upload.fields([
//     { name: "images", maxCount: 10 }, // Max 10 images
//     { name: "videos", maxCount: 5 }, // Max 5 videos
//   ]),
//   asyncHandler(rentalController.UpdateListings)
// );

// Route to delete a listing by ID
router.delete("/delete/:id", asyncHandler(rentalController.DeleteListings));

// Route to get all listings
router.get("/all", asyncHandler(rentalController.GetListings));



// Route to get a single listing by listing ID
router.get(
  "/GetListingsById/:id",
  asyncHandler(rentalController.GetListingsById)

);



// Route to get all listings by a specific user (by user ID)
router.get("/user/:id", asyncHandler(rentalController.GetListingByUserId));

// Route to get all listings with populated owner details (name and email)
router.get("/all/owners", asyncHandler(rentalController.GetALLListingByOwners));


// Route to get all listings by a specific owner with populated owner details (name and email)
router.get(
  "/owner/:id",
  asyncHandler(rentalController.GetALLListingByOwnersId)
);
// Route to get all listings  with populated owner details (name and email) with media
router.get(
  "/AllDetailWithMedia",
  asyncHandler(rentalController.AllDetailWithMedia)
);

// Route to get all listings by a specific owner with populated owner details (name and email) with media
router.get(
  "/AllDetailWithMedia/:id",
  asyncHandler(rentalController.AllDetailWithMediaWithOwnerID)
);

// placing bid by a user on a listing
router.post(
  "/placeBid",
  AuthorizeUser("user", "Admin"),
  asyncHandler(rentalController.placeBid)
);


router.post("/favorites/:id", AuthorizeUser("user", "Admin"), asyncHandler(rentalController.toggleFavoriteListing));

router.get("/favorites", AuthorizeUser("user", "Admin"), asyncHandler(rentalController.getFavoriteListings));

module.exports = router;
