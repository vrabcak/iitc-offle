// ==UserScript==
// @id             iitc-plugin-offle
// @name           IITC plugin: offle
// @category       Misc
// @version        0.3.4
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
    var offle = window.plugin.offle;
    offle.portalDb = {};
    offle.lastAddedDb = {};
    offle.symbol = '&bull;';
    offle.symbolWithMission = '◉';
    offle.maxVisibleCount = 2000;


    // Use portal add event to save it to db
    offle.portalAdded = function (data) {
        offle.addPortal(
            data.portal.options.guid,
            data.portal.options.data.title,
            data.portal.getLatLng(),
            data.portal.options.data.mission
        );
    };

    // Always update portal data if displayed in sidebar (to handle e.g. moved portals)
    offle.portalDetailsUpdated = function (data) {
        var guid = data.portal.options.guid,
            name = data.portal.options.data.title;
        if (name) { //update data only with portals with full details
            offle.portalDb[guid] = data.portal.getLatLng();
            offle.portalDb[guid].name = data.portal.options.data.title;
            offle.portalDb[guid].mission = data.portal.options.data.mission;
            offle.renderVisiblePortals();
            localStorage.setItem('portalDb', JSON.stringify(offle.portalDb));
        }
    };


    offle.addPortal = function (guid, name, latLng, mission) {

        var notInDb = guid && !(guid in offle.portalDb);
        var newName = name && offle.portalDb[guid] && !offle.portalDb[guid].name;

        //console.log("AddPortal ", guid," ",name, "::", notInDb, " ", newName);

        if (notInDb || newName) {

            //add to last added list only new portals or update already displayed guid with name
            if (notInDb || (newName && (guid in offle.lastAddedDb))) {
                offle.lastAddedDb[guid] = {
                    name: name || guid,
                    latLng: latLng,
                    unique: false
                };

                if (!(window.plugin.uniques && (guid in window.plugin.uniques.uniques))) {
                offle.lastAddedDb[guid].unique = true;
                }
            }

            offle.portalDb[guid] = latLng;
            offle.portalDb[guid].name = name;
            offle.portalDb[guid].mission = mission;
            offle.dirtyDb = true; //mark Db dirty to by stored on mapDataRefreshEnd
            offle.renderPortal(guid);
            offle.updatePortalCounter();
            offle.updateLACounter();
            offle.updateLAList();
        }
    };

    offle.renderPortal = function (guid) {
        var portalMarker, uniqueInfo,
            iconCSSClass = 'offle-marker';

        if (window.plugin.uniques) {
            uniqueInfo = window.plugin.uniques.uniques[guid];
        }

        if (uniqueInfo) {
            if (uniqueInfo.visited) {
                iconCSSClass += ' offle-marker-visited-color';
            }
            if (uniqueInfo.captured) {
                iconCSSClass += ' offle-marker-captured-color';
            }
        }

        portalMarker = L.marker(offle.portalDb[guid], {
            icon: L.divIcon({
                className: iconCSSClass,
                iconAnchor: [15, 23],
                iconSize: [30, 30],
                html: offle.portalDb[guid].mission ? offle.symbolWithMission : offle.symbol
            }),
            name: offle.portalDb[guid].name,
            title: offle.portalDb[guid].name || ''
        });

        portalMarker.on('click', function () {
            window.renderPortalDetails(guid);
        });

        portalMarker.addTo(offle.portalLayerGroup);

    };

    offle.clearLayer = function () {
        offle.portalLayerGroup.clearLayers();
    };

    offle.mapDataRefreshEnd = function () {
        if (offle.dirtyDb) {
            //console.log("Storing new portals to localStorage");
            localStorage.setItem('portalDb', JSON.stringify(offle.portalDb));
        }
        offle.dirtyDb = false;
    };

    offle.setupLayer = function () {
        offle.portalLayerGroup = new L.LayerGroup();
        window.addLayerGroup('offlePortals', offle.portalLayerGroup, false);
    };

    offle.setupCSS = function () {
        $("<style>")
            .prop("type", "text/css")
            .html('.offle-marker {' +
                'font-size: 30px;' +
                'color: #FF6200;' +
                'font-family: monospace;' +
                'text-align: center;' +
                //'pointer-events: none;' +
                '}' +
                '.offle-marker-visited-color {' +
                'color: #FFCE00;' +
                '}' +
                '.offle-marker-captured-color {' +
                'color: #00BB00;' +
                '}' +
                '.offle-portal-counter {' +
                'display: none; position: absolute; top:0; left: 40vh;' +
                'background-color: orange; z-index: 4002; cursor:pointer;}' +
                '.pokus {' +
                'border-style: solid;' +
                'border-width: 3px' +
                '}'

            )
            .appendTo("head");
    };

    offle.updatePortalCounter = function () {
        $('#offle-portal-counter').html(Object.keys(offle.portalDb).length);
    };


    offle.getVisiblePortals = function () {
        var keys = Object.keys(offle.portalDb);
        var actualBounds = map.getBounds();
        var keysInView = keys.filter(function (key) {
            var ll,
                portal = offle.portalDb[key];
            if (portal.lat && portal.lng) {
                ll = L.latLng(portal.lat, portal.lng);
                return actualBounds.contains(ll);
            }
            return false;
        });
        $('#visible-portals-counter').html(keysInView.length);

        return keysInView;
    };

    offle.renderVisiblePortals = function () {
        var visiblePortalsKeys = offle.getVisiblePortals();
        if (visiblePortalsKeys.length < offle.maxVisibleCount) {
            visiblePortalsKeys.forEach(function (key) {
                offle.renderPortal(key);
            });
        }
    };

    offle.onMapMove = function () {
        offle.renderVisiblePortals();
    };

    offle.clearDb = function () {
        localStorage.removeItem('portalDb');
        offle.portalDb = {};
        offle.portalLayerGroup.clearLayers();
        offle.updatePortalCounter();
    };

    offle.changeSymbol = function (event) {
        offle.symbol = event.target.value;
        offle.clearLayer();
        offle.renderVisiblePortals();
    };

    offle.changeMaxVisibleCount = function (event) {
        offle.maxVisibleCount = event.target.value;
        offle.clearLayer();
        offle.renderVisiblePortals();
    };

    offle.setupHtml = function () {

        $('#toolbox').append('<a id="offle-show-info" onclick="window.plugin.offle.showDialog();">Offle</a> ');

        offle.lastAddedDialogHtml = '' +
            '<div id="offle-last-added-list">' +
            'placeholder <br/>' +
            'placeholder' +
            '</div>' +
            '<button onclick="window.plugin.offle.clearLADb()">Clear</div>';

        $('body').append('<div class="offle-portal-counter" onclick="window.plugin.offle.showLAWindow();">0</div>');

    };


    offle.showDialog = function () {
        offle.dialogHtml = '<div id="offle-info">' +
            '<div>' +
            '<div> Offline portals count:' +
            '<span id="offle-portal-counter">' +
            Object.keys(offle.portalDb).length +
            '</span></div>' +
            '<div> Visible portals:' +
            '<span id="visible-portals-counter">x</span></div>' +
            '<div> Unique portals visited: ' +
            (window.plugin.uniques ? Object.keys(window.plugin.uniques.uniques).length : 'uniques plugin missing') +
            '</div>' +
            '<div> Portal marker symbol: <input type="text" value="' +
            offle.symbol +
            '" size="1" onchange="window.plugin.offle.changeSymbol(event)"> </div>' +
            '<div> Maximum visible portals: <input type="number" value="' +
            offle.maxVisibleCount +
            '" size="5" onchange="window.plugin.offle.changeMaxVisibleCount(event)"> </div>' +
            '<div style="border-bottom: 60px;">' +
            '<button onclick="window.plugin.offle.showLAWindow();return false;">New portals</button>' +
            '</div><br/><br/><br/>' +
            '<button onclick="window.plugin.offle.clearDb();return false;" style="font-size: 5px;">' +
            'Clear all offline portals</button>' +
            '</div>';

        window.dialog({
            html: offle.dialogHtml,
            title: 'Offle',
            modal: false,
            id: 'offle-info'
        });
        offle.updatePortalCounter();
        offle.getVisiblePortals();
    };

    offle.zoomToPortalAndShow = function (guid) {
       var lat = offle.portalDb[guid].lat,
           lng = offle.portalDb[guid].lng,
           ll = [lat,lng];
       map.setView (ll, 17);
       window.renderPortalDetails(guid);
    };

    offle.showLAWindow = function () {

        window.dialog({
            html: offle.lastAddedDialogHtml,
            title: 'Portals added since last session:',
            modal: false,
            id: 'offle-LA',
            height: $(window).height() * 0.45
        });
        offle.updateLAList();

    };

    offle.updateLAList = function () { /// update list of last added portals
        var guids = Object.keys(offle.lastAddedDb);
        var portalListHtml = guids.map(function (guid) {
            var portal = offle.lastAddedDb[guid];
            return '<a onclick="window.plugin.offle.zoomToPortalAndShow(\''+guid+'\');return false"' +
                (portal.unique ? 'style="color: #FF6200;"' : '') +
                'href="/intel?pll=' + portal.latLng.lat + ',' + portal.latLng.lng + '">' + portal.name + '</a>';
        }).join('<br />');
        $('#offle-last-added-list').html(portalListHtml);
    };

    offle.updateLACounter = function () {
        var count = Object.keys(offle.lastAddedDb).length;
        if (count > 0) {
            $('.offle-portal-counter').css('display', 'block').html('' + count);
        }

    };

    offle.clearLADb = function () {
        offle.lastAddedDb = {};
        offle.updateLAList();
        $('.offle-portal-counter').css('display', 'none');
    };

    var setup = function () {
        var portalDb = offle.portalDb = JSON.parse(localStorage.getItem('portalDb')) || {};
        offle.setupLayer();
        offle.setupCSS();
        offle.setupHtml();

        if (Object.keys(portalDb).length > 0) {
            offle.renderVisiblePortals();
        } else {
            offle.portalDb = {};
        }

        map.on('movestart', function () {
            offle.portalLayerGroup.clearLayers();
        });
        map.on('moveend', offle.onMapMove);
        window.addHook('portalAdded', offle.portalAdded);
        window.addHook('mapDataRefreshEnd', offle.mapDataRefreshEnd);
        window.addHook('portalDetailsUpdated', offle.portalDetailsUpdated);
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
