
(function () {
    "use strict";

    //var client = new WindowsAzure.MobileServiceClient(
    //    "https://displaydynamic.azure-mobile.net/",
    //    "sijpFAGXcEVMYInEJrGPGwHCLtzKwm49"
    //);

    Date.prototype.yyyymmdd = function () {
        var yyyy = this.getFullYear().toString();
        var mm = (this.getMonth() + 1).toString(); // getMonth() is zero-based
        var dd = this.getDate().toString();
        return yyyy + (mm[1] ? mm : "0" + mm[0]) + (dd[1] ? dd : "0" + dd[0]); // padding
    };

    document.addEventListener('deviceready', onDeviceReady.bind(this), false);

    function onDeviceReady() {
        // Handle the Cordova pause and resume events
        document.addEventListener('pause', onPause.bind(this), false);
        document.addEventListener('resume', onResume.bind(this), false);

        // TODO: Cordova has been loaded. Perform any initialization that requires Cordova here.
        //checkConnection();
        document.getElementById("cmdGetBeaconList").onclick = getBeaconList;
        document.getElementById("txtUuid").value = device.uuid;
        //plotData();
    };

    function onPause() {
        // TODO: This application has been suspended. Save application state here.
    };

    function onResume() {
        // TODO: This application has been reactivated. Restore application state here.
    };

    //function getBeaconList() {
    //    var request = new XMLHttpRequest();
    //    request.open("GET", "https://displaydynamic.azure-mobile.net/api/GetBeacons", true);
    //    //request.open("GET", "http://localhost:51284/api/GetBeacons/", true);
    //    request.onreadystatechange = function () {
    //        if (request.readyState == 4) {
    //            alert(request.status);//this alert is working and getting 0 status
    //            if (request.status == 200 || request.status == 0) {
    //                // -> request.responseText <- is a result
    //                /*var tweets = JSON.parse(request.responseText);*/
    //                alert(request.responseText);//this alert is not working// 
    //                //if i make other alert then it works
    //            } else {
    //                alert("function is called3");
    //            }
    //        }
    //    }
    //    //request.send(JSON.stringify(JSONdata)); //for push
    //    request.send();
    //};

    function getBeaconList() {
        var beaconIds = [];
        //$.getJSON("http://localhost:51284/api/GetBeacons",
        $.getJSON("https://displaydynamic.azure-mobile.net/api/GetBeacons",
            function (json) {
                var tr;
                for (var i = 0; i < json.length; i++) {
                    var dateInt = new Date(json[i].lastPing);
                    tr = $('<tr/>');
                    tr.append('<td>' + json[i].beaconId + '</td>');
                    var td = $("<td><a>" + json[i].currentSiteName + "</a></td>");
                    td.on("click", $.proxy(showBeaconHourDetail, td, json[i].beaconId, dateInt));
                    tr.append(td);
                    tr.append('<td>' + new Date(json[i].lastPing).toLocaleString() + '</td>');
                    $('#beaconTable').append(tr);

                    beaconIds.push(json[i].beaconId);
                }

            }).then(function (data) {
                var promises = [];
                for (var i = 0; i < beaconIds.length; i++) {
                    promises.push(getBeaconHourSummary(beaconIds[i], new Date().yyyymmdd()));
                }
                $.when.apply($, promises).done(function () {
                    var plotData = [];
                    for (var i = 0; i < arguments.length; i++) {
                        var hourMask = arguments[i][0].hourMask;
                        var bId = arguments[i][0].beaconId;

                        plotData.push(convertHourMaskToRadarDataset(hourMask, getColor(bId).color, getColor(bId).highlight, "ID_" + bId));
                    }
                    plotHourSummaryRadar(plotData);
                });
            });
    }

    function showBeaconHourDetail(bId, targetDate) {

        if (bId === undefined)
            return;
        if (targetDate === undefined)
            targetDate = new Date().yyyymmdd();
        else targetDate = targetDate.yyyymmdd();


        //$.getJSON("http://localhost:51284/api/GetBeaconReportHourDetailed",
        $.getJSON("https://displaydynamic.azure-mobile.net/api/GetBeaconReportHourDetailed",
             {
                 beaconId: bId,
                 dateInt: targetDate
             }, function (json) {
                 var datasets = [];
                 var ds = {
                     label: 'NA',
                     fillColor: getColor(0).color,
                     strokeColor: "rgba(151,187,205,1)",
                     pointColor: getColor(0).color,
                     pointStrokeColor: "#fff",
                     pointHighlightFill: "#fff",
                     pointHighlightStroke: getColor(0).color,
                     data:  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                 };
                 datasets.push(ds);
                 plotHourDetailedLine(datasets);

             }).fail(function () {
                 alert("Error Loading BeaconReportHourDetailed for beaconid=" + bId + " date=" + targetDate);
             }).done(function (json) {
                 var datasets = [];
                 for (var i = 0; i < json.length; i++) {
                     var ds = {
                         label: json[i].mac,
                         fillColor: getColor(i).color,
                         strokeColor: "rgba(151,187,205,1)",
                         pointColor: getColor(i).color,
                         pointStrokeColor: "#fff",
                         pointHighlightFill: "#fff",
                         pointHighlightStroke: getColor(i).color,
                         data: json[i].hourMask
                     };
                     datasets.push(ds);
                 }
                 plotHourDetailedLine(datasets);
             });
    }

    //GET api/GetBeaconReportHourSummary?beaconId={beaconId}&date={date}
    function getBeaconHourSummary(bId, targetDate) {
        if (bId === undefined)
            bId = "0";
        if (targetDate === undefined)
            targetDate = new Date().yyyymmdd;
        //return $.getJSON("http://localhost:51284/api/GetBeaconReportHourSummary",
        return $.getJSON("https://displaydynamic.azure-mobile.net/api/GetBeaconReportHourSummary",
             {
                 beaconId: bId,
                 dateInt: targetDate
             }, null).fail(function () {
                 alert("Error Loading BeaconReportHourSummary for beaconid=" + bId + " date=" + targetDate);
             });
    }

    function plotHourSummaryRadar(datasets) {
        if (datasets === undefined)
            return;
        var data = {
            labels: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
                "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23"],
            datasets: datasets
        };
        // Define default option for line chart
        var option = {
            scaleOverlay: false,
            scaleOverride: false,
            scaleSteps: null,
            scaleStepWidth: null,
            scaleStartValue: null,
            scaleLineColor: "rgba(0,0,0,.1)",
            scaleLineWidth: 1,
            scaleShowLabels: true,
            //scaleLabel: "<%=value%>",
            scaleFontFamily: "'proxima-nova'",
            scaleFontSize: 10,
            scaleFontStyle: "normal",
            scaleFontColor: "#909090",
            scaleShowGridLines: true,
            scaleGridLineColor: "rgba(0,0,0,.05)",
            scaleGridLineWidth: 1,
            bezierCurve: true,
            pointDot: true,
            pointDotRadius: 3,
            pointDotStrokeWidth: 1,
            datasetStroke: true,
            datasetStrokeWidth: 2,
            datasetFill: true,
            //animation: true,
            //animationSteps: 60,
            //animationEasing: "easeOutQuart",
            //onAnimationComplete: null,
            responsive: true
        }

        var ctx = document.getElementById("chartSummary").getContext("2d");
        window.myPolarArea = new Chart(ctx).Radar(data, option);
    }

    function plotHourDetailedLine(datasets) {

        if (datasets === undefined)
            return;
        var options = {
            //Boolean - Whether to show a dot for each point
            pointDot: true,
            //Number - Radius of each point dot in pixels
            pointDotRadius: 4,
            //Number - Pixel width of point dot stroke
            pointDotStrokeWidth: 1,
            //Number - amount extra to add to the radius to cater for hit detection outside the drawn point
            pointHitDetectionRadius: 20,
            //Boolean - Whether to show a stroke for datasets
            datasetStroke: true,
            //Number - Pixel width of dataset stroke
            datasetStrokeWidth: 2,
            //Boolean - Whether to fill the dataset with a colour
            datasetFill: true//,
            ////String - A legend template
            //legendTemplate: "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].strokeColor%>\"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>"
        };

        var data = {
            labels: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
               "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23"],
            datasets: datasets
        };
        var ctx = document.getElementById("chartDetailed").getContext("2d");
        var myLineChart = new Chart(ctx).Line(data, options);
    }

    function convertHourMaskToRadarDataset(hourmask, fillColor, highlight, label) {
        if (hourmask === undefined)
            return;
        var dataset = {
            label: label,
            fillColor: fillColor,
            strokeColor: "rgba(151,187,205,1)",
            pointColor: fillColor,
            pointStrokeColor: "#fff",
            pointHighlightFill: "#fff",
            pointHighlightStroke: highlight,
            data: hourmask
        };

        return dataset;
    }

    function plotPolar(data) {
        var ctx = document.getElementById("chartSummary").getContext("2d");
        window.myPolarArea = new Chart(ctx).PolarArea(data, {
            responsive: true
        });
    }

    function getColor(num) {
        var colorWheel = [
        {
            value: 300,
            color: "#F7464A",
            highlight: "#FF5A5E",
            label: "Red"
        },
        {
            value: 50,
            color: "#46BFBD",
            highlight: "#5AD3D1",
            label: "Green"
        },
        {
            value: 100,
            color: "#FDB45C",
            highlight: "#FFC870",
            label: "Yellow"
        },
        {
            value: 40,
            color: "#949FB1",
            highlight: "#A8B3C5",
            label: "Grey"
        },
        {
            value: 120,
            color: "#4D5360",
            highlight: "#616774",
            label: "Dark Grey"
        }];
        return colorWheel[num % colorWheel.length];
    };

})();