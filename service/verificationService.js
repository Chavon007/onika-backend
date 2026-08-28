import axios from "axios";

const BASE_URL = "https://api.qoreid.com";
const CLIENT_ID = process.env.QOREID_CLIENT_ID;
const SECRET_KEY = process.env.QOREID_SECRET_KEY;

// cached token
let cachedToken = null;
let tokenExpiresAt = 0;

const getAccessToken = async () => {
  const now = Date.now();

  //   reuse cahced toaken if it still has more than 60s life lfe

  if (cachedToken && now < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const { data } = await axios.post(`${BASE_URL}/token`, {
    clientId: CLIENT_ID,
    secret: SECRET_KEY,
  });

  cachedToken = data.accessToken;

  //   expiresIn comes back as a string like "7200 secs"

  const seconds = parseInt(data.expiresIn, 10) || 7200;
  tokenExpiresAt = now + seconds * 1000;

  return cachedToken;
};

/**
 * Verify a NIN and check whether the submitted name matches official records.
 * @param {string} nin - the National Identity Number
 * @param {string} firstname
 * @param {string} lastname
 */

export const verifyNIN = async (nin, firstname, lastname) => {
  const token = await getAccessToken();

  const { data } = await axios.post(
    `${BASE_URL}/v1/ng/identities/nin/${nin}`,
    { firstname, lastname },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  const matched = data?.summary?.nin_check?.status === "EXACT_MATCH";
  return {
    matched,
    status: data?.summary?.nin_check?.status,
    fieldMatches: data?.summary?.nin_check?.fieldMatches,
    providerData: data.nin,
  };
};

/**
 * Verify a BVN and check whether the submitted name matches official records.
 * @param {string} bvn - Bank Verification Number
 * @param {string} firstname
 * @param {string} lastname
 */
export const verifyBVN = async (bvn, firstname, lastname) => {
  const token = await getAccessToken();
  const { data } = await axios.post(
    `${BASE_URL}/v1/ng/identities/bvn-basic/${bvn}`,
    {
      firstname,
      lastname,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  const matched = data?.summary?.bvn_check?.status === "EXACT_MATCH";

  return {
    matched,
    status: data?.summary?.bvn_check?.status,
    fieldMatches: data?.summary?.bvn_check?.fieldMatches,
    providerData: data.bvn,
  };
};

/**
 * Compare the user's uploaded selfie against their official government photo.
 * @param {"nin"|"vnin"|"nigerian_passport"|"bvn"|"drivers-license"} idType
 * @param {string} idNumber - the NIN, BVN, etc.
 * @param {string} selfieUrl - Cloudinary URL of the user's uploaded selfie
 */
export const verifyFaceMatch = async (selfieUrl, idType, idNumber) => {
  const token = await getAccessToken();

  const { data } = await axios.post(
    `${BASE_URL}/v1/ng/identities/face-verification/${idType}`,
    {
      idNumber,
      photoUrl: selfieUrl,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  const check = data?.summary?.face_verification_check;

  return {
    matched: check?.match === true,
    matchScore: check?.match_score,
    matchingThreshold: check?.matching_threshold,
    providerData: data.face_verification,
  };
};
