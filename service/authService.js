import { hashPassword, comparePassword } from "../utliz/hash.js";
import User from "../model/auth.js";

const createAccountService = async ({
  email,
  fullName,
  phoneNumber,
  role,
  state,
  password,
  lga,
}) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new Error("Email already exist");
  }
  const hashed = await hashPassword(password);
  const user = await User.create({
    fullName,
    role,
    password: hashed,
    state,
    lga,
    email,
    phoneNumber,
  });

  const userObject = user.toObject();
  delete userObject.password;
  return userObject;
};

export default createAccountService;
