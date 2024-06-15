// Initialize the map
var map = L.map('map').setView([56.1304, -106.3468], 4);

// Add a basemap
var basemap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Initialize the sidebar
var sidebar = L.control.sidebar({
    autopan: true,       // whether to maintain the centered map point when opening the sidebar
    closeButton: true,   // whether to add a close button to the pane
    container: 'sidebar', // the DOM container or #ID of a predefined sidebar container that should be used
    position: 'right'    // left or right
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
}).addTo(map);  // Add this layer to the map by default

var provincesOfInterestLayer = L.geoJson(null, {
    style: function (feature) {
        return {
            color: '#008000',
            weight: 5,
            fillColor: 'transparent'
        };
    }
}).addTo(map);  // Add this layer to the map by default

var canadaProvincesLayer = L.geoJson(null, {
    style: function (feature) {
        return {
            color: '#808080',
            weight: 1,
            fillColor: 'transparent'
        };
    }
}).addTo(map);  // Add this layer to the map by default

// Load GeoJSON data and set the map view to ProvincesOfInterest
fetch('ProvincesOfInterest.geojson')
    .then(response => response.json())
    .then(data => {
        provincesOfInterestLayer.addData(data);
        map.fitBounds(provincesOfInterestLayer.getBounds());
    });

fetch('grids.geojson')
    .then(response => response.json())
    .then(data => {
        gridsLayer.addData(data);
    });

fetch('CanadaProvinces.geojson')
    .then(response => response.json())
    .then(data => canadaProvincesLayer.addData(data));

// Create custom control container for dropdown and search bar
var customSearchControl = L.Control.extend({
    onAdd: function(map) {
        var div = L.DomUtil.create('div', 'custom-search-control');
        div.innerHTML = `
            <input type="text" id="search-input" placeholder="Search..." />
            <select id="search-type">
                <option value="grid">Grid</option>
                <option value="address">Address</option>
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
            var found = false;
            gridsLayer.eachLayer(function(layer) {
                if (layer.feature.properties.Grid === searchText) {
                    map.fitBounds(layer.getBounds());
                    displayGridInfo(layer.feature.properties);
                    found = true;
                }
            });
            if (!found) {
                alert('Grid not found');
            }
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
    fetch(`https://grid-info-backend.onrender.com/api/grids/${properties.OBJECTID}`)
        .then(response => response.json())
        .then(grid => {
            var content = `
                <p><strong>Grid:</strong> ${grid.attributes.Grid}</p>
                <p><strong>Info:</strong> <input type="text" id="grid-info" value="${grid.attributes.Info || ''}" /></p>
                <button onclick="saveGridInfo('${grid.attributes.OBJECTID}')">Save</button>
            `;
            document.getElementById('grid-info-content').innerHTML = content;
            sidebar.open('info');
        });
}

// Function to save grid information
function saveGridInfo(gridId) {
    var newInfo = document.getElementById('grid-info').value;
    fetch(`https://grid-info-backend.onrender.com/api/grids/${gridId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ Info: newInfo })
    })
    .then(response => response.json())
    .then(data => {
        alert('Grid information updated successfully!');
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to update grid information.');
    });
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

var layerControl = L.control.layers(baseLayers, overlays, { position: 'topleft' }).addTo(map);  // Add the layer control after the search control

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
