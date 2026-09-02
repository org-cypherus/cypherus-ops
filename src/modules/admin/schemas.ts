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

const phoneRequired = z
  .string()
  .min(1, "Informe o telefone")
  .refine((value) => isValidPhone(value), "Telefone inválido (DDD + número)");

const phoneOptional = z
  .string()
  .refine((value) => !value.trim() || isValidPhone(value), "Telefone inválido (DDD + número)");

const teamRequired = z
  .string()
  .trim()
  .min(1, "Selecione o time")
  .max(120, "Time muito longo");

const teamOptional = z.string().max(120, "Time muito longo");

const userFormBase = {
  name: personNameSchema,
  email: z
    .string()
    .trim()
    .min(1, "Informe o e-mail")
    .email("E-mail inválido")
    .max(160, "E-mail muito longo"),
  role: z.enum(ROLE_NAMES as [RoleName, ...RoleName[]], {
    required_error: "Selecione o cargo",
  }),
  status: z.enum(["Ativo", "Inativo"]),
};

/** Criação: telefone e time obrigatórios. */
export const adminUserFormSchema = z.object({
  ...userFormBase,
  phone: phoneRequired,
  team: teamRequired,
});

/** Edição: CRM não devolve phone/job_title na lista — não bloquear o save. */
export const adminUserEditSchema = z.object({
  ...userFormBase,
  phone: phoneOptional,
  team: teamOptional,
});

export const adminUserCreateSchema = adminUserFormSchema;

export type AdminUserFormValues = z.infer<typeof adminUserFormSchema>;

export const emptyAdminUserForm: AdminUserFormValues = {
  name: "",
  email: "",
  phone: "",
  role: Role.Comercial,
  team: "",
  status: "Ativo",
};
