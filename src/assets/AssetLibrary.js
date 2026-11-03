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

            request.onsuccess = () => {
                const database = request.result;

                database.onversionchange = () => {
                    database.close();
                    this.databasePromise = null;
                };

                resolve(database);
            };

            request.onerror = () => reject(request.error);
            request.onblocked = () => {
                reject(new Error("Asset database upgrade is blocked"));
            };
        }).catch((error) => {
            this.databasePromise = null;
            throw error;
        });

        return this.databasePromise;
    }

    async put(asset) {
        if (
            !asset?.id ||
            !asset?.data ||
            !asset?.filename ||
            !asset?.fingerprint
        ) {
            throw new Error("Invalid asset data");
        }

        const database = await this.open();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(
                STORE_NAME,
                "readwrite"
            );

            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();
            let result = null;

            request.onsuccess = () => {
                const existing = request.result.find(
                    (item) => item.fingerprint === asset.fingerprint
                );

                if (existing) {
                    result = existing;
                    return;
                }

                const now = Date.now();

                result = {
                    ...asset,
                    fileSize: asset.fileSize || 0,
                    importedAt: asset.importedAt || now,
                    updatedAt: now
                };

                store.add(result);
            };

            transaction.oncomplete = () => resolve(result);

            transaction.onerror = () => {
                reject(this.storageError(transaction.error));
            };

            transaction.onabort = () => {
                reject(this.storageError(transaction.error));
            };
        });
    }

    storageError(error) {
        if (
            error?.name === "QuotaExceededError" ||
            error?.name === "NS_ERROR_DOM_QUOTA_REACHED"
        ) {
            return new Error(
                "Asset storage is full. Delete unused assets and try again."
            );
        }

        if (error?.name === "SecurityError") {
            return new Error(
                "Browser storage is blocked. Check site storage permissions."
            );
        }

        return error || new Error("Asset storage operation failed");
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
                        (a, b) => (b.importedAt || 0) - (a.importedAt || 0)
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
        if (!id) throw new Error("Asset ID is required");

        const database = await this.open();

        return new Promise((resolve, reject) => {
            const transaction = database.transaction(
                STORE_NAME,
                "readwrite"
            );

            transaction.objectStore(STORE_NAME).delete(id);

            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => {
                reject(this.storageError(transaction.error));
            };
            transaction.onabort = () => {
                reject(this.storageError(transaction.error));
            };
        });
    }
}

export const assetLibrary = new AssetLibrary();
