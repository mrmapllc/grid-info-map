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

// Load GeoJSON data from the backend
fetch('https://your-backend-url.com/path-to-backend/grids.geojson')
    .then(response => response.json())
    .then(data => {
        gridsLayer.addData(data);
    })
    .catch(error => console.error('Error loading grids.geojson:', error));

// Add the rest of the functions as in the previous example

// Add search functionality back
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

var geocoder = L.Control.Geocoder.nominatim();
var addressMarker;

document.getElementById('search-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        var searchType = document.getElementById('search-type').value;
        var searchText = e.target.value;

        if (searchType === 'grid') {
            fetch(`https://your-backend-url.com/api/grids/name/${searchText}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(grid => {
                    displayGridInfo(grid.attributes);
                    gridsLayer.eachLayer(function(layer) {
                        if (layer.feature.properties.Grid === searchText) {
                            map.setView(layer.getBounds().getCenter(), 6);
                        }
                    });
                })
                .catch(error => {
                    console.error('Error fetching grid info:', error);
                    Swal.fire('Error', 'Grid not found', 'error');
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

                    gridsLayer.eachLayer(function(layer) {
                        if (layer.getBounds().contains(result.center)) {
                            displayGridInfo(layer.feature.properties);
                        }
                    });
                } else {
                    Swal.fire('Error', 'Address not found', 'error');
                }
            });
        }
    }
});
