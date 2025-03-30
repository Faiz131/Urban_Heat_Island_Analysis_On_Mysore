// Define the region of interest (Mysore, India)
var mysore = ee.Geometry.Point([76.6394, 12.2958]).buffer(50000); // Buffer around Mysore (50 km)

// Define the time range
var startDate = '2014-01-01';
var endDate = '2024-12-31';

// Load Sentinel-2 Image Collection (Harmonized Sentinel-2 MSI Level-2A)
var sentinel2 = ee.ImageCollection('COPERNICUS/S2')
                  .filterBounds(mysore)
                  .filterDate(startDate, endDate)
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)); // Filter for less cloudy images

// Calculate NDVI using Sentinel-2 bands (B8: NIR, B4: Red)
var calculateNDVI = function(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  return ndvi.clip(mysore); // Clip to Mysore region
};

// Map the NDVI calculation function over the Image Collection
var ndviCollection = sentinel2.map(calculateNDVI);

// Create a composite image showing median NDVI over the time period
var ndviComposite = ndviCollection.median().clip(mysore); // Clip final composite to Mysore

// Visualization parameters for NDVI
var ndviVisParams = {
  min: -1,
  max: 1,
  palette: ['red', 'yellow', 'green'] // Red for low NDVI, Yellow for moderate, Green for high
};

// Add NDVI layer to the map
Map.centerObject(mysore, 10); // Zoom into Mysore region
Map.addLayer(ndviComposite, ndviVisParams, 'Median NDVI - Mysore');

// Export the NDVI composite as a GeoTIFF to Google Drive
Export.image.toDrive({
  image: ndviComposite.float(), // Ensure NDVI values remain in original range (-1 to 1)
  description: 'Mysore_NDVI_2014_2024_Clipped',
  folder: 'GEE_Exports', // Specify your Google Drive folder
  fileNamePrefix: 'Mysore_NDVI_2014_2024_Clipped',
  region: mysore,
  scale: 10, // Spatial resolution in meters (Sentinel-2 resolution)
  maxPixels: 1e13 // Handle large datasets
});
