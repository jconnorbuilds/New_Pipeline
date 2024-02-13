function separateThousands(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function separateThousandsOnInput(x) {
  let xInt = parseInt(x.replaceAll(',', ''));
  return xInt.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Parses a thousands-separated number from str -> int
const removeCommas = (numStr) => {
  return parseInt(numStr.replaceAll(',', ''));
};

/**
 * Get FX rates. The forexRates dict is passed from the backend and stored in a global variable.
 */
const getFXRates = (srcCurrency, trgtCurrency) => {
  return [forexRates[srcCurrency], forexRates[trgtCurrency]];
};

const theDate = () => new Date();

const currentDate = () => {
  const date = theDate();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return [year, month];
};

const thisYear = () => theDate().getFullYear();
const thisMonth = () => theDate().getMonth() + 1;

const dates = {
  currentDate,
  thisYear,
  thisMonth,
};

export {
  separateThousands,
  separateThousandsOnInput,
  removeCommas,
  getFXRates,
  dates,
};
export function createNewEl(tag, clsList, attrDict, textContent) {
  // TODO: implement kwargs to make more flexible
  const newEl = document.createElement(tag);

  clsList.forEach((cls) => newEl.classList.add(cls));
  if (attrDict)
    Object.entries(attrDict).forEach(([attrName, attrVal]) => {
      newEl.setAttribute(attrName, attrVal);
    });
  newEl.textContent = textContent;

  return newEl;
}
export const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]')
  ? document.querySelector('[name=csrfmiddlewaretoken]').value
  : null;

export function truncate(string, allowedLengthJp = 15, maxLength = 30) {
  // Function to count Japanese characters
  const countJapaneseCharacters = (str) => {
    // Regex checks for hiragana, katakana, most kanji, and full-width romaji
    const JPRegex =
      /[\u3040-\u309F\u30A0-\u30FF\uFF01-\uFF5E\u4E00-\u9FAF\u3400-\u4DBF]/gu;
    const matches = str.match(JPRegex);
    return matches ? matches.length : 0;
  };

  // Calculate the number of Japanese characters
  const jpCharCount = countJapaneseCharacters(string);
  const totalLength = string.length;

  // Truncate based on the number of JP + EN characters
  if (jpCharCount > allowedLengthJp) {
    return string.substring(0, allowedLengthJp) + '...';
  } else if (jpCharCount >= 10 && totalLength > 15) {
    return string.substring(0, 15) + '...';
  } else if (jpCharCount >= 5 && totalLength > 20) {
    return string.substring(0, 20) + '...';
  } else if (jpCharCount >= 2 && totalLength > 25) {
    return string.substring(0, 25) + '...';
  } else if (totalLength > maxLength) {
    return string.substring(0, maxLength) + '...';
  }
  // No truncation needed
  return string;
}
export const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
