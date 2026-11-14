// One-time script: lowercases existing state / lga / city / category / skills
// so old records match new ones.
//
// BACK UP YOUR DATABASE FIRST.
// Safe to run more than once. Records already normalized are skipped.

import "dotenv/config";
import mongoose from "mongoose";
import User from "./model/auth.js";
import Job from "./model/jobModel.js";
import ArtisanProfile from "./model/artisanProfileModel.js";
import { normalizeText, normalizeList } from "./utliz/normalize.js";

const BATCH_SIZE = 500;

async function migrate(Model, label, textFields, listFields = []) {
  const projection = [...textFields, ...listFields].join(" ");
  const cursor = Model.find({}).select(projection).lean().cursor();

  let ops = [];
  let scanned = 0;
  let changed = 0;
  let skipped = 0;

  // Model.collection writes straight to MongoDB, so old oddly-shaped data
  // can't trip Mongoose's casting.
  const flush = async () => {
    if (ops.length === 0) return;
    await Model.collection.bulkWrite(ops);
    ops = [];
  };

  for await (const doc of cursor) {
    scanned++;
    const $set = {};

    for (const field of textFields) {
      if (typeof doc[field] === "string") {
        const cleaned = normalizeText(doc[field]);
        if (cleaned !== doc[field]) $set[field] = cleaned;
      }
    }

    for (const field of listFields) {
      if (Array.isArray(doc[field])) {
        const cleaned = normalizeList(doc[field]);

        if (cleaned.length === 0) {
          // Don't wipe anything. Flag it so you can check it by hand.
          skipped++;
          console.warn(
            `  ${label}: skipped ${doc._id} (${field} is empty after cleaning). Raw value:`,
            JSON.stringify(doc[field]),
          );
          continue;
        }

        if (JSON.stringify(cleaned) !== JSON.stringify(doc[field])) {
          $set[field] = cleaned;
        }
      }
    }

    if (Object.keys($set).length > 0) {
      changed++;
      ops.push({
        updateOne: { filter: { _id: doc._id }, update: { $set } },
      });
    }

    if (ops.length >= BATCH_SIZE) await flush();
  }

  await flush();
  console.log(
    `${label}: scanned ${scanned}, updated ${changed}, skipped ${skipped}`,
  );
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URL);
  console.log("Connected. Normalizing...");

  await migrate(User, "Users", ["state", "lga"]);
  await migrate(Job, "Jobs", ["category", "city", "lga", "state"]);
  await migrate(ArtisanProfile, "Artisan profiles", [], ["skills"]);

  await mongoose.disconnect();
  console.log("Done.");
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});