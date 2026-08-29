/**
 * Shared password strength validation utility.
 * Used by RegisterPage and ResetPasswordPage.
 */

export interface PasswordValidationResult {
  valid: boolean;
  error: string;
  strength: "weak" | "fair" | "strong";
}

/**
 * Validate a password against security requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
export function validatePasswordStrength(
  password: string,
): PasswordValidationResult {
  if (!password || password.length < 8) {
    return {
      valid: false,
      error: "Password must be at least 8 characters",
      strength: "weak",
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one uppercase letter",
      strength: "weak",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one lowercase letter",
      strength: "weak",
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one number",
      strength: "fair",
    };
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one special character (!@#$%^&*)",
      strength: "fair",
    };
  }

  const strength = password.length >= 12 ? "strong" : "fair";
  return { valid: true, error: "", strength };
}

/**
 * Get color for password strength indicator.
 */
export function getStrengthColor(strength: "weak" | "fair" | "strong"): string {
  switch (strength) {
    case "weak":
      return "bg-red-500";
    case "fair":
      return "bg-amber-500";
    case "strong":
      return "bg-emerald-500";
  }
}

/**
 * Get width percentage for password strength bar.
 */
export function getStrengthWidth(strength: "weak" | "fair" | "strong"): string {
  switch (strength) {
    case "weak":
      return "w-1/3";
    case "fair":
      return "w-2/3";
    case "strong":
      return "w-full";
  }
}
