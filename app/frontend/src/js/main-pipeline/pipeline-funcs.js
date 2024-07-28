import { CSRFTOKEN } from '../utils.js';
import { showLoadingSpinner, hideLoadingSpinner } from './pipeline-ui-funcs.js';
import { plTable } from './pipeline-dt.js';
import createAndInitializeToast from '../toast-notifs.js';

const displayErrorMessage = (message) => {
  // TODO: actually dislpay the message on screen?
  console.error(message);
};

const NewClientForm = (() => {
  const el = document.querySelector('#new-client-modal');
  const init = () => el.modal();

  return {
    el,
    init,
  };
})();

export const _fetchRevenueData = async (year, month) => {
  try {
    const response = await fetch(`/pipeline/revenue-data/${year}/${month}/`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.log(error);
  }
};

const createSuccessToast = (response) => {
  return createAndInitializeToast({
    headerText: 'Job created',
    bodyText: response.data.job_name,
    id: 'toast-successful-job-created',
  });
};

const handleSuccessfulSubmission = (data, form) => {
  if (data.status === 'success') {
    form.classList.remove('was-validated');
    plTable.refresh();
    createSuccessToast(data).show();
    form.reset();
  } else {
    console.alert('Form processing failed. Perhaps bad data was sent?');
    form.classList.add('was-validated');
  }
};

const handleFormSubmission = async (e) => {
  showLoadingSpinner();
  e.preventDefault();
  try {
    const jobForm = document.querySelector('#job-form');
    const formData = new FormData(jobForm);
    const response = await fetch('/pipeline/job-add', {
      method: 'post',
      body: formData,
      headers: { 'X-CSRFToken': CSRFTOKEN },
    });
    const data = await response.json();
    handleSuccessfulSubmission(data, jobForm);
  } catch (error) {
    alert('Form submission failed: ', error);
  } finally {
    hideLoadingSpinner();
  }
};

export { displayErrorMessage, NewClientForm, handleFormSubmission };
