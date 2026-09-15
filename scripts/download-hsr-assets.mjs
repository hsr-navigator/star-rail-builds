#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const kind = process.argv[2];

const validKinds = new Set([
    'character',
    'light-cone',
    'relic',
    'filter',
]);

if (!validKinds.has(kind)) {
    throw new Error(
        'Expected asset kind: character, light-cone, relic, or filter.',
    );
}

const ROOT = process.cwd();

const RESOURCE_ROOT =
    'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master';

const DB_ROOT =
    `${RESOURCE_ROOT}/index_new/en`;

const ASSET_ROOT =
    RESOURCE_ROOT;

const supportedExtensions = [
    '.webp',
    '.png',
    '.jpg',
    '.jpeg',
];

/*
 * Trailblazer source IDs.
 *
 * Change this once depending on which Trailblazer
 * artwork the site should use.
 */
const TRAILBLAZER_GENDER = 'female';

const TRAILBLAZER_SOURCE_IDS = {
    male: {
        destruction: '8001',
        preservation: '8003',
        harmony: '8005',
        remembrance: '8007',
        elation: '8009',
    },

    female: {
        destruction: '8002',
        preservation: '8004',
        harmony: '8006',
        remembrance: '8008',
        elation: '8010',
    },
};

function getAutomaticCharacterSourceId(
    localEntry,
) {
    const key =
        normalizeName(localEntry.key);

    /*
     * Supports both:
     *
     * trailblazer-destruction
     * destruction-trailblazer
     */
    const normalMatch =
        key.match(
            /^trailblazer-(destruction|preservation|harmony|remembrance|elation)$/,
        );

    const reverseMatch =
        key.match(
            /^(destruction|preservation|harmony|remembrance|elation)-trailblazer$/,
        );

    const pathName =
        normalMatch?.[1] ??
        reverseMatch?.[1];

    if (!pathName) {
        return null;
    }

    return (
        TRAILBLAZER_SOURCE_IDS[
        TRAILBLAZER_GENDER
        ]?.[pathName] ??
        null
    );
}

