// Initialize the map with the desired zoom level and center
var map = L.map('map').setView([56.1304, -106.3468], 6);

// Add a basemap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Initialize the sidebar
var sidebar = L.control.sidebar({
    autopan: true,
    closeButton: true,
    container: 'sidebar',
    position: 'right'
}).addTo(map);

// Layer groups
var gridsLayer = L.geoJson(null, {
    style: function (feature) {
        return {
            color: '#000000',
            weight: 1,
            fillColor: 'transparent'
        };
    },
    onEachFeature: function (feature, layer) {
        layer.on('click', function(e) {
            console.log('Grid clicked:', feature.properties);
            displayGridInfo(feature.properties);
        });
        if (feature.properties && feature.properties.Grid) {
            layer.bindTooltip(feature.properties.Grid, {
                permanent: true,
                direction: 'center',
                className: 'grid-label'
            });
        }
    }
}).addTo(map);

// Load GeoJSON data
fetch('https://your-backend-url.com/path-to-backend/grids.geojson')
    .then(response => response.json())
    .then(data => {
        gridsLayer.addData(data);
    })
    .catch(error => console.error('Error loading grids.geojson:', error));

// Function to display grid information
function displayGridInfo(properties) {
    const hiddenFields = ['OBJECTID', 'Shape_Length', 'Shape_Area'];
    let content = `<p><strong>Grid:</strong> ${properties.Grid}</p>`;
    for (let key in properties) {
        if (!hiddenFields.includes(key)) {
            content += `<p><strong>${key}:</strong> <input type="text" id="grid-${key}" value="${properties[key]}" /></p>`;
        }
    }
    content += `
        <button onclick="addField('${properties.Grid}')">Add Field</button>
        <button onclick="saveGridInfo('${properties.Grid}')">Save</button>
        <button onclick="deleteField('${properties.Grid}')">Delete Field</button>
    `;
    document.getElementById('grid-info-content').innerHTML = content;
    openSidebar();
}

