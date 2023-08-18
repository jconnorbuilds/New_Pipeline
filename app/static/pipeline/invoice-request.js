const slugify = str =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

let hintWithInvoices = "Simply choose the matching job from the dropdown menu. When you've finished, click the Submit button below.";
let hintWithNoInvoices = "Files will appear here once you've added them."

var myDropzone;
Dropzone.options.invoiceUploadForm = {
    autoProcessQueue: false,
    uploadMultiple: true,
    parallelUploads: 10,
    maxFiles: 10,
    maxFilesize: 10,
    previewsContainer: ".dropzone-previews",
    clickable: false,
    thumbnailMethod: "contain",
    acceptedFiles: ".pdf", 
    addRemoveLinks: true, 
    dictDefaultMessage: "Drop them here!",
    
    // Set up the dropzone
    init: function() {
        myDropzone = this;
        // First change the button to actually tell Dropzone to process the queue.
        // this.element.querySelector("button[type=submit]").addEventListener("click", function(e) {
        $("#invoice-upload-btn").on("click", (e) => { 
          // Make sure that the form isn't actually being sent.
            e.preventDefault();
            e.stopPropagation();
            var allSelected = checkifAllJobsSelected();
            var noDuplicates = checkDuplicatesValidation();
            var rejectedFiles = myDropzone.getRejectedFiles.length;
            console.log(`allSelected: ${allSelected}`)
            console.log(`noDuplicates: ${noDuplicates}`)
            console.log(`rejectedFiles: ${rejectedFiles}`)
            if (allSelected && noDuplicates && !rejectedFiles) {
                myDropzone.processQueue();
            } else {
                // TODO: display helpful info on the screen instead of in the console
                console.log(`allSelected: ${allSelected}`)
                console.log(`noDuplicates: ${noDuplicates}`)
                console.log(`rejectedFiles: ${rejectedFiles}`)
            }
        });

        // Listen to the sendingmultiple event. In this case, it's the sendingmultiple event instead
        // of the sending event because uploadMultiple is set to true.
        this.on("sendingmultiple", function(files, xhr, formData) {
            const invoices = {};
            $("select").each(function () {
                const costId = $(this).val();
                const fileName = $(this).data("file-name");
                if (costId !== "0") {
                    invoices[costId] = fileName;
                };
            });
            formData.append("invoices", JSON.stringify(invoices))
          // Gets triggered when the form is actually being sent.
          // Hide the success button or the complete form.
          
        });
        this.on("successmultiple", function(files, response) {
          // Gets triggered when the files have successfully been sent.
          // Redirect user or notify of success.
          window.location.replace('../invoice-uploader/send-email/')

        });
        this.on("errormultiple", function(files, response,) {
          // Gets triggered when there was an error sending the files.
          // Maybe show form again, and notify user of error
            console.log(response);
            for (file of files) {
                $(`#${slugify(file.name)}-form`).remove();
            }
            if (myDropzone.getQueuedFiles().length == 0) { 
                $("#invoice-select-area").hide();
                if (myDropzone.getRejectedFiles().length == 0) {
                    $('#invoice-hint').text(hintWithNoInvoices);
                    $('.dz-message').show();
                }
            }
        });
        this.on("removedfile", function(file) {
            console.log('File removed!')
            validateFormsAndFiles()
            if (myDropzone.getQueuedFiles().length == 0) { 
                $('#invoice-hint').text(hintWithNoInvoices);
                $("#invoice-select-area").hide();
                if (myDropzone.getRejectedFiles().length == 0) {
                        $('.dz-message').show();
                }
            }
            $(`#${slugify(file.name)}-form`).remove();
        });
    }
}

// Functions for form and file validation
function validateFormsAndFiles() {
    /*
    To avoid having duplicates or bad files uploaded to the server
    and having to deal with them, this function checks
    to make sure all invoices are valid and accounted for with a 
    dropdown menu selection, and that there are no duplicates.
    It runs after every time a file is added, removed, or 
    a selection is made one of the dropdown menus.
    */
    let noDuplicates = checkDuplicatesValidation();
    let allSelected = checkifAllJobsSelected();

    console.log(`Rejected Files: ${myDropzone.getRejectedFiles().length}`)
    console.log(`Queued Files: ${myDropzone.getQueuedFiles().length}`)
    console.log(`noDuplicates: ${noDuplicates}`)
    if (myDropzone.getRejectedFiles().length == 0 
        && myDropzone.getQueuedFiles().length > 0
        && allSelected
        && noDuplicates) {
        $("#invoice-upload-btn").removeClass('disabled')
        return true
    } else if (myDropzone.getRejectedFiles().length > 0
    || (myDropzone.files.length == 0) 
    || noDuplicates == false 
    || allSelected == false) {
        $("#invoice-upload-btn").addClass('disabled')
        return false
    }
};

