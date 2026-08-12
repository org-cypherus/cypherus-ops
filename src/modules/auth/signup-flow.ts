import {
  signupAdminSchema,
  signupCompanySchema,
  signupPlanSchema,
  type SignupFormValues,
} from "./schemas";

export const SIGNUP_STEP_FIELDS = [
  ["companyName", "legalName", "document"],
  ["adminName", "email", "password", "confirmPassword"],
  ["planCode", "billingInterval"],
] as const satisfies ReadonlyArray<ReadonlyArray<keyof SignupFormValues>>;

const stepSchemas = [signupCompanySchema, signupAdminSchema, signupPlanSchema] as const;

export type SignupStepIssue = { path: (string | number)[]; message: string };

export function validateSignupStep(
  step: number,
  values: Partial<SignupFormValues>,
): { success: true } | { success: false; issues: SignupStepIssue[] } {
  const schema = stepSchemas[step];
  if (!schema) return { success: true };

  const fields = SIGNUP_STEP_FIELDS[step] ?? [];
  const payload = Object.fromEntries(fields.map((field) => [field, values[field]]));
  const parsed = schema.safeParse(payload);

  if (parsed.success) return { success: true };
  return {
    success: false,
    issues: parsed.error.issues.map((issue) => ({
      path: issue.path,
      message: issue.message,
    })),
  };
}

/** Garante que a criação só ocorre na etapa de revisão (índice 3). */
export function canSubmitSignup(step: number) {
  return step === 3;
}

export function billingIntervalLabel(interval: SignupFormValues["billingInterval"]) {
  return interval === "MONTHLY" ? "Mensal" : "Anual";
}
