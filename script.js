function callbackFromSphinx(object, xml) {
    //either delete Sphinx iFrame
    //sphinx.deleteIframe();
    //and then add your own content to the DOM tree
    //or alert ( xml);
    //or submit response to another page
    //document.myForm.datResponse.value=xml;
    //document.myForm.submit();
    alert("Vehicle selection is ready: " + xml.xml);
}

//handle error messages
function errorFunc(e) {
    alert(e);
}


function load() {
    sphinx.host = 'https://www.dat.de/DATECodeSelection';
    // alert('TEWST KRE U PRO')
    // adjust pageflow and destination page
    sphinx.firstPage = 'model selection';
    sphinx.lastPage = 'vehicle data';
    var destination = 'model selection';

    //initialize    
    sphinx.init(sphinx.host + "/vehicleSelection/model.tmpl", destination,
        document.getElementById('iframeContainer'), "modelIFrame");

    $.ajax({
        url: 'https://www.dat.de/AuthorizationManager/service--/endpoint/tokenService',
        data: {
            payload: JSON.stringify({
                action: "generateToken",
                customerNumber: "1305109",
                user: "fayflori",
                password: "Donnerstag2022%",
                // interfacePartnerNumber: "1305109",
                // interfacePartnerNumber: "1215372",
                // interfacePartnerSignature: "108F584A83D3D01DDE778657FEF0F30CA0136FFC1BB73583D49145C68DA1C9BC",
                // productVariant: "myClaim",
                // productVariant: "ValuateNG.expoert"
            })
        },
        type: 'POST',
        error: function (error) { alert(error); },
        success: function (data, textStatus, jqXHR) {
            //display and execute
            var loginInfo = sphinx.encryptPassword(new DatTokenInformation(data));
            var params = {}
            try {
                sphinx.execute(loginInfo, params, errorFunc);
            }
            catch (e) {
                document.getElementById('iframeContainer').innerHTML = e;
            }
        }
    });

}
function loadOld() {
    var values = new Object();

    // don't show DAT header
    values.displayHeader = false;

    // hide VIN-query button
    //values.withoutVinQueryButton = true;

    //vehicle filter restriction, one of ALL, REPAIR or APPRAISAL, default = ALL
    values.Restriction = 'APPRAISAL';
    // prohibit the change of Restriction (if true the Restriction selection is hidden)
    values.noRestrictionInp = true;

    // Country code for the target market (international licence plate country code, 3 chars)
    // corresponds to the datCountryIndicator (Values: 'D', 'A', 'CH', 'I', 'E', 'F', ...)
    values.CountryCode = 'D';

    // DossierID for loading a instance from database to the application
    //values.az = '123456'

    //DAT Europa-Code
    values.DatECode = '018601250190001';
    //or splitted DAT Europa-Code
    //values.VehicleType = 1;
    //values.Manufacturer = 860;
    //values.BaseModel = 125;
    //values.SubModel = 19;
    //values.SubModelVariant = 1;

    //Container
    values.Container = 'DE001';

    //VehicleIdentification Number
    //values.VehicleIdentNumber = '';

    //KBA 
    //values.KbaCode = ''; 

    // NatCode (for Austria only)
    //values.natCode = '';

    // Licence plate (for Italy and Switzerland only)
    //values.licencePlate = '';

    // Base number (for Switzerland only)
    //values.baseNumber = '';

    // Type note number (for Switzerland only)
    //values.typeNoteNumber = '';

    //if available vehicle initial registration date in milliseconds since 1/1/1970 
    values.InitialRegistration = 1390387939000;
    //values.constructionTime = 4900;

    // equipment filter, one of ALL, GENERAL, EXTERIOR, INTERIOR, CHASSIS, AGGREGATE or GLASS (default = ALL)
    values.equFilter = 'ALL';
    // comma separated list of dat standard/orptional equipment numbers (eg. '23605,73606')
    values.equDatNr = '';
    // comma separated list of additional equipments (eg. 'auxiliary heating, auxiliary lights')
    values.equAdd = '';

    // save selection at the end of process
    values.withSaveAsEvent = true;
    values.eventName = 'from external';

    // set the pageflow (possible values: 'model selection', 'equipment selection', 'vehicle summary' and 'vehicle data')
    sphinx.firstPage = 'model selection';
    sphinx.lastPage = 'vehicle data';
    var destination = 'model selection';

    // host: DAT €uropa Code vehicle selection
    sphinx.host = 'https://www.dat.de/DATECodeSelection';
    sphinx.init(sphinx.host + "/vehicleSelection/model.tmpl", "model", document.getElementById('iframeContainer'), "modelIFrame", null, callbackFromSphinx);

    // authentication through DAT-AuthorizationToken
    $.ajax({
        url: 'https://www.dat.de/AuthorizationManager/service--/endpoint/tokenService',
        data: {
            payload: JSON.stringify({
                action: "generateToken",
                customerNumber: "1305109",
                user: "fayflori",
                password: "Donnerstag2022%"
            })
        },
        type: 'POST',
        error: function (error) { alert(error); },
        success: function (data, textStatus, jqXHR) {
            var DAF = sphinx.getDAFXml(values);
            var loginInfo = sphinx.encryptPassword(new DatTokenInformation(data));
            // call Sphinx
            try {
                sphinx.execute(loginInfo, DAF, errorFunc);
            }
            catch (e) {
                document.getElementById('iframeContainer').innerHTML = e;
            }
        }
    });
}