import {
  separateThousands,
  separateThousandsOnInput,
  removeCommas,
  getFXRates,
} from './utils.js/index.js';

const currencyCalc = document.querySelector('#currencyCalc');
const calcInput = document.querySelector('#calcInput');
const calcResult = document.querySelector('#calcResult');
const source = document.querySelector('#calcFrom');
const target = document.querySelector('#calcTo');
const currencySelectors = currencyCalc.querySelectorAll('select');

const Calculator = (() => {
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

  const evaluate = (inputVal, srcRate, trgtRate) =>
    (removeCommas(inputVal) * (srcRate / trgtRate)).toFixed(2);

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
