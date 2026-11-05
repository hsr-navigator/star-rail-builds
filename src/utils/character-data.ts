import fs from 'fs';
import path from 'path';

import { readJSONFile } from './content';

export type CharacterAbilityVariant = {
    type: string;
    name: string;

    tag?: string;

    id?: string;
    selector_label?: string;
    energy_gain?: number | string;
    energy_cost?: number | string;

    break?: number | string;
    break_main?: number | string;
    break_adjacent?: number | string;
    break_bounce?: number | string;
    break_aoe?: number | string;

    description?: string;
    description_template?: string;
    participant_id?: number | string;

    break_first_hit?: number | string;
    break_final_hit?: number | string;
    break_total?: number | string;

    min_level?: number;
    max_level?: number;
    default_level?: number;

    scaling?: Record<
        string,
        Array<number | string>
    >;
};

export type CharacterAbility = {
    type: string;
    name: string;

    tag?: string;
    variant_selector?: {
        label?: string;
    };
    energy_gain?: number | string;
    energy_cost?: number | string;

    break?: number | string;
    break_main?: number | string;
    break_adjacent?: number | string;
    break_bounce?: number | string;
    break_aoe?: number | string;
    participant_id?: number | string;

    break_first_hit?: number | string;
    break_final_hit?: number | string;
    break_total?: number | string;
    description?: string;
    min_level?: number;
    max_level?: number;
    default_level?: number;

    description_template?: string;

    scaling?: Record<
        string,
        Array<number | string>
    >;

    variants?: CharacterAbilityVariant[];
};
export type CharacterMemosprite = {
    name: string;

    initial_spd?: number | string;
    hp_source?: string;

    skills: Record<
        string,
        CharacterAbility
    >;
};

export type CharacterElation = {
    skills: Record<
        string,
        CharacterAbility
    >;
};

export type CharacterMajorTrace = {
    name: string;
    description: string;
};

export type CharacterStatBonus = {
    stat: string;
    value: string;
};

export type CharacterEidolon = {
    level: number;
    name: string;
    description: string;
};

export type CharacterGlobalPassive = {
    name: string;
    tag?: string;
    description: string;
};

type CharacterAffinityEidolon = Omit<CharacterEidolon, 'level'> & {
    tag?: string;
};

export type CharacterData = {
    id: string;
    name: string;
    rarity: number;
    type: string;
    path: string;

    version_released?: string;
    max_energy?: number | null;

    level_80_stats?: {
        hp?: number;
        atk?: number;
        def?: number;
        spd?: number;
    };

    abilities: Record<
        string,
        CharacterAbility
    >;

    memosprite?: CharacterMemosprite;
    elation?: CharacterElation;

    global_passives?: Record<
        string,
        CharacterGlobalPassive
    >;

    aha_buffs?: Record<string, CharacterGlobalPassive>;
    affinity_eidolon?: CharacterAffinityEidolon;
    hidden_kit_sections?: Array<'affinity_eidolon' | 'aha_buffs'>;
    major_traces: Record<
        string,
        CharacterMajorTrace
    >;

    stat_bonuses: CharacterStatBonus[];
    eidolons: CharacterEidolon[];
};

type AbilityTextTranslation = {
    type?: string;
    name?: string;
    tag?: string;

    energy_gain?: number | string;
    energy_cost?: number | string;

    break?: number | string;
    break_main?: number | string;
    break_adjacent?: number | string;
    break_bounce?: number | string;
    break_aoe?: number | string;
    break_first_hit?: number | string;
    break_final_hit?: number | string;
    break_total?: number | string;

    description?: string;
    description_template?: string;

    variant_selector?: {
        label?: string;
    };

    variants?: Array<{
        type?: string;
        name?: string;
        tag?: string;

        energy_gain?: number | string;
        energy_cost?: number | string;

        break?: number | string;
        break_main?: number | string;
        break_adjacent?: number | string;
        break_bounce?: number | string;
        break_aoe?: number | string;
        break_first_hit?: number | string;
        break_final_hit?: number | string;
        break_total?: number | string;

        selector_label?: string;

        description?: string;
        description_template?: string;
    }>;
};

type CharacterKitTranslation = {
    abilities?: Record<
        string,
        AbilityTextTranslation
    >;

    memosprite?: {
        name?: string;

        initial_spd?: number | string;
        hp_source?: string;

        skills?: Record<
            string,
            AbilityTextTranslation
        >;
    };

    elation?: {
        skills?: Record<
            string,
            AbilityTextTranslation
        >;
    };

    global_passives?: Record<string, Partial<CharacterGlobalPassive>>;
    aha_buffs?: Record<string, Partial<CharacterGlobalPassive>>;
    affinity_eidolon?: Partial<CharacterAffinityEidolon>;

    major_traces?: Record<
        string,
        {
            name?: string;
            description?: string;
        }
    >;

    stat_bonuses?: Array<{
        stat?: string;
    }>;

    eidolons?:
    | Record<
        string,
        {
            name?: string;
            description?: string;
        }
    >
    | Array<{
        level?: number;
        name?: string;
        description?: string;
    }>;
};

