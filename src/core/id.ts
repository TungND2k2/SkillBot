import { ObjectId } from "mongodb";
import { ValidationError } from "./errors.js";

/**
 * Convert a 24-char hex string to a MongoDB `ObjectId`.
 * Throws `ValidationError` on bad input — preferred over `new ObjectId(s)`
 * which throws a generic `BSONError` we'd then have to catch and rewrap.
 */
export function toObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) {
    throw new ValidationError(`ID không hợp lệ: "${id}"`);
  }
  return new ObjectId(id);
}

/** Convert an `ObjectId` (or any value with .toString) to its hex string form. */
export function fromObjectId(oid: ObjectId | string): string {
  return typeof oid === "string" ? oid : oid.toHexString();
}

export function isValidObjectId(s: unknown): s is string {
  return typeof s === "string" && ObjectId.isValid(s);
}
