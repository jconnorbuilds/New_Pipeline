const jobExtensionSearch = document.querySelector('#job-extension-search');
const jobList = document.querySelector('.job-extension__job-list');
const menuToggle = document.querySelector('.job-extension .menu-toggle');
const jobExtensionForm = document.querySelector('#job-extension-form');

const filterJobs = (e) => {
  const searchString = e.target.value.toUpperCase();
  try {
    const jobLi = jobList?.querySelectorAll('li');
    if (!jobLi) throw new Error(`Wasn't able to load the job list!`);
    jobLi.forEach((job) => {
      let jobDisplayName = job.querySelector('a').textContent.toUpperCase();
      job.style.display = !jobDisplayName.includes(searchString)
        ? 'none'
        : 'list-item';
    });
  } catch (error) {
    console.error(error.message);
  }
};

const _toggleIcon = (isOpen) => {
  let icon = menuToggle.querySelector('i');
  icon.classList = isOpen ? 'bi bi-caret-down-fill' : 'bi bi-caret-right-fill';
};

const _createJobList = (jobDataJson) => {
  jobList.innerHTML = '';
  jobDataJson.forEach((job) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = `${job.job_name} ${job.job_code}`;
    a.dataset.jobId = job.id;
    li.appendChild(a);
    jobList.appendChild(li);

    // Add event listener to create input and submit form
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'is_extension_of';
      input.value = a.dataset.jobId;
      jobExtensionForm.appendChild(input);
      jobExtensionForm.submit();
    });
  });
};

const toggleMenu = (e) => {
  let formIsShown = !jobExtensionForm.classList.toggle('d-none');

  _toggleIcon(formIsShown);
  if (formIsShown) {
    fetch('/pipeline/ajax/get_job_list/')
      .then((response) => response.json())
      .then((data) => _createJobList(data));

    jobExtensionSearch.focus();
  }
};

menuToggle.addEventListener('click', toggleMenu);
jobExtensionSearch.addEventListener('keyup', filterJobs);