const characterDataPath = path.resolve(
    'src/data/characters',
);

const characterKitTranslationPath =
    path.resolve('src/i18n');

function localizeAbility(
    ability: CharacterAbility,
    translation?: AbilityTextTranslation,
): CharacterAbility {
    if (!translation) {
        return ability;
    }

    return {
        ...ability,

        type:
            translation.type ??
            ability.type,

        name:
            translation.name ??
            ability.name,

        tag:
            translation.tag ??
            ability.tag,


        energy_gain:
            translation.energy_gain ??
            ability.energy_gain,

        energy_cost:
            translation.energy_cost ??
            ability.energy_cost,

        break:
            translation.break ??
            ability.break,

        break_main:
            translation.break_main ??
            ability.break_main,

        break_adjacent:
            translation.break_adjacent ??
            ability.break_adjacent,

        break_bounce:
            translation.break_bounce ??
            ability.break_bounce,

        break_aoe:
            translation.break_aoe ??
            ability.break_aoe,

        break_first_hit:
            translation.break_first_hit ??
            ability.break_first_hit,

        break_final_hit:
            translation.break_final_hit ??
            ability.break_final_hit,

        break_total:
            translation.break_total ??
            ability.break_total,
        description:
            translation.description ??
            ability.description,

        description_template:
            translation.description_template ??
            ability.description_template,

        variant_selector:
            ability.variant_selector
                ? {
                    ...ability.variant_selector,
                    label:
                        translation
                            .variant_selector
                            ?.label ??
                        ability
                            .variant_selector
                            .label,
                }
                : ability.variant_selector,

        variants:
            ability.variants?.map(
                (variant, index) => {
                    const translatedVariant =
                        translation.variants?.[
                        index
                        ];

                    if (!translatedVariant) {
                        return variant;
                    }

                    return {
                        ...variant,

                        type:
                            translatedVariant.type ??
                            variant.type,

                        name:
                            translatedVariant.name ??
                            variant.name,

                        tag:
                            translatedVariant.tag ??
                            variant.tag,

                        energy_gain:
                            translatedVariant.energy_gain ??
                            variant.energy_gain,

                        energy_cost:
                            translatedVariant.energy_cost ??
                            variant.energy_cost,

                        break:
                            translatedVariant.break ??
                            variant.break,

                        break_main:
                            translatedVariant.break_main ??
                            variant.break_main,

                        break_adjacent:
                            translatedVariant.break_adjacent ??
                            variant.break_adjacent,

                        break_bounce:
                            translatedVariant.break_bounce ??
                            variant.break_bounce,

                        break_aoe:
                            translatedVariant.break_aoe ??
                            variant.break_aoe,

                        break_first_hit:
                            translatedVariant.break_first_hit ??
                            variant.break_first_hit,

                        break_final_hit:
                            translatedVariant.break_final_hit ??
                            variant.break_final_hit,

                        break_total:
                            translatedVariant.break_total ??
                            variant.break_total,

                        selector_label:
                            translatedVariant
                                .selector_label ??
                            variant
                                .selector_label,

                        description:
                            translatedVariant
                                .description ??
                            variant.description,

                        description_template:
                            translatedVariant
                                .description_template ??
                            variant
                                .description_template,
                    };
                },
            ),
    };
}

function getEidolonTranslation(
    eidolons:
        | CharacterKitTranslation['eidolons']
        | undefined,
    level: number,
) {
    if (!eidolons) {
        return undefined;
    }

    /*
     * Array format:
     *
     * "eidolons": [
     *   { "level": 1, ... },
     *   { "level": 2, ... }
     * ]
     */
    if (Array.isArray(eidolons)) {
        /*
         * Prefer matching the explicit level.
         */
        const byLevel = eidolons.find(
            (eidolon) =>
                eidolon.level === level,
        );

        if (byLevel) {
            return byLevel;
        }

        /*
         * Also support text-only arrays without
         * a "level" property.
         *
         * E1 = index 0
         * E2 = index 1
         * etc.
         */
        return eidolons[level - 1];
    }

    /*
     * Object format:
     *
     * "eidolons": {
     *   "1": {...},
     *   "2": {...}
     * }
     */
    return eidolons[String(level)];
}

function localizeKitEffects(
    effects: CharacterData['global_passives'],
    translations: CharacterKitTranslation['global_passives'],
) {
    if (!effects) return undefined;

    return Object.fromEntries(
        Object.entries(effects).map(([id, effect]) => [
            id,
            {
                ...effect,
                name: translations?.[id]?.name ?? effect.name,
                tag: translations?.[id]?.tag ?? effect.tag,
                description: translations?.[id]?.description ?? effect.description,
            },
        ]),
    );
}

