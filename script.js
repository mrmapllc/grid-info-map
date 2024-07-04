// Initialize the map
var map = L.map('map').setView([56.1304, -106.3468], 6);

// Add a basemap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Layer for grids
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

// Load GeoJSON data from backend
fetch('https://your-backend-url.com/path-to-backend/grids.geojson')
    .then(response => response.json())
    .then(data => {
        gridsLayer.addData(data);
    })
    .catch(error => console.error('Error loading grids.geojson:', error));

// Function to display grid information
function displayGridInfo(properties) {
    let content = `<p><strong>Grid:</strong> ${properties.Grid}</p>`;
    for (let key in properties) {
        content += `<p><strong>${key}:</strong> ${properties[key]}</p>`;
    }
    document.getElementById('grid-info-content').innerHTML = content;
    openSidebar();
}

// Function to open the sidebar
function openSidebar() {
    var sidebarElement = document.getElementById('sidebar');
    sidebarElement.classList.remove('collapsed');
    var sidebarPane = document.getElementById('info');
    sidebarPane.classList.add('active');
}
