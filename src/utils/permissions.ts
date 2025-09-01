// Utility to check if a user has a specific permission
export function hasPermission(user: any, perm: string) {
  if (user?.roles?.includes('owner') || user?.roles?.includes('admin')) {
    return true;
  }
  // Support both string and object permission arrays
  if (Array.isArray(user?.permissions)) {
    // If permissions are strings
    if (typeof user.permissions[0] === 'string') {
      return user.permissions.includes(perm);
    }
    // If permissions are objects with a 'name' property
    return user.permissions.some((p: any) => p.name === perm);
  }
  return false;
} 