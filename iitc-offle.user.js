// ==UserScript==
// @id             iitc-plugin-offle
// @name           IITC plugin: offle
// @category       Misc
// @version        0.2.2-a
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
        window.plugin.offle.lastAddedDb = [];


        // Use portal add event to save it to db
        window.plugin.offle.portalAdded = function (data) {
            window.plugin.offle.addPortal(
                data.portal.options.guid,
                data.portal.options.data.title,
                data.portal.getLatLng()
            );
        };

        window.plugin.offle.addPortal = function (guid, name, latLng) {
            if (!(guid in window.plugin.offle.portalDb)) {
                window.plugin.offle.lastAddedDb.push({
                    name: name,
                    latLng: latLng
                });
                window.plugin.offle.portalDb[guid] = latLng;
                window.plugin.offle.dirtyDb = true; //mark Db dirty to by stored on mapDataRefreshEnd
                window.plugin.offle.renderPortal(guid, name, latLng);
                window.plugin.offle.updatePortalCounter();
                window.plugin.offle.updateLACounter();
                window.plugin.offle.updateLAList();
            }
        };

        window.plugin.offle.renderPortal = function (guid, name, latLng) {
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

            portalMarker = L.marker(latLng, {
                icon: L.divIcon({
                    className: iconCSSClass,
                    iconAnchor: [15, 23],
                    iconSize: [30, 30],
                    html: "&bull;"
                }),
                name: name
            });

            portalMarker.addTo(window.plugin.offle.portalLayerGroup);

        };

        window.plugin.offle.mapDataRefreshEnd = function () {
            if (window.plugin.offle.dirtyDb) {
                //console.log("Storing new portals to localStorage");
                localStorage.setItem('portalDb', JSON.stringify(window.plugin.offle.portalDb));
            }
            window.plugin.offle.dirtyDb = false;
        };

        window.plugin.offle.setupLayer = function () {
            window.plugin.offle.portalLayerGroup = new L.LayerGroup();
            window.addLayerGroup('offlePortals', window.plugin.offle.portalLayerGroup, false);
        };

        window.plugin.offle.setupCSS = function () {
            $("<style>")
                .prop("type", "text/css")
                .html('.offle-marker {' +
                    'font-size: 30px;' +
                    'color: #FF6200;' +
                    'font-family: monospace;' +
                    'text-align: center;' +
                    'pointer-events: none;' +
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

        window.plugin.offle.updatePortalCounter = function () {
            $('#offle-portal-counter').html(Object.keys(window.plugin.offle.portalDb).length);
        };


        window.plugin.offle.getVisiblePortals = function () {
            var keys = Object.keys(window.plugin.offle.portalDb);
            var actualBounds = map.getBounds();
            var keysInView = keys.filter(function (key) {
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
            var visiblePortalsKeys = window.plugin.offle.getVisiblePortals();
            if (visiblePortalsKeys.length < 2000) {
                visiblePortalsKeys.forEach(function (key) {
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

        window.plugin.offle.setupHtml = function () {
            window.plugin.offle.dialogHtml = '<div id="offle-info">' +
                '<div>' +
                '<div> Offline portals count:' +
                '<span id="offle-portal-counter">' +
                Object.keys(window.plugin.offle.portalDb).length +
                '</span></div>' +
                '<div> Visible portals:' +
                '<span id="visible-portals-counter">x</span></div>' +
                '<div style="border-bottom: 60px;">' +
                '<button onclick="window.plugin.offle.showLAWindow();return false;">New portals</button>' +
                '</div><br/><br/><br/>' +
                '<button onclick="window.plugin.offle.clearDb();return false;" style="font-size: 5px;">' +
                'Clear all offline portals</button>' +
                '</div>';
            $('#toolbox').append('<a id="offle-show-info" onclick="window.plugin.offle.showDialog();">Offle</a> ');

            window.plugin.offle.lastAddedDialogHtml = '' +
                '<div id="offle-last-added-list">' +
                'placeholder <br/>' +
                'placeholder' +
                '</div>' +
                '<button onclick="window.plugin.offle.clearLADb()">Clear</div>';

            $('body').append('<div class="offle-portal-counter" onclick="window.plugin.offle.showLAWindow();">0</div>');

        };


        window.plugin.offle.showDialog = function () {
            window.dialog({
                html: window.plugin.offle.dialogHtml,
                title: 'Offle',
                modal: false,
                id: 'offle-info'
            });
            window.plugin.offle.updatePortalCounter();
            window.plugin.offle.getVisiblePortals();
        };

        window.plugin.offle.showLAWindow = function () {

            window.dialog({
                html: window.plugin.offle.lastAddedDialogHtml,
                title: 'Portals added since last session:',
                modal: false,
                id: 'offle-LA',
                height: $(window).height() * 0.45
            });
            window.plugin.offle.updateLAList();

        };

        window.plugin.offle.updateLAList = function () { /// update list of last added portals
            var portalListHtml = window.plugin.offle.lastAddedDb.map(function (portal) {
                var lat = portal.latLng.lat,
                    lng = portal.latLng.lng;
                return '<a onclick="window.selectPortalByLatLng(' + lat + ', ' + lng + ');return false"' +
                    'href="/intel?pll=' + portal.latLng.lat + ',' + portal.latLng.lng + '">' + portal.name + '</a>';
            }).join('<br />');
            $('#offle-last-added-list').html(portalListHtml);
        };

        window.plugin.offle.updateLACounter = function () {
            var count = window.plugin.offle.lastAddedDb.length;
            if (count > 0) {
                $('.offle-portal-counter').css('display', 'block').html('' + count);
            }

        };

        window.plugin.offle.clearLADb = function () {
            window.plugin.offle.lastAddedDb = [];
            window.plugin.offle.updateLAList();
            $('.offle-portal-counter').css('display', 'none');
        };

        var setup = function () {
            var portalDb = window.plugin.offle.portalDb = JSON.parse(localStorage.getItem('portalDb')) || {};
            window.plugin.offle.setupLayer();
            window.plugin.offle.setupCSS();
            window.plugin.offle.setupHtml();

            if (Object.keys(portalDb).length > 0) {
                window.plugin.offle.renderVisiblePortals();
            } else {
                window.plugin.offle.portalDb = {};
            }

            map.on('movestart', function () {
                window.plugin.offle.portalLayerGroup.clearLayers();
            });
            map.on('moveend', window.plugin.offle.onMapMove);
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
