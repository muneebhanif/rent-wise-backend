const { check } = require('express-validator');

const validateCreateListings = [
    check('owner').notEmpty().withMessage('Owner is required'),
    check('title').notEmpty().withMessage('Title is required'),
    check('description').notEmpty().withMessage('Description is required'),
    check('price').isFloat({ gt: 0 }).withMessage('Price must be a positive number'),
    check('category').notEmpty().withMessage('Category is required'),
    check('priceUnit').notEmpty().withMessage('Price unit is required'),
];

module.exports = { validateCreateListings };
