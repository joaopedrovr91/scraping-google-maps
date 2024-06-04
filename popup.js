document.addEventListener('DOMContentLoaded', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        var currentTab = tabs[0];
        var actionButton = document.getElementById('actionButton');
        var downloadCsvButton = document.getElementById('downloadCsvButton');
        var resultsTable = document.getElementById('resultsTable');
        var filenameInput = document.getElementById('filenameInput');

        if (currentTab && currentTab.url.includes("://www.google.com/maps/search")) {
            document.getElementById('message').textContent = "Vamos capturar os dados";
            actionButton.disabled = false;
            actionButton.classList.add('enabled');
        } else {
            var messageElement = document.getElementById('message');
            messageElement.innerHTML = '';
            var linkElement = document.createElement('a');
            linkElement.href = 'https://www.google.com/maps/search/';
            linkElement.textContent = "Vai para o Google Maps";
            linkElement.target = '_blank'; 
            messageElement.appendChild(linkElement);

            actionButton.style.display = 'none'; 
            downloadCsvButton.style.display = 'none';
            filenameInput.style.display = 'none'; 
        }

        actionButton.addEventListener('click', function() {
            chrome.scripting.executeScript({
                target: {tabId: currentTab.id},
                function: scrapeData
            }, function(results) {
                while (resultsTable.firstChild) {
                    resultsTable.removeChild(resultsTable.firstChild);
                }

                // Define and add headers to the table
                const headers = ['Phone Number'];
                const headerRow = document.createElement('tr');
                headers.forEach(headerText => {
                    const header = document.createElement('th');
                    header.textContent = headerText;
                    headerRow.appendChild(header);
                });
                resultsTable.appendChild(headerRow);

                // Add new results to the table
                if (!results || !results[0] || !results[0].result) return;
                results[0].result.forEach(function(item) {
                    var row = document.createElement('tr');
                    var cell = document.createElement('td');
                    cell.textContent = item.phone || ''; 
                    row.appendChild(cell);
                    resultsTable.appendChild(row);
                });

                if (results && results[0] && results[0].result && results[0].result.length > 0) {
                    downloadCsvButton.disabled = false;
                }
            });
        });

        downloadCsvButton.addEventListener('click', function() {
            // Verifica se os dados estão prontos
            if (downloadCsvButton.disabled) {
                alert('Por favor, colete os dados primeiro antes de baixar o arquivo CSV.');
            } else {
                // Coleta os dados da tabela e inicia o download do arquivo CSV
                var csv = tableToCsv(resultsTable); 
                var filename = filenameInput.value.trim();
                if (!filename) {
                    filename = 'google-maps-phone-numbers.csv'; 
                } else {
                    filename = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.csv';
                }
                downloadCsv(csv, filename); 
            }
        });

    });
});

function scrapeData() {
    var links = Array.from(document.querySelectorAll('a[href^="https://www.google.com/maps/place"]'));
    return links.map(link => {
        var container = link.closest('[jsaction*="mouseover:pane"]');
        var phone = '';

        // Phone Numbers
        if (container) {
            var containerText = container.textContent || '';
            var phoneRegex = /\(?(\d{2})\)?\s?\d{4,5}-?\d{4}/;
            var phoneMatch = containerText.match(phoneRegex);
            phone = phoneMatch ? phoneMatch[0] : '';
        }

        // Return the data as an object
        return {
            phone: phone
        };
    });
}

function tableToCsv(table) {
    var csv = [];
    var rows = table.querySelectorAll('tr');
    
    if (rows.length === 0) {
        return ''; // Não há dados na tabela
    }

    // Add headers to the CSV
    var headers = ['Phone Number'];
    csv.push(headers.join(','));

    // Add data rows to the CSV
    for (var i = 1; i < rows.length; i++) {
        var cols = rows[i].querySelectorAll('td');
        var rowData = [];
        
        for (var j = 0; j < cols.length; j++) {
            rowData.push('"' + cols[j].innerText + '"');
        }
        csv.push(rowData.join(','));
    }
    return csv.join('\n');
}

// Download the CSV file
function downloadCsv(csv, filename) {
    var csvFile;
    var downloadLink;

    csvFile = new Blob([csv], {type: 'text/csv'});
    downloadLink = document.createElement('a');
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
}
