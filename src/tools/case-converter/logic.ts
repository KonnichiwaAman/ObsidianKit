export function toSentenceCase(value: string): string {
  return value.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, (character) => character.toUpperCase());
}

export function toTitleCase(value: string): string {
  return value.toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}

export function toAlternatingCase(value: string): string {
  return [...value]
    .map((character, index) => (index % 2 === 0 ? character.toLowerCase() : character.toUpperCase()))
    .join("");
}

export function toInverseCase(value: string): string {
  return [...value]
    .map((character) => {
      if (character.toLowerCase() === character.toUpperCase()) return character;
      return character === character.toUpperCase() ? character.toLowerCase() : character.toUpperCase();
    })
    .join("");
}
