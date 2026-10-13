import fs from 'fs';
import path from 'path';
import { loadCharacterData } from './character-data';
import { marked } from 'marked';
import {
    parsePublicCharacterSlug,
} from './character-slugs';
import { resolveCharacterAssetImage } from './character-assets';
import {
    findCharacterPath,
    loadJSON,
    readJSONFile,
    toTitleCase,
} from './content';
import { getLocale, t } from './i18n';
import {
    collectNotes,
    collectSectionNotes,
    collectStatNotes,
    type NoteGroupRegistry,
} from './notes';
import { TranslationHelper } from './translator';

type CharacterPathParam = string | string[] | undefined;

type CharacterPageDataOptions = {
    lang?: string;
    characterPath: CharacterPathParam;
    contentBase?: string;
};

type BuildContext = {
    buildPath: string;
    buildName: string;
    pathName: string;
    lang: string;
    locale: any;
    translator: TranslationHelper;
    relicSetData: Record<string, any>;
};

type LightConeTranslationContext = {
    lightConeData: Record<
        string,
        SharedLightConeData
    >;
    pathName: string;
    sourceFile: string;
    translator: TranslationHelper;
};

/**
 * Localized editorial note used by build-notes.json.
 *
 * English is required because it is the fallback when the requested language
 * is missing. Any other language key is allowed, for example fr, es, it, or ru.
 */
type LocalizedBuildNote = {
    en: string;
    [lang: string]: string;
};

type BuildCalculationCredit = {
    label?: string | Record<string, string>;
    author?: string;
    link?: string;
    detail?: string;
};

/**
 * Resolves the expected path for a build-level JSON file.
 *
 * @param buildPath Absolute path to a build directory.
 * @param fileName JSON file name.
 * @returns Absolute file path.
 */
const fileInBuild = (buildPath: string, fileName: string) =>
    path.join(buildPath, fileName);

const lightConeDataPath = path.resolve('src/data/light-cones');
const relicSetDataPath = path.resolve(
    'src/data/relics/relic_sets.json',
);

const relicGroupDataPath = path.resolve(
    'src/data/relics/relic_groups.json',
);

let relicGroupDataCache:
    | Record<string, any>
    | null = null;

function loadRelicGroupData(): Record<
    string,
    any
> {
    if (relicGroupDataCache) {
        return relicGroupDataCache;
    }

    if (!fs.existsSync(relicGroupDataPath)) {
        throw new Error(
            'No shared relic group data found at src/data/relics/relic_groups.json',
        );
    }

    relicGroupDataCache =
        readJSONFile(
            relicGroupDataPath,
        ) as Record<string, any>;

    return relicGroupDataCache;
}

/**
 * Renders Markdown text to HTML.
 *
 * @param value Markdown source text.
 * @returns Rendered HTML string.
 */
const renderMarkdown = (value: string) => marked.parse(value) as string;

/**
 * Loads the shared artifact set database used by popovers and validation.
 */
function loadRelicSetData() {
    if (!fs.existsSync(relicSetDataPath)) {
        throw new Error(
            'No shared relic set data found at src/data/relics/relic_sets.json',
        );
    }

    return readJSONFile(relicSetDataPath);
}

/**
 * Loads shared Light Cone data for one Path.
 */
function loadLightConeData(
    pathName: string,
) {
    const filePath = path.join(
        lightConeDataPath,
        `${pathName}.json`,
    );

    if (!fs.existsSync(filePath)) {
        throw new Error(
            `No shared Light Cone data found for Path "${pathName}"`,
        );
    }

    return readJSONFile(filePath);
}

/**
 * Loads every shared Light Cone entry so inline
 * Light Cone popovers can resolve IDs.
 */
function loadAllLightConeData() {
    return fs
        .readdirSync(lightConeDataPath)
        .filter((fileName) =>
            fileName.endsWith('.json'),
        )
        .reduce<
            Record<
                string,
                SharedLightConeData
            >
        >((lightConeData, fileName) => {
            const pathData = readJSONFile(
                path.join(
                    lightConeDataPath,
                    fileName,
                ),
            );

            Object.assign(
                lightConeData,
                pathData,
            );

            return lightConeData;
        }, {});
}

