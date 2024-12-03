const fs = require('fs').promises;

/**
 * Lit un fichier JSON et renvoie son contenu sous forme d'objet.
 * @param {string} filePath - Chemin du fichier JSON.
 * @returns {Promise<any>} - Contenu du fichier JSON.
 */
async function readJsonFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return []; // Retourne un tableau vide si le fichier n'existe pas.
    }
    throw err;
  }
}

/**
 * Écrit des données dans un fichier JSON.
 * @param {string} filePath - Chemin du fichier JSON.
 * @param {any} data - Données à écrire.
 * @returns {Promise<void>}
 */
async function writeJsonFile(filePath, data) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    throw err;
  }
}

/**
 * Vérifie si un fichier existe.
 * @param {string} filePath - Chemin du fichier à vérifier.
 * @returns {Promise<boolean>} - `true` si le fichier existe, sinon `false`.
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

module.exports = { readJsonFile, writeJsonFile, fileExists };