// Function to add a new field to the grid information
function addField(gridId) {
    Swal.fire({
        title: 'Enter the name of the new field:',
        input: 'text',
        showCancelButton: true,
        confirmButtonText: 'Add'
    }).then((result) => {
        if (result.isConfirmed && result.value) {
            const fieldName = result.value;
            Swal.fire({
                title: `Enter the value for ${fieldName}:`,
                input: 'text',
                showCancelButton: true,
                confirmButtonText: 'Add'
            }).then((result) => {
                if (result.isConfirmed && result.value !== null) {
                    const fieldValue = result.value;
                    const newField = {};
                    newField[fieldName] = fieldValue;
                    fetch(`https://your-backend-url.com/api/grids/name/${gridId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(newField)
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json();
                    })
                    .then(data => {
                        displayGridInfo(data.attributes);
                        Swal.fire('Success', 'Field added successfully!', 'success');
                    })
                    .catch(error => {
                        console.error('Error adding field:', error);
                        Swal.fire('Error', 'Failed to add field.', 'error');
                    });
                }
            });
        }
    });
}

// Function to save grid information
function saveGridInfo(gridId) {
    const inputs = document.querySelectorAll('#grid-info-content input[type="text"]');
    const newInfo = {};
    inputs.forEach(input => {
        const key = input.id.replace('grid-', '');
        newInfo[key] = input.value;
    });
    fetch(`https://your-backend-url.com/api/grids/name/${gridId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newInfo)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        Swal.fire('Success', 'Grid information updated successfully!', 'success');
    })
    .catch(error => {
        console.error('Error saving grid info:', error);
        Swal.fire('Error', 'Failed to update grid information.', 'error');
    });
}

// Function to delete a field from the grid information
function deleteField(gridId) {
    Swal.fire({
        title: 'Enter the name of the field to delete:',
        input: 'text',
        showCancelButton: true,
        confirmButtonText: 'Delete'
    }).then((result) => {
        if (result.isConfirmed && result.value) {
            const fieldName = result.value;
            fetch(`https://your-backend-url.com/api/grids/name/${gridId}/${fieldName}`, {
                method: 'DELETE'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                displayGridInfo(data.attributes);
                Swal.fire('Success', 'Field deleted successfully!', 'success');
            })
            .catch(error => {
                console.error('Error deleting field:', error);
                Swal.fire('Error', 'Failed to delete field.', 'error');
            });
        }
    });
}

// Function to open the sidebar
function openSidebar() {
    var sidebarElement = document.getElementById('sidebar');
    sidebarElement.classList.remove('collapsed');
    var sidebarPane = document.getElementById('info');
    sidebarPane.classList.add('active');
}

// Function to close the sidebar
function closeSidebar() {
    var sidebarElement = document.getElementById('sidebar');
    sidebarElement.classList.add('collapsed');
    var sidebarPane = document.getElementById('info');
    sidebarPane.classList.remove('active');
}

// Add layer control
var baseLayers = {
    "Basemap": basemap
};

var overlays = {
    "Grids": gridsLayer,
    "Provinces of Interest": provincesOfInterestLayer,
    "Canada Provinces": canadaProvincesLayer
};

var layerControl = L.control.layers(baseLayers, overlays, { position: 'topleft' }).addTo(map);

// Add custom CSS for labels
var css = `
    .grid-label {
        color: black;
        font-weight: bold;
        background-color: transparent !important;
        border: none !important;
        padding: 0;
    }
`;
var style = document.createElement('style');
style.innerHTML = css;
document.head.appendChild(style);

// Function to add a new field to all grid features
async function addFieldToAllGrids() {
    const { value: fieldName } = await Swal.fire({
        title: 'Enter the name of the new field:',
        input: 'text',
        showCancelButton: true,
        confirmButtonText: 'Next'
    });

    if (!fieldName) {
        return;
    }

    const { value: fieldValue } = await Swal.fire({
        title: `Enter the value for ${fieldName}:`,
        input: 'text',
        showCancelButton: true,
        confirmButtonText: 'Add'
    });

    if (fieldValue === undefined) {
        return;
    }

    const response = await fetch('https://your-backend-url.com/api/grids/add-field-to-all', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            fieldName: fieldName,
            fieldValue: fieldValue
        })
    });

    const result = await response.json();
    if (response.ok) {
        Swal.fire('Success', 'Field added to all grid features successfully!', 'success');
        fetch('https://your-backend-url.com/path-to-backend/grids.geojson')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                gridsLayer.clearLayers();
                gridsLayer.addData(data);
                console.log('grids reloaded successfully');
            })
            .catch(error => {
                console.error('Error reloading grids.geojson:', error);
            });
    } else {
        Swal.fire('Error', 'Failed to add field to all grid features.', 'error');
    }
}

// Function to delete a field from all grid features
async function deleteFieldFromAllGrids() {
    const { value: fieldName } = await Swal.fire({
        title: 'Enter the name of the field to delete from all grids:',
        input: 'text',
        showCancelButton: true,
        confirmButtonText: 'Delete'
    });

    if (!fieldName) {
        return;
    }

    const response = await fetch(`https://your-backend-url.com/api/grids/delete-field-from-all/${fieldName}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        }
    });

    const result = await response.json();
    if (response.ok) {
        Swal.fire('Success', 'Field deleted from all grid features successfully!', 'success');
        fetch('https://your-backend-url.com/path-to-backend/grids.geojson')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                gridsLayer.clearLayers();
                gridsLayer.addData(data);
                console.log('grids reloaded successfully');
            })
            .catch(error => {
                console.error('Error reloading grids.geojson:', error);
            });
    } else {
        Swal.fire('Error', 'Failed to delete field from all grid features.', 'error');
    }
}

// Function to export grid information to an Excel file
function exportToTable() {
    fetch('https://your-backend-url.com/api/grids/export')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'grids.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            Swal.fire('Success', 'Exported grid information to Excel successfully!', 'success');
        })
        .catch(error => {
            console.error('Error exporting grid information:', error);
            Swal.fire('Error', 'Failed to export grid information.', 'error');
        });
}
