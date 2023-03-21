/**
 * BEGIN BOILERPLATE
 * We need this request boilerplate BS because I don't want to use jquery,
 * and SFCC blackboxes some logic to bind to XMLHttpRequests, and fetch
 * does not use XMLHttpRequests, so here we are
 */

function makeRequest(method, url, data = null) {
    return new Promise(function (resolve, reject) {
        const xhr = new XMLHttpRequest();

        xhr.open(method, url);

        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr.response);
            } else {
                reject({
                    status: xhr.status,
                    statusText: xhr.statusText
                });
            }
        };

        xhr.onerror = function () {
            reject({
                status: xhr.status,
                statusText: xhr.statusText
            });
        };

        xhr.send(data);
    });
}

/**
 * END BOILERPLATE
 */

(function () {
    // the catalogs display
    const catalogsDiv = document.getElementById('all-catalogs');
    const catalogsLoadingHtml = catalogsDiv.innerHTML;

    // the form that is submitted
    const form = document.getElementById('catalog-form');

    // submit form button
    const exportBtn = document.getElementById('export-btn');

    // the exports display
    const exportsDiv = document.getElementById('recent-exports');
    const exportsLoadingHtml = exportsDiv.innerHTML;

    // shown when a job is running
    const jobStatusDiv = document.getElementById('job-status');
    const jobState = jobStatusDiv.querySelector('strong');

    let interval;

    /**
     * Setup initial monitoring
     */
    makeRequest('get', window.catalogReducerUrls.checkJobStatus)
        .then((status) => {

            if (status.length) {
                jobStatusDiv.style.display = 'block';
                jobState.innerText = status;
                exportBtn.setAttribute('disabled', true);
                interval = setInterval(checkStatus, 1500);
            }
        })

    // display catalogs UI
    loadCatalogs();

    // display exports UI
    loadRecentExports();

    /**
     * Handle form submission
     */
    form.addEventListener('submit', exportCatalog);

    /**
     * Handle toggle of optional fields
     */
    form.querySelectorAll('.field-toggle')
        .forEach(el =>
            el.addEventListener('change', () => {
                el.closest('tr').nextElementSibling.style.display = el.checked ? 'table-row' : 'none';
            })
        );

    /**
     * Submit the form to trigger the catalog export job
     */
    function exportCatalog(e) {
        e.preventDefault();

        exportBtn.setAttribute('disabled', true);

        const data = new FormData();
        const mastercat = getCheckedValues(form.elements['mastercat']);

        if (!mastercat.length) {
            alert('You must select a master catalog');
            exportBtn.removeAttribute('disabled');
            return false;
        }

        data.append('mastercat', mastercat);
        data.append('storefrontcat', form.elements['storefrontcat'].value);
        data.append('noofprods', form.elements['noofprods'].value);
        data.append('onlineprods', form.elements['onlineprods'].checked);
        data.append('exportimages', form.elements['exportimages'].checked);
        data.append('imagesizes', form.elements['imagesizes'].value);
        data.append('exportpricebooks', form.elements['exportpricebooks'].checked);
        data.append('exportinventorylist', form.elements['exportinventorylist'].checked);
        data.append('prodids', form.elements['prodids'].value);

        jobStatusDiv.style.display = 'block';

        makeRequest('post', form.action, data)
            .then(state => {
                jobState.innerText = state;
                interval = setInterval(checkStatus, 1500);
            });
    }

    /**
     * Get the current state of the running job and update the DOM
     */
    function checkStatus() {
        makeRequest('get', window.catalogReducerUrls.checkJobStatus)
            .then(state => {
                if (!state.length) {
                    exportBtn.removeAttribute('disabled');
                    jobStatusDiv.style.display = 'none';

                    alert('Finished!');
                    clearInterval(interval);
                    loadRecentExports();
                } else {
                    jobState.innerText = state;
                }
            });
    }

    /**
     * Utility function to get all values for checked options
     *
     * @param inputs
     * @returns {*|string|string}
     */
    function getCheckedValues(inputs) {
        if (inputs instanceof RadioNodeList) {
            return Array.from(inputs)
                .filter(input => input.checked)
                .map(input => input.value)
                .join(',');
        }

        return inputs.checked ? inputs.value : '';
    }

    /**
     * Load the recent exports
     */
    function loadRecentExports() {
        exportsDiv.innerHTML = exportsLoadingHtml;

        makeRequest('post', window.catalogReducerUrls.showExports)
            .then(html => {
                exportsDiv.innerHTML = html;

                exportsDiv.querySelector('#catalog-list-refresh')
                    .addEventListener('click', loadRecentExports)
            });
    }

    /**
     * Load Catalogs
     */
    function loadCatalogs() {
        catalogsDiv.innerHTML = catalogsLoadingHtml;

        makeRequest('post', window.catalogReducerUrls.showAllCatalogs)
            .then(html => {
                catalogsDiv.innerHTML = html;

                catalogsDiv.querySelector('#catalogs-refresh-btn')
                    .addEventListener('click', () => loadCatalogs());
            });
    }
})();