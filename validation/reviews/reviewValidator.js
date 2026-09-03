const { body, param, validationResult } = require("express-validator");
const {REVIEWS} = require("../../messages/response")

exports.validateCreateUserReview = [
  param("id").isMongoId().withMessage("Invalid listing ID"),
  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage(REVIEWS.REVIEW_INVALID_RATING),
  body("comment")
    .isString()
    .trim()
    .notEmpty()
    .withMessage(REVIEWS.REVIEW_COMMENT_REQUIRED),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    next();
  },
];



exports.validateCreateUserReview = [
    param("id").isMongoId().withMessage("Invalid user ID"),
    body("rating")
      .isInt({ min: 1, max: 5 })
      .withMessage(REVIEWS.REVIEW_INVALID_RATING),
    body("comment")
      .isString()
      .trim()
      .notEmpty()
      .withMessage(REVIEWS.REVIEW_COMMENT_REQUIRED),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }
      next();
    },
  ];
  