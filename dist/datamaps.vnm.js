(function() {
  var svg;

  //save off default references
  var d3 = window.d3, topojson = window.topojson;

  var defaultOptions = {
    scope: 'world',
    responsive: false,
    aspectRatio: 0.5625,
    setProjection: setProjection,
    projection: 'equirectangular',
    dataType: 'json',
    data: {},
    done: function() {},
    fills: {
      defaultFill: '#ABDDA4'
    },
    filters: {},
    geographyConfig: {
        dataUrl: null,
        hideAntarctica: true,
        hideHawaiiAndAlaska : false,
        borderWidth: 1,
        borderColor: '#FDFDFD',
        popupTemplate: function(geography, data) {
          return '<div class="hoverinfo"><strong>' + geography.properties.name + '</strong></div>';
        },
        popupOnHover: true,
        highlightOnHover: true,
        highlightFillColor: '#FC8D59',
        highlightBorderColor: 'rgba(250, 15, 160, 0.2)',
        highlightBorderWidth: 2
    },
    projectionConfig: {
      rotation: [97, 0]
    },
    bubblesConfig: {
        borderWidth: 2,
        borderColor: '#FFFFFF',
        popupOnHover: true,
        radius: null,
        popupTemplate: function(geography, data) {
          return '<div class="hoverinfo"><strong>' + data.name + '</strong></div>';
        },
        fillOpacity: 0.75,
        animate: true,
        highlightOnHover: true,
        highlightFillColor: '#FC8D59',
        highlightBorderColor: 'rgba(250, 15, 160, 0.2)',
        highlightBorderWidth: 2,
        highlightFillOpacity: 0.85,
        exitDelay: 100,
        key: JSON.stringify
    },
    arcConfig: {
      strokeColor: '#DD1C77',
      strokeWidth: 1,
      arcSharpness: 1,
      animationSpeed: 600
    }
  };

  /*
    Getter for value. If not declared on datumValue, look up the chain into optionsValue
  */
  function val( datumValue, optionsValue, context ) {
    if ( typeof context === 'undefined' ) {
      context = optionsValue;
      optionsValues = undefined;
    }
    var value = typeof datumValue !== 'undefined' ? datumValue : optionsValue;

    if (typeof value === 'undefined') {
      return  null;
    }

    if ( typeof value === 'function' ) {
      var fnContext = [context];
      if ( context.geography ) {
        fnContext = [context.geography, context.data];
      }
      return value.apply(null, fnContext);
    }
    else {
      return value;
    }
  }

  function addContainer( element, height, width ) {
    this.svg = d3.select( element ).append('svg')
      .attr('width', width || element.offsetWidth)
      .attr('data-width', width || element.offsetWidth)
      .attr('class', 'datamap')
      .attr('height', height || element.offsetHeight)
      .style('overflow', 'hidden'); // IE10+ doesn't respect height/width when map is zoomed in

    if (this.options.responsive) {
      d3.select(this.options.element).style({'position': 'relative', 'padding-bottom': (this.options.aspectRatio*100) + '%'});
      d3.select(this.options.element).select('svg').style({'position': 'absolute', 'width': '100%', 'height': '100%'});
      d3.select(this.options.element).select('svg').select('g').selectAll('path').style('vector-effect', 'non-scaling-stroke');

    }

    return this.svg;
  }

  // setProjection takes the svg element and options
  function setProjection( element, options ) {
    var width = options.width || element.offsetWidth;
    var height = options.height || element.offsetHeight;
    var projection, path;
    var svg = this.svg;

    if ( options && typeof options.scope === 'undefined') {
      options.scope = 'world';
    }

    if ( options.scope === 'usa' ) {
      projection = d3.geo.albersUsa()
        .scale(width)
        .translate([width / 2, height / 2]);
    }
    else if ( options.scope === 'world' ) {
      projection = d3.geo[options.projection]()
        .scale((width + 1) / 2 / Math.PI)
        .translate([width / 2, height / (options.projection === "mercator" ? 1.45 : 1.8)]);
    }

    if ( options.projection === 'orthographic' ) {

      svg.append("defs").append("path")
        .datum({type: "Sphere"})
        .attr("id", "sphere")
        .attr("d", path);

      svg.append("use")
          .attr("class", "stroke")
          .attr("xlink:href", "#sphere");

      svg.append("use")
          .attr("class", "fill")
          .attr("xlink:href", "#sphere");
      projection.scale(250).clipAngle(90).rotate(options.projectionConfig.rotation)
    }

    path = d3.geo.path()
      .projection( projection );

    return {path: path, projection: projection};
  }

  function addStyleBlock() {
    if ( d3.select('.datamaps-style-block').empty() ) {
      d3.select('head').append('style').attr('class', 'datamaps-style-block')
      .html('.datamap path.datamaps-graticule { fill: none; stroke: #777; stroke-width: 0.5px; stroke-opacity: .5; pointer-events: none; } .datamap .labels {pointer-events: none;} .datamap path {stroke: #FFFFFF; stroke-width: 1px;} .datamaps-legend dt, .datamaps-legend dd { float: left; margin: 0 3px 0 0;} .datamaps-legend dd {width: 20px; margin-right: 6px; border-radius: 3px;} .datamaps-legend {padding-bottom: 20px; z-index: 1001; position: absolute; left: 4px; font-size: 12px; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;} .datamaps-hoverover {display: none; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; } .hoverinfo {padding: 4px; border-radius: 1px; background-color: #FFF; box-shadow: 1px 1px 5px #CCC; font-size: 12px; border: 1px solid #CCC; } .hoverinfo hr {border:1px dotted #CCC; }');
    }
  }

  function drawSubunits( data ) {
    var fillData = this.options.fills,
        colorCodeData = this.options.data || {},
        geoConfig = this.options.geographyConfig;


    var subunits = this.svg.select('g.datamaps-subunits');
    if ( subunits.empty() ) {
      subunits = this.addLayer('datamaps-subunits', null, true);
    }

    var geoData = topojson.feature( data, data.objects[ this.options.scope ] ).features;
    if ( geoConfig.hideAntarctica ) {
      geoData = geoData.filter(function(feature) {
        return feature.id !== "ATA";
      });
    }

    if ( geoConfig.hideHawaiiAndAlaska ) {
      geoData = geoData.filter(function(feature) {
        return feature.id !== "HI" && feature.id !== 'AK';
      });
    }

    var geo = subunits.selectAll('path.datamaps-subunit').data( geoData );

    geo.enter()
      .append('path')
      .attr('d', this.path)
      .attr('class', function(d) {
        return 'datamaps-subunit ' + d.id;
      })
      .attr('data-info', function(d) {
        return JSON.stringify( colorCodeData[d.id]);
      })
      .style('fill', function(d) {
        //if fillKey - use that
        //otherwise check 'fill'
        //otherwise check 'defaultFill'
        var fillColor;

        var datum = colorCodeData[d.id];
        if ( datum && datum.fillKey ) {
          fillColor = fillData[ val(datum.fillKey, {data: colorCodeData[d.id], geography: d}) ];
        }

        if ( typeof fillColor === 'undefined' ) {
          fillColor = val(datum && datum.fillColor, fillData.defaultFill, {data: colorCodeData[d.id], geography: d});
        }

        return fillColor;
      })
      .style('stroke-width', geoConfig.borderWidth)
      .style('stroke', geoConfig.borderColor);
  }

  function handleGeographyConfig () {
    var hoverover;
    var svg = this.svg;
    var self = this;
    var options = this.options.geographyConfig;

    if ( options.highlightOnHover || options.popupOnHover ) {
      svg.selectAll('.datamaps-subunit')
        .on('mouseover', function(d) {
          var $this = d3.select(this);
          var datum = self.options.data[d.id] || {};
          if ( options.highlightOnHover ) {
            var previousAttributes = {
              'fill':  $this.style('fill'),
              'stroke': $this.style('stroke'),
              'stroke-width': $this.style('stroke-width'),
              'fill-opacity': $this.style('fill-opacity')
            };

            $this
              .style('fill', val(datum.highlightFillColor, options.highlightFillColor, datum))
              .style('stroke', val(datum.highlightBorderColor, options.highlightBorderColor, datum))
              .style('stroke-width', val(datum.highlightBorderWidth, options.highlightBorderWidth, datum))
              .style('fill-opacity', val(datum.highlightFillOpacity, options.highlightFillOpacity, datum))
              .attr('data-previousAttributes', JSON.stringify(previousAttributes));

            //as per discussion on https://github.com/markmarkoh/datamaps/issues/19
            if ( ! /((MSIE)|(Trident))/.test(navigator.userAgent) ) {
             moveToFront.call(this);
            }
          }

          if ( options.popupOnHover ) {
            self.updatePopup($this, d, options, svg);
          }
        })
        .on('mouseout', function() {
          var $this = d3.select(this);

          if (options.highlightOnHover) {
            //reapply previous attributes
            var previousAttributes = JSON.parse( $this.attr('data-previousAttributes') );
            for ( var attr in previousAttributes ) {
              $this.style(attr, previousAttributes[attr]);
            }
          }
          $this.on('mousemove', null);
          d3.selectAll('.datamaps-hoverover').style('display', 'none');
        });
    }

    function moveToFront() {
      this.parentNode.appendChild(this);
    }
  }

  //plugin to add a simple map legend
  function addLegend(layer, data, options) {
    data = data || {};
    if ( !this.options.fills ) {
      return;
    }

    var html = '<dl>';
    var label = '';
    if ( data.legendTitle ) {
      html = '<h2>' + data.legendTitle + '</h2>' + html;
    }
    for ( var fillKey in this.options.fills ) {

      if ( fillKey === 'defaultFill') {
        if (! data.defaultFillName ) {
          continue;
        }
        label = data.defaultFillName;
      } else {
        if (data.labels && data.labels[fillKey]) {
          label = data.labels[fillKey];
        } else {
          label= fillKey + ': ';
        }
      }
      html += '<dt>' + label + '</dt>';
      html += '<dd style="background-color:' +  this.options.fills[fillKey] + '">&nbsp;</dd>';
    }
    html += '</dl>';

    var hoverover = d3.select( this.options.element ).append('div')
      .attr('class', 'datamaps-legend')
      .html(html);
  }

    function addGraticule ( layer, options ) {
      var graticule = d3.geo.graticule();
      this.svg.insert("path", '.datamaps-subunits')
        .datum(graticule)
        .attr("class", "datamaps-graticule")
        .attr("d", this.path);
  }

  function handleArcs (layer, data, options) {
    var self = this,
        svg = this.svg;

    if ( !data || (data && !data.slice) ) {
      throw "Datamaps Error - arcs must be an array";
    }

    // For some reason arc options were put in an `options` object instead of the parent arc
    // I don't like this, so to match bubbles and other plugins I'm moving it
    // This is to keep backwards compatability
    for ( var i = 0; i < data.length; i++ ) {
      data[i] = defaults(data[i], data[i].options);
      delete data[i].options;
    }

    if ( typeof options === "undefined" ) {
      options = defaultOptions.arcConfig;
    }

    var arcs = layer.selectAll('path.datamaps-arc').data( data, JSON.stringify );

    var path = d3.geo.path()
        .projection(self.projection);

    arcs
      .enter()
        .append('svg:path')
        .attr('class', 'datamaps-arc')
        .style('stroke-linecap', 'round')
        .style('stroke', function(datum) {
          return val(datum.strokeColor, options.strokeColor, datum);
        })
        .style('fill', 'none')
        .style('stroke-width', function(datum) {
            return val(datum.strokeWidth, options.strokeWidth, datum);
        })
        .attr('d', function(datum) {
            var originXY = self.latLngToXY(val(datum.origin.latitude, datum), val(datum.origin.longitude, datum))
            var destXY = self.latLngToXY(val(datum.destination.latitude, datum), val(datum.destination.longitude, datum));
            var midXY = [ (originXY[0] + destXY[0]) / 2, (originXY[1] + destXY[1]) / 2];
            if (options.greatArc) {
                  // TODO: Move this to inside `if` clause when setting attr `d`
              var greatArc = d3.geo.greatArc()
                  .source(function(d) { return [val(d.origin.longitude, d), val(d.origin.latitude, d)]; })
                  .target(function(d) { return [val(d.destination.longitude, d), val(d.destination.latitude, d)]; });

              return path(greatArc(datum))
            }
            var sharpness = val(datum.arcSharpness, options.arcSharpness, datum);
            return "M" + originXY[0] + ',' + originXY[1] + "S" + (midXY[0] + (50 * sharpness)) + "," + (midXY[1] - (75 * sharpness)) + "," + destXY[0] + "," + destXY[1];
        })
        .transition()
          .delay(100)
          .style('fill', function(datum) {
            /*
              Thank you Jake Archibald, this is awesome.
              Source: http://jakearchibald.com/2013/animated-line-drawing-svg/
            */
            var length = this.getTotalLength();
            this.style.transition = this.style.WebkitTransition = 'none';
            this.style.strokeDasharray = length + ' ' + length;
            this.style.strokeDashoffset = length;
            this.getBoundingClientRect();
            this.style.transition = this.style.WebkitTransition = 'stroke-dashoffset ' + val(datum.animationSpeed, options.animationSpeed, datum) + 'ms ease-out';
            this.style.strokeDashoffset = '0';
            return 'none';
          })

    arcs.exit()
      .transition()
      .style('opacity', 0)
      .remove();
  }

  function handleLabels ( layer, options ) {
    var self = this;
    options = options || {};
    var labelStartCoodinates = this.projection([-67.707617, 42.722131]);
    this.svg.selectAll(".datamaps-subunit")
      .attr("data-foo", function(d) {
        var center = self.path.centroid(d);
        var xOffset = 7.5, yOffset = 5;

        if ( ["FL", "KY", "MI"].indexOf(d.id) > -1 ) xOffset = -2.5;
        if ( d.id === "NY" ) xOffset = -1;
        if ( d.id === "MI" ) yOffset = 18;
        if ( d.id === "LA" ) xOffset = 13;

        var x,y;

        x = center[0] - xOffset;
        y = center[1] + yOffset;

        var smallStateIndex = ["VT", "NH", "MA", "RI", "CT", "NJ", "DE", "MD", "DC"].indexOf(d.id);
        if ( smallStateIndex > -1) {
          var yStart = labelStartCoodinates[1];
          x = labelStartCoodinates[0];
          y = yStart + (smallStateIndex * (2+ (options.fontSize || 12)));
          layer.append("line")
            .attr("x1", x - 3)
            .attr("y1", y - 5)
            .attr("x2", center[0])
            .attr("y2", center[1])
            .style("stroke", options.labelColor || "#000")
            .style("stroke-width", options.lineWidth || 1)
        }

        layer.append("text")
          .attr("x", x)
          .attr("y", y)
          .style("font-size", (options.fontSize || 10) + 'px')
          .style("font-family", options.fontFamily || "Verdana")
          .style("fill", options.labelColor || "#000")
          .text( d.id );
        return "bar";
      });
  }


  function handleBubbles (layer, data, options ) {
    var self = this,
        fillData = this.options.fills,
        filterData = this.options.filters,
        svg = this.svg;

    if ( !data || (data && !data.slice) ) {
      throw "Datamaps Error - bubbles must be an array";
    }

    var bubbles = layer.selectAll('circle.datamaps-bubble').data( data, options.key );

    bubbles
      .enter()
        .append('svg:circle')
        .attr('class', 'datamaps-bubble')
        .attr('cx', function ( datum ) {
          var latLng;
          if ( datumHasCoords(datum) ) {
            latLng = self.latLngToXY(datum.latitude, datum.longitude);
          }
          else if ( datum.centered ) {
            latLng = self.path.centroid(svg.select('path.' + datum.centered).data()[0]);
          }
          if ( latLng ) return latLng[0];
        })
        .attr('cy', function ( datum ) {
          var latLng;
          if ( datumHasCoords(datum) ) {
            latLng = self.latLngToXY(datum.latitude, datum.longitude);
          }
          else if ( datum.centered ) {
            latLng = self.path.centroid(svg.select('path.' + datum.centered).data()[0]);
          }
          if ( latLng ) return latLng[1];
        })
        .attr('r', function(datum) {
          // if animation enabled start with radius 0, otherwise use full size.
          return options.animate ? 0 : val(datum.radius, options.radius, datum);
        })
        .attr('data-info', function(d) {
          return JSON.stringify(d);
        })
        .attr('filter', function (datum) {
          var filterKey = filterData[ val(datum.filterKey, options.filterKey, datum) ];

          if (filterKey) {
            return filterKey;
          }
        })
        .style('stroke', function ( datum ) {
          return val(datum.borderColor, options.borderColor, datum);
        })
        .style('stroke-width', function ( datum ) {
          return val(datum.borderWidth, options.borderWidth, datum);
        })
        .style('fill-opacity', function ( datum ) {
          return val(datum.fillOpacity, options.fillOpacity, datum);
        })
        .style('fill', function ( datum ) {
          var fillColor = fillData[ val(datum.fillKey, options.fillKey, datum) ];
          return fillColor || fillData.defaultFill;
        })
        .on('mouseover', function ( datum ) {
          var $this = d3.select(this);

          if (options.highlightOnHover) {
            //save all previous attributes for mouseout
            var previousAttributes = {
              'fill':  $this.style('fill'),
              'stroke': $this.style('stroke'),
              'stroke-width': $this.style('stroke-width'),
              'fill-opacity': $this.style('fill-opacity')
            };

            $this
              .style('fill', val(datum.highlightFillColor, options.highlightFillColor, datum))
              .style('stroke', val(datum.highlightBorderColor, options.highlightBorderColor, datum))
              .style('stroke-width', val(datum.highlightBorderWidth, options.highlightBorderWidth, datum))
              .style('fill-opacity', val(datum.highlightFillOpacity, options.highlightFillOpacity, datum))
              .attr('data-previousAttributes', JSON.stringify(previousAttributes));
          }

          if (options.popupOnHover) {
            self.updatePopup($this, datum, options, svg);
          }
        })
        .on('mouseout', function ( datum ) {
          var $this = d3.select(this);

          if (options.highlightOnHover) {
            //reapply previous attributes
            var previousAttributes = JSON.parse( $this.attr('data-previousAttributes') );
            for ( var attr in previousAttributes ) {
              $this.style(attr, previousAttributes[attr]);
            }
          }

          d3.selectAll('.datamaps-hoverover').style('display', 'none');
        })

    bubbles.transition()
      .duration(400)
      .attr('r', function ( datum ) {
        return val(datum.radius, options.radius, datum);
      });

    bubbles.exit()
      .transition()
        .delay(options.exitDelay)
        .attr("r", 0)
        .remove();

    function datumHasCoords (datum) {
      return typeof datum !== 'undefined' && typeof datum.latitude !== 'undefined' && typeof datum.longitude !== 'undefined';
    }
  }

  //stolen from underscore.js
  function defaults(obj) {
    Array.prototype.slice.call(arguments, 1).forEach(function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] == null) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  }
  /**************************************
             Public Functions
  ***************************************/

  function Datamap( options ) {

    if ( typeof d3 === 'undefined' || typeof topojson === 'undefined' ) {
      throw new Error('Include d3.js (v3.0.3 or greater) and topojson on this page before creating a new map');
   }
    //set options for global use
    this.options = defaults(options, defaultOptions);
    this.options.geographyConfig = defaults(options.geographyConfig, defaultOptions.geographyConfig);
    this.options.projectionConfig = defaults(options.projectionConfig, defaultOptions.projectionConfig);
    this.options.bubblesConfig = defaults(options.bubblesConfig, defaultOptions.bubblesConfig);
    this.options.arcConfig = defaults(options.arcConfig, defaultOptions.arcConfig);

    //add the SVG container
    if ( d3.select( this.options.element ).select('svg').length > 0 ) {
      addContainer.call(this, this.options.element, this.options.height, this.options.width );
    }

    /* Add core plugins to this instance */
    this.addPlugin('bubbles', handleBubbles);
    this.addPlugin('legend', addLegend);
    this.addPlugin('arc', handleArcs);
    this.addPlugin('labels', handleLabels);
    this.addPlugin('graticule', addGraticule);

    //append style block with basic hoverover styles
    if ( ! this.options.disableDefaultStyles ) {
      addStyleBlock();
    }

    return this.draw();
  }

  // resize map
  Datamap.prototype.resize = function () {

    var self = this;
    var options = self.options;

    if (options.responsive) {
      var newsize = options.element.clientWidth,
          oldsize = d3.select( options.element).select('svg').attr('data-width');

      d3.select(options.element).select('svg').selectAll('g').attr('transform', 'scale(' + (newsize / oldsize) + ')');
    }
  }

  // actually draw the features(states & countries)
  Datamap.prototype.draw = function() {
    //save off in a closure
    var self = this;
    var options = self.options;

    //set projections and paths based on scope
    var pathAndProjection = options.setProjection.apply(self, [options.element, options] );

    this.path = pathAndProjection.path;
    this.projection = pathAndProjection.projection;

    //if custom URL for topojson data, retrieve it and render
    if ( options.geographyConfig.dataUrl ) {
      d3.json( options.geographyConfig.dataUrl, function(error, results) {
        if ( error ) throw new Error(error);
        self.customTopo = results;
        draw( results );
      });
    }
    else {
      draw( this[options.scope + 'Topo'] || options.geographyConfig.dataJson);
    }

    return this;

      function draw (data) {
        // if fetching remote data, draw the map first then call `updateChoropleth`
        if ( self.options.dataUrl ) {
          //allow for csv or json data types
          d3[self.options.dataType](self.options.dataUrl, function(data) {
            //in the case of csv, transform data to object
            if ( self.options.dataType === 'csv' && (data && data.slice) ) {
              var tmpData = {};
              for(var i = 0; i < data.length; i++) {
                tmpData[data[i].id] = data[i];
              }
              data = tmpData;
            }
            Datamaps.prototype.updateChoropleth.call(self, data);
          });
        }
        drawSubunits.call(self, data);
        handleGeographyConfig.call(self);

        if ( self.options.geographyConfig.popupOnHover || self.options.bubblesConfig.popupOnHover) {
          hoverover = d3.select( self.options.element ).append('div')
            .attr('class', 'datamaps-hoverover')
            .style('z-index', 10001)
            .style('position', 'absolute');
        }

        //fire off finished callback
        self.options.done(self);
      }
  };
  /**************************************
                TopoJSON
  ***************************************/
  Datamap.prototype.worldTopo = '__WORLD__';
  Datamap.prototype.abwTopo = '__ABW__';
  Datamap.prototype.afgTopo = '__AFG__';
  Datamap.prototype.agoTopo = '__AGO__';
  Datamap.prototype.aiaTopo = '__AIA__';
  Datamap.prototype.albTopo = '__ALB__';
  Datamap.prototype.aldTopo = '__ALD__';
  Datamap.prototype.andTopo = '__AND__';
  Datamap.prototype.areTopo = '__ARE__';
  Datamap.prototype.argTopo = '__ARG__';
  Datamap.prototype.armTopo = '__ARM__';
  Datamap.prototype.asmTopo = '__ASM__';
  Datamap.prototype.ataTopo = '__ATA__';
  Datamap.prototype.atcTopo = '__ATC__';
  Datamap.prototype.atfTopo = '__ATF__';
  Datamap.prototype.atgTopo = '__ATG__';
  Datamap.prototype.ausTopo = '__AUS__';
  Datamap.prototype.autTopo = '__AUT__';
  Datamap.prototype.azeTopo = '__AZE__';
  Datamap.prototype.bdiTopo = '__BDI__';
  Datamap.prototype.belTopo = '__BEL__';
  Datamap.prototype.benTopo = '__BEN__';
  Datamap.prototype.bfaTopo = '__BFA__';
  Datamap.prototype.bgdTopo = '__BGD__';
  Datamap.prototype.bgrTopo = '__BGR__';
  Datamap.prototype.bhrTopo = '__BHR__';
  Datamap.prototype.bhsTopo = '__BHS__';
  Datamap.prototype.bihTopo = '__BIH__';
  Datamap.prototype.bjnTopo = '__BJN__';
  Datamap.prototype.blmTopo = '__BLM__';
  Datamap.prototype.blrTopo = '__BLR__';
  Datamap.prototype.blzTopo = '__BLZ__';
  Datamap.prototype.bmuTopo = '__BMU__';
  Datamap.prototype.bolTopo = '__BOL__';
  Datamap.prototype.braTopo = '__BRA__';
  Datamap.prototype.brbTopo = '__BRB__';
  Datamap.prototype.brnTopo = '__BRN__';
  Datamap.prototype.btnTopo = '__BTN__';
  Datamap.prototype.norTopo = '__NOR__';
  Datamap.prototype.bwaTopo = '__BWA__';
  Datamap.prototype.cafTopo = '__CAF__';
  Datamap.prototype.canTopo = '__CAN__';
  Datamap.prototype.cheTopo = '__CHE__';
  Datamap.prototype.chlTopo = '__CHL__';
  Datamap.prototype.chnTopo = '__CHN__';
  Datamap.prototype.civTopo = '__CIV__';
  Datamap.prototype.clpTopo = '__CLP__';
  Datamap.prototype.cmrTopo = '__CMR__';
  Datamap.prototype.codTopo = '__COD__';
  Datamap.prototype.cogTopo = '__COG__';
  Datamap.prototype.cokTopo = '__COK__';
  Datamap.prototype.colTopo = '__COL__';
  Datamap.prototype.comTopo = '__COM__';
  Datamap.prototype.cpvTopo = '__CPV__';
  Datamap.prototype.criTopo = '__CRI__';
  Datamap.prototype.csiTopo = '__CSI__';
  Datamap.prototype.cubTopo = '__CUB__';
  Datamap.prototype.cuwTopo = '__CUW__';
  Datamap.prototype.cymTopo = '__CYM__';
  Datamap.prototype.cynTopo = '__CYN__';
  Datamap.prototype.cypTopo = '__CYP__';
  Datamap.prototype.czeTopo = '__CZE__';
  Datamap.prototype.deuTopo = '__DEU__';
  Datamap.prototype.djiTopo = '__DJI__';
  Datamap.prototype.dmaTopo = '__DMA__';
  Datamap.prototype.dnkTopo = '__DNK__';
  Datamap.prototype.domTopo = '__DOM__';
  Datamap.prototype.dzaTopo = '__DZA__';
  Datamap.prototype.ecuTopo = '__ECU__';
  Datamap.prototype.egyTopo = '__EGY__';
  Datamap.prototype.eriTopo = '__ERI__';
  Datamap.prototype.esbTopo = '__ESB__';
  Datamap.prototype.espTopo = '__ESP__';
  Datamap.prototype.estTopo = '__EST__';
  Datamap.prototype.ethTopo = '__ETH__';
  Datamap.prototype.finTopo = '__FIN__';
  Datamap.prototype.fjiTopo = '__FJI__';
  Datamap.prototype.flkTopo = '__FLK__';
  Datamap.prototype.fraTopo = '__FRA__';
  Datamap.prototype.froTopo = '__FRO__';
  Datamap.prototype.fsmTopo = '__FSM__';
  Datamap.prototype.gabTopo = '__GAB__';
  Datamap.prototype.psxTopo = '__PSX__';
  Datamap.prototype.gbrTopo = '__GBR__';
  Datamap.prototype.geoTopo = '__GEO__';
  Datamap.prototype.ggyTopo = '__GGY__';
  Datamap.prototype.ghaTopo = '__GHA__';
  Datamap.prototype.gibTopo = '__GIB__';
  Datamap.prototype.ginTopo = '__GIN__';
  Datamap.prototype.gmbTopo = '__GMB__';
  Datamap.prototype.gnbTopo = '__GNB__';
  Datamap.prototype.gnqTopo = '__GNQ__';
  Datamap.prototype.grcTopo = '__GRC__';
  Datamap.prototype.grdTopo = '__GRD__';
  Datamap.prototype.grlTopo = '__GRL__';
  Datamap.prototype.gtmTopo = '__GTM__';
  Datamap.prototype.gumTopo = '__GUM__';
  Datamap.prototype.guyTopo = '__GUY__';
  Datamap.prototype.hkgTopo = '__HKG__';
  Datamap.prototype.hmdTopo = '__HMD__';
  Datamap.prototype.hndTopo = '__HND__';
  Datamap.prototype.hrvTopo = '__HRV__';
  Datamap.prototype.htiTopo = '__HTI__';
  Datamap.prototype.hunTopo = '__HUN__';
  Datamap.prototype.idnTopo = '__IDN__';
  Datamap.prototype.imnTopo = '__IMN__';
  Datamap.prototype.indTopo = '__IND__';
  Datamap.prototype.ioaTopo = '__IOA__';
  Datamap.prototype.iotTopo = '__IOT__';
  Datamap.prototype.irlTopo = '__IRL__';
  Datamap.prototype.irnTopo = '__IRN__';
  Datamap.prototype.irqTopo = '__IRQ__';
  Datamap.prototype.islTopo = '__ISL__';
  Datamap.prototype.isrTopo = '__ISR__';
  Datamap.prototype.itaTopo = '__ITA__';
  Datamap.prototype.jamTopo = '__JAM__';
  Datamap.prototype.jeyTopo = '__JEY__';
  Datamap.prototype.jorTopo = '__JOR__';
  Datamap.prototype.jpnTopo = '__JPN__';
  Datamap.prototype.kabTopo = '__KAB__';
  Datamap.prototype.kasTopo = '__KAS__';
  Datamap.prototype.kazTopo = '__KAZ__';
  Datamap.prototype.kenTopo = '__KEN__';
  Datamap.prototype.kgzTopo = '__KGZ__';
  Datamap.prototype.khmTopo = '__KHM__';
  Datamap.prototype.kirTopo = '__KIR__';
  Datamap.prototype.knaTopo = '__KNA__';
  Datamap.prototype.korTopo = '__KOR__';
  Datamap.prototype.kosTopo = '__KOS__';
  Datamap.prototype.kwtTopo = '__KWT__';
  Datamap.prototype.laoTopo = '__LAO__';
  Datamap.prototype.lbnTopo = '__LBN__';
  Datamap.prototype.lbrTopo = '__LBR__';
  Datamap.prototype.lbyTopo = '__LBY__';
  Datamap.prototype.lcaTopo = '__LCA__';
  Datamap.prototype.lieTopo = '__LIE__';
  Datamap.prototype.lkaTopo = '__LKA__';
  Datamap.prototype.lsoTopo = '__LSO__';
  Datamap.prototype.ltuTopo = '__LTU__';
  Datamap.prototype.luxTopo = '__LUX__';
  Datamap.prototype.lvaTopo = '__LVA__';
  Datamap.prototype.macTopo = '__MAC__';
  Datamap.prototype.mafTopo = '__MAF__';
  Datamap.prototype.marTopo = '__MAR__';
  Datamap.prototype.mcoTopo = '__MCO__';
  Datamap.prototype.mdaTopo = '__MDA__';
  Datamap.prototype.mdgTopo = '__MDG__';
  Datamap.prototype.mdvTopo = '__MDV__';
  Datamap.prototype.mexTopo = '__MEX__';
  Datamap.prototype.mhlTopo = '__MHL__';
  Datamap.prototype.mkdTopo = '__MKD__';
  Datamap.prototype.mliTopo = '__MLI__';
  Datamap.prototype.mltTopo = '__MLT__';
  Datamap.prototype.mmrTopo = '__MMR__';
  Datamap.prototype.mneTopo = '__MNE__';
  Datamap.prototype.mngTopo = '__MNG__';
  Datamap.prototype.mnpTopo = '__MNP__';
  Datamap.prototype.mozTopo = '__MOZ__';
  Datamap.prototype.mrtTopo = '__MRT__';
  Datamap.prototype.msrTopo = '__MSR__';
  Datamap.prototype.musTopo = '__MUS__';
  Datamap.prototype.mwiTopo = '__MWI__';
  Datamap.prototype.mysTopo = '__MYS__';
  Datamap.prototype.namTopo = '__NAM__';
  Datamap.prototype.nclTopo = '__NCL__';
  Datamap.prototype.nerTopo = '__NER__';
  Datamap.prototype.nfkTopo = '__NFK__';
  Datamap.prototype.ngaTopo = '__NGA__';
  Datamap.prototype.nicTopo = '__NIC__';
  Datamap.prototype.niuTopo = '__NIU__';
  Datamap.prototype.nldTopo = '__NLD__';
  Datamap.prototype.nplTopo = '__NPL__';
  Datamap.prototype.nruTopo = '__NRU__';
  Datamap.prototype.nulTopo = '__NUL__';
  Datamap.prototype.nzlTopo = '__NZL__';
  Datamap.prototype.omnTopo = '__OMN__';
  Datamap.prototype.pakTopo = '__PAK__';
  Datamap.prototype.panTopo = '__PAN__';
  Datamap.prototype.pcnTopo = '__PCN__';
  Datamap.prototype.perTopo = '__PER__';
  Datamap.prototype.pgaTopo = '__PGA__';
  Datamap.prototype.phlTopo = '__PHL__';
  Datamap.prototype.plwTopo = '__PLW__';
  Datamap.prototype.pngTopo = '__PNG__';
  Datamap.prototype.polTopo = '__POL__';
  Datamap.prototype.priTopo = '__PRI__';
  Datamap.prototype.prkTopo = '__PRK__';
  Datamap.prototype.prtTopo = '__PRT__';
  Datamap.prototype.pryTopo = '__PRY__';
  Datamap.prototype.pyfTopo = '__PYF__';
  Datamap.prototype.qatTopo = '__QAT__';
  Datamap.prototype.rouTopo = '__ROU__';
  Datamap.prototype.rusTopo = '__RUS__';
  Datamap.prototype.rwaTopo = '__RWA__';
  Datamap.prototype.sahTopo = '__SAH__';
  Datamap.prototype.sauTopo = '__SAU__';
  Datamap.prototype.scrTopo = '__SCR__';
  Datamap.prototype.sdnTopo = '__SDN__';
  Datamap.prototype.sdsTopo = '__SDS__';
  Datamap.prototype.senTopo = '__SEN__';
  Datamap.prototype.serTopo = '__SER__';
  Datamap.prototype.sgpTopo = '__SGP__';
  Datamap.prototype.sgsTopo = '__SGS__';
  Datamap.prototype.shnTopo = '__SHN__';
  Datamap.prototype.slbTopo = '__SLB__';
  Datamap.prototype.sleTopo = '__SLE__';
  Datamap.prototype.slvTopo = '__SLV__';
  Datamap.prototype.smrTopo = '__SMR__';
  Datamap.prototype.solTopo = '__SOL__';
  Datamap.prototype.somTopo = '__SOM__';
  Datamap.prototype.spmTopo = '__SPM__';
  Datamap.prototype.srbTopo = '__SRB__';
  Datamap.prototype.stpTopo = '__STP__';
  Datamap.prototype.surTopo = '__SUR__';
  Datamap.prototype.svkTopo = '__SVK__';
  Datamap.prototype.svnTopo = '__SVN__';
  Datamap.prototype.sweTopo = '__SWE__';
  Datamap.prototype.swzTopo = '__SWZ__';
  Datamap.prototype.sxmTopo = '__SXM__';
  Datamap.prototype.sycTopo = '__SYC__';
  Datamap.prototype.syrTopo = '__SYR__';
  Datamap.prototype.tcaTopo = '__TCA__';
  Datamap.prototype.tcdTopo = '__TCD__';
  Datamap.prototype.tgoTopo = '__TGO__';
  Datamap.prototype.thaTopo = '__THA__';
  Datamap.prototype.tjkTopo = '__TJK__';
  Datamap.prototype.tkmTopo = '__TKM__';
  Datamap.prototype.tlsTopo = '__TLS__';
  Datamap.prototype.tonTopo = '__TON__';
  Datamap.prototype.ttoTopo = '__TTO__';
  Datamap.prototype.tunTopo = '__TUN__';
  Datamap.prototype.turTopo = '__TUR__';
  Datamap.prototype.tuvTopo = '__TUV__';
  Datamap.prototype.twnTopo = '__TWN__';
  Datamap.prototype.tzaTopo = '__TZA__';
  Datamap.prototype.ugaTopo = '__UGA__';
  Datamap.prototype.ukrTopo = '__UKR__';
  Datamap.prototype.umiTopo = '__UMI__';
  Datamap.prototype.uryTopo = '__URY__';
  Datamap.prototype.usaTopo = '__USA__';
  Datamap.prototype.usgTopo = '__USG__';
  Datamap.prototype.uzbTopo = '__UZB__';
  Datamap.prototype.vatTopo = '__VAT__';
  Datamap.prototype.vctTopo = '__VCT__';
  Datamap.prototype.venTopo = '__VEN__';
  Datamap.prototype.vgbTopo = '__VGB__';
  Datamap.prototype.virTopo = '__VIR__';
  Datamap.prototype.vnmTopo = {"type":"Topology","objects":{"vnm":{"type":"GeometryCollection","geometries":[{"type":"MultiPolygon","properties":{"name":null},"id":"-99","arcs":[[[0]],[[1]],[[2]],[[3]],[[4]],[[5]],[[6]],[[7]],[[8]],[[9]],[[10]]]},{"type":"MultiPolygon","properties":{"name":"Quảng Ninh"},"id":"VN.QN","arcs":[[[11]],[[12]],[[13]],[[14]],[[15]],[[16]],[[17]],[[18]],[[19]],[[20]],[[21]],[[22]],[[23]],[[24]],[[25]],[[26]],[[27]],[[28]],[[29]],[[30]],[[31]],[[32]],[[33]],[[34]],[[35]],[[36]],[[37]],[[38]],[[39]],[[40]],[[41]],[[42]],[[43]],[[44]],[[45]],[[46]],[[47]],[[48]],[[49,50,51,52,53]]]},{"type":"Polygon","properties":{"name":"Tây Ninh"},"id":"VN.TN","arcs":[[54,55,56,57,58]]},{"type":"Polygon","properties":{"name":"Điện Biên"},"id":"VN.DB","arcs":[[59,60,61]]},{"type":"Polygon","properties":{"name":"Đông Bắc"},"id":"VN.","arcs":[[62,63,64,65]]},{"type":"Polygon","properties":{"name":"Thái Nguyên"},"id":"VN.TY","arcs":[[66,67,68,69,70,-64]]},{"type":"Polygon","properties":{"name":"Lai Chau"},"id":"VN.LI","arcs":[[71,72,-62,73]]},{"type":"Polygon","properties":{"name":"Lạng Sơn"},"id":"VN.LS","arcs":[[74,-53,75,-67,-63,76]]},{"type":"Polygon","properties":{"name":"Son La"},"id":"VN.","arcs":[[77,78,79,80,81,-60,-73,82]]},{"type":"Polygon","properties":{"name":"Thanh Hóa"},"id":"VN.TH","arcs":[[83,84,85,86,87,-81]]},{"type":"Polygon","properties":{"name":"Tuyên Quang"},"id":"VN.TQ","arcs":[[-65,-71,88,89,90,91]]},{"type":"Polygon","properties":{"name":"Yên Bái"},"id":"VN.YB","arcs":[[-91,92,-78,93,94]]},{"type":"Polygon","properties":{"name":"Hòa Bình"},"id":"VN.HO","arcs":[[95,96,97,-84,-80,98]]},{"type":"Polygon","properties":{"name":"Hải Dương"},"id":"VN.HD","arcs":[[-51,99,100,101,102,103]]},{"type":"Polygon","properties":{"name":"Hải Phòng"},"id":"VN.","arcs":[[104,105,-100,-50]]},{"type":"Polygon","properties":{"name":"Đồng Bằng Sông Hồng"},"id":"VN.","arcs":[[-102,106,107,108,109]]},{"type":"Polygon","properties":{"name":"Ha Noi"},"id":"VN.","arcs":[[110,111,-109,112,-96,113,114,-69]]},{"type":"Polygon","properties":{"name":"Bắc Ninh"},"id":"VN.BN","arcs":[[-103,-110,-112,115]]},{"type":"Polygon","properties":{"name":"Vĩnh Phúc"},"id":"VN.VC","arcs":[[-115,116,-89,-70]]},{"type":"Polygon","properties":{"name":"Ninh Bình"},"id":"VN.NB","arcs":[[117,118,119,-85,-98]]},{"type":"Polygon","properties":{"name":"Hà Nam"},"id":"VN.HM","arcs":[[120,121,-118,-97,-113,-108]]},{"type":"Polygon","properties":{"name":"Nam Định"},"id":"VN.ND","arcs":[[122,-119,-122,123]]},{"type":"Polygon","properties":{"name":"Phú Thọ"},"id":"VN.PT","arcs":[[-117,-114,-99,-79,-93,-90]]},{"type":"Polygon","properties":{"name":"Bắc Giang"},"id":"VN.BG","arcs":[[-76,-52,-104,-116,-111,-68]]},{"type":"Polygon","properties":{"name":"Thái Bình"},"id":"VN.TB","arcs":[[124,-124,-121,-107,-101,-106]]},{"type":"Polygon","properties":{"name":"Ha Tinh"},"id":"VN.","arcs":[[125,126,127,128]]},{"type":"Polygon","properties":{"name":"Nghệ An"},"id":"VN.NA","arcs":[[129,-128,130,-87]]},{"type":"Polygon","properties":{"name":"Quảng Bình"},"id":"VN.QB","arcs":[[131,132,133,-126]]},{"type":"Polygon","properties":{"name":"Dak Lak"},"id":"VN.","arcs":[[134,135,136,137,138,139]]},{"type":"Polygon","properties":{"name":"Gia Lai"},"id":"VN.","arcs":[[140,141,-140,142,143,144]]},{"type":"MultiPolygon","properties":{"name":"Khánh Hòa"},"id":"VN.KH","arcs":[[[145]],[[146]],[[147,148,149,-136,150]]]},{"type":"Polygon","properties":{"name":"Lâm Đồng"},"id":"VN.LD","arcs":[[151,152,153,154,155,-137,-150]]},{"type":"Polygon","properties":{"name":"Ninh Thuận"},"id":"VN.NT","arcs":[[156,157,-152,-149]]},{"type":"Polygon","properties":{"name":"Phú Yên"},"id":"VN.PY","arcs":[[-151,-135,-142,158,159]]},{"type":"Polygon","properties":{"name":"Bình Dương"},"id":"VN.BI","arcs":[[160,161,-56,162]]},{"type":"MultiPolygon","properties":{"name":"Tiền Giang"},"id":"VN.TG","arcs":[[[163]],[[164,165,166,167,168]]]},{"type":"Polygon","properties":{"name":"Đắk Nông"},"id":"VN.","arcs":[[-156,169,170,-138]]},{"type":"Polygon","properties":{"name":"Bình Phước"},"id":"VN.BP","arcs":[[-155,171,-163,-55,172,-170]]},{"type":"Polygon","properties":{"name":"Bình Định"},"id":"VN.BD","arcs":[[173,-159,-141,174]]},{"type":"Polygon","properties":{"name":"Kon Tum"},"id":"VN.","arcs":[[175,-144,176,177]]},{"type":"Polygon","properties":{"name":"Quàng Nam"},"id":"VN.","arcs":[[178,179,180,-178,181,182]]},{"type":"Polygon","properties":{"name":"Quảng Ngãi"},"id":"VN.QG","arcs":[[-175,-145,-176,-181,183]]},{"type":"Polygon","properties":{"name":"Quảng Trị"},"id":"VN.QT","arcs":[[184,185,-133,186]]},{"type":"Polygon","properties":{"name":"Thừa Thiên - Huế"},"id":"VN.TT","arcs":[[187,-183,188,-185,189]]},{"type":"Polygon","properties":{"name":"Đà Nẵng"},"id":"VN.DA","arcs":[[190,-179,-188]]},{"type":"MultiPolygon","properties":{"name":"Bà Rịa - Vũng Tàu"},"id":"VN.BV","arcs":[[[191]],[[192,193]],[[194,195,196,197,198]]]},{"type":"MultiPolygon","properties":{"name":"Bình Thuận"},"id":"VN.BU","arcs":[[[199]],[[200,-195,201,-153,-158]]]},{"type":"Polygon","properties":{"name":"Đông Nam Bộ"},"id":"VN.","arcs":[[-202,-199,202,-193,203,204,-161,-172,-154]]},{"type":"Polygon","properties":{"name":"An Giang"},"id":"VN.AG","arcs":[[205,206,207,208]]},{"type":"Polygon","properties":{"name":"Can Tho"},"id":"VN.","arcs":[[209,210,211,-207,212]]},{"type":"Polygon","properties":{"name":"Ð?ng Tháp"},"id":"VN.DT","arcs":[[213,-168,-213,-206,214]]},{"type":"MultiPolygon","properties":{"name":"Hồ Chí Minh city"},"id":"VN.HC","arcs":[[[-197,215]],[[216]],[[217]],[[218]],[[-205,219,220,-57,-162]]]},{"type":"MultiPolygon","properties":{"name":"Kiên Giang"},"id":"VN.KG","arcs":[[[221]],[[-208,-212,222,223,224,225]]]},{"type":"Polygon","properties":{"name":"Long An"},"id":"VN.LA","arcs":[[-221,226,-169,-214,227,-58]]},{"type":"MultiPolygon","properties":{"name":"Bến Tre"},"id":"VN.BR","arcs":[[[228]],[[229,230,-166]]]},{"type":"Polygon","properties":{"name":"Hau Giang"},"id":"VN.","arcs":[[231,232,233,-223,-211,234]]},{"type":"Polygon","properties":{"name":"Bạc Liêu"},"id":"VN.BL","arcs":[[235,236,-224,-234,237]]},{"type":"Polygon","properties":{"name":"Cà Mau"},"id":"VN.CM","arcs":[[-237,238,-225]]},{"type":"MultiPolygon","properties":{"name":"Sóc Trăng"},"id":"VN.ST","arcs":[[[239]],[[240]],[[-238,-233,241]]]},{"type":"Polygon","properties":{"name":"Trà Vinh"},"id":"VN.TV","arcs":[[242,243]]},{"type":"Polygon","properties":{"name":"Vĩnh Long"},"id":"VN.VL","arcs":[[-231,244,-243,245,-235,-210,-167]]},{"type":"Polygon","properties":{"name":"Cao Bằng"},"id":"VN.CB","arcs":[[-77,-66,246,247]]},{"type":"Polygon","properties":{"name":"Hà Giang"},"id":"VN.HG","arcs":[[-247,-92,-95,248,249]]},{"type":"Polygon","properties":{"name":"Lào Cai"},"id":"VN.LO","arcs":[[-249,-94,-83,-72,250]]}]}},"arcs":[[[3705,4],[-16,-4],[-12,6],[11,6],[17,10],[6,0],[1,-8],[-9,-4],[2,-6]],[[1846,580],[-26,-4],[-1,11],[-12,7],[49,3],[15,-3],[-15,-7],[-10,-7]],[[3054,835],[0,-6],[-17,8],[5,15],[2,7],[9,1],[-2,-10],[4,-10],[-1,-5]],[[3458,932],[-10,-10],[-18,-3],[-14,3],[-6,0],[-13,0],[-10,2],[5,2],[10,5],[11,5],[16,4],[7,-2],[11,-2],[11,-4]],[[9850,3478],[3,-6],[-3,-1],[-6,2],[-5,0],[-4,1],[-8,7],[-3,7],[7,-1],[12,-7],[7,-2]],[[9534,4652],[-16,-1],[-18,3],[-11,3],[1,3],[9,4],[16,1],[18,-1],[15,-3],[5,-4],[-7,-3],[-12,-2]],[[8733,5022],[-1,-3],[-5,1],[-8,5],[-25,9],[-1,1],[-1,4],[-7,3],[-10,1],[-9,1],[-5,4],[3,2],[15,5],[9,1],[41,-15],[4,-6],[0,-13]],[[5189,7320],[-8,-1],[-5,2],[-6,4],[-1,5],[5,3],[6,0],[5,1],[5,0],[6,-3],[2,-4],[-3,-3],[-6,-4]],[[7647,7833],[-4,-3],[-5,1],[-8,1],[-4,2],[6,3],[11,3],[8,1],[-1,-4],[-3,-4]],[[7271,8229],[-18,-4],[14,8],[0,2],[6,2],[5,4],[4,-2],[0,-3],[-11,-7]],[[7969,8570],[-8,-1],[-16,0],[-11,4],[1,4],[20,3],[8,0],[8,-2],[2,-4],[-4,-4]],[[6837,8243],[-6,-2],[-7,0],[-7,4],[-3,3],[2,2],[5,3],[5,4],[7,3],[5,-2],[-2,-8],[-1,-4],[1,-2],[1,-1]],[[7305,8258],[-13,-5],[-8,4],[7,3],[2,2],[13,3],[4,2],[-5,-9]],[[6804,8285],[4,-2],[2,2],[3,1],[3,-2],[0,-4],[3,0],[5,-3],[2,-4],[-1,-1],[-6,-1],[0,-1],[2,-1],[-4,-2],[1,-1],[1,-2],[-6,-2],[-4,0],[-9,9],[-1,4],[1,3],[-1,3],[-2,2],[-1,2],[3,1],[5,-1]],[[7204,8265],[-4,-4],[-3,0],[-4,3],[-4,2],[-3,2],[-2,7],[0,5],[5,5],[7,2],[9,-7],[5,-8],[-3,-5],[-3,-2]],[[7160,8291],[-1,-9],[-5,-1],[-7,4],[-8,2],[-11,-1],[-15,4],[-11,12],[-1,9],[5,0],[17,-9],[17,-2],[16,-5],[4,-4]],[[6348,8299],[18,-5],[10,0],[6,1],[4,-3],[-11,-4],[-17,-1],[-11,0],[-9,3],[-19,9],[-5,5],[-1,6],[6,3],[29,-14]],[[7044,8312],[-6,-3],[-10,0],[-2,-3],[-10,-1],[-7,-1],[-2,0],[4,3],[4,0],[1,2],[2,1],[-6,-1],[-6,0],[1,2],[9,1],[9,2],[-4,2],[6,4],[4,-1],[0,-1],[0,-4],[6,-1],[7,-1]],[[6781,8310],[3,-3],[7,-4],[-1,-2],[-8,0],[-12,7],[-6,-1],[-4,-1],[-4,2],[-2,3],[2,2],[4,1],[3,2],[4,2],[4,2],[5,0],[2,-2],[-2,-3],[0,-2],[5,-3]],[[6502,8326],[1,-7],[2,-5],[-8,0],[-1,-1],[2,-3],[-1,0],[-21,4],[0,4],[9,0],[0,1],[-3,1],[4,2],[1,2],[-1,2],[6,-1],[-1,2],[-1,4],[12,-5]],[[6630,8317],[14,-6],[9,0],[1,11],[14,2],[18,-3],[14,-6],[0,-4],[-4,-7],[16,-5],[22,-3],[12,1],[10,0],[5,-5],[6,-3],[7,-4],[10,-2],[-29,3],[-9,2],[0,-5],[7,-2],[4,-2],[8,-5],[-16,1],[-10,5],[-12,12],[-5,-6],[1,-5],[5,-4],[9,-3],[0,-4],[-18,-4],[-13,0],[-12,3],[-13,5],[6,-14],[42,-11],[8,-12],[-10,0],[0,5],[-8,0],[-7,-12],[-12,-11],[0,14],[-10,-2],[-4,-1],[-5,-2],[0,5],[-9,-5],[-6,3],[-4,2],[0,4],[29,0],[0,5],[-6,1],[-1,1],[0,1],[-3,2],[-9,0],[0,-5],[-10,0],[-5,3],[-8,3],[-5,3],[-10,0],[6,-7],[4,-2],[0,-5],[-27,9],[-31,20],[-17,8],[-39,12],[-15,9],[4,12],[32,5],[9,3],[5,5],[0,5],[2,5],[12,4],[-10,-5],[19,-9],[42,-3]],[[6293,8332],[9,-2],[11,-9],[6,-7],[-1,0],[-15,3],[-7,5],[0,2],[-2,0],[-7,0],[-7,1],[-3,2],[-5,0],[-5,2],[0,2],[-3,0],[0,2],[4,1],[6,3],[11,-4],[8,-1]],[[6923,8326],[-3,0],[-3,2],[-4,2],[-3,0],[-16,6],[2,2],[7,1],[6,-1],[14,-5],[3,-3],[-3,-4]],[[7108,8342],[7,-2],[6,1],[14,1],[22,-1],[14,-2],[4,-4],[-4,-3],[-4,-1],[0,-2],[0,-1],[-2,-2],[-19,-4],[-9,0],[-9,0],[-9,4],[-15,8],[-4,-1],[-7,1],[-4,4],[2,4],[7,1],[10,-1]],[[7065,8342],[13,-12],[-11,4],[-10,5],[-11,7],[-9,7],[2,1],[10,-4],[16,-8]],[[7066,8357],[6,-5],[5,-8],[4,-7],[-3,0],[-13,7],[-4,9],[-3,0],[3,2],[5,2]],[[6420,8336],[7,-9],[49,-30],[7,-17],[-18,-4],[-23,2],[-12,3],[-7,11],[-27,26],[-4,16],[-7,-6],[-2,-6],[2,-6],[7,-5],[-10,0],[-18,5],[-21,2],[-18,4],[-6,12],[10,19],[16,17],[54,-10],[15,-9],[6,-15]],[[6627,8361],[-2,0],[-2,0],[-6,2],[-4,2],[-7,5],[19,4],[8,0],[0,-5],[-3,-4],[-3,-4]],[[6576,8376],[-9,-5],[-22,5],[6,8],[25,-8]],[[7168,8387],[-4,-6],[-28,-12],[-16,-3],[-7,0],[-32,3],[-11,3],[-3,4],[14,0],[11,2],[7,1],[10,-6],[1,-1],[5,4],[6,1],[12,1],[16,9],[5,0],[1,-2],[3,0],[2,4],[5,1],[3,-1],[0,-2]],[[7156,8352],[-38,-2],[-4,3],[31,3],[44,6],[11,2],[9,7],[4,7],[3,2],[10,3],[9,5],[11,4],[9,-2],[-13,-13],[-16,-9],[-6,-2],[-11,-5],[-53,-9]],[[7286,8292],[-18,0],[22,24],[3,10],[-16,8],[0,4],[28,1],[20,2],[14,6],[13,9],[32,31],[5,11],[5,-2],[2,-2],[2,-5],[-8,-16],[-11,-11],[-65,-44],[-8,-7],[-10,-14],[-10,-5]],[[6709,8385],[-20,-4],[-11,1],[-10,1],[-4,3],[16,13],[8,0],[2,2],[7,1],[10,-1],[9,-7],[5,-3],[1,-3],[-13,-3]],[[6315,8402],[1,-4],[-7,0],[-2,0],[3,-1],[6,-1],[2,-4],[1,-3],[-2,-4],[-6,-4],[-29,2],[-15,2],[-19,0],[-16,1],[-12,4],[-10,9],[1,5],[8,2],[9,-2],[5,-3],[10,-3],[23,-3],[8,3],[-6,5],[0,5],[6,4],[9,2],[7,-1],[12,-4],[13,-7]],[[7715,8411],[0,-4],[-14,3],[-4,1],[-9,0],[7,-13],[-10,-10],[-20,-8],[-24,-5],[26,22],[2,8],[-7,4],[-14,3],[-8,6],[10,12],[18,-3],[47,-16]],[[7762,8409],[-13,-1],[-1,12],[12,13],[22,7],[20,-1],[-5,-9],[-12,-6],[-23,-15]],[[7362,8443],[0,-13],[18,10],[8,2],[8,-2],[-5,-9],[-21,-24],[-14,-24],[-9,-9],[-14,-9],[-19,-5],[-22,-2],[-33,-2],[-61,-7],[-24,-1],[0,4],[40,8],[37,9],[31,12],[24,12],[-4,7],[5,11],[17,19],[5,-2],[15,-3],[4,6],[14,12]],[[7428,8495],[1,-5],[-2,-5],[-11,-12],[-9,-2],[-5,-2],[-1,-4],[-14,-3],[-21,-8],[-2,-3],[-22,-4],[-7,-1],[-8,-4],[-10,-1],[-4,1],[12,7],[12,3],[10,4],[11,8],[4,-1],[1,-2],[2,0],[3,1],[2,2],[-11,4],[-1,2],[3,2],[7,3],[1,2],[4,3],[7,3],[9,9],[7,2],[4,-2],[4,-1],[5,0],[12,4],[7,0]],[[7439,8422],[-14,-17],[-27,2],[14,3],[2,4],[-3,6],[-3,8],[4,6],[20,9],[4,7],[2,15],[3,6],[4,5],[5,3],[32,15],[9,3],[6,-1],[-1,-5],[-48,-49],[-9,-20]],[[7431,8508],[-3,-5],[-21,-9],[-4,1],[-5,4],[1,3],[4,2],[5,3],[6,-1],[8,1],[9,1]],[[7540,8513],[-8,-3],[-1,5],[17,33],[6,6],[7,3],[1,-2],[-22,-42]],[[7474,8572],[-6,0],[-16,3],[6,3],[47,11],[1,-2],[1,-2],[-2,-2],[-31,-11]],[[7433,8589],[-8,-1],[-17,-1],[-8,-2],[-8,3],[-10,0],[-8,2],[3,4],[18,4],[21,1],[14,-4],[7,-4],[-4,-2]],[[7356,8552],[6,-3],[8,0],[10,3],[47,6],[30,5],[4,-1],[-6,-8],[-15,-9],[-45,-14],[-14,-10],[-11,0],[-20,2],[-27,-13],[-46,-30],[-15,-3],[-33,-6],[-17,-5],[-46,-18],[-22,8],[9,15],[20,17],[12,13],[2,8],[12,19],[7,20],[9,0],[10,-6],[4,1],[2,6],[6,3],[12,2],[-6,4],[-1,10],[2,18],[4,8],[3,4],[5,3],[6,1],[5,0],[5,-1],[6,-1],[14,-5],[32,-19],[9,-3],[9,0],[7,-2],[3,-6],[0,-6],[1,-4],[3,-3]],[[7380,8604],[5,0],[10,1],[-5,-4],[-9,-3],[-10,-3],[-10,-2],[-10,7],[8,4],[3,3],[9,-1],[9,-2]],[[7670,8604],[-3,0],[-4,2],[7,5],[16,2],[6,0],[8,1],[13,0],[8,-2],[-5,-1],[-17,0],[-11,-1],[-18,-6]],[[7589,8611],[-54,-16],[-1,1],[23,13],[25,6],[8,0],[-1,-4]],[[7738,8649],[-133,-27],[4,2],[15,9],[79,22],[22,4],[18,-2],[3,-1],[4,-3],[1,-2],[-3,-2],[-10,0]],[[7995,8682],[-53,-16],[-21,-3],[-11,5],[-8,0],[-11,-2],[-92,-15],[-18,-2],[3,7],[6,8],[8,-7],[2,-3],[6,6],[8,4],[10,3],[-28,0],[-34,-3],[0,4],[45,7],[11,2],[177,9],[0,-4]],[[6162,8428],[-9,0],[-53,5]],[[6100,8433],[-37,11],[-135,7],[-29,4],[-17,4],[-5,7],[-2,8],[2,8],[7,6],[15,5],[35,6],[16,4],[15,6],[14,8],[24,15],[17,14]],[[6020,8546],[290,-22],[88,1],[72,10],[64,4],[32,4],[22,6],[12,9],[11,13],[10,14],[14,42],[12,8],[10,5],[69,17]],[[6726,8657],[48,3],[36,4],[87,15],[32,9],[23,11],[15,10],[9,13],[0,10],[-4,10],[-29,27],[11,11],[12,8],[125,38]],[[7091,8826],[20,-9],[47,13],[37,18],[22,4],[27,-3],[15,-10],[5,-24],[17,-4],[24,-4],[14,-2],[11,0],[12,4],[11,11],[9,3],[24,2],[57,-4],[28,0],[80,8],[25,5],[53,18],[21,4],[21,1],[24,-2],[46,-5],[28,-6],[10,-6],[6,-9],[15,-11],[17,-8],[39,-13],[47,-23],[18,-3],[64,-30],[-29,-6],[-29,-14],[-26,-9],[-18,11],[0,7],[7,4],[8,3],[3,2],[-1,5],[-4,4],[-3,3],[-2,2],[-5,9],[-12,6],[-17,4],[-21,2],[3,-5],[-2,-3],[-10,-6],[-9,0],[-8,11],[-9,-6],[-11,-19],[-16,-3],[-10,4],[-4,10],[1,12],[-8,0],[-10,-5],[0,-4],[6,-3],[2,-2],[2,-9],[-10,0],[-9,9],[-9,-5],[-5,14],[-17,3],[-23,-3],[-20,-4],[0,-5],[22,0],[16,-2],[11,-6],[6,-10],[-19,4],[3,-4],[4,-10],[3,-4],[-14,0],[-11,-2],[-8,-3],[-4,-4],[9,-4],[-23,-19],[-25,1],[-12,-1],[-5,-2],[-8,-6],[-19,0],[-18,3],[-11,5],[-10,0],[-4,-3],[-4,-2],[0,-4],[8,-8],[-8,-5],[-18,-1],[-20,5],[3,-4],[0,-2],[0,-1],[7,-2],[0,-5],[-12,-3],[-4,-3],[4,-3],[12,-5],[-9,0],[-20,-4],[6,-1],[1,0],[1,-1],[2,-3],[-6,2],[-22,3],[-6,-17],[-6,-8],[-12,-3],[-23,0],[-15,3],[-11,4],[-10,7],[-6,8],[-3,7],[-7,5],[-18,2],[0,-2],[5,-7],[4,-7],[-5,-6],[0,-5],[17,-4],[-15,-2],[-30,0],[-27,2],[-4,0],[-13,1],[-14,4],[-7,6],[-8,2],[-48,5],[-9,-9],[10,-4],[37,-10],[0,-4],[-27,-6],[-43,1],[-33,-5],[0,-4],[8,-5],[-4,-4],[-8,-4],[-5,-6],[-3,-24],[-6,-8],[11,-4],[11,-2],[12,-1],[12,3],[-8,-30],[-9,-16],[-20,-9],[7,-6],[2,-4],[-5,-2],[-13,-2],[5,-10],[3,-10],[6,-8],[13,-4],[0,-4],[-22,-9],[-14,-3],[-19,-3],[-31,0],[-25,-1],[-18,-3],[-17,3],[-29,-1],[-29,-3],[-18,-4],[7,-1],[5,-2],[6,-1],[9,0],[0,-5],[-22,-2],[-29,-15],[5,-10],[-20,-1],[-15,-2],[-14,-1],[-16,4],[0,-5],[-21,9],[-66,5],[-26,5],[0,4],[40,24],[73,22],[0,4],[-18,0],[-17,-2],[-17,-3],[-13,-3],[-6,-5],[-2,-4],[-4,-4],[-12,-2],[-5,2],[1,5],[5,5],[4,3],[-6,1],[-1,1],[-3,2],[-11,-11],[-12,-5],[-7,3],[3,13],[-10,0],[1,-7],[-1,-7],[-4,-5],[-5,-4],[1,10],[-3,7],[-9,5],[-17,1],[0,-4],[5,-2],[7,-5],[7,-3],[-5,0],[-14,0],[19,-9],[-20,0],[-13,3],[-24,11],[-3,-9],[35,-14],[6,-9],[-12,-10],[-21,-4],[-26,-1],[-25,1],[-23,2],[-20,3],[-18,4],[-14,5],[-33,14],[-15,2],[-8,-7],[-5,4],[-5,1],[-9,-1],[40,-21],[17,-6],[28,-7],[8,-2],[6,-5],[3,-5],[5,-5],[15,-4],[0,-4],[-35,0],[-21,3],[-14,6],[-14,14],[-10,0],[2,-6],[4,-5],[5,-4],[8,-4],[-27,-18],[-11,4],[-11,14],[-25,9],[4,4],[-2,1],[-2,5],[-10,0],[-28,-4],[-31,7],[-14,10],[22,5],[25,1],[13,2],[5,4],[-1,7],[-9,3],[-14,3],[-6,5],[19,7],[-9,5],[-10,3],[-12,2],[-15,0],[3,-3],[3,-5],[3,-2],[-31,2],[-22,6],[-21,3],[-28,-6],[0,-5],[10,0],[0,-5],[-50,10],[-30,3],[-22,-3],[11,-2]],[[5868,2182],[35,-6],[15,-11],[22,-41],[4,-13],[-1,-8],[-6,-2],[-7,-1],[-7,0],[-14,-2]],[[5909,2098],[-46,-40],[-25,-15],[-13,-5],[-21,-10],[-11,-8],[-36,-37],[-8,-12],[-5,-13],[-2,-26],[2,-11],[5,-11],[8,-10],[15,-14],[8,-5],[5,-5],[5,-6],[3,-6],[3,-5],[5,-4],[9,-4],[23,-8],[17,-11],[12,-21]],[[5862,1811],[-15,-40],[-10,-13],[-15,-14],[-12,-10],[-38,-18]],[[5772,1716],[-47,20],[-18,5],[-18,3],[-9,-1],[-3,-4],[0,-6],[2,-6],[-4,-5],[-10,-4],[-112,-16],[-19,0],[-14,2],[-11,4]],[[5509,1708],[14,0],[10,4],[-15,13],[-22,39],[-16,11],[-25,9],[-23,2],[-21,-6],[-16,-15],[-13,14],[-19,11],[-47,20],[-21,11],[-33,25],[-20,9],[-73,9],[-28,10],[-14,18],[0,1],[-3,14],[-18,5],[-23,3],[-17,7],[-1,9],[22,50],[15,23],[4,10],[-2,10],[-21,36],[3,17],[-2,9],[-6,8],[-15,5],[-36,3],[-17,4],[-14,12],[-3,3],[4,13],[15,12],[18,9],[4,2],[27,11],[23,2],[65,-11],[39,-1],[16,9],[13,14],[37,19],[8,9],[4,9],[1,9],[31,16],[63,-5],[70,-11],[57,0],[94,-14],[26,-7],[10,-6],[20,-15],[12,-5],[18,-1],[77,10],[14,0],[14,-1],[19,-3],[30,-10],[17,-5],[18,1],[12,10],[-1,1]],[[1947,9010],[9,-90],[16,-53],[0,-21],[-10,-21],[-21,-18],[-27,-15],[-62,-25],[-20,-13],[-9,-11],[-7,-15],[-12,-9],[-13,-6],[-53,-11],[-15,-6],[-11,-8],[-2,-7],[5,-6],[10,-3],[8,-3],[4,-7],[-4,-9],[3,-8],[9,-6],[50,-19],[10,-10],[5,-15],[-4,-26],[-9,-19],[-26,-27],[-3,-9],[3,-11],[20,-24],[3,-14],[-10,-8],[-19,-4],[-23,-2],[-27,0],[-25,3],[-22,5],[-19,7],[-18,4],[-17,3],[-15,-1],[-9,-4],[-3,-5],[1,-7],[5,-11],[2,-12],[-5,-9],[-12,-7],[-29,-8],[-13,-8],[-6,-9],[-5,-24],[-16,-25],[-6,-22],[2,-19],[0,-2]],[[1505,8300],[-9,-1],[-16,0],[-14,2],[-18,6],[-11,3],[-14,2],[-25,1],[-14,3],[-9,3],[-20,9],[-39,23],[-25,19],[-42,43],[-31,30],[-21,12],[-34,7],[-20,-2],[-10,2],[-7,5],[-6,6],[-10,12],[-12,25],[-1,1],[-15,11],[-14,4],[-11,0],[-9,2],[-9,6],[0,7],[12,13],[2,6],[-7,8],[-13,7],[-18,6],[-20,4],[-30,0],[-26,-1],[-11,3],[16,13],[22,8],[46,5],[17,8],[5,11],[1,30],[5,14],[45,34],[2,7],[-19,2],[-26,-6],[-28,-8],[-20,-4],[62,47],[29,12],[51,29],[27,12],[1,2],[1,2],[-1,2],[-1,2],[-13,14],[-5,17],[1,46],[-2,7],[-5,8],[-12,8],[-7,2],[-7,-3],[-99,-20],[-23,-1],[-17,9],[-4,12],[4,27],[-12,31],[-26,10],[-24,-11],[-4,-54],[-16,-21],[-31,-18],[-42,-13],[-15,-2],[-71,0],[-6,-2],[-4,1],[-10,7],[-8,11],[-7,15],[-3,15],[7,39],[-13,28],[-47,48],[-42,16],[-60,9],[-51,13],[-16,25],[1,3],[2,2],[3,2],[4,2],[12,8],[-20,9],[-35,9],[-27,10],[-10,7],[-13,17],[-9,7],[-13,5],[-42,12],[-98,44],[-82,19],[-26,11],[-9,14],[-19,8],[-24,8],[-19,10],[-3,4],[5,8],[0,4],[-4,3],[-12,4],[-4,2],[-14,21],[-8,7],[-9,9],[14,9],[25,7],[23,3],[30,-3],[23,-6],[20,-1],[18,10],[7,12],[8,22],[14,13],[98,46]],[[280,9463],[74,7],[31,-1],[76,-8],[69,3],[20,-3],[19,-14],[19,-7],[13,-1],[10,-3],[13,-12],[92,-47],[24,-8],[52,-7],[49,-14],[54,-22],[32,-19],[23,-23],[11,-25],[0,-18],[4,-3],[12,-6],[11,-9],[21,0],[39,4],[26,-6],[11,-15],[8,-17],[17,-12],[23,-1],[120,8],[36,-5],[40,-12],[60,-25],[51,2],[118,-27],[27,4],[-5,3],[-10,3],[-10,4],[-4,5],[5,4],[78,45],[20,6],[30,0],[30,-6],[23,-9],[10,-11],[3,-16],[10,-9],[33,-14],[15,-8],[8,-12],[4,-13],[1,-14],[5,-4],[25,-7],[12,-1],[7,-3],[63,-50],[9,-4]],[[5540,9357],[24,-24],[13,-33],[9,-9],[35,-17],[8,-7],[2,-7],[-3,-8],[-24,-34],[-68,-58],[-11,-7],[-12,-5],[-14,-5],[-27,-6],[-14,-6],[-13,-10],[-5,-12],[-8,-59]],[[5432,9050],[-70,-5],[-15,-4],[-21,-4],[-13,-4],[-10,-7],[-15,-12],[-8,-4],[-32,-5],[-21,-6],[-64,-24],[-22,-6],[-23,-3],[-24,0],[-20,-1],[-15,-4],[-10,-7],[-7,-7],[-8,-6],[-10,-3],[-9,0],[-8,5],[-5,6],[-3,7],[-11,14],[-2,7],[-2,13],[-7,16],[1,11],[5,9],[0,9],[-3,7],[-5,6],[-2,7],[0,7],[-4,8],[-11,9],[-18,10],[-23,9],[-24,7],[-24,2],[-22,-1],[-52,-8],[-25,-6],[-26,-13],[-32,-23],[-36,-4]],[[4676,9052],[-16,31],[-49,40],[-12,14],[-8,16],[-9,35],[8,77],[7,18],[13,15],[15,15],[45,33],[48,26],[16,12],[12,16],[2,14],[-5,17],[-14,18],[-14,14],[-25,18]],[[4690,9481],[61,27],[49,31],[60,22],[22,5],[22,4],[16,0],[42,-5],[8,-2],[5,-5],[0,-7],[-4,-8],[-15,-18],[-3,-9],[0,-9],[5,-9],[8,-8],[23,-18],[8,-10],[5,-12],[9,-13],[15,-14],[38,-16],[25,-4],[26,-2],[20,2],[20,3],[21,7],[21,6],[34,6],[12,3],[13,4],[17,5],[70,9],[46,2],[22,-3],[13,-5],[1,-7],[-1,-6],[2,-6],[8,-5],[13,-5],[11,-5],[4,-6],[-1,-17],[4,-9],[12,-8],[21,-7],[42,-2]],[[5432,9050],[6,-33],[9,-18],[16,-17],[3,-8],[0,-15],[4,-4],[9,-2],[11,-1],[16,-3],[18,-7],[98,-61],[5,-7],[-3,-5],[-33,-13],[-30,-17],[-56,-41]],[[5505,8798],[-8,21],[-8,6],[-16,7],[-23,3],[-82,5],[-22,-1],[-12,-2],[-4,-6],[2,-8],[43,-71],[1,-13],[-7,-14],[-22,-18],[-21,-10],[-23,-5],[-22,0],[-16,1],[-14,0],[-13,-3],[-68,-54]],[[5170,8636],[-35,4],[-64,20],[-59,6],[-18,-1],[-9,-1],[-17,-5]],[[4968,8659],[-11,15],[-11,10],[-22,12],[-141,47],[-80,37]],[[4703,8780],[-30,9],[-13,7],[-12,7],[-20,20],[-5,18],[-1,25],[22,130],[21,30],[11,26]],[[1946,9519],[29,-11],[42,-36],[10,-15],[5,-15],[-4,-11],[-14,-8],[-16,-7],[-14,-8],[-1,-10],[15,-11],[34,-12],[28,-7],[26,-3],[23,-1],[23,2],[23,3],[28,1],[31,-4],[44,-14],[20,-12],[11,-12],[-2,-12],[-9,-12],[-30,-26],[-62,-35],[-17,-8],[-20,-6],[-68,-9],[-20,-6],[-17,-8],[-28,-20],[-12,-11],[-9,-11],[-22,-56]],[[1973,9108],[-40,-23],[-6,-11],[0,-13],[20,-51]],[[280,9463],[71,34],[10,9],[-2,1],[-6,6],[-8,4],[-12,4],[-10,5],[0,7],[9,5],[14,1],[16,-1],[14,2],[16,9],[11,11],[14,24],[24,13],[34,2],[36,-5],[29,-10],[14,-13],[4,-12],[9,-8],[31,-1],[10,3],[6,5],[8,5],[14,1],[7,-2],[20,-11],[8,-3],[27,-5],[55,-4],[28,-5],[80,-31],[26,-5],[58,-6],[25,-6],[18,-9],[11,-12],[8,-12],[47,-42],[12,-7],[23,-5],[50,-6],[45,-15],[27,-5],[27,0],[22,7],[5,11],[-6,10],[-1,10],[20,6],[22,1],[22,5],[69,22],[6,5],[-2,7],[-16,9],[-4,6],[16,19],[36,13],[82,20],[22,8],[11,7],[23,30],[54,43],[17,2],[30,-5],[18,-5],[16,-6],[14,-7],[11,-7],[20,-5],[3,-10],[-3,-11],[3,-12],[9,-10],[50,-37],[35,-18],[16,-5],[25,-2],[15,4],[43,30],[6,6],[-1,5]],[[6002,9355],[2,-4],[3,-25],[7,-10],[19,-9],[30,-5],[54,-1],[22,-9],[8,-8],[32,-49],[-3,-7],[-12,-5],[-17,-10],[4,-10],[9,-7],[10,-7],[7,-8],[0,-5],[-4,-11],[0,-5],[4,-4],[12,-6],[2,-3],[2,-18],[-7,-15],[-27,-32],[0,-6],[2,-6],[5,-6],[7,-4],[22,0],[20,7],[45,23],[8,1],[19,-3],[8,-3],[11,-7],[6,-3],[28,-7],[24,-1],[56,1],[33,-4],[17,-7],[11,-10],[19,-10],[29,-7],[24,2],[21,6],[24,4],[28,0],[24,-5],[15,-10],[1,-14],[-13,-11],[-19,-10],[-14,-11],[2,-13],[19,-10],[28,-4],[58,-5],[39,-12],[106,-42],[54,-7],[43,7],[39,2],[41,-20],[36,-49],[6,-2]],[[6726,8657],[-56,11],[-8,5],[-6,8],[0,21],[-9,10],[-14,2],[-19,-1],[-24,-4],[-29,0],[-30,5],[-17,11],[-14,14],[-36,23],[-20,16],[-13,15],[-4,11],[-8,9],[-16,3],[-22,-3],[-23,-6],[-18,-6],[-31,-14],[-15,-3],[-21,1],[-18,7],[-50,25],[-32,6],[-37,1],[-36,-2],[-33,-5],[-29,-8],[-26,-13],[-25,-15],[-43,-51],[-17,-14],[-24,-12],[-33,-8],[-50,-5],[-35,3],[-28,6],[-83,36],[-42,9],[-43,5],[-44,2],[-25,4],[-17,6],[-8,9],[-2,10],[12,17]],[[5540,9357],[44,19],[20,4],[24,4],[19,-1],[20,-3],[113,-35],[39,-7],[38,-2],[37,1],[31,2],[28,3],[45,11],[4,2]],[[2456,8898],[124,-23],[209,-18],[46,1],[39,6],[52,20],[24,6],[26,1],[26,-7],[21,-10],[11,-9],[-1,-12],[-28,-36],[-15,-24],[-8,-25],[-1,-20],[7,-18],[17,-17],[39,-18],[120,-33],[33,-3],[29,2],[91,26],[33,6],[29,0],[29,-5],[38,-11],[28,-5],[23,-1],[41,7],[20,0],[17,-5],[14,-10],[11,-11],[18,-12],[22,-4],[19,-2],[26,3]],[[3685,8637],[50,-53],[14,-31],[-6,-37],[3,-8],[6,-5],[23,-9],[19,-10]],[[3794,8484],[-37,-27],[-2,-10],[1,-5],[-1,-11],[16,-9],[16,-12],[13,-18],[113,-58],[11,-3],[12,-8],[100,-32],[5,-4],[3,-8],[-5,-1],[-11,-7],[-5,-7],[-34,-3],[-6,-3],[-20,-9],[-27,-7],[-26,-4],[-28,-2],[-118,3],[-22,-1],[-18,-4],[-14,-7],[-10,-14],[-2,-27],[6,-20]],[[3704,8166],[-44,-24],[-21,-5],[-25,-5],[-23,-1],[-21,3],[-22,5],[-49,17],[-21,9],[-45,12],[-40,0]],[[3393,8177],[2,3],[-20,9],[-77,12],[-71,16],[-22,11],[-13,21],[-18,9],[-28,2],[-31,-1],[-28,4],[-10,5],[-11,12],[-8,5],[-10,3],[-21,4],[-12,3],[-17,10],[-22,21],[-16,10],[-10,4],[-13,4],[-13,3],[-12,2],[-13,-1],[-31,-4],[-9,0],[-5,3],[-14,14],[-8,5],[-10,3],[-39,7],[-14,1],[-31,0],[-13,1],[-12,3],[-20,7],[-9,2],[-49,-1],[-63,-34],[-49,-4],[-16,0],[-14,-1],[-27,-6],[-100,-15],[-11,-3],[-20,-8],[-12,-4],[-14,0],[-28,2],[-15,-3],[-13,-7],[-14,-13],[-12,-13],[-5,-11],[3,-14],[5,-6],[-6,-5],[-27,-8],[-17,-2],[-12,-1],[-8,-3],[-7,-9],[2,-6],[14,-13],[1,-5],[-8,-4],[-15,-3],[-17,-3],[-12,0],[-15,1],[-6,1],[-4,3],[-30,12],[-52,27],[-27,7],[-84,8],[-14,0],[-11,2],[-11,3],[-11,3],[-14,9],[-25,22],[-17,8],[-19,3],[-7,-1],[-4,-5],[-9,-4],[-28,-7],[-3,0],[-34,-5],[-7,0],[-15,1],[-38,6],[-76,19],[-23,3],[-12,0],[-17,-3]],[[1973,9108],[49,5],[17,-3],[23,-9],[17,-13],[60,-73],[26,-23],[169,-85],[29,-12],[29,-4],[25,2],[39,5]],[[3704,8166],[42,-4],[63,-15],[26,-4],[173,-11],[27,1],[40,7],[30,3],[20,-3],[17,-7],[44,-29],[22,-10],[130,-41],[199,-47],[49,-9],[34,-4],[36,0]],[[4656,7993],[288,-114],[88,-27],[58,-15],[77,-10],[35,-11],[27,-9],[25,-7],[23,-4],[46,-2],[22,-2],[14,-4],[10,-7],[4,-6],[0,-5],[-2,-4],[-6,-3],[-7,-4],[-34,-11],[0,-3]],[[5324,7745],[-3,2],[-9,0],[-8,-9],[-15,-8],[-60,-26],[-12,-6],[-8,-11],[0,-6],[9,-10],[1,-7],[-29,-18],[-5,-10],[0,-19],[-4,-8],[-4,3],[-15,7],[-8,-7],[-20,-7],[-37,-9],[9,-5],[18,4],[39,2],[18,3],[-8,-9],[-24,-15],[-5,-10],[-9,-5],[-19,1],[-19,-1],[-9,-9],[-6,-11],[-31,-22],[-10,-11],[-3,-10],[0,-19],[-7,-7],[-2,15],[-18,2],[-18,-7],[1,-10],[6,4],[10,6],[3,4],[7,-6],[3,-7],[1,-7],[2,-3],[5,-1],[1,-24],[-15,-51],[6,-25],[-19,5],[-19,-19],[-19,4],[0,-4],[16,-6],[6,-7],[6,-19],[25,-22],[4,-10],[-29,9],[4,-6],[6,-8],[10,2],[6,-2],[-3,-13],[-3,-4]],[[5014,7262],[-58,13],[-86,6],[-18,5],[-75,35],[-27,9],[-20,4],[-15,4],[-13,6],[-35,26],[-23,12],[-37,11],[-32,3],[-64,-4],[-27,3],[-21,7],[-41,28],[-19,10],[-20,5],[-18,1],[-16,-2],[-13,-6],[-30,-14],[-12,-1],[-7,3],[-1,12],[2,27],[-2,14],[-12,14],[-20,13],[-78,32],[-30,18],[-29,30],[-11,19],[-3,16],[5,11],[11,9],[33,17],[10,8],[0,9],[-14,9],[-24,7],[-80,10],[-41,7],[-66,19],[-70,13],[-23,2]],[[3844,7742],[5,2],[5,10],[-2,8],[-4,8],[-3,12],[-4,6],[1,4],[4,2],[19,2],[4,2],[-10,11],[-52,16],[-19,13],[-1,15],[7,7],[-1,5],[-121,30],[-55,-1],[-61,-10],[-59,-5],[-46,11],[-5,8],[-1,14],[2,14],[5,8],[11,5],[12,-1],[10,2],[9,9],[1,6],[-2,8],[-4,7],[-5,6],[-20,7],[-51,9],[-22,7],[-32,21],[-18,4],[-195,-2],[-56,7],[-43,13],[9,12],[78,25],[29,26],[34,-12],[35,-3],[34,5],[30,11],[88,56],[9,15]],[[4703,8780],[-31,-10],[-22,-6],[-67,-11],[-39,-4],[-92,-1],[-103,12]],[[4349,8760],[-52,37],[-62,33],[-78,32],[-87,25]],[[4070,8887],[-19,9],[-10,8],[-7,14],[4,11],[16,19],[-9,13],[-23,15],[-91,46],[-17,12],[1,34],[-7,11],[-14,11],[-28,13],[-56,18],[-50,24],[-49,54]],[[3711,9199],[56,26],[55,39],[7,8],[5,8],[1,9],[-1,9],[2,10],[8,8],[16,6],[25,1],[22,-2],[39,-7],[15,0],[12,3],[11,7],[24,44],[9,12],[13,13],[18,12],[39,21],[15,11],[33,41],[7,12],[7,21],[13,6],[23,1],[52,-6],[148,-25],[86,-3],[127,-10],[92,7]],[[4070,8887],[-54,-17],[-26,-4],[-75,-8],[-36,-5],[-34,-8],[-33,-14],[-26,-16],[-18,-19],[-2,-30],[10,-25],[30,-43],[2,-16],[-16,-12],[-17,-9],[-90,-24]],[[2456,8898],[17,12],[18,19],[4,9],[-2,8],[-8,9],[-45,33],[-2,4],[4,5],[10,7],[23,12],[28,20],[24,28],[9,4],[14,-1],[15,-5],[39,-17],[24,-8],[24,-4],[29,-3],[57,-2],[24,-2],[21,-4],[17,-6],[14,-5],[12,-1],[12,3],[15,11],[6,11],[1,9],[-2,8],[4,5],[12,2],[14,-3],[34,-10],[113,-23],[33,-5],[26,-1],[22,5],[20,8],[15,11],[10,13],[1,12],[-5,12],[-13,14],[-58,46],[-10,14],[5,12],[19,11],[44,9],[30,1],[29,-4],[92,-29],[17,-3],[15,3],[17,9],[22,17],[20,10],[20,6],[18,3],[12,3],[3,8],[-3,9],[-19,20],[-4,21]],[[3413,9258],[30,7],[24,0],[29,-3],[25,-7],[21,-10],[34,-26],[29,-13],[36,-6],[32,-3],[38,2]],[[4336,8424],[93,7],[83,-2],[38,-5],[29,-7],[25,-9],[18,-11],[13,-11],[6,-10],[2,-8],[-3,-8],[-30,-25],[-5,-11],[3,-10],[11,-12],[21,-10],[111,-35],[23,-13],[14,-13],[18,-29],[14,-12],[22,-16],[16,-7],[19,-5],[19,-2],[26,-5],[21,-6],[43,-21]],[[4986,8128],[32,-51],[44,-49]],[[5062,8028],[-48,3],[-49,12],[-15,0],[-17,-3],[-45,-12],[-10,-4],[-2,-4],[2,-6],[8,-10],[5,-11],[3,-11],[-3,-10],[-11,-7],[-17,-3],[-28,2],[-25,7],[-74,28],[-21,6],[-18,1],[-14,-1],[-27,-12]],[[3794,8484],[15,-19],[11,-5],[19,-8],[136,-30],[100,-39],[31,-6],[28,-3],[48,1],[23,0],[115,-15],[27,-1],[23,3],[0,25],[-4,17],[-9,7],[-10,5],[-11,8]],[[6100,8433],[-16,-27],[0,-7],[-9,-7],[-17,-4],[-24,-1],[-16,-5],[-12,-8],[-3,-14],[3,-10],[-1,-8],[-9,-7],[-25,-6],[-18,-6],[-8,-11],[7,-8],[14,-7],[16,-5],[31,-7],[3,-6],[-10,-8],[-75,-33],[-15,-5],[-12,-3],[-59,-1]],[[5845,8229],[-218,-16]],[[5627,8213],[-89,43],[-30,9],[-42,15],[-16,12],[-7,13],[5,12],[10,13],[37,37],[-11,48]],[[5484,8415],[101,-8],[31,0],[40,3],[23,7],[16,8],[9,12],[3,13],[-2,14],[-22,42]],[[5683,8506],[43,36],[31,12],[45,11],[50,6],[48,1],[41,-3],[35,-7],[22,-7],[22,-9]],[[6162,8428],[3,0],[41,-8],[0,-4],[-9,2],[-28,2],[0,-4],[13,-6],[5,-7],[3,-7],[7,-7],[14,-4],[35,-1],[29,-6],[17,0],[12,-3],[5,-12],[-3,-8],[-12,-9],[-4,-8],[-9,0],[-28,14],[-24,-14],[11,-8],[26,-6],[24,-9],[11,-15],[-5,-15],[-17,-6],[-26,9],[10,-12],[19,-14],[23,-12],[23,-8],[8,5],[14,-11],[23,-35],[-28,9],[-12,6],[-5,5],[-7,4],[-16,-3],[-15,-5],[-4,-3],[-12,-1],[-10,-2],[-12,-1],[-17,0],[-39,5],[-18,-1],[0,-4],[34,-7],[21,-6],[1,-8],[-28,-11],[-18,-5],[-21,-4],[-23,-1],[-22,1],[-12,4],[-19,13],[-16,5],[8,-10],[2,-1]],[[6085,8180],[-4,1],[-12,-3],[-28,-3],[-8,-1],[-6,-2],[-4,-3],[-2,-4],[-4,-4],[-9,-4],[-12,-2],[-11,-1],[-35,0],[-9,-1],[-17,-3],[-9,-1],[-12,6],[-15,13],[-24,28],[-19,33]],[[5627,8213],[-32,-12],[-16,-4],[-21,-3],[-72,1],[-20,-2],[-19,-4],[-16,-7],[-1,-12]],[[5430,8170],[-48,-11],[-23,1],[-8,4],[-31,21],[-6,6],[-2,7],[3,7],[5,7],[2,5],[-3,4],[-14,3],[-18,1]],[[5287,8225],[-22,0],[-13,2],[-17,10],[-5,26],[-12,11],[-12,3],[-26,3],[-11,3],[-7,6],[-4,7],[-1,6],[0,7],[7,11],[10,11],[1,10],[-19,7],[-13,3],[-6,3],[-2,5],[5,11],[5,6],[2,5],[11,13],[16,5],[13,4],[97,7]],[[5284,8410],[24,5],[74,3],[102,-3]],[[5170,8636],[27,-27],[7,-15],[-1,-12]],[[5203,8582],[-28,-17],[-5,-9],[-4,-11],[1,-14],[5,-14],[9,-15],[14,-13],[17,-9],[44,-14],[19,-8],[17,-11],[4,-10],[-1,-9],[-11,-18]],[[5287,8225],[-27,-18],[-14,-4],[-30,-4],[-46,2],[-75,-14],[-22,0],[-15,2],[-9,2],[-9,-2],[-11,-9],[-11,-17],[-32,-35]],[[4336,8424],[-23,18],[-8,11],[3,14],[21,19],[5,15],[-7,10],[-15,9],[-11,11],[4,13],[25,12],[32,8],[22,12],[-4,23],[4,4],[8,9],[7,6],[27,5],[29,2],[27,-3],[15,-10],[5,-11]],[[4502,8601],[6,-16],[8,-11],[22,-18],[13,-8],[16,-7],[23,-9],[13,-2],[14,-2],[194,-4],[18,-2],[53,-14],[40,-15],[14,-4],[19,-2],[-2,10],[23,24],[2,15],[-18,56],[11,44],[-3,23]],[[5203,8582],[114,-24],[24,-4],[34,1],[18,-2],[25,-4],[151,-11],[18,-3],[32,-6],[16,-5],[24,-12],[24,-6]],[[4502,8601],[9,3],[14,4],[7,3],[8,6],[0,8],[-8,8],[-44,25],[-25,25],[-12,7],[-23,4],[-15,1],[-16,7],[-12,5],[-36,53]],[[5062,8028],[26,-17],[57,-21],[66,-17]],[[5211,7973],[4,-18],[13,-19],[18,-7],[20,-3],[39,-2],[12,-3],[26,-12],[12,-1],[13,2],[11,3],[10,2],[9,1],[7,0],[6,-1],[5,-3],[8,-5],[7,-2],[8,-2],[21,-1],[11,-1],[10,-3],[7,-5],[6,-9],[3,-10],[1,-10],[-13,-32],[-53,-62]],[[5432,7770],[-9,0],[-4,-11],[-21,-29],[-7,-6],[-20,2],[-22,6],[-18,8],[-7,5]],[[5430,8170],[18,-4],[4,-6],[3,-19],[8,-9],[30,-11],[13,-8],[6,-9],[7,-20],[9,-8]],[[5528,8076],[-40,-2],[-21,1],[-49,-4],[-20,1],[-24,-1],[-20,-7],[-22,-18],[-9,-13],[-10,-9],[-16,-5],[-13,-1],[-8,3],[-9,10],[-7,3],[-11,-1],[-14,-5],[-22,-19],[-2,-36]],[[5961,7948],[3,-2],[11,-2],[10,3],[6,7],[32,-12],[6,-3],[5,-6],[14,-11],[8,-10],[-4,-9],[-21,-5],[-18,1],[-16,-3],[-33,-3],[-43,-2],[-18,-2],[-88,-5],[0,5],[9,0],[0,4],[-10,0],[-6,-1],[-13,-3],[0,-5],[10,-4],[-9,-4],[-29,-5],[-9,-5],[-18,-18],[-47,-28],[-30,-9],[-33,-23],[-31,-8],[-33,-18],[-21,-6],[13,15],[6,3],[-10,5],[-10,-9],[-16,-20],[-11,-8],[-21,-5],[-50,-6],[-23,-7],[-8,10],[5,11],[8,11],[5,14],[-1,0]],[[5528,8076],[7,-3],[8,-2],[9,-1],[9,-1],[8,-4],[5,-4],[0,-5],[-5,-15],[0,-10],[7,-7],[20,-3],[37,1],[15,-3],[10,-9],[0,-9],[-7,-8],[-9,-7],[-5,-8],[4,-9],[15,-1],[18,3],[15,5],[28,13],[15,3],[21,-1],[7,-6],[43,-10],[11,-5],[21,-11],[55,-19],[7,-2],[9,-1],[17,0],[9,1],[8,1],[7,3],[12,6],[2,0]],[[6085,8180],[7,-6],[21,-10],[7,-3],[6,0],[4,-1],[2,-7],[-1,-4],[-4,-4],[-5,-3],[-22,-4],[-30,-13],[-87,-16],[24,-6],[19,1],[40,9],[0,-4],[-17,-10],[10,-10],[13,-10],[-6,-12],[-8,0],[-39,-7],[-4,-1],[-7,-2],[-10,-6],[-9,-6],[-6,-5],[8,0],[18,6],[32,6],[31,2],[14,-7],[-5,-29],[-9,-15],[-15,-9],[-7,6],[-2,3],[0,-2],[-1,-2],[-4,0],[-5,0],[25,-11],[3,-6],[5,-8],[3,-11],[4,-13],[5,-18],[-15,-8],[-30,15],[-13,8],[-17,7],[-21,3],[-24,-3],[-8,0],[6,-6]],[[5983,6381],[-12,-1],[-59,7],[-110,5],[-49,-4],[-24,-9],[-15,-9],[-14,-11],[-13,-7],[-31,-4],[-43,2],[-147,12],[-84,12],[-19,6],[-6,5],[0,6],[2,7],[-1,8],[-8,9],[-14,11],[-20,10],[-25,8],[-32,6],[-81,7],[-48,-1],[-43,-4],[-53,-10],[-88,-12],[-27,-5],[-35,-15],[-39,-13],[-66,-5],[-41,-3]],[[4738,6389],[-18,18],[-32,8],[-10,5],[-5,7],[-5,15],[-7,7],[-11,5],[-24,7],[-11,4],[-23,24],[-5,2],[-16,1],[-6,3],[1,1],[3,3],[3,4],[0,4],[-11,18],[-9,6],[-20,8],[-28,5],[-29,1],[-24,-5],[-8,-7],[-6,-14],[-6,-5],[-12,-4],[-4,1],[-3,3],[-10,2],[-22,3],[-25,5],[-22,7],[-14,10],[-1,7],[9,16],[-2,8],[-9,7],[-7,0],[-6,-2],[-36,-2],[-14,0],[-14,2],[-9,4],[-12,10],[-8,5],[-66,19],[-13,9],[-1,14],[8,8],[1,9],[-23,11],[-43,15],[-32,14],[-14,19],[7,27],[20,37],[18,20],[20,12],[17,1],[16,-2],[13,1],[10,11],[0,2]],[[4148,6823],[36,1],[107,4],[151,-22],[36,-3],[34,1],[31,3],[59,2],[152,-9],[7,-1],[17,0],[9,-3],[31,-5],[26,5],[20,16],[-3,0],[-4,4],[-2,5],[0,5],[6,2],[9,1],[9,2],[3,6],[8,6],[16,5],[33,5]],[[4939,6853],[26,6],[0,16],[-5,40],[-3,2],[26,-7],[9,-20],[1,-19],[6,-9],[9,-7],[33,-48],[72,-56],[49,-25],[47,-1],[3,-13],[10,-13],[12,-12],[13,-8],[31,-11],[10,-5],[52,-31],[71,-28],[16,-10],[3,-8],[-25,-3],[13,-5],[23,2],[29,5],[33,2],[21,-4],[71,-26],[10,-2],[29,-5],[12,-4],[38,-23],[45,-16],[19,-8],[11,-13],[-10,0],[-13,4],[-18,-1],[-16,-6],[-8,-6],[18,-4],[6,2],[5,1],[17,1],[-8,-8],[3,-6],[14,-13],[0,8],[4,8],[7,6],[7,5],[15,3],[9,-1],[9,-2],[15,0],[11,4],[26,15],[17,-4],[-2,-6],[-15,-13],[7,-14],[15,-14],[109,-64]],[[5014,7262],[-1,-1],[-11,-4],[-12,0],[-10,-1],[-12,-20],[-17,0],[-19,1],[-3,-3],[-17,-42],[-2,-24],[10,-17],[-34,-8],[-14,-4],[-8,-6],[-37,5],[-34,-16],[-26,-24],[-14,-20],[-1,-9],[7,-6],[3,-6],[2,-9],[10,-21],[7,-9],[18,-11],[30,-12],[33,-10],[30,-4],[0,-4],[-18,-9],[-6,6],[-8,4],[-11,3],[-13,0],[14,-15],[4,-3],[9,-2],[24,1],[10,-1],[28,-15],[15,-10],[8,-10],[-20,-27],[6,-5],[12,-5],[2,-13],[-4,-14],[-5,-9]],[[4148,6823],[0,9],[-9,5],[-29,10],[-39,30],[-17,2],[-16,-1],[-16,-2],[-16,0],[-33,5],[-69,19],[-22,2],[-23,-3],[-27,0],[-23,3],[-15,7],[-13,16],[-36,5],[-78,-3],[-19,1],[-53,8],[-55,3],[-16,3],[-11,4],[-16,12],[-7,3],[-13,3],[-26,1],[-14,2],[-21,6],[-37,18],[-19,7],[-46,11],[-16,7],[-47,33],[-16,8],[-23,7],[-26,3],[-42,-2],[-24,2],[-17,6],[-39,28],[-23,10],[-22,5],[-23,3],[-26,6],[-21,7],[-18,9],[-19,7],[-1,0],[-27,3],[-40,-5],[-11,6],[-1,12],[-5,13],[-14,6],[-54,18],[-151,32],[-28,3],[-28,-1],[-29,-6],[-2,0],[-40,14],[-34,8],[-10,4],[-7,4],[-18,16],[-22,1],[-24,0],[-14,3],[11,12],[18,6],[49,10],[21,8],[27,19],[16,6],[29,3],[31,8],[32,5],[20,1],[4,-2],[1,0],[10,10],[5,6],[6,16],[8,7],[14,4],[15,1],[11,3],[6,8],[-16,9],[-4,11],[-2,12],[-9,11],[-15,6],[-43,12],[-15,9],[-27,35],[-3,8],[7,11],[13,2],[16,-2],[65,-15],[26,-4],[28,2],[10,4],[10,10],[10,4],[6,3],[30,1],[57,7],[39,5],[18,-7],[48,-8],[25,-19],[63,18],[25,3],[27,-1],[16,-6],[13,-8],[19,-9],[11,-3],[35,-8],[77,-21],[23,-3],[32,2],[12,3],[20,6],[13,2],[11,-1],[24,-7],[12,1],[12,7],[43,53],[12,9],[17,9],[22,8],[17,2],[18,1],[26,3],[32,14],[34,7],[27,10],[13,21],[3,11],[-1,6],[-10,4],[-25,4],[-41,1],[-7,4],[9,12],[26,15],[74,21],[31,11],[12,9],[3,6],[6,3],[26,2],[40,-2],[18,1],[14,5]],[[5983,6381],[8,-5],[0,-4],[-28,-9],[-27,-10],[-14,-8],[-11,-9],[-15,-5],[-26,0],[0,-5],[15,-2],[6,-4],[-2,-6],[-9,-7],[12,-12],[12,-19],[13,-35],[7,-7],[27,-13],[4,-5],[-12,-5],[-15,0],[-40,9],[-18,15],[-14,4],[-20,2],[-49,12],[-93,4],[-19,4],[-10,-4],[20,-6],[31,-6],[33,-4],[46,-3],[66,-8],[0,-5],[-9,0],[-27,5],[-27,-8],[-4,-14],[39,-10],[-8,8],[-3,3],[-7,2],[30,7],[44,-3],[44,-8],[30,-9],[15,-9],[32,-28],[37,-20],[66,-53],[16,-22],[11,-10],[6,-1],[26,-11],[2,-2],[6,-2],[17,-12],[119,-63],[249,-87],[82,-29]],[[6647,5849],[-8,-3],[-134,-38],[-27,-14],[-36,-23],[-19,-19],[-17,-14],[-18,-11],[-42,-9],[-50,-3],[-219,7],[-41,-8],[-33,-6]],[[6003,5708],[0,15],[-12,11],[-38,-17],[-31,4],[-24,2],[-26,5],[-23,5],[-12,5],[-4,6],[-6,7],[-23,21],[1,3],[9,8],[1,3],[-14,12],[-66,29],[-41,32],[-7,10],[1,7],[11,11],[1,6],[-5,4],[-19,9],[-7,5],[-3,8],[1,7],[-3,5],[-16,4],[-17,-1],[-7,-4],[-3,-5],[-6,-6],[-20,-10],[-16,-4],[-20,1],[-29,7],[-226,92],[-119,67],[-28,15],[-89,54],[-35,16],[-45,13],[-70,15],[-17,6],[-13,11],[-17,26],[-12,11],[-30,19],[-36,31],[-52,23],[-15,23],[16,51],[-4,3]],[[8895,3063],[88,-67],[19,-11],[28,-10],[79,-24],[59,-15],[34,-5],[112,-12],[93,-19]],[[9407,2900],[-91,-38],[-11,-3],[-12,-2],[-28,1],[-13,-1],[-11,-2],[-11,-3],[-12,-7],[-12,-13],[-20,-28],[-2,-13],[3,-10],[5,-5],[0,-8],[-5,-9],[-14,-16],[-14,-22],[-9,-6],[-18,-4],[-17,2],[-48,14],[-14,2],[-14,0],[-14,-1],[-15,-3],[-25,-6],[-10,-1],[-9,0],[-30,3],[-10,-1],[-9,-3],[-7,-7],[-7,-13],[-2,-25],[5,-28],[18,-45]],[[8924,2599],[-58,-16],[-22,-3],[-26,-2],[-24,2],[-68,14],[-28,3],[-22,-1],[-21,-4],[-79,-32],[-23,-6],[-24,-1],[-57,5],[-18,-1],[-18,-5],[-21,-7],[-41,-10],[-20,-6],[-12,-6],[-4,-6],[-3,-11],[-8,-4],[-9,-1],[-8,1],[-11,3],[-13,1],[-29,1],[-39,4],[-19,0],[-14,-3],[-14,-5],[-14,-5]],[[8157,2498],[5,8],[3,5],[5,6],[4,7],[-2,7],[-6,3],[-31,11],[-25,20],[-9,8],[-25,7],[-16,11],[-23,5],[-26,3],[-21,1],[-22,2],[-16,5],[-35,26],[-9,11],[-5,12],[-1,15],[7,10],[18,7],[21,3],[19,-4],[14,8],[17,14],[7,13],[-15,6],[-8,2],[-17,9],[-74,12],[-16,5],[-3,5],[1,8],[4,6],[-51,18],[-14,61],[-30,25],[-240,0],[-170,-3]],[[7372,2876],[-4,20],[2,18],[-4,17],[-19,19],[-38,21],[-9,8],[-6,10],[-5,20],[-15,17],[-3,8],[2,7],[8,6],[7,3],[4,4],[-1,4],[-3,5],[-21,7],[-4,10],[138,161]],[[7401,3241],[41,10],[40,11],[56,20],[12,4],[13,2],[165,11],[172,-3],[23,2],[24,3],[92,21],[24,3],[28,0],[52,-3],[350,-59],[31,-11],[30,-18],[18,-16],[15,-18],[52,-85],[58,-28],[198,-24]],[[8904,4133],[22,-46],[5,-47],[-15,-56],[-56,-104],[1,-44],[11,-28],[21,-22],[22,-15],[41,-22],[13,-9],[5,-9],[-1,-12],[-5,-14],[-3,-17],[5,-16],[17,-17],[62,-41],[34,-30],[12,-19],[19,-55],[6,-72]],[[9120,3438],[-6,-85],[4,-14],[9,-13],[24,-23],[7,-13],[1,-11],[-3,-14],[2,-12],[4,-10],[21,-17],[6,-10],[-3,-9],[-13,-11],[-27,-14],[-44,-16],[-114,-30],[-29,-10],[-27,-13],[-30,-21],[-7,-29]],[[7401,3241],[18,21],[44,51],[4,20],[-8,66],[-10,24],[-112,106],[-24,16],[-32,17],[-2,3],[-13,10],[-26,15],[-7,10],[1,7],[8,14],[2,6],[-15,20],[6,11],[8,8],[3,8],[-2,8]],[[7244,3682],[28,7],[89,30],[54,23],[50,26],[29,23],[17,19],[21,17],[31,14],[53,17],[92,21],[497,76],[146,33],[103,34],[63,29],[39,29],[16,19],[4,14],[-1,8],[-5,6],[-15,11],[-3,5],[2,6],[9,3],[13,1],[19,0],[17,-2],[30,-7],[12,-2],[14,0],[169,21]],[[8837,4163],[67,-30]],[[9803,2545],[11,-3],[8,-3],[5,-4],[4,-4],[-6,-3],[-15,-5],[-7,-1],[-7,4],[-9,3],[-10,0],[-12,-3],[4,-1],[2,0],[1,0],[3,-3],[-27,1],[-25,7],[-20,8],[-13,7],[0,4],[9,-1],[20,-2],[9,-1],[0,2],[0,7],[25,-5],[50,-4]],[[9907,2778],[-6,-8],[-22,3],[-50,17],[-8,5],[-8,5],[-17,2],[-15,6],[11,9],[35,2],[31,-2],[20,-3],[9,-7],[5,-8],[10,-13],[5,-8]],[[9880,2954],[-10,-1],[-12,-5],[9,-5],[2,-8],[-2,-10],[1,-9],[61,-57],[21,-11],[20,-1],[25,-9],[4,-2],[-3,-6],[-8,-1],[-10,-2],[-8,-3],[-3,-10],[5,-27],[-2,-9],[-15,-4],[-14,8],[-17,20],[-5,3],[-6,2],[-6,3],[-2,7],[4,1],[24,11],[0,4],[-28,23],[-2,-6],[-8,-3],[-12,-1],[-15,1],[6,-6],[1,-5],[-1,-6],[-6,-6],[-8,7],[-9,5],[-13,2],[-16,0],[24,17],[4,3],[5,2],[13,3],[13,3],[6,7],[-5,10],[-24,15],[-8,9],[0,20],[-5,3],[-15,-2],[-5,-4],[-2,-5],[-6,-5],[-47,-15],[-13,-6],[-34,-20],[-19,-9],[-18,-3],[-12,-5],[-39,-27],[0,-6],[4,-26],[-10,-5],[1,-10],[5,-11],[0,-6],[4,-1],[3,0],[2,-1],[0,-3],[10,0],[4,7],[3,8],[5,6],[16,2],[0,4],[-10,0],[0,5],[23,-4],[-2,-9],[-13,-11],[-8,-10],[7,-12],[17,-9],[66,-21],[7,-5],[-13,-14],[1,-7],[6,-5],[7,-3],[20,-3],[24,-8],[13,-9],[-15,-7],[10,-5],[-10,-4],[-17,9],[-9,-6],[-9,-12],[-16,-6],[-20,4],[-14,8],[-18,16],[-59,32],[-42,13],[-39,-3],[7,-4],[8,-7],[4,-3],[-14,3],[-5,1],[-9,0],[7,-9],[21,-11],[9,-7],[27,2],[13,-10],[6,-16],[1,-15],[4,-6],[9,-7],[11,-6],[18,-5],[0,-6],[-8,-4],[-16,4],[-8,0],[-5,-5],[-14,-18],[-30,7],[-8,3],[8,-6],[12,-5],[27,-8],[-9,-10],[6,-8],[12,-7],[9,-7],[-35,5],[-14,-2],[-6,-8],[9,5],[19,-5],[7,-5],[2,-9],[2,-4],[0,-3],[2,-2],[10,-6],[7,-8],[-6,-6],[-15,-7],[-2,-6],[5,-28],[10,-12],[38,-35],[13,-7],[39,-13],[0,-4],[-5,-12],[0,-2],[-23,-10],[-1,-11],[7,-10],[13,-7],[19,-4],[0,-4],[-23,-5],[-22,1],[-19,5],[-11,8],[-5,-1],[-10,-2],[-5,-2],[-11,21],[8,48],[-15,23],[10,0],[-31,40],[-13,28],[-13,8],[-18,-11],[17,-16],[6,-3],[2,-2],[-7,-19],[8,-7],[32,-14],[7,-11],[-4,-19],[-13,-19],[-23,-18],[-35,-15],[-26,-2],[-15,-22],[8,-22],[43,-4],[6,6],[20,13],[21,11],[9,-1],[-5,-9],[-9,-9],[-2,-9],[16,-11],[-1,-15]],[[9634,2255],[-8,0],[-21,-1],[-17,0],[-49,4],[-27,3],[-21,7],[-17,8],[-17,14],[-10,22],[-8,9],[-14,7],[-23,7],[-86,12],[-89,7],[-19,5],[-17,7],[-14,15],[-9,11],[-25,27],[-31,46],[-14,15],[-24,14],[-20,8],[-79,16]],[[8975,2518],[-17,60],[-17,18],[-17,3]],[[9407,2900],[50,1],[20,5],[20,8],[40,23],[30,13],[28,8],[28,5],[27,2],[27,1],[57,-1],[61,2],[28,0],[25,-3],[15,-3],[17,-7]],[[8975,2518],[-21,-10],[-12,-7],[-11,-10],[-5,-12],[3,-14],[7,-11],[3,-15],[-16,-60],[-59,-90],[3,-20],[11,-12],[13,-9],[23,-11],[8,-6],[6,-7],[-2,-10],[-10,-13],[-29,-18],[-48,-21],[-13,-6],[-4,-10],[0,-7],[18,-34]],[[8840,2105],[-12,-9],[-16,-20],[-11,-7],[-15,-3],[-22,3],[-39,10],[-30,2],[-173,-3],[-28,-3],[-33,-7],[-19,-9],[-11,-8],[-6,-11],[-1,-12],[2,-12],[8,-10],[20,-18],[3,-7],[-4,-7],[-14,-8],[-27,-11],[-34,-12],[-40,-10],[-42,-8],[-58,-4],[-34,-5],[-28,-8],[-18,-10],[-35,-24],[-20,-8],[-16,-2],[-12,1],[-6,4],[-1,4],[3,5],[2,13],[-1,10],[-4,8],[-9,9],[-19,7],[-29,4],[-345,9],[-40,3],[-49,6],[-47,11],[-64,12]],[[7466,1970],[-112,27],[-59,4],[-21,-1],[-16,2],[-10,5],[-8,9],[0,7],[3,5],[6,4],[12,6],[4,3],[2,4],[-6,6],[-14,5],[-28,5],[-25,3],[-16,2],[-8,6],[-2,5],[2,12],[-1,4],[-2,4],[-3,3],[-7,2],[-10,1],[-38,0],[-52,3]],[[7057,2106],[-2,14],[-5,6],[-9,9],[-21,13],[-1,8],[5,10],[26,25],[19,11],[14,6],[85,23]],[[7168,2231],[41,-6],[15,0],[16,1],[30,3],[15,3],[18,8],[17,5],[23,3],[42,3],[18,3],[80,26],[73,32],[8,6],[8,10],[7,4],[13,2],[22,2],[14,0],[10,-2],[4,-4],[2,-3],[3,-10],[1,-4],[4,-4],[4,-2],[4,-2],[17,-6],[10,-3],[9,-1],[10,1],[46,3],[21,3],[39,3],[14,1],[14,-2],[12,-3],[8,-4],[5,-5],[0,-6],[-1,-8],[1,-8],[6,-7],[10,-5],[16,-1],[45,4],[15,-1],[10,-3],[7,-4],[5,-4],[8,-4],[7,-2],[14,2],[22,8],[49,24],[26,20],[13,18],[-2,12],[7,18],[-7,12],[-8,3],[-13,2],[-11,4],[-5,7],[-5,5],[-33,16],[-13,8],[-4,5],[-3,17],[-5,3],[-8,3],[-13,5],[-12,5],[-6,0],[-1,2],[0,9],[3,7],[12,15],[4,8],[9,0],[12,-3],[14,4],[18,8],[22,4],[56,-4],[26,3],[5,5]],[[9634,2255],[0,-2],[53,-33],[-15,-15],[-10,5],[-9,-5],[-12,-13],[-24,-15],[-4,-6],[0,-6],[-6,-10],[-8,-5],[-24,-10],[-6,-5],[-3,-8],[-8,-7],[-16,-11],[-10,0],[-16,7],[-20,0],[-23,0],[-25,2],[-16,9],[-10,23],[-6,5],[-32,-4],[2,-8],[16,-9],[10,-4],[-3,-9],[-5,-9],[-1,-10],[9,-11],[-29,-1],[-9,1],[21,-17],[0,-29],[-12,-45],[4,-26],[-6,-8],[-17,-8],[-34,-14],[-19,-6],[-20,-3],[-25,1],[-37,8]],[[9229,1944],[-3,10],[-7,9],[-17,13],[-25,11],[-37,8],[-27,2],[-43,-1],[-14,1],[-10,4],[-5,7],[-3,19],[-4,8],[-9,4],[-34,4],[-13,4],[-9,6],[-3,7],[-5,19],[-6,8],[-10,7],[-20,6],[-21,4],[-64,1]],[[9120,3438],[114,-13],[46,0],[46,3],[115,22],[25,8],[86,48],[26,10],[66,7],[31,9],[4,1]],[[9679,3533],[3,-5],[0,-19],[3,-13],[8,-14],[13,-11],[17,-5],[1,-3],[17,-6],[18,-5],[6,0],[5,-6],[-1,-4],[-7,-3],[-15,-1],[0,-4],[6,-3],[2,-2],[2,-9],[-12,6],[-30,25],[-14,17],[-37,20],[-10,10],[-10,0],[-2,-11],[8,-4],[11,-3],[11,-5],[7,-7],[6,-14],[5,-6],[18,-8],[12,-4],[-1,-3],[-5,-4],[-5,1],[9,-7],[29,-17],[10,0],[5,4],[5,2],[17,3],[-5,-6],[-11,-8],[-3,-6],[5,-9],[11,-5],[15,-1],[16,4],[7,-7],[-12,-9],[5,-8],[-13,-12],[-9,-6],[-15,-4],[-12,7],[-29,2],[-6,7],[7,4],[14,3],[13,4],[3,9],[-8,5],[-43,14],[-13,-1],[-11,-2],[-9,-6],[-9,-10],[8,-5],[-4,-6],[0,-5],[14,-7],[-10,-5],[-5,-6],[-3,-12],[24,-5],[23,-16],[18,-6],[15,7],[12,1],[11,-8],[2,-7],[-5,-5],[-10,-3],[-15,1],[0,-4],[6,-3],[4,-4],[1,-5],[-1,-6],[-7,2],[-15,4],[-7,2],[-6,-6],[-3,0],[-10,-2],[18,-23],[12,-10],[18,-9],[-2,21],[4,8],[16,3],[0,5],[-6,5],[1,3],[5,1],[9,-4],[5,-6],[3,-7],[1,-13],[-3,-5],[-15,-16],[0,-6],[9,-14],[-3,-11],[-7,-10],[-4,-11],[5,-12],[11,-9],[13,-8],[8,-9],[-4,-6],[18,-5],[11,-6],[28,-24],[36,-20],[27,-20],[57,-32],[9,-7],[3,-11],[-1,-12],[-5,-12],[-6,-7],[-7,-1],[-24,-3],[-6,0],[-4,5],[7,3],[10,2],[5,3],[3,3],[5,3],[-2,2],[-14,1],[-29,-9],[-4,-3],[-9,-11],[-6,-4],[-11,-2],[-12,0],[-2,-1]],[[6589,1917],[-42,-46],[-3,-10],[5,-7],[12,-4],[14,-8],[13,-12],[15,-20],[1,-11],[-4,-8],[-24,-20],[-58,-24],[-14,-2],[-16,0],[-16,1],[-18,4],[-14,5],[-12,6],[-12,3],[-14,1],[-17,-2],[-19,-5],[-18,-7],[-4,-6],[1,-6],[3,-6],[-1,-13],[1,-5],[5,-6],[9,-7],[11,-8],[15,-7],[13,-8],[8,-7],[5,-19]],[[6414,1653],[-50,4],[-16,-2],[-51,-9],[-21,-2],[-17,0],[-13,4],[-18,14],[-34,22],[-27,21],[-48,30],[-1,5],[0,5],[-3,4],[-7,2],[-26,-1],[-11,3],[-13,8],[-58,47],[-12,7],[-12,4],[-21,0],[-16,0],[-77,-8]],[[5909,2098],[23,-10],[19,-7],[15,-7],[11,-6],[5,-5],[2,-8],[2,-3],[5,-2],[8,-2],[17,-1],[19,-3],[21,-4],[39,-12],[15,-6],[9,-6],[1,-4],[-2,-14],[-5,-11],[-1,-6],[2,-6],[4,-6],[15,-8],[4,-5],[1,-10],[7,-4],[13,-2],[26,1],[15,4],[8,7],[3,8],[4,6],[10,3],[13,-1],[21,-9],[6,-6],[-1,-4],[-14,-8],[-2,-5],[7,-3],[15,-1],[33,5],[16,5],[11,6],[6,4],[18,0],[29,-4],[98,-20],[66,-10],[43,-1]],[[6281,1212],[-19,-2],[-9,3],[-11,9],[-26,5],[-178,16],[-65,14],[21,1],[46,-10],[37,-4],[156,-1],[29,-4],[31,-4],[12,-4],[4,-9],[-8,-5],[-20,-5]],[[6114,1351],[20,6],[16,9],[10,10],[9,0],[7,-9],[3,-11],[10,-8],[26,1],[12,5],[21,18],[14,4],[23,-4],[15,-10],[11,-11],[12,-9],[18,-10],[8,-10],[10,-58],[-6,-15],[-21,-6],[-27,1],[-70,8],[-144,0],[-99,9],[-52,0],[-26,3],[-21,6],[-20,4],[-21,-3]],[[5852,1271],[-14,4],[-45,9],[-17,1],[-17,1],[-16,-1],[-68,-12],[-18,-2],[-69,1],[-33,-2],[-62,-12],[-26,-1],[-44,0],[-33,3],[-65,12],[-21,2],[-22,0],[-21,-2],[-20,-3],[-23,-9],[-2,-8]],[[5216,1252],[-77,1],[-67,8]],[[5072,1261],[-5,3],[-8,25],[4,6],[8,6],[13,4],[124,75],[12,16],[7,12],[0,21]],[[5227,1429],[54,-1],[66,-6],[37,1],[28,3],[14,5],[25,16],[25,7],[28,1],[142,-4],[24,-2],[17,-5],[18,-7],[56,-39],[19,-6],[24,-5],[38,-3],[21,-4],[14,-6],[4,-6],[0,-6],[-4,-14],[3,-6],[12,-5],[19,-1],[63,2],[40,-2],[59,0],[31,7],[10,8]],[[7168,2231],[14,22],[-1,8],[-4,7],[-12,8],[-11,9],[-8,12],[-10,30],[-10,15],[-19,15],[-22,11],[-77,25],[-20,17],[-14,30],[-26,157],[-1,7]],[[6947,2604],[66,10],[60,3],[32,-10],[40,-30],[27,-11],[31,1],[46,30],[32,11],[35,7],[21,12],[10,15],[7,16],[40,55],[0,15],[0,1],[-9,8],[2,7],[9,8],[7,8],[5,20],[-2,22],[-34,74]],[[7057,2106],[-102,-25],[-127,-19],[-29,-8],[-20,-8],[-12,-11],[-7,-9],[-5,-8],[-2,-12],[-2,-5],[-5,-4],[-17,-10],[-14,-13],[-14,-9],[-29,-14],[-22,-8],[-11,-5],[-5,-4],[-6,-6],[-8,-3],[-31,-8]],[[5868,2182],[-11,14],[-37,31],[-2,11],[8,9],[11,9],[9,9],[2,6],[1,13],[1,4],[21,16],[3,1],[-8,17],[-40,36],[-11,16],[-2,2],[32,4],[16,1],[18,-1],[12,-4],[5,-6],[8,-5],[18,0],[42,14],[65,-1],[117,-7],[-11,10],[68,-8],[28,4],[27,17],[16,22],[22,16],[31,9],[25,1],[17,0],[104,-3],[50,2],[51,10],[33,11],[93,45],[43,25],[36,13],[16,7],[9,9],[41,21],[80,19],[22,3]],[[9462,4184],[6,-44],[7,-7],[2,-5],[-3,-2],[-13,0],[-8,-7],[-9,-3],[-4,-5],[8,-8],[9,13],[1,5],[46,-60],[24,-15],[6,-10],[-2,-36],[3,-9],[7,-11],[18,-19],[43,-23],[13,-9],[5,-9],[9,-28],[-14,-10],[20,-23],[46,-36],[-26,2],[-10,6],[-7,8],[-14,8],[-31,2],[-3,-10],[16,-13],[42,-12],[14,-10],[37,-48],[19,-75],[12,-9],[36,-14],[8,-6],[-10,-53],[5,-26],[-11,-2],[-36,0],[-3,7],[8,39],[-18,33],[-11,11],[-17,-7],[-4,-7],[-6,-25],[-14,-13],[-1,-4],[15,3],[10,-16],[9,-5],[18,-2],[-15,-8],[-17,-6],[-13,-8],[-2,-15],[17,-15]],[[8904,4133],[61,18],[45,9],[64,20],[30,5],[66,4],[158,-5],[74,6],[23,1],[29,-3],[8,-4]],[[8400,4435],[53,-24],[21,-7],[57,-25],[49,-47],[18,-11],[31,-13],[25,-8],[25,-5],[45,-5],[19,-3],[16,-10],[16,-18],[32,-59],[30,-37]],[[7244,3682],[-1,3],[-20,20],[-1,6],[2,6],[-1,7],[-9,6],[-21,4],[-51,-2],[-23,4],[-15,12],[0,14],[5,14],[-3,13],[-15,11],[-13,7],[-6,7],[7,17],[46,63],[7,23],[0,7],[-4,7],[-12,12],[-3,6],[3,14],[9,12],[28,24],[4,6],[2,6],[4,6],[11,4],[18,3],[8,-3],[5,-4],[8,-2],[27,3],[17,7],[12,10],[16,17],[5,9],[2,5],[6,9],[19,14],[7,7],[2,11],[-5,20],[2,10],[31,34],[7,17],[-16,18],[2,9],[-10,6],[-14,6],[-9,6],[16,9],[-7,9],[-14,11],[-4,10],[11,9],[56,26],[20,13],[4,7],[-11,6],[-82,30],[-22,6],[-16,5],[-11,8],[-5,9],[2,9],[-9,11],[1,9],[13,6],[25,1],[39,6],[23,3],[22,1],[37,-3],[21,1],[15,7],[1,7],[-12,12],[0,7],[6,5],[19,7],[8,4],[15,10],[7,13],[3,21],[5,7],[13,5],[8,-1],[7,-4],[8,2],[4,4],[11,32],[-1,10],[-9,9],[-19,10],[-61,22],[-16,9],[-9,12],[-3,25],[-2,3]],[[7421,4673],[36,5],[40,-4],[24,-4],[53,-19],[17,-9],[11,-10],[6,-10],[3,-9],[7,-6],[11,-3],[43,0],[21,-3],[28,-9],[20,-9],[35,-20],[18,-7],[16,-4],[24,-1],[44,5],[23,1],[26,-2],[32,-7],[46,-15],[77,-32],[10,-7],[6,-10],[-1,-11],[-6,-23],[0,-12],[8,-9],[30,-15],[11,-9],[17,-19],[14,-7],[14,-5],[19,1],[22,5],[29,15],[12,10],[3,10],[-6,17],[-1,9],[10,5],[18,1],[67,-9],[42,-3]],[[7801,5131],[106,-6],[74,7],[17,0],[8,-2],[3,-22],[2,-5],[3,-5],[0,-4],[-2,-5],[0,-6],[7,-9],[24,-11],[29,-6],[35,-1],[28,1],[111,13],[12,1],[122,-6],[1,0]],[[8381,5065],[15,-13],[17,-10],[72,-27],[21,-4],[19,-7],[11,-12],[-15,-1],[-11,-3],[-3,-3],[10,-2],[8,2],[10,5],[9,3],[10,-1],[7,-9],[13,-41],[42,-39],[222,-146],[38,-10],[50,3],[-12,-19],[-9,-5],[-16,9],[-16,-2],[-20,-4],[-12,-8],[11,-13],[32,-11],[22,6],[30,28],[9,0],[7,-14],[2,-16],[8,-5],[32,-13],[7,-5],[7,-2],[24,-8]],[[9032,4668],[-3,0],[-32,-3],[-58,-2],[-37,-3],[-179,-31],[-66,-8],[-135,-7],[-20,-2],[-18,-4],[-17,-7],[-13,-7],[-17,-19],[-15,-10],[-34,-20],[-12,-10],[-4,-13],[6,-12],[19,-13],[37,-20],[6,-9],[1,-7],[-41,-26]],[[7421,4673],[-4,5],[-24,3],[-59,-4],[-25,7],[-6,12],[1,16],[-4,13],[-19,5],[-9,-3],[-8,0],[-6,3],[-4,5],[-8,8],[-6,1],[-7,-3],[-8,-1],[-27,4],[-10,-1],[-14,-4],[-8,-6],[-10,-3],[-17,5],[-72,62],[-17,7],[-52,13],[-23,8],[-13,10],[-6,10],[-6,28],[-6,10],[-14,7],[-75,21],[-15,10],[1,13],[35,37],[14,7],[17,2],[14,-2],[13,-3],[12,-1],[12,1],[94,30],[24,4],[52,4],[20,5],[20,11],[38,32],[20,8],[16,10],[-2,6],[-9,5],[-6,8],[1,11]],[[7226,5109],[37,3],[63,0],[95,-4],[28,2],[21,5],[38,13],[30,5],[20,-2],[15,-7],[28,-29],[18,-12],[11,-2],[11,3],[26,17],[37,19],[24,8],[26,6],[19,1],[28,-4]],[[9032,4668],[6,-1],[10,-5],[2,-8],[-2,-8],[1,-8],[8,-8],[-5,-3],[-2,-2],[-2,-4],[9,0],[2,4],[8,10],[10,-1],[11,-1],[26,2],[0,4],[-34,3],[-11,11],[10,14],[25,9],[0,5],[-8,2],[-4,1],[-7,6],[11,-2],[9,-2],[8,1],[9,3],[7,-10],[9,-26],[9,-6],[10,-2],[33,-13],[7,-5],[-2,-25],[7,-8],[35,-16],[17,-4],[10,-2],[19,-1],[8,-1],[-11,-9],[-15,-7],[-17,-3],[-23,0],[0,-5],[14,1],[8,-1],[5,-3],[2,-6],[-20,5],[-6,-7],[-4,-20],[-6,-10],[-22,5],[-19,-1],[-7,-5],[10,-8],[8,0],[11,2],[11,-1],[7,-6],[1,-9],[7,0],[1,6],[2,4],[6,8],[13,-59],[32,-52],[85,-95],[-27,-1],[6,-4],[31,-6],[5,-6],[28,-20],[9,-4],[51,-32],[7,-9],[12,-32],[-11,2],[-9,4],[-5,6],[1,-9]],[[7197,5574],[-6,-6],[-94,-63],[-39,-19],[-29,-8],[-26,-5],[-129,-8],[-61,-9],[-20,-7],[-8,-7],[3,-12],[11,-13],[16,-11],[15,-7],[26,-8],[8,-4],[0,-5],[-7,-6],[-49,-28],[-60,-25],[-17,-12],[-9,-9],[7,-31],[1,-4]],[[6730,5267],[-20,3],[-53,2],[-47,0],[-17,1],[-15,4],[-3,5],[-5,15],[-6,7],[-9,3],[-33,9],[-24,9],[-12,8],[-17,19],[-5,-1],[-8,-2],[-9,-2],[-6,2],[0,4],[3,3],[5,2],[1,2],[6,22],[-4,27],[-23,18],[-33,0],[-29,-23],[-5,-11],[-16,-7],[-36,-11],[-6,-6],[-1,-5],[-2,-5],[-2,-1],[-12,-4],[-14,-3],[-9,0],[-4,3],[0,7],[-40,-3],[-31,11],[-21,18],[-19,26],[-2,8],[7,36],[-6,7],[-21,5],[-18,1],[-27,5],[-26,7],[-31,17],[-12,14],[-8,16],[-2,179]],[[6647,5849],[142,-49],[21,-19],[-8,-28],[15,-6],[74,-50],[19,-5],[4,-5],[-4,-3],[-10,-3],[-9,-3],[-4,-5],[-9,-3],[-48,-13],[0,-5],[35,0],[16,2],[15,3],[1,3],[-1,5],[-1,4],[24,8],[13,2],[9,-4],[8,-6],[7,-3],[20,-5],[176,-72],[45,-15]],[[8269,5214],[-1,-1],[-91,-6],[-66,4],[-57,9],[-27,1],[-67,-1],[-27,-4],[-23,-9],[-21,-15],[-47,-45],[-41,-16]],[[7226,5109],[1,1],[3,8],[-7,3],[-26,0],[-76,-9],[-39,-2],[-38,5],[-32,13],[-50,31],[-35,11],[-22,3],[-19,2],[-18,2],[-21,6],[-17,7],[-8,6],[-3,2],[-8,8],[-15,36],[-12,9],[-26,9],[-25,6],[-3,1]],[[7197,5574],[117,-41],[145,-63],[42,-5],[0,-5],[-53,7],[-167,42],[-41,-4],[104,-27],[33,-4],[15,-3],[12,-9],[14,-2],[16,1],[11,4],[10,-7],[13,-5],[33,-7],[0,-5],[-15,4],[-4,1],[-9,0],[-3,-2],[-2,-2],[-4,-5],[20,-1],[19,1],[36,4],[-8,-4],[-6,-5],[-4,-5],[-1,-6],[5,0],[9,-6],[8,-7],[-3,-3],[13,0],[7,2],[5,5],[7,4],[14,4],[8,-4],[6,-6],[6,-5],[51,-17],[13,-6],[31,-24],[25,-8],[29,-19],[27,-5],[-3,-2],[-7,-2],[-9,0],[-9,2],[-9,3],[-10,3],[-14,1],[-3,-5],[18,-38],[7,-6],[16,-6],[32,-9],[10,0],[12,4],[12,-1],[8,-5],[5,-7],[12,4],[7,-4],[50,18],[6,5],[-9,21],[-1,6],[20,3],[62,-22],[29,-4],[12,5],[6,6],[8,5],[16,3],[1,-5],[14,-23],[11,-11],[44,-35],[-38,14],[-19,3],[-8,-9],[10,-8],[25,-5],[25,-1],[15,2],[9,0],[25,-5],[34,-4],[37,-1],[35,1],[-6,-3]],[[8269,5214],[-15,-9],[-47,-19],[-17,-15],[1,-19],[23,-11],[30,-8],[22,-13],[21,10],[10,3],[10,-1],[12,-23],[2,-2],[-7,-10],[-14,-10],[-17,-7],[-17,-5],[25,3],[25,7],[21,3],[12,-9],[-13,34],[-10,10],[-2,10],[10,12],[-1,9],[-30,3],[0,5],[10,4],[8,4],[6,5],[4,5],[10,-2],[2,-1],[1,0],[5,3],[9,0],[12,-5],[16,-6],[20,-5],[22,-2],[2,3],[8,7],[10,4],[4,-3],[3,-2],[16,-9],[-16,-6],[-15,-4],[-11,-5],[-5,-8],[-12,5],[-35,-4],[-19,4],[-10,-24],[10,-27],[18,-24],[5,-4]],[[6913,1352],[11,-8],[-7,1],[-4,1],[-3,0],[-5,3],[-9,0],[-3,-9],[-10,-3],[-10,-3],[-10,-13],[-13,-4],[-29,-5],[-18,-8],[-29,-21],[-18,-8],[-19,33],[8,12],[55,7],[41,11],[8,4],[1,6],[4,9],[7,8],[10,5],[42,-18]],[[6634,1477],[7,0]],[[6641,1477],[0,-5],[16,-4],[14,-5],[-3,-11],[-15,-17],[4,-5],[9,-3],[8,-4],[-2,-6],[-9,-1],[-12,3],[-17,7],[10,5],[-18,9],[0,5],[6,5],[3,8],[-1,19]],[[7340,1565],[85,-95],[10,-27]],[[7435,1443],[-8,-3],[-14,-5],[-36,-17],[-7,-8],[-11,-8],[-26,-8],[-87,-18],[-25,-4],[-61,-4],[-54,-8],[-14,2],[-11,-7],[-40,-18],[-34,-25],[-24,0],[-52,16],[-35,2],[6,6],[11,2],[12,1],[8,5],[-1,6],[-7,6],[-8,4],[-7,2],[-7,3],[-27,13],[-6,0],[-14,0],[-16,1],[-10,2],[0,-10],[-9,0],[-17,9],[-27,7],[-29,1],[-21,-7],[-8,0],[3,5],[1,4],[-4,9],[-13,-13],[-10,-6],[-15,-4],[-8,13],[-1,5]],[[6672,1394],[-7,7]],[[6665,1401],[7,2],[10,8],[2,6],[-3,48],[-4,4],[-18,10],[-6,7],[4,-2],[15,-3],[0,3]],[[6672,1484],[9,1],[11,0],[104,19],[23,7],[13,7],[3,6],[1,7],[-1,6],[1,5],[7,4],[122,28],[18,2],[17,1],[19,-4],[11,-6],[5,-8],[-4,-9],[0,-9],[3,-9],[11,-7],[17,-6],[19,-3],[22,0],[21,5],[89,53],[31,15],[16,6],[20,0],[14,-2],[46,-28]],[[9311,1405],[-8,-10],[-28,1],[-13,7],[-6,11],[5,9],[18,5],[22,-10],[10,-13]],[[9229,1944],[-22,5],[-22,2],[-24,0],[-25,-2],[-22,-5],[-46,-15],[-17,-8],[-12,-9],[-12,-12],[-16,-34],[-11,-11],[-11,-6],[-17,-1],[-23,0],[-13,1],[-29,7],[-18,1],[-13,-2],[-28,-6],[-15,-1],[-51,0],[-8,-2],[-16,-10],[-39,-6],[-23,-9],[-19,-12],[-11,-11],[-14,-27],[-13,-8],[-34,-2],[-11,-2],[-48,-12],[-15,-1],[-22,-1],[-11,-2],[-8,-9],[-17,-30],[-7,-7],[-27,-2],[-13,-4],[-21,-22],[-9,0],[-11,21],[-36,6],[-168,-17],[-39,-6],[-17,-11],[-7,-6],[-32,-17],[-7,-9],[-4,-8],[-20,-19],[-10,-27],[-50,-49],[-10,0],[-14,4],[-61,9],[-23,1],[-28,-1],[-22,-2],[-80,-16],[-56,-23],[-19,-5],[-50,-8],[-89,-23],[-29,-2],[-32,-6],[-47,-12]],[[7340,1565],[63,30],[20,14],[18,19],[2,20],[-6,21],[-13,19],[-13,13],[-16,13],[-17,9],[-18,5],[-22,1],[-24,-2],[-28,2],[-24,5],[-24,9],[-15,10],[8,10],[23,17],[11,11],[6,18],[15,19],[26,22],[14,19],[7,7],[30,24],[20,21],[29,26],[14,9],[13,7],[10,4],[7,2],[10,1]],[[6672,1484],[-3,14],[-14,11],[-39,18],[-6,-10],[14,-8],[19,-6],[10,-6],[-12,-16],[0,-4]],[[6634,1477],[-8,0],[-9,-19],[-1,-20]],[[6616,1438],[-18,12],[-10,14],[-25,13],[-25,10],[-18,9],[-16,6],[-13,5],[-18,0],[-18,-4],[-16,-4],[-24,2],[-24,8],[-16,8],[-17,4],[-12,3],[-13,2],[-15,2],[-11,3],[-1,8],[0,3],[-5,8],[-2,16],[-5,8],[5,2],[4,0],[48,-13],[6,-1],[3,1],[4,1],[13,5],[6,2],[10,2],[12,2],[13,0],[13,0],[10,-2],[11,-2],[9,-2],[6,-1],[4,0],[3,0],[2,1],[0,1],[0,1],[-2,5],[0,2],[2,1],[2,1],[2,2],[1,4],[0,6],[-6,11],[-38,34],[-23,16]],[[4202,1655],[9,-31],[6,-10],[10,-9],[19,-7],[7,-13],[1,-5],[52,-27],[5,-6],[3,-6],[1,-4],[2,-5],[9,-2],[7,-1],[57,1],[30,-1],[11,-23],[1,-7],[-4,-20],[4,-11],[12,-8],[22,-8],[137,-34],[15,-5],[13,-6],[10,-8],[25,-23],[10,-7],[12,-5],[23,-6]],[[4711,1358],[-67,-30],[-48,-40],[-6,-6],[-3,-16],[-25,-23],[-9,-2],[-10,-1],[-12,2],[-12,2],[-17,-2],[-14,-5],[-41,-19],[-16,-3],[-12,0],[-11,5],[-24,16],[-13,5],[-18,3],[-8,-2],[-5,-8],[-10,-5],[-24,-4],[-14,-4],[-13,-5],[-33,-24]],[[4246,1192],[-481,123],[-222,93]],[[3543,1408],[67,-4],[61,1],[49,9],[33,17],[56,41],[15,9],[18,7],[134,33],[33,15],[-1,22],[-49,44],[-21,25],[-5,23],[9,11],[15,9],[13,6],[6,3],[18,6],[30,7],[8,-3],[3,-8],[15,-11],[20,-3],[132,-12]],[[5072,1261],[37,-23],[8,-18],[1,-1],[3,-1],[12,-2],[9,-2],[8,-3],[7,-4],[4,-5],[2,-6],[-2,-12],[-7,-10],[-11,-8],[-27,-9],[-18,-4],[-24,-1],[-43,3],[-36,5],[-33,8],[-41,14],[-14,1],[-15,-2],[-12,-5],[-5,-5],[4,-7],[2,-9],[-22,-14]],[[4859,1141],[-84,-14],[-144,-15],[-138,-24]],[[4493,1088],[-98,50],[-36,16],[-70,22],[-43,16]],[[4711,1358],[66,-20],[18,-3],[56,-1],[18,-2],[16,-4],[14,-5],[61,-34],[22,-9],[23,-7],[66,-12],[1,0]],[[4630,1695],[1,-3],[4,-9],[4,-4],[10,-5],[14,-6],[37,-11],[21,-10],[85,-49],[289,-132],[78,-28],[54,-9]],[[4202,1655],[60,-5],[21,-7],[47,-20],[20,-3],[13,6],[41,40],[55,31],[17,6],[6,-1],[39,-6],[30,-7],[11,-1],[68,7]],[[6672,1394],[-20,-5],[-10,-3],[-8,-5],[-8,0],[4,10],[13,5],[13,3],[3,1],[6,1]],[[6567,1398],[-7,-20],[-29,-34],[10,0],[10,9],[29,-9],[15,-7],[11,-7],[-66,-8],[-27,-6],[-18,-9],[-10,0],[0,12],[-7,9],[-7,8],[-5,8],[4,12],[21,14],[4,11],[-10,0],[0,-10],[-12,16],[12,10],[25,6],[29,5],[28,-10]],[[6531,1447],[4,-7],[6,-8],[1,-6],[-11,-4],[-7,2],[-8,7],[-12,14],[-9,0],[3,-9],[13,-12],[2,-9],[-8,-7],[-17,2],[-20,7],[-11,5],[-2,2],[-14,11],[-3,0],[3,6],[13,6],[3,5],[5,13],[-4,7],[-20,5],[0,4],[15,2],[18,1],[14,-1],[2,-5],[32,-10],[6,-5],[6,-2],[7,-1],[3,-1],[1,-5],[-3,-3],[-5,-2],[-3,-2]],[[6452,1385],[14,-14],[0,-4],[-22,2],[-18,4],[-17,2],[-17,-4],[8,-2],[2,0],[2,1],[7,1],[20,-9],[15,-14],[-1,-13],[-25,-5],[-32,6],[-34,15],[-29,18],[-16,16],[-5,11],[0,8],[5,18],[-2,0],[-3,5],[-4,11],[5,2],[22,2],[9,3],[10,16],[-10,16],[-36,27],[31,0],[13,-2],[12,-5],[12,-10],[8,-4],[37,-5],[17,-9],[8,-10],[0,-10],[-9,-4],[-7,-4],[-2,-8],[3,-3],[15,-11],[5,-2],[14,-4],[6,-9],[-10,-9],[-33,-1],[0,-4],[21,-1],[11,-4]],[[6616,1438],[10,-18],[27,-12],[-11,-3],[-12,-3],[-31,-26],[-11,-5],[-9,3],[2,6],[5,7],[2,7],[-6,7],[-7,3],[-7,3],[-8,6],[-7,13],[0,12],[7,23],[-72,29],[-12,5],[-19,-5],[-26,-6],[-27,-4],[-12,8],[-7,7],[-18,10],[-10,4],[-11,5],[-18,4],[-6,-1],[-1,0],[-27,-8],[-8,-2],[-7,-8],[10,-4],[13,-3],[7,-4],[3,-7],[16,-18],[-5,-8],[-7,-4],[-8,-2],[-8,-4],[-8,-11],[-3,-6]],[[6289,1428],[-7,6],[0,6],[6,20],[1,12],[-9,10],[-17,7],[-19,6],[-18,2],[-14,-1],[-13,-3],[-13,-5],[-13,-3],[-18,1],[-14,6],[-18,9],[-15,5],[-61,12],[-58,16],[-25,9],[-14,8],[3,9],[9,11],[26,25],[6,15],[-3,17],[-18,23],[-21,14],[-26,13],[-25,8],[-31,7],[-53,10],[-45,13]],[[2565,1361],[16,-8],[-10,4],[99,-50],[4,-11],[0,-71],[-52,-65],[-18,-37],[24,-18],[-10,-14],[0,-8],[5,-7],[5,-12],[-23,6],[-5,3],[-28,6],[-18,30],[-18,56],[-36,50],[-27,22],[-39,15],[-52,13],[-18,9],[-11,26],[-4,7],[7,2],[85,-6],[27,1],[11,6],[3,3],[15,10],[6,2],[12,3],[4,6],[2,8],[5,7],[10,6],[13,5],[16,1]],[[4493,1088],[62,-32],[28,-11],[40,-18],[10,-8],[3,-8],[0,-14],[-3,-17],[-9,-16],[-21,-16],[-157,-71],[-28,-17],[-9,-13],[7,-7],[14,-6],[22,-14],[-1,-37]],[[4451,783],[-92,10],[-24,2],[-15,-3],[-4,-9],[20,-35],[4,-13],[-13,-12],[-26,-18],[-5,-8],[6,-8],[18,-11],[4,-4],[-1,-3],[-4,-4],[-21,-6]],[[4298,661],[-53,8],[-208,51],[-64,20],[-23,3],[-38,-1],[-22,2],[-14,0],[-11,-2],[-7,-4],[-11,-1],[-16,-1],[-31,2],[-37,-9],[-11,0],[-7,1],[-52,17],[-1,1]],[[3692,748],[2,14],[29,122],[21,36],[28,39],[63,-1],[42,3],[9,12],[23,11],[83,30],[30,7],[14,-5],[3,-11],[33,-42],[0,10],[-9,25],[0,29],[-9,15],[-17,15],[-61,39],[-54,25],[-26,7],[-27,2],[-54,-7],[-32,1],[-43,13],[-32,20],[-28,23],[-28,17],[-44,14],[-46,3],[-42,-6],[-36,-16],[-4,-6],[0,-6],[-3,-4],[-15,-2],[-9,-3],[-5,-13],[-5,-2],[-47,1],[-4,-1],[-8,6],[3,4],[5,5],[0,8],[-6,4],[-18,10],[-4,7],[0,18],[-5,15],[-13,10],[-38,14],[-6,-4],[-1,-2],[-1,-3],[-11,0],[-2,18],[-14,13],[-30,19],[-6,9],[4,1],[9,0],[12,4],[10,8],[7,6],[0,7],[-7,6],[-10,0],[-11,-10],[-14,-8],[-18,-6],[-22,-3],[-22,1],[-1,7],[4,11],[-6,9],[25,-3],[19,2],[14,6],[57,40],[11,11],[13,10],[18,6],[21,2],[59,2],[102,-6],[32,-2]],[[6289,1428],[-4,-8],[-10,-12],[-17,-5],[-44,-7],[-22,0],[-14,12],[-9,0],[5,-10],[4,-4],[9,-4],[-15,-2],[-15,-4],[-12,-5],[-10,-13],[-14,-4],[-18,-4],[-17,-5],[0,11],[-3,8],[-7,7],[-10,6],[3,-23],[6,-10],[15,-3],[24,2]],[[4630,1695],[127,13],[20,2],[31,7],[26,8],[32,10],[39,5],[37,-2],[22,-13],[24,-20],[47,-31],[9,-10],[16,-23],[10,-10],[19,-11],[24,-7],[28,0],[12,7],[16,13],[13,15],[2,10],[45,-17],[13,-8],[25,-14],[35,-12],[38,-9],[36,-6],[77,-4],[35,-4],[31,-12],[-35,64],[-34,31],[-7,11],[2,1],[2,17],[-3,2],[8,7],[4,2],[24,2],[29,-1]],[[6017,951],[-11,-6],[-20,5],[-33,25],[-38,11],[-63,28],[0,4],[6,-2],[22,-2],[58,-20],[17,-8],[45,-22],[17,-13]],[[5852,1271],[79,-24],[327,-55],[7,-2],[22,-9],[8,-2],[7,-2],[7,-3],[9,-3],[14,-1],[14,-1],[10,-1],[6,-4],[2,-6],[-3,-15],[-8,-10],[-73,-38],[-22,-6],[-23,3],[7,5],[1,6],[-2,6],[-6,6],[-10,0],[-6,-12],[-4,-2],[-17,-9],[-8,-6],[-3,-5],[5,-2],[9,-6],[7,-6],[-7,-3],[-20,-1],[-5,-3],[0,-5],[-9,-6],[-4,-5],[-3,-2],[-6,-1],[-51,1],[-22,4],[-19,7],[-19,9],[-21,7],[-67,14],[-40,15],[-35,21],[-113,88],[-39,19],[-53,8],[7,-4],[7,-2],[7,-1],[41,-16],[16,-8],[12,-26],[14,-14],[126,-80],[31,-14],[105,-24],[72,-27],[76,-20],[22,-2],[13,-6],[-4,-14],[-15,-14],[-18,-8],[0,5],[8,5],[2,6],[-3,6],[-7,5],[-9,0],[-6,-23],[-27,-15],[-36,-6],[-34,3],[-32,13],[-80,43],[-33,12],[-115,34],[-341,170],[-11,4],[-12,3],[-8,1],[-5,-2]],[[5438,1218],[-24,8],[-37,7],[-120,16],[-41,3]],[[5058,1062],[-1,0],[-26,2],[27,-19],[86,-42]],[[5144,1003],[-95,-108],[-3,-8],[0,-9],[-5,-4],[-8,-3],[-17,-1],[-20,-3],[-162,-48],[-142,-21]],[[4692,798],[-48,-7],[-97,-8],[-96,0]],[[4859,1141],[23,-9],[96,-30],[43,-18],[10,-6],[27,-16]],[[5098,560],[-147,-29],[-301,-54],[-33,-14],[-60,-31],[-36,-14],[-15,-9],[-5,-12],[-4,-2],[-1,0]],[[4496,395],[-7,17],[-8,7],[-22,10],[-46,7],[-18,3],[-14,8],[-13,12],[-19,34],[0,13],[1,7],[-2,5],[-7,3],[-8,1],[-8,1],[-9,0],[-7,1],[-6,3],[-3,8],[0,13],[16,17],[15,11],[13,8],[5,5],[-3,4],[-13,7],[-14,6],[-11,5],[0,6],[10,8],[11,4],[4,6],[-1,4],[-34,22]],[[4692,798],[11,-101],[12,-13],[18,-14],[35,-3],[14,-2],[28,-10],[21,-4],[28,-4],[60,-3],[20,2],[30,6],[17,2],[22,-3],[29,-8],[14,-10],[47,-73]],[[4496,395],[-16,-2],[-7,-3],[-1,-3],[2,-7],[-1,-3],[-101,-94],[-26,-19],[-30,-16],[-46,-18],[-57,-4],[-45,-9],[-40,-24],[-38,-30],[-34,-18],[-91,-12],[-243,-33],[-32,2],[-8,2],[-6,3],[-10,3],[-85,6],[-32,6],[-8,2],[-4,8],[11,1],[16,-2],[27,2],[66,21],[15,5],[12,1],[10,3],[5,7],[-7,7],[-14,3],[-6,3],[18,6],[18,-1],[90,-8],[19,2],[22,5],[20,7],[9,8],[-33,-7],[-43,-6],[-43,0],[-31,9],[-6,7],[6,4],[15,2],[22,1],[33,0],[10,1],[23,8],[0,4],[-13,12],[-4,13],[7,13],[-86,-19],[-56,-7],[-34,9],[-24,22],[15,26],[15,23],[21,31],[-4,26],[-3,47],[6,58],[11,40],[9,99],[0,40],[9,76],[2,14]],[[6187,225],[-4,0],[-14,0],[7,-4],[1,-2],[1,-3],[-31,-2],[0,-7],[14,-10],[8,-8],[-17,3],[-14,0],[-14,-2],[-16,-1],[-12,-3],[-2,-7],[1,-7],[-1,-6],[1,-3],[2,-3],[-5,-2],[-21,-1],[-7,3],[-21,13],[-5,4],[16,16],[37,18],[44,15],[38,8],[5,-1],[5,-1],[3,-3],[1,-4]],[[5564,805],[17,-8],[76,-9],[18,-6],[-2,-16],[-9,-12],[-19,-6],[-36,0],[0,4],[7,13],[-20,14],[-30,12],[-21,7],[-10,-4],[21,-12],[23,-9],[7,-5],[-27,-1],[-14,5],[-47,36],[-34,20],[-15,12],[-6,11],[-5,15],[-13,10],[-29,19],[9,4],[3,-3],[4,-3],[11,-3],[66,-46],[65,-31],[10,-8]],[[5144,1003],[233,-113],[9,-11],[5,-12],[13,-13],[141,-102],[9,-10],[6,-10],[4,-28],[-7,-8],[-49,-26],[13,-7],[12,-2],[9,-4],[3,-10],[-5,-10],[-12,-5],[-39,-3],[-187,-28],[-204,-41]],[[5273,984],[89,26],[47,8],[40,3],[9,2],[6,3],[2,3],[-1,3],[-6,9],[-2,5],[-1,4],[4,5],[10,4],[48,10],[15,5],[7,6],[5,7],[12,9],[13,6],[28,7],[15,2]],[[5613,1111],[50,-18],[12,-6],[8,-6],[11,-11],[8,-6],[70,-32],[8,-2],[26,-16],[118,-48],[35,-18],[24,-22],[12,-26],[14,-8],[34,-2],[16,-6],[7,-12],[1,-14],[-7,-34],[-17,-23],[-26,-20],[-34,-14],[-29,-9],[-17,-2],[-16,3],[-12,2],[-14,-3],[-20,-6],[-56,1],[-18,4],[-65,24],[-118,31],[-253,116],[-92,56]],[[5438,1218],[-6,-2],[6,-4],[13,-3],[10,-3],[31,-16],[11,-10],[10,-22],[12,-10],[15,-9],[30,-13],[43,-15]],[[5273,984],[-36,22],[-51,23],[-39,14],[-47,6],[-42,13]],[[4690,9481],[-66,48],[-41,45],[-20,14],[-31,15],[-203,54],[-9,7],[8,7],[78,26],[25,12],[21,12],[28,21],[13,7],[13,6],[14,2],[16,1],[16,-2],[16,-1],[14,5],[12,10],[17,42],[5,3],[5,2],[6,2],[19,1]],[[4646,9820],[0,-3],[6,-13],[16,-10],[19,-4],[97,-2],[38,-5],[34,0],[15,-4],[25,-12],[17,-3],[15,-3],[16,-3],[15,-7],[1,0],[18,-13],[76,-39],[25,-9],[11,2],[6,5],[5,6],[8,3],[14,1],[24,-3],[12,-1],[43,3],[23,3],[17,5],[22,20],[12,4],[107,3],[74,-4],[52,-6],[44,-12],[28,-24],[5,-24],[10,-8],[29,-6],[29,-3],[27,0],[26,2],[193,24],[22,5],[5,15],[14,4],[18,-2],[21,-5],[68,-7],[20,-6],[14,-10],[10,-10],[15,-8],[31,-3],[10,3],[11,9],[12,2],[14,-2],[9,-4],[15,-8],[41,-15],[22,-18],[-1,-1],[20,-1],[31,2],[29,-2],[13,-8],[-10,-8],[-45,-12],[-16,-7],[-10,-12],[-5,-21],[-13,-12],[-29,-21],[-10,-10],[-24,-34],[-16,-7],[-30,0],[-22,7],[-14,12],[-16,8],[-27,-1],[-15,-9],[-11,-14],[-31,-68],[-6,-5],[-15,-10],[-5,-8],[0,-7],[8,-16]],[[3413,9258],[-23,-14],[-10,-3],[-8,1],[-6,4],[-3,9],[2,9],[11,21],[0,11],[-9,11],[-21,12],[-19,8],[-21,6],[-45,10],[-47,13],[-16,9],[-7,13],[1,19],[-3,10],[-8,13],[-17,17],[-7,18],[2,9],[11,4],[25,0],[10,0],[5,3],[-1,4],[-8,7],[-50,28],[-9,6],[-10,5],[-14,3],[-42,4],[-15,4],[-7,4],[-4,9],[0,3]],[[3050,9548],[119,36],[26,13],[88,33],[25,12],[3,2],[12,-1],[0,-3],[-2,-3],[5,-3],[8,-3],[5,-3],[7,-2],[12,-1],[8,1],[14,8],[7,2],[26,-2],[46,-6],[28,0],[24,4],[20,6],[17,8],[47,31],[16,8],[67,18],[6,7],[-1,13],[-40,88],[18,7],[34,3],[34,13],[6,9],[2,11],[4,9],[15,6],[19,-1],[35,-10],[20,-1],[13,4],[50,20],[46,11],[42,14],[20,4],[110,14],[5,2],[3,3],[3,2],[7,2],[4,-1],[10,-4],[5,0],[10,-2],[8,-2],[10,-1],[15,1],[23,8],[8,10],[5,13],[12,13],[13,7],[47,19],[18,5],[25,0],[11,-8],[6,-12],[11,-12],[16,-10],[21,-8],[22,-7],[18,-4],[13,0],[11,2],[10,0],[16,-3],[7,-4],[17,-15],[28,-26],[13,-8],[59,-18],[6,-3],[9,-5],[9,-13],[1,-25]],[[1946,9519],[-7,28],[3,7],[29,16],[12,11],[7,10],[11,8],[18,5],[59,16],[16,-4],[92,-52],[92,-38],[15,-8],[6,-6],[27,-19],[10,-5],[10,-2],[31,-16],[8,-1],[22,-1],[8,-2],[11,-7],[19,-17],[12,-4],[20,-2],[14,-5],[12,-7],[20,6],[15,8],[3,8],[-3,10],[0,11],[7,10],[18,19],[5,11],[9,40],[13,19],[29,18],[13,5],[16,14],[10,6],[18,6],[17,2],[39,1],[116,19],[38,0],[-11,-14],[-6,-14],[1,-14],[10,-13],[17,-10],[75,-16],[28,-8],[21,-4],[20,2],[9,2]]],"transform":{"scale":[0.0007354502939294021,0.001495095472547254],"translate":[102.11865523300008,8.416815497000087]}};
  Datamap.prototype.vutTopo = '__VUT__';
  Datamap.prototype.wlfTopo = '__WLF__';
  Datamap.prototype.wsbTopo = '__WSB__';
  Datamap.prototype.wsmTopo = '__WSM__';
  Datamap.prototype.yemTopo = '__YEM__';
  Datamap.prototype.zafTopo = '__ZAF__';
  Datamap.prototype.zmbTopo = '__ZMB__';
  Datamap.prototype.zweTopo = '__ZWE__';

  /**************************************
                Utilities
  ***************************************/

  //convert lat/lng coords to X / Y coords
  Datamap.prototype.latLngToXY = function(lat, lng) {
     return this.projection([lng, lat]);
  };

  //add <g> layer to root SVG
  Datamap.prototype.addLayer = function( className, id, first ) {
    var layer;
    if ( first ) {
      layer = this.svg.insert('g', ':first-child')
    }
    else {
      layer = this.svg.append('g')
    }
    return layer.attr('id', id || '')
      .attr('class', className || '');
  };

  Datamap.prototype.updateChoropleth = function(data) {
    var svg = this.svg;
    for ( var subunit in data ) {
      if ( data.hasOwnProperty(subunit) ) {
        var color;
        var subunitData = data[subunit]
        if ( ! subunit ) {
          continue;
        }
        else if ( typeof subunitData === "string" ) {
          color = subunitData;
        }
        else if ( typeof subunitData.color === "string" ) {
          color = subunitData.color;
        }
        else {
          color = this.options.fills[ subunitData.fillKey ];
        }
        //if it's an object, overriding the previous data
        if ( subunitData === Object(subunitData) ) {
          this.options.data[subunit] = defaults(subunitData, this.options.data[subunit] || {});
          var geo = this.svg.select('.' + subunit).attr('data-info', JSON.stringify(this.options.data[subunit]));
        }
        d3.selectAll("svg > *").selectAll('.' + subunit).transition().style('fill', color);
      }
    }
  };

  Datamap.prototype.updatePopup = function (element, d, options) {
    var self = this;
    element.on('mousemove', null);
    element.on('mousemove', function() {
      var position = d3.mouse(self.options.element);
      d3.select(self.svg[0][0].parentNode).select('.datamaps-hoverover')
        .style('top', ( (position[1] + 30)) + "px")
        .html(function() {
          var data = JSON.parse(element.attr('data-info'));
          try {
            return options.popupTemplate(d, data);
          } catch (e) {
            return "";
          }
        })
        .style('left', ( position[0]) + "px");
    });

    d3.select(self.svg[0][0].parentNode).select('.datamaps-hoverover').style('display', 'block');
  };

  Datamap.prototype.addPlugin = function( name, pluginFn ) {
    var self = this;
    if ( typeof Datamap.prototype[name] === "undefined" ) {
      Datamap.prototype[name] = function(data, options, callback, createNewLayer) {
        var layer;
        if ( typeof createNewLayer === "undefined" ) {
          createNewLayer = false;
        }

        if ( typeof options === 'function' ) {
          callback = options;
          options = undefined;
        }

        options = defaults(options || {}, self.options[name + 'Config']);

        //add a single layer, reuse the old layer
        if ( !createNewLayer && this.options[name + 'Layer'] ) {
          layer = this.options[name + 'Layer'];
          options = options || this.options[name + 'Options'];
        }
        else {
          layer = this.addLayer(name);
          this.options[name + 'Layer'] = layer;
          this.options[name + 'Options'] = options;
        }
        pluginFn.apply(this, [layer, data, options]);
        if ( callback ) {
          callback(layer);
        }
      };
    }
  };

  // expose library
  if (typeof exports === 'object') {
    d3 = require('d3');
    topojson = require('topojson');
    module.exports = Datamap;
  }
  else if ( typeof define === "function" && define.amd ) {
    define( "datamaps", ["require", "d3", "topojson"], function(require) {
      d3 = require('d3');
      topojson = require('topojson');

      return Datamap;
    });
  }
  else {
    window.Datamap = window.Datamaps = Datamap;
  }

  if ( window.jQuery ) {
    window.jQuery.fn.datamaps = function(options, callback) {
      options = options || {};
      options.element = this[0];
      var datamap = new Datamap(options);
      if ( typeof callback === "function" ) {
        callback(datamap, options);
      }
      return this;
    };
  }
})();
