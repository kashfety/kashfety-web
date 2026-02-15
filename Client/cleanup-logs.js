#!/usr/bin/env node

/**
 * Console Log Cleanup Script for Kashfety Web
 * 
 * Finds and optionally removes console.log, console.error, console.warn, etc.
 * statements from source code files.
 * 
 * Usage:
 *   npm run cleanup-logs [options]
 *   OR
 *   node cleanup-logs.js [options]
 * 
 * Options:
 *   --dry-run          Show what would be removed without removing
 *   --remove           Actually remove console statements (default: false)
 *   --types <types>    Comma-separated list of console types to target
 *                      (e.g., "log,error,warn" or "all")
 *   --extensions <ext>  Comma-separated list of file extensions (default: "js,ts,tsx,jsx")
 *   --exclude <paths>  Comma-separated paths to exclude (e.g., "node_modules,dist,.next")
 *   --help, -h         Show this help message
 */

import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join, extname, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default console types to find
const DEFAULT_CONSOLE_TYPES = ['log', 'error', 'warn', 'info', 'debug', 'trace'];

// Default file extensions
const DEFAULT_EXTENSIONS = ['.js', '.ts', '.tsx', '.jsx'];

// Default paths to exclude
const DEFAULT_EXCLUDE = ['node_modules', '.next', 'dist', 'build', '.git', 'coverage'];

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        dryRun: true, // Default to dry-run for safety
        remove: false,
        types: [...DEFAULT_CONSOLE_TYPES],
        extensions: [...DEFAULT_EXTENSIONS],
        exclude: [...DEFAULT_EXCLUDE]
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--dry-run':
                options.dryRun = true;
                options.remove = false;
                break;
            case '--remove':
                options.remove = true;
                options.dryRun = false;
                break;
            case '--types':
                const types = args[++i];
                if (types === 'all') {
                    options.types = [...DEFAULT_CONSOLE_TYPES];
                } else if (types) {
                    options.types = types.split(',').map(t => t.trim());
                }
                break;
            case '--extensions':
                const exts = args[++i];
                if (exts) {
                    options.extensions = exts.split(',').map(e => e.startsWith('.') ? e : '.' + e);
                }
                break;
            case '--exclude':
                const exclude = args[++i];
                if (exclude) {
                    options.exclude = exclude.split(',').map(e => e.trim());
                }
                break;
            case '--help':
            case '-h':
                showHelp();
                process.exit(0);
                break;
            default:
                showHelp();
                process.exit(1);
        }
    }

    return options;
}

function showHelp() {
    console.log(`
Console Log Cleanup Script for Kashfety Web

Usage:
  npm run cleanup-logs [options]
  OR
  node cleanup-logs.js [options]

Options:
  --dry-run              Show what would be removed without removing (default)
  --remove               Actually remove console statements (use with caution!)
  --types <types>        Comma-separated list of console types to target
                         (e.g., "log,error,warn" or "all")
                         Default: log,error,warn,info,debug,trace
  --extensions <ext>     Comma-separated list of file extensions
                         (default: js,ts,tsx,jsx)
  --exclude <paths>      Comma-separated paths to exclude
                         (default: node_modules,.next,dist,build,.git,coverage)
  --help, -h             Show this help message

Examples:
  npm run cleanup-logs -- --dry-run
  npm run cleanup-logs -- --remove --types "log,error"
  npm run cleanup-logs -- --remove --exclude "node_modules,.next,Server"
  npm run cleanup-logs -- --remove --types "all" --extensions "js,ts"
`);
}

// Check if path should be excluded
function shouldExclude(filePath, excludePaths) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    return excludePaths.some(exclude => normalizedPath.includes(exclude));
}

// Get all files recursively
async function getAllFiles(dir, extensions, excludePaths, fileList = []) {
    try {
        const files = await readdir(dir);

        for (const file of files) {
            const filePath = join(dir, file);
            const fileStat = await stat(filePath);

            if (shouldExclude(filePath, excludePaths)) {
                continue;
            }

            if (fileStat.isDirectory()) {
                await getAllFiles(filePath, extensions, excludePaths, fileList);
            } else if (fileStat.isFile()) {
                const ext = extname(file);
                if (extensions.includes(ext)) {
                    fileList.push(filePath);
                }
            }
        }
    } catch (error) {
        // Ignore permission errors
        if (error.code !== 'EACCES') {
            console.warn(`Warning: Could not read ${dir}:`, error.message);
        }
    }

    return fileList;
}

