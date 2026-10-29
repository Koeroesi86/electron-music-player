/** The items in a random order (Fisher-Yates), the list itself is left as it is */
export const shuffled = <T>(items: readonly T[], random: () => number = Math.random): T[] =>
  items.reduceRight<T[]>(
    (result, _, index) => {
      const other = Math.floor(random() * (index + 1));
      [result[index], result[other]] = [result[other], result[index]];
      return result;
    },
    [...items]
  );
