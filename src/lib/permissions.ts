import { User } from '../types';

/**
 * Mirrors the backend's _require_permission exactly (server/main.py): the
 * studio owner is not an "employee" with a grantable permissions list, so
 * the owner role always passes regardless of what's in user.permissions.
 * Admin/teacher need the specific key present in their own permissions
 * array (set by the owner in Команда -> OwnerTeamPanel). Any other role
 * (parent) never has permissions to check against.
 */
export function hasPermission(user: Pick<User, 'role' | 'permissions'> | null | undefined, permissionKey: string): boolean {
  if (!user) return false;
  if (user.role === 'owner') return true;
  if (user.role !== 'admin' && user.role !== 'teacher') return false;
  return Array.isArray(user.permissions) && user.permissions.includes(permissionKey);
}
