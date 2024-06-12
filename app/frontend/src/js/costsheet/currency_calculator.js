import {
  separateThousands,
  separateThousandsOnInput,
  removeCommas,
  getFXRatesDictOld,
  createElement,
} from '../utils.js';

const calcInput = document.querySelector('#calcInput');
const calcResult = document.querySelector('#calcResult');
const source = document.querySelector('#calcFrom');
const target = document.querySelector('#calcTo');

const createOptionEl = (currency, initialCurrency) => {
  const el = createElement('option', {
    attributes: { value: currency },
    text: currency,
  });
  if (el.value === initialCurrency) el.setAttribute('selected', '');

  return el;
};

const evaluate = (inputVal, srcRate, trgtRate) =>
  (removeCommas(inputVal) * (srcRate / trgtRate)).toFixed(2);

const zeroInputAndOutput = (input, output) => (
  (input.value = 0), (output.value = '0.00')
);

const Calculator = (() => {
  /**
   * Initializes the calculator with currency symbols and their foreign exchange rates
   *
   * @param {Object.<string, number>} currencies // ex. { USD: 146.3242, ...}
   */
  const build = (fxRatesDict) => {
    Object.keys(fxRatesDict)
      .sort()
      .forEach((currency) => {
        const sourceOption = createOptionEl(currency, 'JPY');
        const targetOption = createOptionEl(currency, 'EUR');

        source.appendChild(sourceOption);
        target.appendChild(targetOption);
      });

    const handleCalcInput = (inputEl, outputEl) =>
      inputEl.value
        ? calculate(inputEl, outputEl)
        : zeroInputAndOutput(inputEl, outputEl);

    const calculate = (input, output) => {
      input.value = separateThousandsOnInput(input.value);
      output.value = separateThousands(
        evaluate(input.value, fxRatesDict[source.value], fxRatesDict[target.value]),
      );
      return output.value;
    };

    // Add event listeners to recalculate on input or when a different currency is selected
    calcInput.addEventListener('input', () => handleCalcInput(calcInput, calcResult));

    [source, target].forEach((selectEl) => {
      selectEl.addEventListener('change', () => handleCalcInput(calcInput, calcResult));
    });
  };

  const setup = () => {
    getFXRatesDictOld((fxRatesDict) => build(fxRatesDict));
  };

  return { setup };
})();

export default Calculator;
