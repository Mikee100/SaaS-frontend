// Utility to check if a user has a specific permission
export function hasPermission(user: any, perm: string) {
  if (user?.roles?.includes('owner') || user?.roles?.includes('admin')) {
    return true;
  }
  return user?.permissions?.some((p: any) => p.key === perm);
} 