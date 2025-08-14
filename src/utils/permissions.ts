// Utility to check if a user has a specific permission
export function hasPermission(user: any, perm: string) {
  if (user?.roles?.includes('owner') || user?.roles?.includes('admin')) {
    return true;
  }
  // Fix: check for 'name' instead of 'key'
  return user?.permissions?.some((p: any) => p.name === perm);
} 