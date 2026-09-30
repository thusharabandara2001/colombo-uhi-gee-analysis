/**
 * Project: Colombo District Urban Heat Island (UHI) with Dynamic Legend
 */

// 1. Boundary and Data Loading
var countries = ee.FeatureCollection("FAO/GAUL/2015/level2");
var colombo_boundary = countries.filter(ee.Filter.eq('ADM2_NAME', 'Colombo'));
Map.centerObject(colombo_boundary, 11);

var dataset = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
    .filterBounds(colombo_boundary)
    .filterDate('2023-01-01', '2023-12-31')
    .filter(ee.Filter.lt('CLOUD_COVER', 15))
    .median().clip(colombo_boundary);

// 2. Calculations
var ndvi = dataset.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
var thermal = dataset.select('ST_B10');
var lst = thermal.multiply(0.00341802).add(149.0).subtract(273.15).rename('LST');

var finalLST = lst.updateMask(ndvi.gt(0.1));
var finalNDVI = ndvi.updateMask(ndvi.gt(0.1));

// 3. Visualization Params
var lstVis = {min: 25, max: 38, palette: ['blue', 'green', 'yellow', 'orange', 'red']};
var ndviVis = {min: 0, max: 0.6, palette: ['#ffffff', '#f1b555', '#66a000', '#011301']};

// 4. Create Map Layers (Initially not shown)
var lstLayer = ui.Map.Layer(finalLST, lstVis, 'Surface Temperature', true);
var ndviLayer = ui.Map.Layer(finalNDVI, ndviVis, 'Vegetation Index', false);
Map.layers().reset([lstLayer, ndviLayer]);

// 5. LEGEND SETUP
var legendPanel = ui.Panel({
  style: {position: 'bottom-left', padding: '8px 15px'}
});

var makeRow = function(color, name) {
  var colorBox = ui.Label({style: {backgroundColor: color, padding: '8px', margin: '0 0 4px 0'}});
  var description = ui.Label({value: name, style: {margin: '0 0 4px 6px'}});
  return ui.Panel({widgets: [colorBox, description], layout: ui.Panel.Layout.Flow('horizontal')});
};

// Function to update legend based on selected layer
var updateLegend = function(layerName) {
  legendPanel.clear();
  var title = ui.Label({value: layerName, style: {fontWeight: 'bold', fontSize: '16px'}});
  legendPanel.add(title);
  
  if (layerName === 'Surface Temperature (°C)') {
    legendPanel.add(makeRow('red', 'High (35°C+)'));
    legendPanel.add(makeRow('orange', 'Moderate High'));
    legendPanel.add(makeRow('yellow', 'Moderate'));
    legendPanel.add(makeRow('blue', 'Low (25°C)'));
  } else {
    legendPanel.add(makeRow('#011301', 'Dense Forest'));
    legendPanel.add(makeRow('#66a000', 'Moderate Green'));
    legendPanel.add(makeRow('#f1b555', 'Sparse/Soil'));
    legendPanel.add(makeRow('#ffffff', 'No Vegetation'));
  }
};

// Initial legend
updateLegend('Surface Temperature (°C)');
Map.add(legendPanel);

// 6. LAYER CONTROL PANEL (The Menu)
var controlPanel = ui.Panel({
  style: {position: 'top-right', padding: '8px'}
});
controlPanel.add(ui.Label('Select Layer to View:'));

var lstCheck = ui.Checkbox('Show Temperature', true);
var ndviCheck = ui.Checkbox('Show Vegetation', false);

lstCheck.onChange(function(checked) {
  lstLayer.setShown(checked);
  if (checked) {
    ndviCheck.setValue(false, false);
    ndviLayer.setShown(false);
    updateLegend('Surface Temperature (°C)');
  }
});

ndviCheck.onChange(function(checked) {
  ndviLayer.setShown(checked);
  if (checked) {
    lstCheck.setValue(false, false);
    lstLayer.setShown(false);
    updateLegend('Vegetation Index (NDVI)');
  }
});

controlPanel.add(lstCheck);
controlPanel.add(ndviCheck);
Map.add(controlPanel);

// 7. Charts (Console)
print('Charts loaded in Console -->');
var points = finalNDVI.addBands(finalLST).sample({region: colombo_boundary, scale: 500, numPixels: 500});
print(ui.Chart.feature.byFeature(points, 'NDVI', 'LST').setChartType('ScatterChart').setOptions({title: 'NDVI vs LST'}));
