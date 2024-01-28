function separateThousands(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function separateThousandsOnInput(x) {
  let xInt = parseInt(x.replaceAll(',', ''));
  return xInt.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Parses a thousands-separated number from str -> int
/**
 *
 * @param {string} numStr
 * @returns {number}
 */
const removeCommas = (numStr) => {
  return parseInt(numStr.replaceAll(',', ''));
};

/**
 * Get FX rates. The forexRates dict is passed from the backend and stored in a global variable.
 *
 * @param {string} srcCurrency - Name of the source currency
 * @param {string} trgtCurrency - Name of the target currency
 * @param {Object.<string, number>} forexRates - A dict of exchange rates
 * @returns {[number, number]} - An array containing the exchange rates
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
