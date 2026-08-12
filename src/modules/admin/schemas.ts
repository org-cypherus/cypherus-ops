import { z } from "zod";
import { Role, ROLE_NAMES, type RoleName } from "@/lib/auth/permissions";
import { isValidPhone } from "@/lib/utils/phone";

const personNameSchema = z
  .string()
  .trim()
  .min(3, "Informe um nome válido")
  .max(120, "Nome muito longo")
  .refine((value) => /^[\p{L}\s'.-]+$/u.test(value), "Use apenas letras e espaços")
  .refine((value) => value.split(/\s+/).filter(Boolean).length >= 2, "Informe nome e sobrenome");

export const adminUserFormSchema = z.object({
  name: personNameSchema,
  email: z
    .string()
    .trim()
    .min(1, "Informe o e-mail")
    .email("E-mail inválido")
    .max(160, "E-mail muito longo"),
  phone: z
    .string()
    .min(1, "Informe o telefone")
    .refine((value) => isValidPhone(value), "Telefone inválido (DDD + número)"),
  role: z.enum(ROLE_NAMES as [RoleName, ...RoleName[]], {
    required_error: "Selecione o cargo",
  }),
  team: z
    .string()
    .trim()
    .min(2, "Informe o time")
    .max(80, "Time muito longo"),
  status: z.enum(["Ativo", "Inativo"]),
});

export type AdminUserFormValues = z.infer<typeof adminUserFormSchema>;

export const emptyAdminUserForm: AdminUserFormValues = {
  name: "",
  email: "",
  phone: "",
  role: Role.Comercial,
  team: "Vendas",
  status: "Ativo",
};
