const compareText = (left, right) => left.localeCompare(right);
const versionNumber = (version) => {
    const number = Number.parseFloat(version);
    return Number.isFinite(number) ? number : Number.NEGATIVE_INFINITY;
};
const compareVersionNewest = (left, right) =>
    versionNumber(right) - versionNumber(left);
const value = (card, name) => card.dataset[name] ?? '';
const typeOrder = [
    'physical',
    'fire',
    'ice',
    'lightning',
    'wind',
    'quantum',
    'imaginary',
];

const typeRank = (type) => {
    const index =
        typeOrder.indexOf(type);

    return index === -1
        ? Number.MAX_SAFE_INTEGER
        : index;
};
export function compareCharacterCards(left, right, sort) {
    const pinnedFirst =
        Number(value(right, 'pinned') === 'true') -
        Number(value(left, 'pinned') === 'true');
    if (pinnedFirst) return pinnedFirst;

    const byName = compareText(value(left, 'name'), value(right, 'name'));

    if (sort === 'name') return byName;
    if (sort === 'rarity') {
        return (
            Number(value(right, 'rarity')) - Number(value(left, 'rarity')) || byName
        );
    }
    if (sort === 'release') {
        return (
            compareVersionNewest(
                value(left, 'versionReleased'),
                value(right, 'versionReleased'),
            ) || byName
        );
    }
    if (sort === 'updated') {
        return (
            compareVersionNewest(
                value(left, 'lastUpdated'),
                value(right, 'lastUpdated'),
            ) || byName
        );
    }

    return (
        typeRank(
            value(left, 'type'),
        ) -
        typeRank(
            value(right, 'type'),
        ) ||
        byName
    );
}
