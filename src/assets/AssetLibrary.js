const DB_NAME = "KGTF_AssetLibrary";
const DB_VERSION = 1;
const STORE_NAME = "assets";

class AssetLibrary {
    constructor() {
        this.databasePromise = null;
    }

    open() {
        if (this.databasePromise) return this.databasePromise;

        this.databasePromise = new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error("IndexedDB is not supported"));
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = () => {
                const database = request.result;

                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    database.createObjectStore(STORE_NAME, {
                        keyPath: "id"
                    });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        }).catch((error) => {
            this.databasePromise = null;
            throw error;
        });

        return this.databasePromise;
    }

    async put(asset) {
        if (!asset?.id || !asset?.data || !asset?.filename) {
            throw new Error("Invalid asset data");
        }

        const database = await this.open();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(
                STORE_NAME,
                "readwrite"
            );

            transaction.objectStore(STORE_NAME).put({
                ...asset,
                updatedAt: Date.now()
            });

            transaction.oncomplete = () => resolve(asset);
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }

    async getAll() {
        const database = await this.open();

        return new Promise((resolve, reject) => {
            const request = database
                .transaction(STORE_NAME, "readonly")
                .objectStore(STORE_NAME)
                .getAll();

            request.onsuccess = () => {
                resolve(
                    request.result.sort(
                        (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
                    )
                );
            };

            request.onerror = () => reject(request.error);
        });
    }

    async get(id) {
        const database = await this.open();

        return new Promise((resolve, reject) => {
            const request = database
                .transaction(STORE_NAME, "readonly")
                .objectStore(STORE_NAME)
                .get(id);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    async remove(id) {
        const database = await this.open();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(
                STORE_NAME,
                "readwrite"
            );

            transaction.objectStore(STORE_NAME).delete(id);

            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }
}

export const assetLibrary = new AssetLibrary();
