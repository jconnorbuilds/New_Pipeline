import {
  separateThousands,
  separateThousandsOnInput,
  removeCommas,
  getFXRates,
} from './utils.js/index.js';

const currencyCalc = /** @type {HTMLInputElement} */ (
  document.querySelector('#currencyCalc')
);
const calcInput = document.querySelector('#calcInput');
const calcResult = document.querySelector('#calcResult');
const source = /** @type {HTMLInputElement} */ (document.querySelector('#calcFrom'));
const target = /** @type {HTMLInputElement} */ (document.querySelector('#calcTo'));
const currencySelectors =
  /** @type {HTMLInputElement[]} */ currencyCalc.querySelectorAll('select');

const Calculator = (() => {
  /**
   * @param {string[][]} currencyList
   */
  const setup = (currencyList) => {
    console.log(currencyList);
    const initialTargetCurrency = 'EUR';
    currencyList.forEach((currency) => {
      const sourceOption = document.createElement('option');
      sourceOption.value = currency[0];
      sourceOption.innerHTML = currency[1];

      const targetOption = document.createElement('option');
      targetOption.value = currency[0];
      targetOption.innerHTML = currency[1];

      if (targetOption.value === initialTargetCurrency) {
        targetOption.setAttribute('selected', 'selected');
      }
      if (source && target) {
        source.appendChild(sourceOption);
        target.appendChild(targetOption);
      } else {
        console.warn("source and target elements aren't defined!");
      }
    });

    // Add event listeners to recalculate on input or when a different currency is selected
    if (calcInput) {
      calcInput.addEventListener('input', () =>
        handleCalcInput(calcInput, calcResult)
      );
      currencySelectors.forEach((currency) => {
        currency.addEventListener('change', () =>
          handleCalcInput(calcInput, calcResult)
        );
      });
    } else {
      console.warn("calcInput not defined, couldn't add event listeners!");
    }
  };

  /**
   * Calculates the amount in the target currency based on the value provided for the source currency.
   *
   * @param {string} inputVal - A thousands-separated string representation of a number
   * @param {number} srcRate - Exchange rate of the source currency
   * @param {number} trgtRate - Exchange rate of the target currency
   * @returns {number} - The commaless result, the amount in the target currency.
   */
  const evaluate = (inputVal, srcRate, trgtRate) =>
    (removeCommas(inputVal) * (srcRate / trgtRate)).toFixed(2);

  /**
   *
   * @param {*} input
   * @param {*} output
   * @returns
   */
  const zeroInputAndOutput = (input, output) => (
    (input.value = 0), (output.value = '0.00')
  );

  const handleCalcInput = (inputEl, outputEl) =>
    inputEl.value
      ? calculate(inputEl, outputEl)
      : zeroInputAndOutput(inputEl, outputEl);

  const calculate = (input, output) => {
    input.value = separateThousandsOnInput(input.value);
    output.value = separateThousands(
      evaluate(input.value, ...getFXRates(source.value, target.value))
    );
    return output.value;
  };

  return { setup };
})();

export { Calculator };