// Remove console statements from code
function removeConsoleStatements(content, types) {
    const lines = content.split('\n');
    const result = [];
    let removedCount = 0;
    let inMultiLineComment = false;
    let inString = false;
    let stringChar = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let modifiedLine = line;
        let shouldRemove = false;

        // Simple check for multi-line comments
        if (line.includes('/*')) inMultiLineComment = true;
        if (line.includes('*/')) inMultiLineComment = false;

        // Skip if in multi-line comment
        if (inMultiLineComment && !line.includes('*/')) {
            result.push(line);
            continue;
        }

        // Check for console statements
        for (const type of types) {
            // Pattern: console.type(...)
            const regex = new RegExp(
                `console\\.${type}\\s*\\([^)]*\\)(?:;)?`,
                'g'
            );

            // Check if line contains console.type
            if (line.includes(`console.${type}`)) {
                // More sophisticated check - handle strings and comments
                let inString = false;
                let stringChar = null;
                let inComment = false;
                let cleaned = '';

                for (let j = 0; j < line.length; j++) {
                    const char = line[j];
                    const nextChar = line[j + 1];

                    // Handle strings
                    if (!inComment && (char === '"' || char === "'" || char === '`')) {
                        if (!inString) {
                            inString = true;
                            stringChar = char;
                        } else if (char === stringChar && line[j - 1] !== '\\') {
                            inString = false;
                            stringChar = null;
                        }
                        cleaned += char;
                        continue;
                    }

                    // Handle comments
                    if (!inString && char === '/' && nextChar === '/') {
                        inComment = true;
                        cleaned += line.substring(j);
                        break;
                    }

                    if (inString || inComment) {
                        cleaned += char;
                        continue;
                    }

                    cleaned += char;
                }

                // Check if console statement is in actual code (not in string or comment)
                if (cleaned.includes(`console.${type}`)) {
                    // Check if entire line is just the console statement (with optional semicolon and whitespace)
                    const trimmed = line.trim();
                    const isOnlyConsole = regex.test(trimmed) &&
                        trimmed.replace(regex, '').trim().length === 0;

                    if (isOnlyConsole) {
                        shouldRemove = true;
                        removedCount++;
                        break;
                    } else {
                        // Try to remove just the console statement from the line
                        const beforeConsole = line.substring(0, line.indexOf(`console.${type}`));
                        const afterConsole = line.substring(line.indexOf(`console.${type}`));
                        const match = afterConsole.match(regex);

                        if (match) {
                            const consolePart = match[0];
                            const afterMatch = afterConsole.substring(afterConsole.indexOf(consolePart) + consolePart.length);
                            modifiedLine = beforeConsole + afterMatch;
                            removedCount++;
                            break;
                        }
                    }
                }
            }
        }

        if (shouldRemove) {
            // Skip empty lines that result from removal
            continue;
        } else {
            result.push(modifiedLine);
        }
    }

    return {
        content: result.join('\n'),
        removedCount
    };
}

// Process a single file
async function processFile(filePath, options) {
    try {
        const content = await readFile(filePath, 'utf8');
        const { content: newContent, removedCount } = removeConsoleStatements(content, options.types);

        if (removedCount > 0) {
            const relativePath = relative(__dirname, filePath);

            if (options.remove) {
                await writeFile(filePath, newContent, 'utf8');
                console.log(`✅ Removed ${removedCount} console statement(s) from: ${relativePath}`);
            } else {
                console.log(`📝 Would remove ${removedCount} console statement(s) from: ${relativePath}`);
            }

            return removedCount;
        }

        return 0;
    } catch (error) {
        return 0;
    }
}

// Main execution function
async function main() {
    try {
        const options = parseArgs();

        if (options.remove) {
            console.log('⚠️  WARNING: This will permanently remove console statements from your code!');
            console.log('   Make sure you have committed your changes or have a backup.\n');
        } else {
            console.log('🔍 DRY RUN MODE - No files will be modified\n');
        }

        console.log('📂 Scanning for files...');
        console.log(`   Extensions: ${options.extensions.join(', ')}`);
        console.log(`   Console types: ${options.types.join(', ')}`);
        console.log(`   Excluding: ${options.exclude.join(', ')}\n`);

        const startDir = __dirname;
        const files = await getAllFiles(startDir, options.extensions, options.exclude);

        console.log(`✅ Found ${files.length} files to scan\n`);

        if (files.length === 0) {
            console.log('No files found matching the criteria.');
            return;
        }

        let totalRemoved = 0;
        let filesModified = 0;

        for (const file of files) {
            const removed = await processFile(file, options);
            if (removed > 0) {
                totalRemoved += removed;
                filesModified++;
            }
        }

        console.log('\n' + '='.repeat(50));
        if (options.remove) {
            console.log(`✅ Cleanup complete!`);
            console.log(`   Files modified: ${filesModified}`);
            console.log(`   Console statements removed: ${totalRemoved}`);
        } else {
            console.log(`📊 Dry run complete!`);
            console.log(`   Files that would be modified: ${filesModified}`);
            console.log(`   Console statements that would be removed: ${totalRemoved}`);
            console.log(`\n💡 Run with --remove to actually remove these statements.`);
        }
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
    }
}

// Run the script
const isMainModule = process.argv[1] && (
    import.meta.url.endsWith(process.argv[1]) ||
    import.meta.url.includes(process.argv[1].replace(/\\/g, '/'))
);

if (isMainModule || !process.env.NODE_ENV) {
    main().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

export { main, removeConsoleStatements };
