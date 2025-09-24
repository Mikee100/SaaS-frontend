// Utility to check if a user has a specific permission
interface PermissionObject {
  name: string;
}

interface User {
  roles?: string[];
  permissions?: string[] | PermissionObject[];
}

export function hasPermission(user: User | null | undefined, perm: string): boolean {
  if (!user) return false;

  if (user.roles?.includes('owner') || user.roles?.includes('admin')) {
    return true;
  }

  // Support both string and object permission arrays
  if (Array.isArray(user.permissions)) {
    // If permissions are strings
    if (typeof user.permissions[0] === 'string') {
      return (user.permissions as string[]).includes(perm);
    }
    // If permissions are objects with a 'name' property
    return (user.permissions as PermissionObject[]).some((p) => p.name === perm);
  }
  return false;
}
