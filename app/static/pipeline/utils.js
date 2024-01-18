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
export { separateThousands, separateThousandsOnInput, removeCommas, getFXRates };
