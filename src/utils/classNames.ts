type ClassValue =
  | string
  | false
  | null
  | undefined
  | Record<string, boolean | undefined>;

export function classNames(...values: ClassValue[]) {
  return values
    .flatMap((value) => {
      if (!value) {
        return [];
      }

      if (typeof value === "string") {
        return [value];
      }

      return Object.entries(value)
        .filter(([, enabled]) => Boolean(enabled))
        .map(([className]) => className);
    })
    .join(" ");
}