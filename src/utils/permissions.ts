// Utility to check if a user has a specific permission
export function hasPermission(user: any, perm: string) {
  return user?.permissions?.some((p: any) => p.key === perm);
} 