function checkDuplicatesValidation() {
    let dupChecker = [];
    let duplicates = []

    $('.invoice-select').each(function() {
        let currentVal = $(this).val();
        if (currentVal == "0") { 
            return;
        } else if (dupChecker.includes(currentVal)) {
            duplicates.push(currentVal)
        } else {
            dupChecker.push(currentVal);
        }
    });

    $('.invoice-select').each(function() {
        let currentVal = $(this).val();
        if (currentVal == "0") { 
            $(this).removeClass('is-valid');
            $(this).removeClass('is-invalid');
        } else if (duplicates.includes(currentVal)) {
            $(this).removeClass('is-valid');
            $(this).addClass('is-invalid');
        } else {
            $(this).removeClass('is-invalid');
            $(this).addClass('is-valid');
        }
    });

    console.log(`duplicates: ${duplicates}`)
    return duplicates.length === 0;
};

function checkifAllJobsSelected() {
    let allSelected = true;
    $('.invoice-select').each(function() {
        console.log(`SELECTED VALUE: ${$(this).val()}`)
        if ($(this).val() === "0") {
            allSelected = false;
            return false; // Exit the loop early if a zero value is found
      }
    })
    return allSelected;
};

function removeDuplicates(dropzone, file) {
    // If the name, size, and last modified date of the added file match an existing file, remove the file
    let _i, _len;
    for (_i = 0, _len = dropzone.files.length; _i < _len - 1; _i++) { // -1 to exclude current file
        if (dropzone.files[_i].name === file.name &&
            dropzone.files[_i].size === file.size &&
            dropzone.files[_i].lastModified.toString() === file.lastModified.toString()) {
            dropzone.removeFile(file);
        }
    };
}

$(document).ready(function(){
    console.log('Ready!');

    /* 
    Dynamic dropdown menu generation logic.
    When a file is uploaded, a dropdown is generated with all 
    costs that are awaiting invoices that are available to that vendor.
    */
    let myDropzone = new Dropzone("#invoice-upload-form");

    const costs = JSON.parse(window.costsJson);
    const jobs = window.jobsJson;
    const jobMap = {};

    for (const job of jobs) {
        // console.log(job)
        jobMap[job.pk] = {
            jobCode: job.job_code,
            jobName: job.job_name,
            display: job.job_code + " - (" + job.job_name + ")"
        };
    };

    let formNum = 0;
    let filenameList = [];
    myDropzone.on("addedfile", function(file) {
        formNum ++;
        $(".dz-message").hide();
        console.log(this);
        if (this.files.length) {
            removeDuplicates(this, file)
        };
        let invoiceSelect = $(`
            <div class="input-group mb-3 invoice-select-row" id="${slugify(file.name)}-form">
                <label for='invoice-select-${formNum}' class="input-group-text"><b>${file.name}</b></label>
                <select class='form-select invoice-select' id='invoice-select-${formNum}' required></select>
            </div>`);
        $("#invoice-select-area").append(invoiceSelect).show();
        $("#invoice-hint").text(hintWithInvoices);
        invoiceSelect.find('select').append("<option value=0>Select job</option>")
            .attr("data-file-name", file.name);
        for (const cost of costs) {
            if (cost.fields.vendor === window.vendorId) {
                const option = $("<option></option>")
                .val(cost.pk)
                .text(`PO# ${cost.fields.PO_number} - Job details: ${cost.fields.description} for ${jobMap[cost.fields.job].jobName}`);
                
                if (file.name.includes(cost.fields.PO_number) || 
                    file.name.includes(jobMap[cost.fields.job].jobCode)) {
                    option.attr('selected', true);
                }
                invoiceSelect.find('select').append(option)
            }
            if ($(`#invoice-select-${formNum} :selected`).val() !== "0") {
                $(`#invoice-select-${formNum}`).addClass('is-valid');
            }
        }
        // waits 50ms after adding a file because for some reason dropzone thinks the file is
        // rejected until the "accept" event occurs.
        setTimeout(function() {
            validateFormsAndFiles();
          }, 50);
    });
    // Use event delegation to handle dynamically-generated elements
    $("#invoice-select-area").on("change", ".invoice-select", function() {
        validateFormsAndFiles()
    });
});


