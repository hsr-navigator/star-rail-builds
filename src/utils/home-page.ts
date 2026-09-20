import fs from 'fs';
import path from 'path';
import {
    getPublicCharacterName,
    getPublicCharacterSlug,
} from './character-slugs';
import { resolveCharacterAssetImage } from './character-assets';
import { readJSONFile, toTitleCase } from './content';
import { getCharacterBuilds, getContentCharacters } from './content-tree';
import { getLocale } from './i18n';
import { TranslationHelper } from './translator';

function normalizeVersion(version: unknown) {
    return typeof version === 'string'
        ? version
            .trim()
            .replace(/\s*\/\s*/g, ' / ')
            .replace(/\s+/g, ' ')
        : '';
}

function getRecentChangelogVersions(contentPath: string) {
    const changelogPath = path.join(contentPath, 'site', 'changelog.json');

    if (!fs.existsSync(changelogPath)) {
        return [];
    }

    const changelog = readJSONFile(changelogPath);

    return (changelog?.groups ?? [])
        .slice(0, 2)
        .map((group: any) => normalizeVersion(group.version))
        .filter(Boolean);
}

function getBuildSummaries(
    characterPath: string,
    lang: string,
    translator: TranslationHelper,
) {
    return getCharacterBuilds(characterPath).map((build) => {
        const buildNotesPath = path.join(build.path, 'build-notes.json');
        const buildNoteData = fs.existsSync(buildNotesPath)
            ? readJSONFile(buildNotesPath)
            : null;
        const rawBuildName =
            buildNoteData?.name?.[lang] ??
            buildNoteData?.name?.en ??
            toTitleCase(build.name);

        return {
            name: translator.translateNoteText(rawBuildName, buildNotesPath),
        };
    });
}

/**
 * Builds the localized character list used by the home page.
 *
 * The content directory is the source of truth: type, rarity, and slug come
 * from folder names, Path comes from metadata.json, and images come from
 * src/assets/character-assets.
 *
 * @param lang Requested language code.
 * @returns Characters plus the matching locale bundle.
 */
export function getHomePageData(lang = 'en') {
    const locale = getLocale(lang);
    const contentPath = path.join(process.cwd(), 'src', 'content');
    const translator = new TranslationHelper(locale, {}, lang);
    const recentVersions = getRecentChangelogVersions(contentPath);

    const characters = getContentCharacters(contentPath, true)
        .map(({ character, characterPath, type, metadataPath, rarity }) => {
            const metadata = readJSONFile(metadataPath);
            const assetContext = {
                type,
                rarity,
                character,
                characterPath,
            };
            const name = getPublicCharacterName(locale, {
                character,

            });
            const lastUpdated = normalizeVersion(metadata.last_updated);
            const versionReleased = normalizeVersion(metadata.version_released);

            return {
                name,
                slug: getPublicCharacterSlug({
                    character,

                }),
                type,
                rarity,
                path: metadata.path,
                lastUpdated,
                versionReleased,
                isWip: lastUpdated.toUpperCase() === 'WIP',
                isRecentlyUpdated: recentVersions.includes(lastUpdated),
                portrait: resolveCharacterAssetImage(assetContext, 'portrait'),
                builds: getBuildSummaries(characterPath, lang, translator),
            };
        })
        .sort((a, b) => {
            const leftVersion =
                Number.parseFloat(a.versionReleased);

            const rightVersion =
                Number.parseFloat(b.versionReleased);

            const safeLeft =
                Number.isFinite(leftVersion)
                    ? leftVersion
                    : Number.NEGATIVE_INFINITY;

            const safeRight =
                Number.isFinite(rightVersion)
                    ? rightVersion
                    : Number.NEGATIVE_INFINITY;

            return (
                safeRight - safeLeft ||
                a.name.localeCompare(b.name)
            );
        });

    const recentlyUpdatedCharacters = characters.filter(
        (character) => character.isRecentlyUpdated,
    );

    return {
        characters,
        recentVersions,
        recentlyUpdatedCharacters,
        lang,
        locale,
    };
}
