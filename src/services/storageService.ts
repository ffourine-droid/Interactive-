import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'azilearn-db';
const STORE_NAME = 'downloads';
const DB_VERSION = 1;

interface Experiment {
  id: string | number;
  title: string;
  keywords: string;
  html_content: string;
  downloaded_at: number;
}

export const initDB = async (): Promise<IDBPDatabase> => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
};

export const saveExperiment = async (experiment: any) => {
  const db = await initDB();
  const data = {
    ...experiment,
    downloaded_at: Date.now(),
  };
  await db.put(STORE_NAME, data);
};

export const deleteExperiment = async (id: string | number) => {
  const db = await initDB();
  await db.delete(STORE_NAME, id);
};

export const getDownloadedExperiments = async (): Promise<Experiment[]> => {
  const db = await initDB();
  return db.getAll(STORE_NAME);
};

export const isExperimentDownloaded = async (id: string | number): Promise<boolean> => {
  const db = await initDB();
  const item = await db.get(STORE_NAME, id);
  return !!item;
};
