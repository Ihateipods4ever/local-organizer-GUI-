const selectFolderBtn = document.getElementById('select-folder-btn');
const organizeBtn = document.getElementById('organize-btn');
const undoBtn = document.getElementById('undo-btn');
const findDuplicatesBtn = document.getElementById('find-duplicates-btn');
const deleteEmptyCheckbox = document.getElementById('delete-empty-checkbox');

const selectedFolderEl = document.getElementById('selected-folder');
const logOutputEl = document.getElementById('log-output');
const duplicatesOutputEl = document.getElementById('duplicates-output');

let currentFolderPath = null;
let lastMoves = [];

function log(message) {
    logOutputEl.textContent += `${message}\n`;
    logOutputEl.scrollTop = logOutputEl.scrollHeight;
}

selectFolderBtn.addEventListener('click', async () => {
    const folderPath = await window.electronAPI.selectFolder();
    if (folderPath) {
        currentFolderPath = folderPath;
        selectedFolderEl.textContent = folderPath;
        organizeBtn.disabled = false;
        findDuplicatesBtn.disabled = false;
        log(`Folder selected: ${folderPath}`);
    }
});

organizeBtn.addEventListener('click', async () => {
    if (!currentFolderPath) return;
    log('\nStarting organization...');
    organizeBtn.disabled = true;
    undoBtn.disabled = true;

    try {
        const movedFiles = await window.electronAPI.organizeFolder(currentFolderPath);
        lastMoves = movedFiles; // Save for undo

        if (movedFiles.length > 0) {
            log(`✅ Success! Organized ${movedFiles.length} file(s).`);
            movedFiles.forEach(move => log(`   - Moved: ${move.file}`));
            undoBtn.disabled = false;
        } else {
            log('Analysis complete. No new files to organize.');
        }

        if (deleteEmptyCheckbox.checked) {
            log('\nDeleting empty folders...');
            const deletedFolders = await window.electronAPI.deleteEmptyFolders(currentFolderPath);
            if (deletedFolders.length > 0) {
                log(`   - Deleted ${deletedFolders.length} empty folder(s).`);
            } else {
                log('   - No empty folders found.');
            }
        }

    } catch (error) {
        log(`❌ Error: ${error.message}`);
    } finally {
        organizeBtn.disabled = false;
    }
});

undoBtn.addEventListener('click', async () => {
    if (lastMoves.length === 0) return;
    log('\nUndoing last organization...');
    undoBtn.disabled = true;

    try {
        const undoneCount = await window.electronAPI.undoAll(lastMoves);
        log(`✅ Success! Reverted ${undoneCount} file move(s).`);
        lastMoves = []; // Clear history after undo
    } catch (error) {
        log(`❌ Error during undo: ${error.message}`);
        undoBtn.disabled = false; // Re-enable if undo fails
    }
});

findDuplicatesBtn.addEventListener('click', async () => {
    if (!currentFolderPath) return;
    log('\nFinding duplicates... (this may take a while)');
    findDuplicatesBtn.disabled = true;
    duplicatesOutputEl.innerHTML = '<p>Scanning...</p>';

    try {
        const duplicates = await window.electronAPI.findDuplicates(currentFolderPath);
        const duplicateGroups = Object.values(duplicates);

        if (duplicateGroups.length > 0) {
            log(`Found ${duplicateGroups.length} group(s) of duplicate files.`);
            duplicatesOutputEl.innerHTML = ''; // Clear "Scanning..."
            duplicateGroups.forEach((group, index) => {
                const groupEl = document.createElement('div');
                groupEl.className = 'duplicate-group';
                const title = document.createElement('h4');
                title.textContent = `Duplicate Set ${index + 1} (${group.length} files)`;
                groupEl.appendChild(title);
                const list = document.createElement('ul');
                group.forEach(filePath => {
                    const item = document.createElement('li');
                    item.textContent = filePath;
                    list.appendChild(item);
                });
                groupEl.appendChild(list);
                duplicatesOutputEl.appendChild(groupEl);
            });
        } else {
            log('No duplicate files found.');
            duplicatesOutputEl.innerHTML = '<p>No duplicates found.</p>';
        }
    } catch (error) {
        log(`❌ Error finding duplicates: ${error.message}`);
        duplicatesOutputEl.innerHTML = `<p class="error-text">Error: ${error.message}</p>`;
    } finally {
        findDuplicatesBtn.disabled = false;
    }
});

