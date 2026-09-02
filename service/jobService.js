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
  city
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
    lga,
    images,
    priority,
  });

  return newjob;
};
