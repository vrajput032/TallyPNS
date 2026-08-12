import type { FieldValues, Path, RegisterOptions, UseFormRegister } from "react-hook-form";

export function registerFormNumber<TFieldValues extends FieldValues>(
  register: UseFormRegister<TFieldValues>,
  name: Path<TFieldValues>,
  options?: RegisterOptions<TFieldValues, Path<TFieldValues>>
) {
  return register(name, {
    ...options,
    setValueAs: (value) => {
      if (value === "" || value === null || value === undefined) return undefined;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    },
  });
}

/** Avoid mobile browser NaN errors on optional numeric fields. */
export function numberInputValue(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return String(value);
}
