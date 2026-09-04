type ListedUser = {
  id: string;
  status: "Ativo" | "Inativo" | "Convidado";
};

/**
 * Depois do deactivate o CRM pode omitir o usuário na lista.
 * Se a tela já conhecia a pessoa, mantém a linha como Inativo.
 */
export function keepVanishedUsersAsInactive<T extends ListedUser>(listed: T[], previous?: T[]): T[] {
  if (!previous?.length) return listed;
  const ids = new Set(listed.map((user) => user.id));
  const vanished = previous
    .filter((user) => !ids.has(user.id))
    .map((user) => (user.status === "Inativo" ? user : { ...user, status: "Inativo" as const }));
  if (vanished.length === 0) return listed;
  return [...listed, ...vanished];
}
