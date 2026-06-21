import {
  createUserSummaryRepository,
  type UserSummaryRepository
} from "@/server/repositories/user-summary-repository";

export type ActiveUserSummary = {
  id: string;
  name: string;
  email?: string;
};

function toActiveUserSummary(user: { id: string; name: string; email: string }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email || undefined
  };
}

export async function listActiveUserSummaries(
  repository: UserSummaryRepository = createUserSummaryRepository()
) {
  const users = await repository.listActiveUsers();

  return users.map(toActiveUserSummary);
}
