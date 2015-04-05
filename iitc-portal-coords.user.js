// ==UserScript==
// @id             iitc-plugin-portal-coords
// @name           IITC plugin: portal-coords
// @category       Misc
// @version        0.0.1
// @namespace      https://pokus
// @description    Portal coords
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
    window.plugin.pocoo = function () {};

    window.plugin.pocoo.portaldetailsUpdated = function (data) {
        var ll = {};
        ll.lat = data.portalData.latE6/1E6;
        ll.lng = data.portalData.lngE6/1E6;
        window.plugin.pocoo.render(ll);

    };

    window.plugin.pocoo.render = function (ll) {
        var html = '<div id="coords-container">' +
                'Coords: ' +
                '<span id="coords-text">' +
                ll.lat + ' ' + ll.lng +
                '</span></div>';
        $('#portaldetails > .imgpreview').after(html);
        $('#coords-container').click( function() {
            var selection = window.getSelection(),
                range = document.createRange();
            range.selectNodeContents(document.getElementById('coords-text'));
            selection.removeAllRanges();
            selection.addRange(range);
        });
    };

    window.plugin.pocoo.setupCSS = function() {
        $("<style>")
        .prop("type", "text/css")
        .html('#coords-container {' +
              'color: #aaaaaa;' +
              'text-align: center;' +
              '}'
             )
        .appendTo("head");
    };

    var setup = function () {
        window.plugin.pocoo.setupCSS();
        window.addHook('portalDetailsUpdated', window.plugin.pocoo.portaldetailsUpdated);
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
