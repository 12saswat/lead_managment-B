import jwt from "jsonwebtoken";
import crypto from "crypto";

const generateEncryptedKey = () => {
  const randomPart = crypto.randomBytes(2).toString("hex");
  return `${process.env.WRK_KEY_NAME}${randomPart}`;
};

const generateRoleToken = (role) => {
  const token = jwt.sign({ role }, process.env.ROLE_JWT_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
  });

  return `${token}-${process.env.IDENTIFY_JWT_SECRET}`;
};

const decodeRoleToken = (tokenWithSuffix) => {
  // extract end suffix
  const suffix = `-${process.env.IDENTIFY_JWT_SECRET}`;

  if (!tokenWithSuffix || !tokenWithSuffix.endsWith(suffix)) {
    return null;
  }

  const pureToken = tokenWithSuffix.replace(suffix, "");

  try {
    const decoded = jwt.verify(pureToken, process.env.ROLE_JWT_SECRET);
    return decoded; // contains actuall role
  } catch (err) {
    return null;
  }
};

export { generateRoleToken, generateEncryptedKey, decodeRoleToken };
