import createAccountService from "../service/authService.js";

const createAccount = async (req, res) => {
  try {
    const user = await createAccountService(req.body);
    res
      .status(200)
      .json({
        success: true,
        message: "Account created successfully",
        data: user,
      });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export default createAccount