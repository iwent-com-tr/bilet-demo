export function flattenJsonValues(obj: any): string[] {
  const result: string[] = [];

  function recurse(value: any) {
    if (value === null || value === undefined) return;

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      result.push(String(value));
    } else if (Array.isArray(value)) {
      value.forEach(recurse);
    } else if (typeof value === "object") {
      Object.values(value).forEach(recurse);
    }
  }

  recurse(obj);
  return result;
}