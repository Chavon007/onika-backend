import { body } from "express-validator";

export const createJobValidator = [
  body("category")
    .trim()
    .notEmpty()
    .withMessage("Category is required")
    .isLength({ min: 3 })
    .withMessage("Category must be at least 3 characters"),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 3 })
    .withMessage("Description must be at least 3 characters"),
  body("priority")
    .trim()
    .notEmpty()
    .withMessage("Priority is required")
    .isIn(["ASAP", "Today", "This week", "Flexible"])
    .withMessage("Invalid priority value"),
  body("lga")
    .trim()
    .notEmpty()
    .withMessage("Lga is required")
    .isLength({ min: 3 })
    .withMessage("LGA must be at least 3 characters"),
  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("address")
    .trim()
    .notEmpty()
    .withMessage("Address is required")
    .isLength({ min: 3 })
    .withMessage("Address must be at least 3 characters"),
  body("city")
    .trim()
    .notEmpty()
    .withMessage("City is required")
    .isLength({ min: 1 })
    .withMessage("City is required"),
  body("state")
    .trim()
    .notEmpty()
    .withMessage("State is required")
    .isLength({ min: 3 })
    .withMessage("State must be at least 3 characters"),
  body("landmark")
    .trim()
    .notEmpty()
    .withMessage("Landmark is required")
    .isLength({ min: 3 })
    .withMessage("Landmark must be at least 3 characters"),
  body("images")
    .isArray({ min: 3, max: 6 })
    .withMessage("Please upload between 3 and 6 images"),
  body("images.*")
    .isString()
    .trim()
    .notEmpty()
    .isURL()
    .withMessage("Each image must be a valid URL"),
];
