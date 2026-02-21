import { UserRole, Permission } from '../types/auth';

export const ACCESS_LEVELS: Record<UserRole, number> = {
    [UserRole.CITOYEN_STANDARD]: 0,
    [UserRole.CITOYEN_VERIFIE]: 1,
    [UserRole.OPERATEUR_SAISIE]: 2,
    [UserRole.MODERATEUR]: 3,
    [UserRole.OFFICIER_POLICE]: 4,
    [UserRole.AGENT_GENDARMERIE]: 4,
    [UserRole.RESPONSABLE_ONG]: 5,
    [UserRole.ADMIN_ORGANISATION]: 6,
    [UserRole.SUPER_ADMIN]: 7,
};

const PUBLIC_PERMISSIONS = [
    Permission.VIEW_PUBLIC_CASES,
    Permission.CREATE_REPORT,
    Permission.RECEIVE_ALERTS,
    Permission.VIEW_PUBLIC_STATS,
];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    [UserRole.CITOYEN_STANDARD]: [
        ...PUBLIC_PERMISSIONS,
    ],
    [UserRole.CITOYEN_VERIFIE]: [
        ...PUBLIC_PERMISSIONS,
        Permission.CREATE_PRIORITY_REPORT,
        Permission.VIEW_RELIABILITY_SCORE,
    ],
    [UserRole.OPERATEUR_SAISIE]: [
        // Operateurs don't necessarily have all public permissions if they are strictly backend, 
        // but usually they do. Assuming they do for now or we define specific subset.
        Permission.CREATE_CASE,
        Permission.UPLOAD_DOCUMENTS,
        Permission.LINK_FAMILY,
    ],
    [UserRole.MODERATEUR]: [
        Permission.VALIDATE_REPORT,
        Permission.MODERATE_CONTENT,
        Permission.MANAGE_COMMENTS,
        Permission.ADJUST_RELIABILITY,
    ],
    [UserRole.OFFICIER_POLICE]: [
        Permission.CREATE_CASE,
        Permission.MANAGE_SENSITIVE_DATA,
        Permission.CREATE_GEO_ALERT,
        Permission.CLOSE_CASE,
        Permission.VALIDATE_REPORT,
        Permission.ADD_INVESTIGATION_NOTES,
    ],
    [UserRole.AGENT_GENDARMERIE]: [
        Permission.CREATE_CASE,
        Permission.MANAGE_SENSITIVE_DATA,
        Permission.CREATE_GEO_ALERT,
        Permission.CLOSE_CASE,
        Permission.VALIDATE_REPORT,
        Permission.ADD_INVESTIGATION_NOTES,
        Permission.COORDINATE_SERVICES,
    ],
    [UserRole.RESPONSABLE_ONG]: [
        Permission.CREATE_CASE,
        Permission.BROADCAST_ALERTS,
        Permission.VIEW_ADVANCED_STATS,
        Permission.MANAGE_CAMPAIGNS,
    ],
    [UserRole.ADMIN_ORGANISATION]: [
        Permission.MANAGE_ORG_USERS,
        Permission.ASSIGN_ROLES,
        Permission.MANAGE_BUDGET,
    ],
    [UserRole.SUPER_ADMIN]: Object.values(Permission),
};