type SharedLightConeData = {
    rarity: number;
    source?: string;
    free?: boolean;
    version_released?: string;

    passive?: {
        en: string;
        [lang: string]:
        | string
        | undefined;
    };

    s1?: (number | number[])[];
    s2?: (number | number[])[];
    s3?: (number | number[])[];
    s4?: (number | number[])[];
    s5?: (number | number[])[];

    level_1?: {
        hp?: number;
        atk?: number;
        def?: number;
    };

    level_max?: {
        hp?: number;
        atk?: number;
        def?: number;
    };
};

/**
 * Gets and validates one Light Cone's rarity.
 */
function getLightConeRarity(
    lightConeData: Record<
        string,
        SharedLightConeData
    >,
    lightConeId: string,
    pathName: string,
    sourceFile: string,
) {
    const rarity =
        lightConeData[lightConeId]?.rarity;

    if (!rarity) {
        throw new Error(
            `Missing rarity for Light Cone "${lightConeId}" in src/data/light-cones/${pathName}.json (source: ${sourceFile})`,
        );
    }

    return rarity;
}

/**
 * Gets and validates the shared data for
 * one Light Cone.
 */
function getLightConeInfo(
    lightConeData: Record<
        string,
        SharedLightConeData
    >,
    lightConeId: string,
    pathName: string,
    sourceFile: string,
) {
    const data =
        lightConeData[lightConeId];

    if (!data) {
        throw new Error(
            `Missing shared data for Light Cone "${lightConeId}" in src/data/light-cones/${pathName}.json (source: ${sourceFile})`,
        );
    }

    return data;
}

/**
 * Normalizes legacy string Light Cone entries
 * into object entries.
 */
function normalizeLightConeItem(
    item: any,
) {
    return typeof item === 'string'
        ? { name: item }
        : item;
}

/**
 * Translates one Light Cone recommendation.
 */
function translateLightConeItem(
    item: any,
    context: LightConeTranslationContext,
) {
    const {
        lightConeData,
        pathName,
        sourceFile,
        translator,
    } = context;

    const normalizedItem =
        normalizeLightConeItem(item);

    const id = translator.resolveAlias(
        'lightcone',
        normalizedItem.name,
    );

    const lightConeInfo =
        getLightConeInfo(
            lightConeData,
            id,
            pathName,
            sourceFile,
        );

    return {
        ...normalizedItem,
        id,

        rarity: getLightConeRarity(
            lightConeData,
            id,
            pathName,
            sourceFile,
        ),

        info: lightConeInfo,

        name: translator.translate(
            'lightcone',
            id,
            sourceFile,
        ),
    };
}

/**
 * Translates ranked and conditional
 * Light Cone recommendations.
 */
function translateLightConeRecommendations(
    lightCones: any,
    context: LightConeTranslationContext,
) {
    return {
        ...lightCones,

        light_cones: (
            lightCones.light_cones ?? []
        ).map(
            (position: {
                items: any[];
            }) => ({
                ...position,

                items:
                    position.items.map(
                        (item) =>
                            translateLightConeItem(
                                item,
                                context,
                            ),
                    ),
            }),
        ),

        conditional:
            lightCones.conditional?.map(
                (item: any) =>
                    translateLightConeItem(
                        item,
                        context,
                    ),
            ),
    };
}



/**
 * Converts Astro's catch-all character param into the stable character slug.
 *
 * Astro may provide `[...character]` as an array, so nested path segments are
 * joined before content lookup.
 */
function normalizeCharacterParam(characterPath: CharacterPathParam) {
    return Array.isArray(characterPath) ? characterPath.join('/') : characterPath;
}

/**
 * Translates a stat ID from either a raw string item or an object item.
 *
 * Stat JSON supports both "er" and `{ "name": "er", ... }` forms.
 */