function normalizeName(value) {
    return String(value ?? '')
        .normalize('NFKD')
        .toLowerCase()

        // Remove essentially every common apostrophe-like mark.
        .replace(
            /['\u2018\u2019\u201B\u2032\u02BC\uFF07`´]/g,
            '',
        )

        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Extremely tolerant comparison key.
 *
 * Examples:
 *
 * "Today's Good Luck"
 * "Todays Good Luck"
 * "Today's-Good-Luck"
 *
 * all become:
 *
 * todaysgoodluck
 */
function compactName(value) {
    return String(value ?? '')
        .normalize('NFKD')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

async function readJSON(filePath) {
    return JSON.parse(
        await fs.readFile(filePath, 'utf8'),
    );
}

async function fetchJSON(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `${response.status} ${response.statusText}: ${url}`,
        );
    }

    return response.json();
}

async function pathExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function existingAsset(
    basePath,
) {
    for (const extension of supportedExtensions) {
        const candidate =
            `${basePath}${extension}`;

        if (await pathExists(candidate)) {
            return candidate;
        }
    }

    return null;
}

function getSourceExtension(sourcePath) {
    const extension =
        path.extname(
            new URL(
                sourcePath,
                `${ASSET_ROOT}/`,
            ).pathname,
        ) || '.png';

    return extension.toLowerCase();
}

async function downloadAsset(
    sourcePath,
    outputBasePath,
    force,
) {
    if (!sourcePath) {
        throw new Error(
            'Source has no image path.',
        );
    }

    const existing =
        await existingAsset(outputBasePath);

    if (existing && !force) {
        console.log(
            `skip       ${path.relative(ROOT, existing)}`,
        );

        return 'skipped';
    }

    const extension =
        getSourceExtension(sourcePath);

    const outputPath =
        `${outputBasePath}${extension}`;

    const url =
        `${ASSET_ROOT}/${sourcePath}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `${response.status} ${response.statusText}: ${url}`,
        );
    }

    const bytes = Buffer.from(
        await response.arrayBuffer(),
    );

    await fs.mkdir(
        path.dirname(outputPath),
        {
            recursive: true,
        },
    );

    await fs.writeFile(
        outputPath,
        bytes,
    );

    console.log(
        `downloaded ${path.relative(ROOT, outputPath)}`,
    );

    return 'downloaded';
}

/*
 * Local character definitions
 */

async function loadLocalCharacters() {
    const directory = path.join(
        ROOT,
        'src/data/characters',
    );

    const files = (
        await fs.readdir(directory)
    ).filter((file) =>
        file.endsWith('.json'),
    );

    const entries = new Map();

    for (const file of files) {
        const slug =
            path.basename(
                file,
                '.json',
            );

        const data = await readJSON(
            path.join(
                directory,
                file,
            ),
        );

        entries.set(slug, {
            key: slug,

            displayName:
                data.name ?? slug,

            element:
                String(
                    data.type ??
                    data.element ??
                    '',
                ).toLowerCase(),

            rarity:
                String(
                    data.rarity ?? '',
                ),
        });
    }

    return entries;
}

/*
 * Local Light Cone definitions
 */

async function loadLocalLightCones() {
    const directory = path.join(
        ROOT,
        'src/data/light-cones',
    );

    const names = await readJSON(
        path.join(
            ROOT,
            'src/i18n/en/light-cones.json',
        ),
    );

    const files = (
        await fs.readdir(directory)
    ).filter((file) =>
        file.endsWith('.json'),
    );

    const entries = new Map();

    for (const file of files) {
        const pathName =
            path.basename(
                file,
                '.json',
            );

        const data = await readJSON(
            path.join(
                directory,
                file,
            ),
        );

        for (const key of Object.keys(data)) {
            if (entries.has(key)) {
                throw new Error(
                    `Duplicate Light Cone ID: ${key}`,
                );
            }

            entries.set(key, {
                key,
                pathName,

                displayName:
                    names[key] ?? key,
            });
        }
    }

    return entries;
}

/*
 * Local Relic definitions
 */

async function loadLocalRelics() {
    const data = await readJSON(
        path.join(
            ROOT,
            'src/data/relics/relic_sets.json',
        ),
    );

    const names = await readJSON(
        path.join(
            ROOT,
            'src/i18n/en/relic-sets.json',
        ),
    );

    return new Map(
        Object.keys(data).map(
            (key) => [
                key,
                {
                    key,

                    displayName:
                        names[key] ??
                        key,
                },
            ],
        ),
    );
}

/*
 * Source API
 */

const sourceConfig = {
    character: {
        endpoint: 'characters',

        loadLocal:
            loadLocalCharacters,
    },

    'light-cone': {
        endpoint: 'light_cones',

        loadLocal:
            loadLocalLightCones,
    },

    relic: {
        endpoint: 'relic_sets',

        loadLocal:
            loadLocalRelics,
    },
};

function parseArguments() {
    const args =
        process.argv.slice(3);

    let all = false;
    let force = false;

    const requested = [];

    for (const arg of args) {
        if (arg === '--all') {
            all = true;
            continue;
        }

        if (arg === '--force') {
            force = true;
            continue;
        }

        requested.push(arg);
    }

    return {
        all,
        force,
        requested,
    };
}

/*
 * Allows:
 *
 * silver-wolf
 *
 * or an explicit source ID:
 *
 * silver-wolf=1006
 */

function parseRequestedKey(value) {
    const separator =
        value.indexOf('=');

    if (separator === -1) {
        return {
            key: normalizeName(value),
            sourceId: null,
        };
    }

    return {
        key: normalizeName(
            value.slice(
                0,
                separator,
            ),
        ),

        sourceId:
            value.slice(
                separator + 1,
            ),
    };
}

function findSourceEntry(
    sourceEntries,
    localEntry,
    sourceId,
) {
    /*
     * Explicit IDs still take priority.
     *
     * Otherwise, special characters such as
     * Trailblazer can resolve automatically.
     */
    const automaticSourceId =
        kind === 'character'
            ? getAutomaticCharacterSourceId(
                localEntry,
            )
            : null;

    const resolvedSourceId =
        sourceId ??
        automaticSourceId;

    if (resolvedSourceId) {
        const entry =
            sourceEntries[
            resolvedSourceId
            ];

        if (!entry) {
            throw new Error(
                `No source entry with ID "${resolvedSourceId}".`,
            );
        }

        return entry;
    }

    /*
     * First try normal slug-style matching.
     */
    if (sourceId) {
        const entry =
            sourceEntries[sourceId];

        if (!entry) {
            throw new Error(
                `No source entry with ID "${sourceId}".`,
            );
        }

        return entry;
    }

    /*
     * First try normal slug-style matching.
     */
    const wantedName =
        normalizeName(
            localEntry.displayName,
        );

    let matches =
        Object.values(
            sourceEntries,
        ).filter(
            (entry) =>
                normalizeName(
                    entry.name,
                ) === wantedName,
        );

    /*
     * If punctuation differs between our
     * translation and StarRailRes, retry using
     * letters/numbers only.
     */
    if (matches.length === 0) {
        const compactWanted =
            compactName(
                localEntry.displayName,
            );

        matches =
            Object.values(
                sourceEntries,
            ).filter(
                (entry) =>
                    compactName(
                        entry.name,
                    ) ===
                    compactWanted,
            );
    }

    /*
     * Also try our canonical local slug.
     */
    if (matches.length === 0) {
        const localKey =
            compactName(
                localEntry.key,
            );

        matches =
            Object.values(
                sourceEntries,
            ).filter(
                (entry) =>
                    compactName(
                        entry.name,
                    ) === localKey,
            );
    }

    if (matches.length === 0) {
        throw new Error(
            `Could not find "${localEntry.displayName}" (${localEntry.key}) in source data.`,
        );
    }

    if (matches.length > 1) {
        throw new Error(
            `Multiple source entries match "${localEntry.displayName}". Pass ${localEntry.key}=SOURCE_ID instead.`,
        );
    }

    return matches[0];
}

async function downloadCharacter(
    localEntry,
    sourceEntry,
    force,
) {
    const directory = path.join(
        ROOT,
        'src/assets/character-assets',
        localEntry.element,
        localEntry.rarity,
        localEntry.key,
    );

    /*
     * Square icon used by the character
     * browser/header.
     */
    await downloadAsset(
        sourceEntry.icon,
        path.join(
            directory,
            'portrait',
        ),
        force,
    );

    /*
     * Larger character artwork.
     */
    await downloadAsset(
        sourceEntry.preview ??
        sourceEntry.portrait,
        path.join(
            directory,
            'splash_art',
        ),
        force,
    );
}

async function downloadLightCone(
    localEntry,
    sourceEntry,
    force,
) {
    await downloadAsset(
        sourceEntry.icon,
        path.join(
            ROOT,
            'src/assets/item-assets/light-cones',
            localEntry.pathName,
            localEntry.key,
        ),
        force,
    );
}

async function downloadRelic(
    localEntry,
    sourceEntry,
    force,
) {
    await downloadAsset(
        sourceEntry.icon,
        path.join(
            ROOT,
            'src/assets/item-assets/relics',
            localEntry.key,
        ),
        force,
    );
}
/*
 * Filter icons
 */

const filterElementIds = {
    Physical: 'physical',
    Fire: 'fire',
    Ice: 'ice',
    Thunder: 'lightning',
    Wind: 'wind',
    Quantum: 'quantum',
    Imaginary: 'imaginary',
};

const filterPathIds = {
    Destruction: 'destruction',
    'The Hunt': 'hunt',
    Erudition: 'erudition',
    Harmony: 'harmony',
    Nihility: 'nihility',
    Preservation: 'preservation',
    Abundance: 'abundance',
    Remembrance: 'remembrance',
    Elation: 'elation',
};

async function downloadFilterAssets(force) {
    const elements =
        await fetchJSON(
            `${DB_ROOT}/elements.json`,
        );

    const paths =
        await fetchJSON(
            `${DB_ROOT}/paths.json`,
        );

    console.log('\nDownloading Type icons...');

    for (
        const [sourceId, localId]
        of Object.entries(filterElementIds)
    ) {
        const entry =
            elements[sourceId];

        if (!entry) {
            console.error(
                `failed     element ${sourceId}: not found in source data`,
            );

            continue;
        }

        await downloadAsset(
            entry.icon,
            path.join(
                ROOT,
                'src/assets/filter-icons/elements',
                localId,
            ),
            force,
        );
    }

    console.log('\nDownloading Path icons...');

    for (
        const [displayName, localId]
        of Object.entries(filterPathIds)
    ) {
        const entry =
            Object.values(paths).find(
                (item) =>
                    item.name === displayName,
            );

        if (!entry) {
            console.error(
                `failed     path ${displayName}: not found in source data`,
            );

            continue;
        }

        await downloadAsset(
            entry.icon,
            path.join(
                ROOT,
                'src/assets/filter-icons/paths',
                localId,
            ),
            force,
        );
    }

    console.log(
        '\nFilter assets complete.',
    );
}
async function main() {
    const {
        all,
        force,
        requested,
    } = parseArguments();

    /*
     * Filter icons are a fixed set and do
     * not depend on local character/item data.
     */
    if (kind === 'filter') {
        await downloadFilterAssets(
            force,
        );

        return;
    }

    const config =
        sourceConfig[kind];

    const localEntries =
        await config.loadLocal();

    if (
        !all &&
        requested.length === 0
    ) {
        console.log(`
Usage:

  npm run download:${kind}-assets -- <id>
  npm run download:${kind}-assets -- <id> <id>
  npm run download:${kind}-assets -- --all
  npm run download:${kind}-assets -- <local-id>=<source-id>

Options:

  --all      Download all locally defined assets
  --force    Replace assets that already exist
`);

        process.exit(0);
    }

    const sourceEntries =
        await fetchJSON(
            `${DB_ROOT}/${config.endpoint}.json`,
        );

    const requests = all
        ? [...localEntries.keys()].map(
            (key) => ({
                key,
                sourceId: null,
            }),
        )
        : requested.map(
            parseRequestedKey,
        );

    let failed = 0;

    for (const request of requests) {
        const localEntry =
            localEntries.get(
                request.key,
            );

        if (!localEntry) {
            console.error(
                `failed     ${request.key}: unknown local ${kind}`,
            );

            failed++;
            continue;
        }

        try {
            const sourceEntry =
                findSourceEntry(
                    sourceEntries,
                    localEntry,
                    request.sourceId,
                );

            console.log(
                `\n${localEntry.key} -> ${sourceEntry.name} [${sourceEntry.id}]`,
            );

            if (kind === 'character') {
                await downloadCharacter(
                    localEntry,
                    sourceEntry,
                    force,
                );
            } else if (
                kind === 'light-cone'
            ) {
                await downloadLightCone(
                    localEntry,
                    sourceEntry,
                    force,
                );
            } else {
                await downloadRelic(
                    localEntry,
                    sourceEntry,
                    force,
                );
            }
        } catch (error) {
            console.error(
                `failed     ${localEntry.key}: ${error instanceof Error
                    ? error.message
                    : String(error)
                }`,
            );

            failed++;
        }
    }

    console.log(
        `\nDone. failed=${failed}`,
    );

    if (failed > 0) {
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});