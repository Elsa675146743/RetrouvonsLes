export enum UserRole {
    // Citoyens
    CITOYEN_STANDARD = 'CITOYEN_STANDARD',
    CITOYEN_VERIFIE = 'CITOYEN_VERIFIE',
    CITOYEN = 'CITOYEN', // Version courte pour correspondre à citizen@test.cm

    // Saisie & Opérateurs
    OPERATEUR_SAISIE = 'OPERATEUR_SAISIE',
    
    // Modération
    MODERATEUR = 'MODERATEUR',

    // Forces de l'ordre
    OFFICIER_POLICE = 'OFFICIER_POLICE',
    POLICE = 'POLICE', // Version courte pour correspondre à police@test.cm
    AGENT_GENDARMERIE = 'AGENT_GENDARMERIE',
    GENDARMERIE = 'GENDARMERIE', // Ajout pour gendarmerie@test.cm

    // Organisations & ONG
    RESPONSABLE_ONG = 'RESPONSABLE_ONG',
    ONG = 'ONG', // Version courte pour correspondre à ong@test.cm
    
    // Administration
    ADMIN_ORGANISATION = 'ADMIN_ORGANISATION',
    ADMIN = 'ADMIN', // Version courte pour correspondre à admin@test.cm
    SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum Permission {
    // Public
    VIEW_PUBLIC_CASES = 'VIEW_PUBLIC_CASES',
    CREATE_REPORT = 'CREATE_REPORT',
    RECEIVE_ALERTS = 'RECEIVE_ALERTS',
    VIEW_PUBLIC_STATS = 'VIEW_PUBLIC_STATS',

    // Verified
    CREATE_PRIORITY_REPORT = 'CREATE_PRIORITY_REPORT',
    VIEW_RELIABILITY_SCORE = 'VIEW_RELIABILITY_SCORE',

    // Operator
    CREATE_CASE = 'CREATE_CASE',
    UPLOAD_DOCUMENTS = 'UPLOAD_DOCUMENTS',
    LINK_FAMILY = 'LINK_FAMILY',

    // Moderator
    VALIDATE_REPORT = 'VALIDATE_REPORT',
    MODERATE_CONTENT = 'MODERATE_CONTENT',
    MANAGE_COMMENTS = 'MANAGE_COMMENTS',
    ADJUST_RELIABILITY = 'ADJUST_RELIABILITY',

    // Police/Gendarmerie
    MANAGE_SENSITIVE_DATA = 'MANAGE_SENSITIVE_DATA',
    CREATE_GEO_ALERT = 'CREATE_GEO_ALERT',
    CLOSE_CASE = 'CLOSE_CASE',
    COORDINATE_SERVICES = 'COORDINATE_SERVICES',
    ADD_INVESTIGATION_NOTES = 'ADD_INVESTIGATION_NOTES',

    // ONG
    MANAGE_CAMPAIGNS = 'MANAGE_CAMPAIGNS',
    VIEW_ADVANCED_STATS = 'VIEW_ADVANCED_STATS',
    BROADCAST_ALERTS = 'BROADCAST_ALERTS',

    // Admin Org
    MANAGE_ORG_USERS = 'MANAGE_ORG_USERS',
    MANAGE_BUDGET = 'MANAGE_BUDGET',
    ASSIGN_ROLES = 'ASSIGN_ROLES',

    // Super Admin
    MANAGE_SYSTEM = 'MANAGE_SYSTEM',
    MANAGE_ALL_USERS = 'MANAGE_ALL_USERS',
    EXPORT_DATA = 'EXPORT_DATA',
}

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    accessLevel: number;
    organizationId?: string;
}