function translateStatValue(locale: any, value: any, sourceFile: string) {
    return t(
        locale,
        'stat',
        typeof value === 'string' ? value : value.name,
        sourceFile,
        false,
    );
}

/**
 * Normalizes one stat entry into an object with a translated display name.
 */
function translateStatItem(
    locale: any,
    item: any,
    sourceFile: string,
    translator?: TranslationHelper,
) {
    return typeof item === 'string'
        ? { name: translateStatValue(locale, item, sourceFile) }
        : {
            ...item,
            name:
                typeof item.name === 'string' && item.name.includes('[[')
                    ? (translator?.translateNoteText(item.name, sourceFile) ??
                        item.name)
                    : translateStatValue(locale, item, sourceFile),
        };
}

/**
 * Normalizes one substat priority row.
 *
 * A row may be a single stat, or an alternative group shaped as
 * `{ "items": ["atk%", "em"] }`. The first item keeps the rank number and
 * later items render as approximate alternatives.
 */
function translateSubstatPriorityItem(
    locale: any,
    item: any,
    sourceFile: string,
    translator: TranslationHelper,
) {
    if (item && Array.isArray(item.items)) {
        return {
            ...item,
            items: item.items.map((stat: any) =>
                translateStatItem(
                    locale,
                    stat,
                    sourceFile,
                    translator,
                ),
            ),
        };
    }

    return translateStatItem(
        locale,
        item,
        sourceFile,
        translator,
    );
}

/**
 * Translates a relic set ID, falling back to stat translations
 * for pseudo-sets.
 */
function translateRelicSetName(
    translator: TranslationHelper,
    locale: any,
    id: string,
    sourceFile: string,
) {
    const relicName = t(
        locale,
        'relic',
        id,
        sourceFile,
        false,
    );

    if (relicName !== id) {
        return relicName;
    }

    return translator.translate(
        'stat',
        id,
        sourceFile,
    );
}

function translateRelicSetItem(
    translator: TranslationHelper,
    locale: any,
    item: any,
    sourceFile: string,
    relicSetData: Record<string, any>,
) {
    const relicGroups =
        loadRelicGroupData();

    const groupDefinition =
        relicGroups[item.name];

    /*
     * Central pseudo-set, e.g.
     *
     * { "name": "2pc-speed" }
     *
     * The actual set list lives in
     * src/data/relics/relic_groups.json.
     */
    if (groupDefinition) {
        const pieces =
            groupDefinition.pieces ?? 2;

        const labelId =
            groupDefinition.label;

        const label =
            translateRelicSetName(
                translator,
                locale,
                labelId,
                sourceFile,
            );

        const pieceLabel = t(
            locale,
            'ui',
            `${pieces}-Pc`,
            sourceFile,
            false,
        );

        const aggregateSets = (
            groupDefinition.sets ?? []
        ).map((rawSetId: string) => {
            const setId =
                translator.resolveAlias(
                    'relic',
                    rawSetId,
                );

            const setInfo =
                relicSetData[setId];

            if (!setInfo) {
                throw new Error(
                    `Unknown Relic "${rawSetId}" inside central relic group "${item.name}" (source: ${sourceFile})`,
                );
            }

            return {
                id: setId,

                name:
                    translateRelicSetName(
                        translator,
                        locale,
                        setId,
                        sourceFile,
                    ),

                info: setInfo,
            };
        });

        return {
            ...item,

            /*
             * Keep the central group ID available
             * for debugging / future use.
             */
            id: item.name,
            aggregateId: item.name,

            pieces,

            /*
             * Examples:
             *   2-Pc SPD
             *   2-Pc ATK
             *   2-Pc HP
             */
            name: `${pieceLabel} ${label}`,

            /*
             * A pseudo-set itself has no real
             * relic_sets.json entry.
             */
            info: undefined,

            /*
             * RelicSetInfoPopover already knows
             * how to render this array.
             */
            aggregateSets,
        };
    }

    /*
     * Normal real Relic.
     */
    const id = translator.resolveAlias(
        'relic',
        item.name,
    );

    return {
        ...item,
        id,

        name:
            translateRelicSetName(
                translator,
                locale,
                id,
                sourceFile,
            ),

        info: relicSetData[id],
    };
}


