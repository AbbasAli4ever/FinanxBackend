import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to specify required permissions for an endpoint
 *
 * @param permissions - One or more permission codes required to access the endpoint
 *
 * @example
 * // Single permission
 * @RequirePermissions('user:create')
 *
 * @example
 * // Multiple permissions (user needs ANY of these)
 * @RequirePermissions('user:create', 'user:edit')
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Permission check mode - determines how multiple permissions are evaluated
 */
export const PERMISSION_MODE_KEY = 'permission_mode';

export type PermissionMode = 'ANY' | 'ALL';

/**
 * Decorator to require ALL specified permissions (instead of ANY)
 *
 * @param permissions - All permission codes required to access the endpoint
 *
 * @example
 * // User must have BOTH permissions
 * @RequireAllPermissions('reports:view', 'reports:export')
 */
export const RequireAllPermissions = (...permissions: string[]) => {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    SetMetadata(PERMISSIONS_KEY, permissions)(target, propertyKey, descriptor);
    SetMetadata(PERMISSION_MODE_KEY, 'ALL' as PermissionMode)(target, propertyKey, descriptor);
  };
};
