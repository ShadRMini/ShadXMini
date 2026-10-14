import React, { createContext, useContext, useMemo } from "react";

export interface PermissionsContextType {
  role: string;
  isSuperAdmin: boolean;
  permissions: string[];
  permissionsMap: Record<string, boolean>;
  can: (section: string) => boolean;
  canAny: (sections: string[]) => boolean;
  canAll: (sections: string[]) => boolean;
}

const defaultContext: PermissionsContextType = {
  role: "",
  isSuperAdmin: false,
  permissions: [],
  permissionsMap: {},
  can: () => false,
  canAny: () => false,
  canAll: () => false,
};

const PermissionsContext = createContext<PermissionsContextType>(defaultContext);

export interface PermissionsProviderProps {
  children: React.ReactNode;
  me: any;
}

export function PermissionsProvider({ children, me }: PermissionsProviderProps) {
  const value = useMemo<PermissionsContextType>(() => {
    const role: string = me?.role || "";
    const isSuperAdmin = role === "super_admin";

    let permissions: string[] = [];
    let permissionsMap: Record<string, boolean> = {};

    if (Array.isArray(me?.permissions)) {
      permissions = me.permissions;
      permissionsMap = Object.fromEntries(permissions.map((s: string) => [s, true]));
    } else if (me?.permissions && typeof me.permissions === "object") {
      permissionsMap = me.permissions;
      permissions = Object.keys(me.permissions).filter((k) => !!me.permissions[k]);
    }

    if (me?.permissionsMap && typeof me.permissionsMap === "object") {
      permissionsMap = { ...permissionsMap, ...me.permissionsMap };
      permissions = Object.keys(permissionsMap).filter((k) => !!permissionsMap[k]);
    }

    // super_admin always can access any section
    const can = (section: string): boolean => {
      if (!section) return true;
      if (isSuperAdmin) return true;
      if (permissions.includes(section)) return true;
      if (permissionsMap[section] === true) return true;
      return false;
    };

    const canAny = (sections: string[]): boolean => {
      if (!sections || sections.length === 0) return true;
      if (isSuperAdmin) return true;
      return sections.some((s) => can(s));
    };

    const canAll = (sections: string[]): boolean => {
      if (!sections || sections.length === 0) return true;
      if (isSuperAdmin) return true;
      return sections.every((s) => can(s));
    };

    return {
      role,
      isSuperAdmin,
      permissions,
      permissionsMap,
      can,
      canAny,
      canAll,
    };
  }, [me]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): PermissionsContextType {
  return useContext(PermissionsContext);
}
