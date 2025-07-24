const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const ORGANIZATION_RULES = {
    "Images": ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'],
    "Documents": ['.pdf', '.doc', 'docx', '.txt', '.ppt', '.pptx', '.xls', '.xlsx', '.odt'],
    "Videos": ['.mp4', '.mov', '.avi', '.mkv', '.wmv'],
    "Audio": ['.mp3', '.wav', '.aac', '.flac'],
    "Archives": ['.zip', '.rar', '.7z', '.tar', '.gz'],
    "Code": ['.js', '.html', '.css', '.py', '.java', '.cpp', '.c', '.ts', '.json'],
};

async function organize(targetPath) {
    const files = await fs.readdir(targetPath);
    const movedFiles = [];

    for (const file of files) {
        const filePath = path.join(targetPath, file);
        const fileStats = await fs.stat(filePath);

        if (fileStats.isDirectory()) continue;

        const fileExt = path.extname(file).toLowerCase();
        let destinationFolder = "Other";

        for (const folder in ORGANIZATION_RULES) {
            if (ORGANIZATION_RULES[folder].includes(fileExt)) {
                destinationFolder = folder;
                break;
            }
        }

        const destinationPath = path.join(targetPath, destinationFolder);
        await fs.mkdir(destinationPath, { recursive: true });

        const newFilePath = path.join(destinationPath, file);

        // Handle potential name conflicts
        if (await fs.access(newFilePath).then(() => true).catch(() => false)) {
            console.log(`Skipping move for "${file}" as a file with the same name already exists in "${destinationFolder}".`);
            continue;
        }

        await fs.rename(filePath, newFilePath);
        movedFiles.push({ from: filePath, to: newFilePath, file });
    }
    return movedFiles;
}

async function undoMoves(moves) {
    let undoneCount = 0;
    for (const move of moves) {
        try {
            // Ensure the parent directory of the 'from' path exists
            await fs.mkdir(path.dirname(move.from), { recursive: true });
            await fs.rename(move.to, move.from);
            undoneCount++;
        } catch (error) {
            console.error(`Could not undo move for ${move.file}: ${error.message}`);
        }
    }
    return undoneCount;
}

async function findDuplicates(targetPath) {
    const files = await fs.readdir(targetPath, { withFileTypes: true, recursive: true });
    const hashes = new Map();

    for (const file of files) {
        // In newer Node versions, `file.path` is available. For broader compatibility:
        const filePath = path.join(file.path || targetPath, file.name);
        if (file.isDirectory()) continue;

        const fileBuffer = await fs.readFile(filePath);
        const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        if (!hashes.has(hash)) {
            hashes.set(hash, []);
        }
        hashes.get(hash).push(filePath);
    }

    const duplicates = {};
    for (const [hash, paths] of hashes.entries()) {
        if (paths.length > 1) {
            duplicates[hash] = paths;
        }
    }
    return duplicates;
}

async function deleteEmptyFolders(directory) {
    const deletedFolders = [];
    const files = await fs.readdir(directory, { withFileTypes: true });

    for (const file of files) {
        const fullPath = path.join(directory, file.name);
        if (file.isDirectory()) {
            // Recursively delete empty folders inside this one first
            deletedFolders.push(...(await deleteEmptyFolders(fullPath)));

            // Check if the current directory is now empty
            const subFiles = await fs.readdir(fullPath);
            if (subFiles.length === 0) {
                await fs.rmdir(fullPath);
                deletedFolders.push(fullPath);
            }
        }
    }
    return deletedFolders;
}

module.exports = {
    organize,
    undoMoves,
    findDuplicates,
    deleteEmptyFolders,
};

