import artisanProfileModel from "../model/artisanProfileModel.js";
import { verifyNIN, verifyBVN, verifyFaceMatch } from "./verificationService.js";

const runVerificationChecks = async (profile, user) => {
  const [firstname, ...rest] = user.fullName.trim().split(" ");
  const lastname = rest.join(" ") || firstname;

  try {
    const ninResult = await verifyNIN(profile.nin, firstname, lastname);
    const faceResult = await verifyFaceMatch(
      "nin",
      profile.nin,
      profile.faceVerification,
    );

    const bvnResult = profile.bvn
      ? await verifyBVN(profile.bvn, firstname, lastname)
      : { matched: true };

    const allVerified =
      ninResult.matched && bvnResult.matched && faceResult.matched;
    profile.verificationStatus = allVerified ? "verified" : "rejected";
    profile.verificationDetails = { ninResult, bvnResult, faceResult };
  } catch (err) {
    profile.verificationStatus = "verification_error";
    profile.verificationDetails = { error: err.message };
  }
  await profile.save();
};

export const createArtisanProfile = async (userId, user, payload) => {
  const existingArtisanProfile = await artisanProfileModel.findOne({
    User: userId,
  });

  if (existingArtisanProfile) {
    const err = new Error("Artisan already exist");
    err.statusCode = 409;
    throw err;
  }

  const createArtisan = await artisanProfileModel.create({
    User: userId,
    bio: payload.bio,
    skills: payload.skills,
    experience: payload.experience,
    nin: payload.nin,
    bvn: payload.bvn,
    governmentId: payload.governmentId,
    faceVerification: payload.faceVerification,
    workImage: payload.workImage,
    verificationStatus: "pending",
  });
  runVerificationChecks(createArtisan, user).catch((err) =>
    console.error("Verification error:", err),
  );

  return createArtisan;
};
