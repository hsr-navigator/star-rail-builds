import fs from 'node:fs';
import path from 'node:path';
import { readJSONFile } from './content';
const HSR_TYPES = new Set([
    'physical',
    'fire',
    'ice',
    'lightning',
    'wind',
    'quantum',
    'imaginary',
]);
const CHARACTER_DATA_PATH = path.resolve(
    'src/data/characters',
);
export type ContentCharacter = {
type: string;
    rarity: string;
    character: string;
    characterPath: string;
    metadataPath: string;
};

export function getContentCharacters(
    contentPath = path.resolve('src/content'),
    includeWip = false,
): ContentCharacter[] {
    if (!fs.existsSync(contentPath)) return [];

    return fs
        .readdirSync(contentPath, { withFileTypes: true })
        .filter(
            (entry) =>
                entry.isDirectory() &&
                HSR_TYPES.has(entry.name),
        )
        .flatMap((type) =>
            fs
                .readdirSync(path.join(contentPath, type.name), {
                    withFileTypes: true,
                })
                .filter((entry) => entry.isDirectory())
                .flatMap((rarity) =>
                    fs
                        .readdirSync(path.join(contentPath, type.name, rarity.name), {
                            withFileTypes: true,
                        })
                        .filter((entry) => entry.isDirectory())
                        .flatMap((character) => {
                            const characterPath = path.join(
                                contentPath,
                                type.name,
                                rarity.name,
                                character.name,
                            );
                            const metadataPath = path.join(
                                characterPath,
                                'metadata.json',
                            );

                            if (!fs.existsSync(metadataPath)) {
                                return [];
                            }

                            const characterDataPath = path.join(
                                CHARACTER_DATA_PATH,
                                `${character.name}.json`,
                            );

                            // A metadata-only character is considered staged.
                            // It will automatically become visible once its
                            // character data file is added.
                            if (!fs.existsSync(characterDataPath)) {
                                return [];
                            }

                            const metadata = readJSONFile(metadataPath);
                            if (metadata?.hidden === true) {
                                return [];
                            }

                            const isWip =
                                String(metadata?.last_updated ?? '')
                                    .trim()
                                    .toUpperCase() === 'WIP';

                            return isWip && !includeWip
                                ? []
                                : [
                                    {
                                        type: type.name,
                                        rarity: rarity.name,
                                        character: character.name,
                                        characterPath,
                                        metadataPath,
                                    },
                                ];
                        }),
                ),
        );
}

export function getCharacterBuilds(characterPath: string) {
    return fs
        .readdirSync(characterPath, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({
            name: entry.name,
            path: path.join(characterPath, entry.name),
        }));
}
