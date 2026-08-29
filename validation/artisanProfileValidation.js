import { body } from "express-validator";

export const artisanProfileValidator = [
  body("bio")
    .trim()
    .notEmpty()
    .withMessage("Bio is required")
    .isLength({ max: 500 })
    .withMessage("Bio can't be more than 500 characters"),

  body("skills")
    .isArray({ min: 1 })
    .withMessage("Please select at least one skill"),
  body("skills.*")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Each skill must be a valid string"),

  body("experience").trim().notEmpty().withMessage("Experience is required"),

  body("nin")
    .trim()
    .notEmpty()
    .withMessage("NIN is required")
    .isLength({ min: 11, max: 11 })
    .withMessage("NIN must be exactly 11 digits")
    .isNumeric()
    .withMessage("NIN must contain only digits"),

  body("bvn")
    .optional()
    .trim()
    .isLength({ min: 11, max: 11 })
    .withMessage("BVN must be exactly 11 digits")
    .isNumeric()
    .withMessage("BVN must contain only digits"),

  body("governmentId")
    .trim()
    .notEmpty()
    .withMessage("Government Id is required")
    .isURL()
    .withMessage("Government Id must be a valid URL"),

  body("faceVerification")
    .trim()
    .notEmpty()
    .withMessage("Face verification is required")
    .isURL()
    .withMessage("Face verification must be a valid URL"),

  body("workImage")
    .isArray({ min: 1, max: 6 })
    .withMessage("Please upload between 1 and 6 work images"),
  body("workImage.*")
    .isString()
    .trim()
    .notEmpty()
    .isURL()
    .withMessage("Each work image must be a valid URL"),
];