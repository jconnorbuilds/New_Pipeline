import {
  separateThousands,
  separateThousandsOnInput,
  removeCommas,
  getFXRates,
} from './utils.js';

const currencyCalc = document.querySelector('#currencyCalc');
const calcInput = document.querySelector('#calcInput');
const calcResult = document.querySelector('#calcResult');
const source = document.querySelector('#calcFrom');
const target = document.querySelector('#calcTo');
const currencySelectors = currencyCalc.querySelectorAll('select');

const Calculator = (() => {
  /**
   *
   * @param {string[][]} currencyList
   */
  const setup = (currencyList) => {
    console.log(currencyList);
    const initialTargetCurrency = 'EUR';
    currencyList.forEach((currency) => {
      const sourceOption = document.createElement('option');
      sourceOption.value = currency[0];
      sourceOption.innerHTML = currency[1];

      const targetOption = sourceOption.cloneNode(true);
      if (targetOption.value === initialTargetCurrency) {
        targetOption.setAttribute('selected', 'selected');
      }
      currencyCalc.querySelector('#calcFrom').appendChild(sourceOption);
      currencyCalc.querySelector('#calcTo').appendChild(targetOption);
    });

    // Add event listeners to recalculate on input or when a different currency is selected
    calcInput.addEventListener('input', () =>
      handleCalcInput(calcInput, calcResult)
    );
    currencySelectors.forEach((currency) => {
      currency.addEventListener('change', () =>
        handleCalcInput(calcInput, calcResult)
      );
    });
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

  const zeroInputAndOutput = () => (
    (calcInput.value = 0), (calcResult.value = '0.00')
  );

  const handleCalcInput = (inputEl, outputEl) =>
    inputEl.value ? calculate(inputEl, outputEl) : zeroInputAndOutput();

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