function applyCharacterKitTranslation(
    character: CharacterData,
    translation: CharacterKitTranslation,
): CharacterData {
    return {
        ...character,

        abilities: Object.fromEntries(
            Object.entries(
                character.abilities ?? {},
            ).map(([id, ability]) => [
                id,
                localizeAbility(
                    ability,
                    translation.abilities?.[
                    id
                    ],
                ),
            ]),
        ),

        memosprite:
            character.memosprite
                ? {
                    ...character.memosprite,

                    name:
                        translation
                            .memosprite
                            ?.name ??
                        character
                            .memosprite
                            .name,
                    initial_spd:
                        translation
                            .memosprite
                            ?.initial_spd ??
                        character
                            .memosprite
                            .initial_spd,
                    hp_source:
                        translation
                            .memosprite
                            ?.hp_source ??
                        character
                            .memosprite
                            .hp_source,

                    skills:
                        Object.fromEntries(
                            Object.entries(
                                character
                                    .memosprite
                                    .skills ??
                                {},
                            ).map(
                                ([
                                    id,
                                    ability,
                                ]) => [
                                        id,
                                        localizeAbility(
                                            ability,
                                            translation
                                                .memosprite
                                                ?.skills?.[
                                            id
                                            ],
                                        ),
                                    ],
                            ),
                        ),
                }
                : undefined,

        elation:
            character.elation
                ? {
                    ...character.elation,

                    skills:
                        Object.fromEntries(
                            Object.entries(
                                character
                                    .elation
                                    .skills ??
                                {},
                            ).map(
                                ([
                                    id,
                                    ability,
                                ]) => [
                                        id,
                                        localizeAbility(
                                            ability,
                                            translation
                                                .elation
                                                ?.skills?.[
                                            id
                                            ],
                                        ),
                                    ],
                            ),
                        ),
                }
                : undefined,

        global_passives: localizeKitEffects(
            character.global_passives,
            translation.global_passives,
        ),

        aha_buffs: localizeKitEffects(
            character.aha_buffs,
            translation.aha_buffs,
        ),

        affinity_eidolon: character.affinity_eidolon && {
            tag: translation.affinity_eidolon?.tag ?? character.affinity_eidolon.tag,
            name: translation.affinity_eidolon?.name ?? character.affinity_eidolon.name,
            description:
                translation.affinity_eidolon?.description ?? character.affinity_eidolon.description,
        },

        major_traces:
            Object.fromEntries(
                Object.entries(
                    character.major_traces ??
                    {},
                ).map(([id, trace]) => {
                    const translated =
                        translation
                            .major_traces?.[
                        id
                        ];

                    return [
                        id,
                        {
                            ...trace,

                            name:
                                translated?.name ??
                                trace.name,

                            description:
                                translated
                                    ?.description ??
                                trace.description,
                        },
                    ];
                }),
            ),

        stat_bonuses:
            character.stat_bonuses.map(
                (bonus, index) => ({
                    ...bonus,

                    stat:
                        translation
                            .stat_bonuses?.[
                            index
                        ]?.stat ??
                        bonus.stat,
                }),
            ),

        eidolons:
            character.eidolons.map(
                (eidolon) => {
                    const translated =
                        getEidolonTranslation(
                            translation.eidolons,
                            eidolon.level,
                        );

                    return {
                        ...eidolon,

                        name:
                            translated?.name ??
                            eidolon.name,

                        description:
                            translated
                                ?.description ??
                            eidolon.description,
                    };
                },
            ),
    };
}

export function loadCharacterData(
    characterId: string,
    lang = 'en',
): CharacterData | null {
    const filePath = path.join(
        characterDataPath,
        `${characterId}.json`,
    );

    if (!fs.existsSync(filePath)) {
        return null;
    }

    const character =
        readJSONFile(
            filePath,
        ) as CharacterData;

    if (lang === 'en') {
        return character;
    }

    const translationFile =
        path.join(
            characterKitTranslationPath,
            lang,
            'character-kits',
            `${characterId}.json`,
        );

    if (!fs.existsSync(translationFile)) {
        return character;
    }

    const translation =
        readJSONFile(
            translationFile,
        ) as CharacterKitTranslation;

    return applyCharacterKitTranslation(
        character,
        translation,
    );
}

/**
 * Builds an ability description at a chosen
 * trace level.
 */
type ScalableAbility = {
    description?: string;
    description_template?: string;

    scaling?: Record<
        string,
        Array<number | string>
    >;
};

export function renderCharacterAbilityDescription(
    ability: ScalableAbility,
    requestedLevel?: number,
    minLevel = 1,
    defaultLevel = minLevel,
) {
    if (
        !ability.description_template ||
        !ability.scaling
    ) {
        return ability.description ?? '';
    }

    const level =
        requestedLevel ??
        defaultLevel;

    const index =
        level - minLevel;

    return ability.description_template.replace(
        /\{\{([a-zA-Z0-9_-]+)\}\}/g,
        (match, key: string) => {
            const value =
                ability.scaling?.[key]?.[
                index
                ];

            return value === undefined
                ? match
                : String(value);
        },
    );
}