/**
 * Translates every relic set item inside one
 * recommendation group.
 */
function translateRelicSetGroup(
    translator: TranslationHelper,
    locale: any,
    group: any,
    sourceFile: string,
    relicSetData: Record<string, any>,
) {
    return {
        ...group,

        items: Array.isArray(group.items)
            ? group.items.map((item: any) =>
                translateRelicSetItem(
                    translator,
                    locale,
                    item,
                    sourceFile,
                    relicSetData,
                ),
            )
            : group.items,

        choices: Array.isArray(group.choices)
            ? group.choices.map((choice: any) => ({
                ...choice,

                items: (choice.items ?? []).map(
                    (item: any) =>
                        translateRelicSetItem(
                            translator,
                            locale,
                            item,
                            sourceFile,
                            relicSetData,
                        ),
                ),
            }))
            : group.choices,
    };
}

/**
 * Translates ranked and conditional relic recommendations.
 */
function translateRelicSetRecommendations(
    relicSets: any,
    translator: TranslationHelper,
    locale: any,
    sourceFile: string,
    relicSetData: Record<string, any>,
) {
    const translateRanks = (
        ranks: any[] = [],
    ) =>
        ranks.map(
            (rank: { groups: any[] }) => ({
                ...rank,

                groups: rank.groups.map(
                    (group: any) =>
                        translateRelicSetGroup(
                            translator,
                            locale,
                            group,
                            sourceFile,
                            relicSetData,
                        ),
                ),
            }),
        );

    return {
        ...relicSets,

        relic_sets: translateRanks(
            relicSets.relic_sets,
        ),

        planar_ornaments: translateRanks(
            relicSets.planar_ornaments,
        ),

        conditional: (
            relicSets.conditional ?? []
        )
            .flatMap(
                (entry: any) =>
                    entry.groups ?? [entry],
            )
            .map((group: any) =>
                translateRelicSetGroup(
                    translator,
                    locale,
                    group,
                    sourceFile,
                    relicSetData,
                ),
            ),
    };
}
/**
 * Translates one talent priority item while preserving legacy display strings.
 */
function translateTraceItem(
    translator: TranslationHelper,
    item: any,
    sourceFile: string,
) {
    if (typeof item?.name !== 'string') {
        return item;
    }

    if (item.name.includes('[[')) {
        return {
            ...item,
            name: translator.translateNoteText(
                item.name,
                sourceFile,
            ),
        };
    }

    if (/^[a-z0-9-]+$/.test(item.name)) {
        return {
            ...item,

            // Keep the original HSR ability ID.
            id: item.id ?? item.name,

            name: translator.translate(
                'ability',
                item.name,
                sourceFile,
            ),
        };
    }

    return item;
}

/**
 * Flattens ranked and conditional artifact groups for note collection.
 */
/**
 * Flattens ranked and conditional relic groups
 * for note collection.
 */
function getRelicSetNoteGroups(
    relicSets: any,
) {
    return [
        ...(relicSets.relic_sets ?? []).flatMap(
            (rank: any) => rank.groups,
        ),

        ...(
            relicSets.planar_ornaments ?? []
        ).flatMap(
            (rank: any) => rank.groups,
        ),

        ...(relicSets.conditional ?? []),
    ];
}

/**
 * Translates every talent priority group for a build.
 */
function translateTracePriorities(
    traces: any,
    translator: TranslationHelper,
    sourceFile: string,
) {
    return {
        ...traces,

        traces: (traces.traces ?? []).map(
            (priority: { items: any[] }) => ({
                ...priority,

                items: priority.items.map((item) =>
                    translateTraceItem(
                        translator,
                        item,
                        sourceFile,
                    ),
                ),
            }),
        ),

        major_traces: traces.major_traces ?? [],
    };
}

