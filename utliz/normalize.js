// Shared helpers so "Ikeja", "ikeja", "IKEJA " and "  IkeJa" all become "ikeja".
// Never use these on passwords, names, descriptions or other free text.

// Trim, collapse repeated spaces, lowercase. Non-strings pass through untouched.
export const normalizeText = (value) =>
  typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").toLowerCase()
    : value;

// Normalize every item in an array, drop empties and duplicates.
// Also flattens nested arrays (e.g. [["plumbing"]]) and ignores non-strings.
export const normalizeList = (values) =>
  Array.isArray(values)
    ? [
        ...new Set(
          values
            .flat(Infinity)
            .filter((v) => typeof v === "string")
            .map(normalizeText)
            .filter(Boolean),
        ),
      ]
    : [];

// Emails: trim + lowercase only.
export const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : value;