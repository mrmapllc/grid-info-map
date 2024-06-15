// Initialize the map
var map = L.map('map').setView([56.1304, -106.3468], 4);

// Add a basemap
var basemap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
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
        layer.on('click', function() {
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

var provincesOfInterestLayer = L.geoJson(null, {
    style: function (feature) {
        return {
            color: '#008000',
            weight: 5,
            fillColor: 'transparent'
        };
    }
}).addTo(map);

var canadaProvincesLayer = L.geoJson(null, {
    style: function (feature) {
        return {
            color: '#808080',
            weight: 1,
            fillColor: 'transparent'
        };
    }
}).addTo(map);

// Load GeoJSON data and set the map view to ProvincesOfInterest
fetch('ProvincesOfInterest.geojson')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        provincesOfInterestLayer.addData(data);
        map.fitBounds(provincesOfInterestLayer.getBounds());
        console.log('ProvincesOfInterest loaded successfully');
    })
    .catch(error => {
        console.error('Error loading ProvincesOfInterest.geojson:', error);
    });

fetch('grids.geojson')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        gridsLayer.addData(data);
        console.log('grids loaded successfully');
    })
    .catch(error => {
        console.error('Error loading grids.geojson:', error);
    });

fetch('CanadaProvinces.geojson')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        canadaProvincesLayer.addData(data);
        console.log('CanadaProvinces loaded successfully');
    })
    .catch(error => {
        console.error('Error loading CanadaProvinces.geojson:', error);
    });

// Create custom control container for dropdown and search bar
var customSearchControl = L.Control.extend({
    onAdd: function(map) {
        var div = L.DomUtil.create('div', 'custom-search-control');
        div.innerHTML = `
            <input type="text" id="search-input" placeholder="Search..." />
            <select id="search-type">
                <option value="address">Address</option>
                <option value="grid">Grid</option>
            </select>
        `;
        return div;
    }
});

map.addControl(new customSearchControl({ position: 'topright' }));

// Add geocoder control for address search
var geocoder = L.Control.Geocoder.nominatim();
var addressMarker;  // Marker for the searched address

// Handle search functionality
document.getElementById('search-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        var searchType = document.getElementById('search-type').value;
        var searchText = e.target.value;

        if (searchType === 'grid') {
            fetch(`https://grid-info-backend.onrender.com/api/grids/name/${searchText}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(grid => {
                    // Display grid info and center map on grid
                    displayGridInfo(grid.attributes);
                })
                .catch(error => {
                    console.error('Error fetching grid info:', error);
                    alert('Grid not found');
                });
        } else if (searchType === 'address') {
            geocoder.geocode(searchText, function(results) {
                if (results && results.length > 0) {
                    var result = results[0];
                    map.setView(result.center, 10);
                    if (result.bounds) {
                        map.fitBounds(result.bounds);
                    }
                    if (addressMarker) {
                        map.removeLayer(addressMarker);
                    }
                    addressMarker = L.marker(result.center).addTo(map)
                        .bindPopup(result.name)
                        .openPopup();

                    // Find and display the grid containing the address
                    gridsLayer.eachLayer(function(layer) {
                        if (layer.getBounds().contains(result.center)) {
                            displayGridInfo(layer.feature.properties);
                        }
                    });
                } else {
                    alert('Address not found');
                }
            });
        }
    }
});

// Function to display grid information in the sidebar and handle updates
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
    sidebar.open('info');
}

// Function to add a new field to the grid information
function addField(gridId) {
    const fieldName = prompt("Enter the name of the new field:");
    if (fieldName) {
        const fieldValue = prompt(`Enter the value for ${fieldName}:`);
        if (fieldValue !== null) {
            const newField = {};
            newField[fieldName] = fieldValue;
            fetch(`https://grid-info-backend.onrender.com/api/grids/name/${gridId}`, {
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
                alert('Field added successfully!');
            })
            .catch(error => {
                console.error('Error adding field:', error);
                alert('Failed to add field.');
            });
        }
    }
}

// Function to save grid information
function saveGridInfo(gridId) {
    const inputs = document.querySelectorAll('#grid-info-content input[type="text"]');
    const newInfo = {};
    inputs.forEach(input => {
        const key = input.id.replace('grid-', '');
        newInfo[key] = input.value;
    });
    fetch(`https://grid-info-backend.onrender.com/api/grids/name/${gridId}`, {
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
        alert('Grid information updated successfully!');
    })
    .catch(error => {
        console.error('Error saving grid info:', error);
        alert('Failed to update grid information.');
    });
}

// Function to delete a field from the grid information
function deleteField(gridId) {
    const fieldName = prompt("Enter the name of the field to delete:");
    if (fieldName) {
        fetch(`https://grid-info-backend.onrender.com/api/grids/name/${gridId}/${fieldName}`, {
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
            alert('Field deleted successfully!');
        })
        .catch(error => {
            console.error('Error deleting field:', error);
            alert('Failed to delete field.');
        });
    }
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