/**
 * Translates all artifact main stat slots while preserving their slot groups.
 */
function translateMainStats(
    locale: any,
    mainstats: any,
    sourceFile: string,
    translator: TranslationHelper,
) {
    return {
        body: (mainstats.main_stats.body ?? []).map(
            (item: any) =>
                translateStatItem(
                    locale,
                    item,
                    sourceFile,
                    translator,
                ),
        ),

        feet: (mainstats.main_stats.feet ?? []).map(
            (item: any) =>
                translateStatItem(
                    locale,
                    item,
                    sourceFile,
                    translator,
                ),
        ),

        planar_sphere: (
            mainstats.main_stats.planar_sphere ?? []
        ).map((item: any) =>
            translateStatItem(
                locale,
                item,
                sourceFile,
                translator,
            ),
        ),

        link_rope: (
            mainstats.main_stats.link_rope ?? []
        ).map((item: any) =>
            translateStatItem(
                locale,
                item,
                sourceFile,
                translator,
            ),
        ),
    };
}

/**
 * Translates stat IDs used by recommended stat targets.
 */
function translateRecommendedStats(
    locale: any,
    recommendedStats: any,
    sourceFile: string,
    translator: TranslationHelper,
) {
    return {
        ...recommendedStats,

        stats: (
            recommendedStats.stats ?? []
        ).map((item: any) =>
            translateStatItem(
                locale,
                item,
                sourceFile,
                translator,
            ),
        ),
    };
}

/**
 * Collects notes from sands, goblet, and circlet into one main-stat note list.
 */
function collectMainStatNotes(
    mainStats: any,
    sourceFile: string,
    lang: string,
    translator: TranslationHelper,
    sharedGroups?: NoteGroupRegistry,
) {
    const allMainStats = [
        'body',
        'feet',
        'planar_sphere',
        'link_rope',
    ].flatMap(
        (slot) => mainStats[slot] ?? [],
    );

    return collectStatNotes(
        allMainStats,
        (stat: { name: any }) => stat.name,
        sourceFile,
        lang,
        translator,
        sharedGroups,
    );
}
/**
 * Localizes and renders build-level editorial notes.
 *
 * Expected shape:
 * `{ "notes": [{ "en": "...", "fr": "...", "es": "..." }] }`
 *
 * Each note must include `en`; the requested language falls back to English.
 * Note text may contain inline translation tokens and Markdown.
 */
