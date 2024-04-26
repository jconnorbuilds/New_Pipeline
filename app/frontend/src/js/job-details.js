const jobExtensionSearch = document.querySelector('#job-extension-search');
const jobList = document.querySelector('.job-extension__job-list');
const menuToggle = document.querySelector('.job-extension .menu-toggle');
const jobExtensionForm = document.querySelector('#job-extension-form');

const filterJobs = (e) => {
  const searchString = e.target.value.toUpperCase();
  const jobLi = jobList.querySelectorAll('li');
  jobLi.forEach((job) => {
    let jobDisplayName = job.querySelector('a').textContent.toUpperCase();
    job.style.display = !jobDisplayName.includes(searchString)
      ? 'none'
      : 'list-item';
  });
};

const _toggleIcon = (isOpen) => {
  let icon = menuToggle.querySelector('i');
  icon.classList = isOpen ? 'bi bi-caret-down-fill' : 'bi bi-caret-right-fill';
};

const toggleMenu = (e) => {
  let formIsShown = !jobExtensionForm.classList.toggle('d-none');

  _toggleIcon(formIsShown);
  if (formIsShown) jobExtensionSearch.focus();
};

menuToggle.addEventListener('click', toggleMenu);

jobExtensionSearch.addEventListener('keyup', filterJobs);
