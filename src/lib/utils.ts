type ClassValue = string | number | null | undefined | false | ClassValue[] | { [key: string]: boolean | null | undefined };

function toArray(value: ClassValue): Array<string | number> {
  if (Array.isArray(value)) {
    return value.flatMap(toArray);
  }
  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => key);
  }
  return value ? [value] : [];
}

export function cn(...inputs: ClassValue[]) {
  return inputs.flatMap(toArray).join(" ");
}