function buildLocalizedNotes(
    buildNoteData: any,
    sourceFile: string,
    lang: string,
    translator: TranslationHelper,
) {
    if (!buildNoteData) return null;

    const notes: LocalizedBuildNote[] =
        Array.isArray(buildNoteData.notes)
            ? buildNoteData.notes
            : [];

    const localizeCreditDetail = (credit: BuildCalculationCredit) => {
        const rawLabel = credit?.label;
        const label = typeof rawLabel === 'string'
            ? rawLabel.trim()
            : (rawLabel?.[lang]?.trim() || rawLabel?.en?.trim() || '');
        return {
            ...credit,
            label,
            ...(credit?.detail ? {
                detail: translator.translateNoteText(
                    credit.detail,
                    sourceFile,
                    { lightConePopovers: true, relicPopovers: true, rotationPopovers: true },
                ),
            } : {}),
        };
    };

    const localizeCreditDetails = (
        value:
            | BuildCalculationCredit
            | BuildCalculationCredit[]
            | undefined,
    ) => {
        if (Array.isArray(value)) {
            return value.map(
                localizeCreditDetail,
            );
        }

        return value
            ? localizeCreditDetail(value)
            : value;
    };
    const renderLocalizedBuildText = (
        value:
            | {
                en: string;
                [lang: string]: string;
            }
            | undefined,
    ) => {
        if (!value?.en) {
            return '';
        }

        return renderMarkdown(
            translator.translateNoteText(
                value[lang] ?? value.en,
                sourceFile,
                {
                    lightConePopovers: true,
                    relicPopovers: true,
                    rotationPopovers: true,
                },
            ),
        );
    };
    return {
        ...buildNoteData,

        relic: localizeCreditDetails(
            buildNoteData.relic,
        ),

        relics: localizeCreditDetails(
            buildNoteData.relics,
        ),

        light_cones: localizeCreditDetails(
            buildNoteData.light_cones,
        ),

        talent: localizeCreditDetails(
            buildNoteData.talent,
        ),

        trace: localizeCreditDetails(
            buildNoteData.trace,
        ),

        traces: localizeCreditDetails(
            buildNoteData.traces,
        ),

        talents: localizeCreditDetails(
            buildNoteData.talents,
        ),

        global: localizeCreditDetails(
            buildNoteData.global,
        ),

        notes: notes.map((note) => {
            if (note.en === undefined) {
                throw new Error(
                    `Build note is missing required English text (source: ${sourceFile})`,
                );
            }

            return renderMarkdown(
                translator.translateNoteText(
                    note[lang] ?? note.en,
                    sourceFile,
                    {
                        lightConePopovers: true,
                        relicPopovers: true,
                        rotationPopovers: true,
                    },
                ),
            );
        }),
        overview: buildNoteData.overview
            ? {
                summary:
                    renderLocalizedBuildText(
                        buildNoteData.overview.summary,
                    ),

                investment_priority:
                    buildNoteData.overview
                        .investment_priority
                        ? {
                            priority:
                                renderLocalizedBuildText(
                                    buildNoteData.overview
                                        .investment_priority
                                        .priority,
                                ),

                            details:
                                renderLocalizedBuildText(
                                    buildNoteData.overview
                                        .investment_priority
                                        .details,
                                ),
                        }
                        : undefined,

                notable_eidolons:
                    buildNoteData.overview
                        .notable_eidolons
                        ? {
                            priority:
                                renderLocalizedBuildText(
                                    buildNoteData.overview
                                        .notable_eidolons
                                        .priority,
                                ),

                            details:
                                renderLocalizedBuildText(
                                    buildNoteData.overview
                                        .notable_eidolons
                                        .details,
                                ),
                        }
                        : undefined,
            }
            : undefined,
    };
}

/**
 * Loads and normalizes one build folder for rendering.
 *
 * This keeps file-system content, i18n IDs, localized notes, Markdown, and
 * warning collection out of the Astro route and away from presentation
 * components.
 */
