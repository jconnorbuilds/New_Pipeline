import {
  createToast,
  dropzoneErrorMessages,
  dropzoneMessages,
} from './invoice-uploader-view.js';
import { stripTags } from '../utils.js';
import { myDropzone } from './invoice-uploader.js';

export function getErrorMessageContent({
  responseCode,
  file = null,
  jobName = null,
  message = null,
} = {}) {
  const ERR_MESSAGES = {
    9999: { title: `Error`, message: `This is a default error message.` },
    9998: {
      title: `${jobName ? `${jobName}` : 'Error'}`,
      message: `This is an error with more details. ${file?.cleanName || ''}`,
    },
    5000: {
      title: `Unknown error: ${jobName}`,
      message: `${message}`,
    },
    1001: {
      title: `Couldn't add file${file ? `: ${file.cleanName}` : ''}`,
      message: `This file has already been added.`,
    },
    1002: {
      title: `Couldn't add file${file ? `: ${file.cleanName}` : ''}`,
      message: `A file with the same PO number has already been added.`,
    },
    1003: {
      title: `Couldn't add file${file ? `: ${file.cleanName}` : ''}`,
      message: `This file matches ${jobName}, but there's already an invoice attached to it. Please double check and try again.`,
    },
    1004: {
      title: `Couldn't add file${file ? `: ${file.cleanName}` : ''}`,
      message: `The PO# in the filename <span class="bold">(${
        file?.PONumber
      })</span> doesn't match the job you are attempting to submit it for <span class="bold">${
        jobName ? ` (${jobName})` : ''
      }</span>. To avoid payment issues, please double check the filename and try adding it again.`,
    },
    1101: {
      title: `${jobName}`,
      message: `This job already has an invoice attached! Please choose another job.`,
    },
    3001: {
      title: `File is too big (${Math.round(file.size / 1024 / 1024)}MiB)`,
      message: `Files must be smaller than 10MiB.`,
    },
    3002: {
      title: `Wrong file type`,
      message: `Files must be in .pdf or .jpg format.`,
    },
    3003: {
      title: `Upload cancelled`,
      message: `${file.cleanName}`,
    },
  };

  return (
    ERR_MESSAGES[responseCode] || {
      title: `Unhandled error: ${jobName}`,
      message: `The following error was encountered. Please try again or contact us for help: ${message}`,
    }
  );
}

export function displayErrorMessage(
  file = null,
  { responseCode = null, autoDeleteErrorMsg = null, jobName = null } = {},
) {
  const msg = getErrorMessageContent({ responseCode, file: file, jobName });
  const errorToast = createToast('error', msg);
  errorToast.dataset.filename = file?.cleanName;
  dropzoneMessages.append(errorToast);
  if (autoDeleteErrorMsg) fadeOut(errorToast);

  console.warn(stripTags(msg.message));
}

export function fadeOut(element) {
  // Currently uses 9s transition delay on the toast element. Maybe there's a better way?
  setTimeout(() => {
    element.classList.add('fade--transitioning');
    element.classList.remove('fade--shown');
  }, 10);

  setTimeout(() => element.remove(), 9500);
}
