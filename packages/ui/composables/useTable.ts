// composables/useTable.ts

export function useTable() {
    // Función para invalidar caché de una tabla específica
    const invalidateCache = (tableName: string) => {
        if (!tableName) {
            console.warn('[useTable] No table name provided');
            return;
        }

        const fullCacheKey = `table_cache_${tableName}`;

        try {
            sessionStorage.removeItem(fullCacheKey);
            console.log(`🗑️ Cache invalidated for table: ${tableName}`);
        } catch (error) {
            console.warn('[useTable] Error invalidating cache:', error);
        }
    };

    // Función para invalidar múltiples cachés
    const invalidateMultiple = (tableNames: string[]) => {
        tableNames.forEach(name => invalidateCache(name));
    };

    // Función para limpiar todo el caché de tablas
    const clearAllCache = () => {
        try {
            // Obtener todas las claves del sessionStorage
            const keys = Object.keys(sessionStorage);

            // Filtrar solo las claves de tablas
            const tableCacheKeys = keys.filter(key => key.startsWith('table_cache_'));

            // Eliminar todas
            tableCacheKeys.forEach(key => {
                sessionStorage.removeItem(key);
            });

            console.log(`🗑️ Cleared ${tableCacheKeys.length} table caches`);
        } catch (error) {
            console.warn('[useTable] Error clearing all cache:', error);
        }
    };

    // Función para manejar búsquedas persistentes con invalidación automática de caché
    const useSearch = (tableName: string) => {
        if (!tableName) {
            throw new Error('[useTable] Table name is required for useSearch');
        }

        // Estado global compartido para todas las búsquedas de tablas
        const searchCache = useState<Record<string, string>>("table-search-cache", () => ({}));

        // Referencia reactiva para la búsqueda de esta tabla específica
        const search = ref(searchCache.value[tableName] || "");

        // Watcher para sincronizar automáticamente con el estado global
        // e invalidar caché cuando cambia la búsqueda
        watch(search, (newSearch, oldSearch) => {
            // Guardar en estado global
            searchCache.value[tableName] = newSearch;
            console.log(`[useTable] Saved search for "${tableName}":`, newSearch);

            // Invalidar caché si la búsqueda cambió (excepto en la carga inicial)
            if (oldSearch !== undefined && newSearch !== oldSearch) {
                console.log(`[useTable] Search changed for "${tableName}", invalidating cache`);
                invalidateCache(tableName);
            }
        }, { immediate: true });

        // Función para limpiar la búsqueda específica
        const clearSearch = () => {
            search.value = "";
        };

        return {
            search,
            clearSearch
        };
    };

    // Función para limpiar todas las búsquedas guardadas
    const clearAllSearches = () => {
        const searchCache = useState<Record<string, string>>("table-search-cache", () => ({}));
        searchCache.value = {};
        console.log('[useTable] Cleared all saved searches');
    };

    // Función para obtener el estado del caché de búsquedas
    const getSearchCache = () => {
        const searchCache = useState<Record<string, string>>("table-search-cache", () => ({}));
        return searchCache.value;
    };

    // Manager for persistent filters
    const useFilters = <T extends Record<string, any>>(tableName: string, initialFilters: T) => {
        if (!tableName) {
            throw new Error('[useTable] Table name is required for useFilters');
        }

        // Use Nuxt useState to persist filters across client-side navigation
        const filters = useState<T>(`table_filters_${tableName}`, () => ({ ...initialFilters }));

        const resetFilters = () => {
            filters.value = { ...initialFilters };
        };

        return {
            filters,
            resetFilters
        };
    };

    return {
        invalidateCache,
        invalidateMultiple,
        clearAllCache,
        useSearch,
        useFilters,
        clearAllSearches,
        getSearchCache
    };
}