function loadBuildData({
    buildPath,
    buildName,
    pathName,
    lang,
    locale,
    translator,
    relicSetData,
}: BuildContext) {
    const lightConesFile = fileInBuild(
        buildPath,
        'light-cones.json',
    );

    const relicSetsFile = fileInBuild(
        buildPath,
        'relic-sets.json',
    );

    const relicMainstatsFile = fileInBuild(
        buildPath,
        'relic-mainstats.json',
    );

    const relicSubstatsFile = fileInBuild(
        buildPath,
        'relic-substats.json',
    );
    const recommendedStatsFile = fileInBuild(
        buildPath,
        'recommended-stats.json',
    );

    const tracesFile = fileInBuild(
        buildPath,
        'traces.json',
    );

    const buildNotesFile = fileInBuild(
        buildPath,
        'build-notes.json',
    );

    /*
     * Light Cones
     */
    const rawLightCones = loadJSON(
        buildPath,
        'light-cones.json',
    );

    const lightCones = rawLightCones
        ? translateLightConeRecommendations(
            rawLightCones,
            {
                lightConeData:
                    loadLightConeData(
                        pathName,
                    ),

                pathName,

                sourceFile:
                    lightConesFile,

                translator,
            },
        )
        : null;

    /*
     * Relics
     */
    const rawRelicSets = loadJSON(
        buildPath,
        'relic-sets.json',
    );

    const rawRelicMainstats = loadJSON(
        buildPath,
        'relic-mainstats.json',
    );

    const rawRelicSubstats = loadJSON(
        buildPath,
        'relic-substats.json',
    );

    const relics = {
        sets: rawRelicSets
            ? translateRelicSetRecommendations(
                rawRelicSets,
                translator,
                locale,
                relicSetsFile,
                relicSetData,
            )
            : null,

        mainstats: rawRelicMainstats,
        substats: rawRelicSubstats,
    };

    if (relics.mainstats) {
        relics.mainstats.main_stats =
            translateMainStats(
                locale,
                relics.mainstats,
                relicMainstatsFile,
                translator,
            );
    }

    if (relics.substats) {
        relics.substats.substats_priority =
            relics.substats.substats_priority.map(
                (item: any) =>
                    translateSubstatPriorityItem(
                        locale,
                        item,
                        relicSubstatsFile,
                        translator,
                    ),
            );
    }
    /*
 * Recommended Stats
 */
    const rawRecommendedStats = loadJSON(
        buildPath,
        'recommended-stats.json',
    );

    const recommendedStats = rawRecommendedStats
        ? translateRecommendedStats(
            locale,
            rawRecommendedStats,
            recommendedStatsFile,
            translator,
        )
        : null;

    /*
     * Traces
     */
    const rawTraces = loadJSON(
        buildPath,
        'traces.json',
    );

    const traces = rawTraces
        ? translateTracePriorities(
            rawTraces,
            translator,
            tracesFile,
        )
        : null;
    const sharedNoteGroups: NoteGroupRegistry =
        new Map();

    /*
     * Notes
     */
    const notes = {
        lightCones: {
            global: collectSectionNotes(
                lightCones,
                lightConesFile,
                lang,
                translator,
            ),

            items: collectNotes(
                lightCones
                    ? [
                        ...lightCones.light_cones,

                        ...(lightCones.conditional
                            ? [
                                {
                                    items:
                                        lightCones.conditional,
                                },
                            ]
                            : []),
                    ]
                    : [],

                (lightCone: {
                    id: string;
                }) => `[[lightcone:${lightCone.id}]]`,

                lightConesFile,
                lang,
                translator,
                sharedNoteGroups,
            ),
        },

        relics: {
            global: [
                ...collectSectionNotes(
                    relics.sets,
                    relicSetsFile,
                    lang,
                    translator,
                ),

                ...collectSectionNotes(
                    relics.mainstats,
                    relicMainstatsFile,
                    lang,
                    translator,
                ),

                ...collectSectionNotes(
                    relics.substats,
                    relicSubstatsFile,
                    lang,
                    translator,
                ),
            ],

            sets: collectNotes(
                relics.sets
                    ? getRelicSetNoteGroups(
                        relics.sets,
                    )
                    : [],
                (relic: {
                    id: string;
                    name: any;
                    pieces: any;
                    aggregateSets?: any[];
                }) =>
                    relic.aggregateSets?.length
                        ? relic.name
                        : `[[relic:${relic.id}]] (${relic.pieces})`,

                relicSetsFile,
                lang,
                translator,
                sharedNoteGroups,
            ),

            mainstats: relics.mainstats
                ? collectMainStatNotes(
                    relics.mainstats.main_stats,
                    relicMainstatsFile,
                    lang,
                    translator,
                    sharedNoteGroups,
                )
                : [],

            substats: relics.substats
                ? collectStatNotes(
                    relics.substats.substats_priority,
                    (stat: { name: any }) => stat.name,
                    relicSubstatsFile,
                    lang,
                    translator,
                    sharedNoteGroups,
                )

                : [],
        },

        traces: {
            global: collectSectionNotes(
                traces,
                tracesFile,
                lang,
                translator,
            ),

            items: collectNotes(
                traces?.traces ?? [],

                (trace: {
                    name: any;
                }) => trace.name,

                tracesFile,
                lang,
                translator,
                sharedNoteGroups,
            ),
        },
        recommendedStats: {
            global: collectSectionNotes(
                recommendedStats,
                recommendedStatsFile,
                lang,
                translator,
            ),

            items: recommendedStats
                ? collectStatNotes(
                    recommendedStats.stats ?? [],
                    (stat: { name: any }) => stat.name,
                    recommendedStatsFile,
                    lang,
                    translator,
                    sharedNoteGroups,
                )
                : [],
        },
    };

    /*
     * Build-level notes
     */
    const buildNoteData = loadJSON(
        buildPath,
        'build-notes.json',
    );

    const rawBuildName =
        buildNoteData?.name?.[lang] ??
        buildNoteData?.name?.en ??
        buildName;

    return {
        name: translator.translateNoteText(
            rawBuildName,
            buildNotesFile,
        ),

        isBest:
            buildNoteData?.best === true,

        slug: buildName,

        lightCones,
        relics,
        recommendedStats,
        traces,
        notes,

        buildNote: buildLocalizedNotes(
            buildNoteData,
            buildNotesFile,
            lang,
            translator,
        ),
    };
}

