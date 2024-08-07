'use strict';

export const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]')
  ? document.querySelector('[name=csrfmiddlewaretoken]').value
  : null;

const separateThousands = (x) => {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const separateThousandsOnInput = (x) => {
  let xInt = parseInt(x.replaceAll(',', ''));
  return xInt.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Parses a thousands-separated number from str -> int
const removeCommas = (numStr) => {
  return parseInt(numStr.replaceAll(',', ''));
};

const getFXRatesDict = async () => {
  const data = await fetch('/pipeline/forex-rates')
    .then((response) => response.json())
    .catch((err) => console.error("Couldn't get the FX rates! ", err));

  return data;
};

const CURRENCY_SYMBOLS = {
  JPY: '¥',
  USD: '$',
  CAD: 'CA$',
  AUD: 'AU$',
  EUR: '€',
  GBP: '£',
  THB: '฿',
};

const getDate = () => new Date();

const dates = {
  currentDate: () => {
    const date = getDate();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return [year, month];
  },
  thisYear: () => getDate().getFullYear(),
  thisMonth: () => getDate().getMonth() + 1,
};

const truncate = (string, maxLength = 30) => {
  // Function to count Japanese characters
  const allowedLengthJp = Math.round(maxLength * 0.5);

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
  } else if (jpCharCount >= maxLength * 0.66 && totalLength > maxLength * 0.5) {
    return string.substring(0, Math.round(maxLength * 0.5)) + '...';
  } else if (jpCharCount >= maxLength * 0.33 && totalLength > maxLength * 0.33) {
    return string.substring(0, maxLength * 0.33) + '...';
  } else if (jpCharCount >= maxLength * 0.125 && totalLength > maxLength * 0.83) {
    return string.substring(0, Math.round(maxLength * 0.83)) + '...';
  } else if (totalLength > maxLength) {
    return string.substring(0, maxLength) + '...';
  }

  // No truncation needed
  return string;
};

const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

const createElement = (type, options = {}) => {
  const element = document.createElement(type);

  // classes, attributes, text, children, id, data,
  if (options.classes) {
    typeof options.classes === 'string'
      ? element.classList.add(options.classes)
      : element.classList.add(...options.classes);
  }

  if (options.attributes) {
    Object.keys(options.attributes).forEach((key) => {
      element.setAttribute(key, options.attributes[key]);
    });
  }

  if (options.text) element.textContent = options.text;

  if (options.children) {
    options.children.forEach((child) => {
      element.appendChild(createElement(...child));
    });
  }

  if (options.id) element.id = options.id;

  if (options.data) {
    Object.keys(options.data).forEach((key) => {
      element.dataset[key] = options.data[key];
    });
  }

  return element;
};

export {
  separateThousands,
  separateThousandsOnInput,
  removeCommas,
  stripTags,
  getFXRatesDict,
  dates,
  csrftoken as CSRFTOKEN,
  truncate,
  slugify,
  createElement,
  CURRENCY_SYMBOLS,
};
function stripTags(html) {
  return new DOMParser().parseFromString(html, 'text/html').body.textContent;
}
