'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ProjectListContextType {
    isOpen: boolean;
    toggleOpen: () => void;
    open: () => void;
    close: () => void;
    // New: selected UUID for client-side switching
    selectedUuid: string | null;
    setSelectedUuid: (uuid: string) => void;
}

const ProjectListContext = createContext<ProjectListContextType | undefined>(undefined);

interface ProjectListProviderProps {
    children: ReactNode;
    initialUuid?: string;
}

export function ProjectListProvider({ children, initialUuid }: ProjectListProviderProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedUuid, setSelectedUuidState] = useState<string | null>(initialUuid || null);

    const toggleOpen = useCallback(() => {
        setIsOpen(prev => !prev);
    }, []);

    const open = useCallback(() => {
        setIsOpen(true);
    }, []);

    const close = useCallback(() => {
        setIsOpen(false);
    }, []);

    const setSelectedUuid = useCallback((uuid: string) => {
        setSelectedUuidState(uuid);
        // Update URL without full page reload (shallow routing)
        window.history.replaceState(null, '', `/${uuid}`);
    }, []);

    return (
        <ProjectListContext.Provider value={{
            isOpen,
            toggleOpen,
            open,
            close,
            selectedUuid,
            setSelectedUuid
        }}>
            {children}
        </ProjectListContext.Provider>
    );
}

export function useProjectList() {
    const context = useContext(ProjectListContext);
    if (context === undefined) {
        throw new Error('useProjectList must be used within a ProjectListProvider');
    }
    return context;
}