/**
 * Builds all server-side data needed by the character page route.
 *
 * Resolves the character folder, loads metadata, normalizes every build, and
 * returns accumulated translation warnings so the page can forward them to the
 * browser console.
 */
export function getCharacterPageData({
    lang,
    characterPath,
    contentBase = path.resolve('src/content'),
}: CharacterPageDataOptions) {
    const character = normalizeCharacterParam(characterPath);

    if (!character) {
        throw new Error('Character parameter is required');
    }

    const currentLang = lang ?? 'en';
    const locale = getLocale(currentLang);
    const lightConeData =
        loadAllLightConeData();
    const relicSetData =
        loadRelicSetData();

    const translator =
        new TranslationHelper(
            locale,
            lightConeData,
            currentLang,
            relicSetData,
        );
    const characterSlug = character.toLowerCase();
    const slugParts = parsePublicCharacterSlug(characterSlug);
    const contentSlug = slugParts.character;
    const characterData =
        loadCharacterData(
            contentSlug,
            currentLang,
        );
    const foundPath = findCharacterPath(contentBase, characterSlug);

    if (!foundPath) {
        throw new Error('Character not found');
    }

    // Each child directory is treated as one playable build/role.
    const buildNames = fs
        .readdirSync(foundPath.path)
        .filter((fileName) =>
            fs.statSync(path.join(foundPath.path, fileName)).isDirectory(),
        );

    const translatedCharacterName = translator.translate(
        'character',
        contentSlug,
        'metadata.json',
    );

    const metadata = loadJSON(foundPath.path, 'metadata.json');
    const assetContext = {
        type: foundPath.type,
        rarity: foundPath.rarity,
        character: contentSlug,
        characterPath: foundPath.path,
    };
    const metadataWithAssets = {
        ...metadata,

        // The character's rarity comes from the content folder:
        // src/content/<type>/<rarity>/<character>
        rarity: foundPath.rarity,

        image: resolveCharacterAssetImage(assetContext, 'image'),
        portrait: resolveCharacterAssetImage(assetContext, 'portrait'),
    };

    return {
        characterSlug,
        characterData,
        characterName:
            translatedCharacterName !== contentSlug
                ? translatedCharacterName
                : toTitleCase(contentSlug),
        metadata: metadataWithAssets,
        type: foundPath.type,
        lang: currentLang,
        locale,
        builds: buildNames
            .map((buildName) =>
                loadBuildData({
                    buildPath: path.join(
                        foundPath.path,
                        buildName,
                    ),
                    buildName,
                    pathName: metadata.path,
                    lang: currentLang,
                    locale,
                    translator,
                    relicSetData,
                }),
            )
            .sort(
                (a, b) =>
                    Number(b.isBest) -
                    Number(a.isBest),
            ),
        warnings: translator.getWarnings(),
    };
}
