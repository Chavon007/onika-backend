import jobModel from "../model/jobModel.js";
export const createJob = async ({
  customerId,
  category,
  description,
  price,
  lga,
  address,
  state,
  landmark,
  images,
  priority,
}) => {
  const newjob = await jobModel.create({
    customerId,
    category,
    description,
    price,
    state,
    address,
    city,
    landmark,
    images,
    priority,
  });

  return newjob;
};
