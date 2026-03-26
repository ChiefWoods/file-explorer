import { z } from "zod";

export const signinFormSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email.")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be at most 128 characters."),
});

export type SigninFormValues = z.infer<typeof signinFormSchema>;

export const signupFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required.")
      .max(120, "Name must be at most 120 characters."),
    email: z.string().trim().pipe(z.email("Enter a valid email.")),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(128, "Password must be at most 128 characters."),
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Passwords must match.",
        path: ["confirmPassword"],
      });
    }
  });

export type SignupFormValues = z.infer<typeof signupFormSchema>;
