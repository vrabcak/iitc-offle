// ==UserScript==
// @id             iitc-plugin-offle
// @name           IITC plugin: offle
// @category       Misc
// @version        0.1.0
// @namespace      https://github.com/vrabcak/iitc-offle
// @description    Offle
// @include        https://www.ingress.com/intel*
// @include        http://www.ingress.com/intel*
// @match          https://www.ingress.com/intel*
// @match          http://www.ingress.com/intel*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
    // ensure plugin framework is there, even if iitc is not yet loaded
    if (typeof window.plugin !== 'function') {
        window.plugin = function () {};
    }


    // PLUGIN START ////////////////////////////////////////////////////////

    // use own namespace for plugin
    window.plugin.offle = function () {};
    window.plugin.offle.portalDb = {};


    // Use portal add event to save it to db 
    window.plugin.offle.portalAdded = function (data) {
        window.plugin.offle.addPortal(data.portal.options.guid, data.portal.options.data.title, data.portal.getLatLng());
    };

    window.plugin.offle.addPortal = function (guid, name, latLng) {
        window.plugin.offle.portalDb[guid] = latLng;
        window.plugin.offle.dirtyDb = true;     //mark Db dirty to by stored on mapDataRefreshEnd
        window.plugin.offle.renderPortal(guid, name, latLng);
        window.plugin.offle.updatePortalCounter(); 
    };

    window.plugin.offle.renderPortal = function (guid, name, latLng) {  
        var portalMarker,
            iconCSSClass = 'offle-X-basic',
            uniqueInfo = window.plugin.uniques.uniques[guid];

        if (uniqueInfo) {
            if (uniqueInfo.visited) {
               iconCSSClass = 'offle-X-visited';
            }
            if (uniqueInfo.captured) {
               iconCSSClass = 'offle-X-captured';
            }
        }

        portalMarker = L.marker(latLng, {
            icon: L.divIcon({
                className: iconCSSClass,
                iconAnchor: [5,5],
                iconSize: [10,10],
                html: "X"
            }),
            name: name
        });

        portalMarker.addTo(window.plugin.offle.portalLayerGroup);

    };

    window.plugin.offle.mapDataRefreshEnd = function () {
        if (window.plugin.offle.dirtyDb) {
            console.log("Storing new portals to localStorage");
            localStorage.setItem('portalDb', JSON.stringify(window.plugin.offle.portalDb));
        }
        window.plugin.offle.dirtyDb = false;
    };

    window.plugin.offle.setupLayer = function() {
        window.plugin.offle.portalLayerGroup = new L.LayerGroup();
        window.addLayerGroup('offlePortals', window.plugin.offle.portalLayerGroup, false);   
    };   

    window.plugin.offle.setupCSS = function() {
        $("<style>")
        .prop("type", "text/css")
        .html('.offle-X-basic {' +
              'font-size: 10px;' +
              'color: #FF6200;' +
              'font-family: monospace;'+
              'text-align: center;' +
              'pointer-events: none;' +
              '}' +
              '.offle-X-visited {' +
              'font-size: 10px;' +
              'color: #FFCE00;' +
              'font-family: monospace;'+
              'text-align: center;' +
              'pointer-events: none;' +
              '}' +
              '.offle-X-captured {' +
              'font-size: 10px;' +
              'color: #00BB00;' +
              'font-family: monospace;'+
              'text-align: center;' +
              'pointer-events: none;' +
              '}'
             )
        .appendTo("head");
    };

    window.plugin.offle.updatePortalCounter = function () {
        $('#offle-portal-counter').html(Object.keys(window.plugin.offle.portalDb).length);
    };


    window.plugin.offle.getVisiblePortals = function () {
        var keys = Object.keys(window.plugin.offle.portalDb);
        var actualBounds = map.getBounds();
        var keysInView = keys.filter( function(key) {
            var ll, 
                portal = window.plugin.offle.portalDb[key];
            if (portal.lat && portal.lng) {
                ll = L.latLng(portal.lat, portal.lng);
                return actualBounds.contains(ll);
            } 
            return false;
        });
        $('#visible-portals-counter').html(keysInView.length); 

        return keysInView;
    };

    window.plugin.offle.renderVisiblePortals = function () {
        var visiblePortalsKeys =  window.plugin.offle.getVisiblePortals();
        if (visiblePortalsKeys.length < 2000) {
            visiblePortalsKeys.forEach( function (key) {
                var portal = window.plugin.offle.portalDb[key],
                    ll = L.latLng(portal.lat, portal.lng);
                window.plugin.offle.renderPortal(key, '', ll); 
            });
        }
    };

    window.plugin.offle.onMapMove = function () {
        window.plugin.offle.renderVisiblePortals();
    };

    window.plugin.offle.clearDb = function () {
        localStorage.removeItem('portalDb');
        window.plugin.offle.portalDb = {};
        window.plugin.offle.portalLayerGroup.clearLayers();
        window.plugin.offle.updatePortalCounter();
    };

    window.plugin.offle.setupDialog = function() {
        window.plugin.offle.dialogHtml = '<div id="offle-info">'+
            '<div>' +
            '<div> Offline portals count:' +
            '<span id="offle-portal-counter">' +
            Object.keys(window.plugin.offle.portalDb).length +
            '</span></div>' +
            '<div> Visible portals:' +
            '<span id="visible-portals-counter">x</span></div>' +
            '<button onclick="window.plugin.offle.clearDb();return false;">Clear all offline portals</button>' +
            '</div>';
        $('#toolbox').append('<a id="offle-show-info" onclick="window.plugin.offle.showDialog();">Offle</a> ');
    };



    window.plugin.offle.showDialog = function() {
        window.dialog({html: window.plugin.offle.dialogHtml, title: 'Offle', modal: false, id: 'offle-info'});
        window.plugin.offle.updatePortalCounter();
        window.plugin.offle.getVisiblePortals();
    };


    var setup = function () {        
        var portalDb = window.plugin.offle.portalDb = JSON.parse(localStorage.getItem('portalDb')) || {};
        window.plugin.offle.setupLayer();
        window.plugin.offle.setupCSS();
        window.plugin.offle.setupDialog();

        if (Object.keys(portalDb).length > 0) {
            window.plugin.offle.renderVisiblePortals();
        } else {
            window.plugin.offle.portalDb = {};
        }

        map.on('movestart', function () {
            window.plugin.offle.portalLayerGroup.clearLayers();
        });
        map.on('moveend',  window.plugin.offle.onMapMove);
        window.addHook('portalAdded', window.plugin.offle.portalAdded);
        window.addHook('mapDataRefreshEnd', window.plugin.offle.mapDataRefreshEnd);
    };
    // PLUGIN END //////////////////////////////////////////////////////////


    setup.info = plugin_info; //add the script info data to the function as a property
    if (!window.bootPlugins) {
        window.bootPlugins = [];
    }
    window.bootPlugins.push(setup);
    // if IITC has already booted, immediately run the 'setup' function
    if (window.iitcLoaded && typeof setup === 'function') {
        setup();
    }
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
    info.script = {
        version: GM_info.script.version,
        name: GM_info.script.name,
        description: GM_info.script.description
    };
}
script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ');'));
(document.body || document.head || document.documentElement).appendChild(script);
